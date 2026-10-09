import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';

async function requestApp(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    import('http').then(({ createServer }) => {
      const server = createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: body ? JSON.stringify(body) : undefined,
        })
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            server.close();
            resolve({ status: res.status, ok: res.ok, body: json });
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });
}

const sha = (s) => createHash('sha256').update(s).digest('hex');

async function registerFullAsset(issuerToken, spec, evidenceTypes) {
  const reg = await requestApp('POST', '/api/v1/assets', {
    headers: { Authorization: `Bearer ${issuerToken}` },
    body: {
      id: spec.id,
      typeKey: spec.typeKey,
      displayName: spec.displayName,
      attributes: spec.attributes,
    },
  });
  assert.equal(reg.status, 201);
  for (const docType of evidenceTypes) {
    const ev = await requestApp('POST', `/api/v1/assets/${spec.id}/evidence`, {
      headers: { Authorization: `Bearer ${issuerToken}` },
      body: { docType, fileName: `${docType}.pdf`, sha256: sha(`${spec.id}:${docType}`) },
    });
    assert.equal(ev.status, 201);
  }
  const sub = await requestApp('POST', `/api/v1/assets/${spec.id}/submit-verification`, {
    headers: { Authorization: `Bearer ${issuerToken}` },
  });
  assert.equal(sub.status, 200);
  return sub.body.data.verificationCase.id;
}

describe('Registry Oracle: automated registry cross-verification (API Integration)', () => {
  let issuerToken;
  let verifierToken;
  let investorToken;

  before(async () => {
    issuerToken = (await authService.login('issuer@originator.com', 'Password@123')).token;
    verifierToken = (await authService.login('verifier@auditfirm.com', 'Password@123')).token;
    investorToken = (await authService.login('investor@capitalfund.com', 'Password@123')).token;
  });

  it('GET /api/v1/verification/registries discloses VAHAN/BHOOMI/GST capabilities', async () => {
    const res = await requestApp('GET', '/api/v1/verification/registries', {
      headers: { Authorization: `Bearer ${verifierToken}` },
    });
    assert.equal(res.status, 200);
    const registries = res.body.data.map((r) => r.registry).sort();
    assert.deepEqual(registries, ['BHOOMI_RTC', 'GST_EINVOICE', 'VAHAN']);
    const vahan = res.body.data.find((r) => r.registry === 'VAHAN');
    assert.equal(vahan.checkKey, 'RC_VALID');
    assert.equal(vahan.mode, 'manual');
  });

  it('Vahan cross-check records PASS for matching RC and FAIL for mismatched maker', async () => {
    const suffix = `ORC-${Date.now()}`;
    const caseId = await registerFullAsset(
      issuerToken,
      {
        id: `AST-${suffix}`,
        typeKey: 'VEHICLE',
        displayName: 'Oracle Test Vehicle',
        attributes: {
          registrationNumber: `KA-99-${suffix.slice(-6)}`,
          chassisNumber: `VIN${suffix.replace(/-/g, '').slice(-12).padStart(12, '0')}`,
          make: 'Tata Motors',
          model: 'Ultra T.7 Electric',
        },
      },
      ['RC_BOOK', 'INSURANCE_POLICY', 'FITNESS_CERT']
    );

    const matchRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: {
        registryQuery: { registrationNumber: `KA-99-${suffix.slice(-6)}` },
        registryResponse: {
          registrationNumber: `KA-99-${suffix.slice(-6)}`,
          maker: 'Tata Motors',
          model: 'Ultra T.7 Electric',
          fuel: 'ELECTRIC',
        },
      },
    });
    assert.equal(matchRes.status, 200);
    assert.equal(matchRes.body.data.comparison.result, 'PASS');
    assert.equal(matchRes.body.data.comparison.checkKey, 'RC_VALID');
    assert.ok(matchRes.body.data.comparison.sourceRef.startsWith('registry:VAHAN:'));
    assert.equal(matchRes.body.data.result.checks.RC_VALID.result, 'PASS');

    const mismatchRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: {
        registryResponse: {
          registrationNumber: `KA-99-${suffix.slice(-6)}`,
          maker: 'Ashok Leyland',
          model: 'Ultra T.7 Electric',
        },
      },
    });
    assert.equal(mismatchRes.status, 200);
    assert.equal(mismatchRes.body.data.comparison.result, 'FAIL');
    const makerCmp = mismatchRes.body.data.comparison.comparisons.find((c) => c.field === 'maker');
    assert.equal(makerCmp.match, false);
  });

  it('Bhoomi RTC cross-check records PASS for matching survey record', async () => {
    const suffix = `ORC-${Date.now()}`;
    const caseId = await registerFullAsset(
      issuerToken,
      {
        id: `AST-${suffix}`,
        typeKey: 'REAL_ESTATE',
        displayName: 'Oracle Test Property',
        attributes: {
          surveyNumber: `SY-${suffix}`,
          propertyId: `PID-${suffix}`,
          locality: 'Whitefield, Bengaluru',
          builtUpSqFt: 5000,
        },
      },
      ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'TAX_RECEIPT']
    );

    const res = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: {
        registryQuery: { surveyNumber: `SY-${suffix}`, district: 'Bengaluru Urban' },
        registryResponse: {
          surveyNumber: `SY-${suffix}`,
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          areaSqFt: 5000,
        },
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.comparison.result, 'PASS');
    assert.equal(res.body.data.comparison.checkKey, 'TITLE_SEARCH');
  });

  it('GST e-invoice cross-check records PASS for active IRN and FAIL for cancelled IRN', async () => {
    const suffix = `ORC-${Date.now()}`;
    const caseId = await registerFullAsset(
      issuerToken,
      {
        id: `AST-${suffix}`,
        typeKey: 'INVOICE',
        displayName: 'Oracle Test Invoice',
        attributes: {
          invoiceNumber: `INV-${suffix}`,
          supplierGstin: '27AABCU9603R1ZM',
          buyerGstin: '29AABCU9603R1ZN',
          amountPaise: 45000000,
          dueDate: '2027-06-30',
        },
      },
      ['INVOICE_PDF', 'EWAY_BILL']
    );

    const goodResponse = {
      invoiceNumber: `INV-${suffix}`,
      supplierGstin: '27AABCU9603R1ZM',
      buyerGstin: '29AABCU9603R1ZN',
      amountPaise: 45000000,
      irnStatus: 'ACTIVE',
    };
    const passRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: { registryResponse: goodResponse },
    });
    assert.equal(passRes.status, 200);
    assert.equal(passRes.body.data.comparison.result, 'PASS');

    const cancelledRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: { registryResponse: { ...goodResponse, irnStatus: 'CANCELLED' } },
    });
    assert.equal(cancelledRes.status, 200);
    assert.equal(cancelledRes.body.data.comparison.result, 'FAIL');
  });

  it('rejects empty registry data, malformed responses, wrong roles and decided cases', async () => {
    const suffix = `ORC-${Date.now()}`;
    const caseId = await registerFullAsset(
      issuerToken,
      {
        id: `AST-${suffix}`,
        typeKey: 'VEHICLE',
        displayName: 'Oracle Negative Test Vehicle',
        attributes: {
          registrationNumber: `KA-98-${suffix.slice(-6)}`,
          chassisNumber: `NEG${suffix.replace(/-/g, '').slice(-12).padStart(12, '0')}`,
          make: 'Tata Motors',
          model: 'Ultra T.7 Electric',
        },
      },
      ['RC_BOOK', 'INSURANCE_POLICY', 'FITNESS_CERT']
    );

    const emptyRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: {},
    });
    assert.equal(emptyRes.status, 400);

    const malformedRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: { registryResponse: { maker: 'Tata Motors' } },
    });
    assert.equal(malformedRes.status, 400);

    const forbiddenRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${investorToken}` },
      body: { registryResponse: { registrationNumber: 'KA-98-X', maker: 'T', model: 'M' } },
    });
    assert.equal(forbiddenRes.status, 403);

    const decideRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/decide`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: { decision: 'APPROVED', reasonCode: 'ORACLE_TEST_OK', reasonText: 'Oracle negative-path setup' },
    });
    assert.equal(decideRes.status, 200);

    const afterDecideRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/registry-check`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
      body: { registryResponse: { registrationNumber: 'KA-98-X', maker: 'T', model: 'M' } },
    });
    assert.equal(afterDecideRes.status, 409);
  });
});
