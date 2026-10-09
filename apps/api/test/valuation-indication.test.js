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

async function registerAndVerify(issuerToken, verifierToken, spec, evidenceTypes) {
  const reg = await requestApp('POST', '/api/v1/assets', {
    headers: { Authorization: `Bearer ${issuerToken}` },
    body: { id: spec.id, typeKey: spec.typeKey, displayName: spec.displayName, attributes: spec.attributes },
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
  const dec = await requestApp('POST', `/api/v1/verification/cases/${sub.body.data.verificationCase.id}/decide`, {
    headers: { Authorization: `Bearer ${verifierToken}` },
    body: { decision: 'APPROVED', reasonCode: 'INDICATION_TEST_SETUP', reasonText: 'Setup for indication test' },
  });
  assert.equal(dec.status, 200);
}

describe('Valuation Indication Engine (API Integration)', () => {
  let issuerToken;
  let verifierToken;
  let valuerToken;
  let investorToken;

  before(async () => {
    issuerToken = (await authService.login('issuer@originator.com', 'Password@123')).token;
    verifierToken = (await authService.login('verifier@auditfirm.com', 'Password@123')).token;
    valuerToken = (await authService.login('valuer@valuationpartners.com', 'Password@123')).token;
    investorToken = (await authService.login('investor@capitalfund.com', 'Password@123')).token;
  });

  it('indicates FACE_VALUE_DISCOUNTED for invoices with exact discount math', async () => {
    const suffix = `VIND-${Date.now()}`;
    const assetId = `AST-${suffix}`;
    await registerAndVerify(
      issuerToken,
      verifierToken,
      {
        id: assetId,
        typeKey: 'INVOICE',
        displayName: 'Indication Test Invoice',
        attributes: {
          invoiceNumber: `INV-${suffix}`,
          supplierGstin: '27AABCU9603R1ZM',
          buyerGstin: '29AABCU9603R1ZN',
          amountPaise: 100000000,
          dueDate: '2027-12-31',
        },
      },
      ['INVOICE_PDF', 'EWAY_BILL']
    );

    const res = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId },
    });
    assert.equal(res.status, 200);
    const ind = res.body.data;
    assert.equal(ind.method, 'FACE_VALUE_DISCOUNTED');
    const { daysToDue } = ind.workings;
    assert.ok(daysToDue > 0);
    const expectedDiscount = Math.round((100000000 * 700 * daysToDue) / (10000 * 365));
    assert.equal(ind.workings.discountPaise, expectedDiscount);
    assert.equal(ind.recommendedPaise, 100000000 - expectedDiscount);
    assert.equal(ind.indicatedLowPaise, Math.round(ind.recommendedPaise * 0.97));
    assert.equal(ind.indicatedHighPaise, Math.round(ind.recommendedPaise * 1.03));
    assert.ok(ind.indicationHash && ind.indicationHash.length === 64);
    assert.ok(ind.suggestedMethodDetails.indicationHash);
  });

  it('indicates DEPRECIATED_COST for vehicles with exact WDV math', async () => {
    const suffix = `VIND-${Date.now()}`;
    const assetId = `AST-${suffix}`;
    const mfgYear = new Date().getFullYear() - 2;
    await registerAndVerify(
      issuerToken,
      verifierToken,
      {
        id: assetId,
        typeKey: 'VEHICLE',
        displayName: 'Indication Test Vehicle',
        attributes: {
          registrationNumber: `KA-97-${suffix.slice(-6)}`,
          chassisNumber: `WDV${suffix.replace(/-/g, '').slice(-12).padStart(12, '0')}`,
          make: 'Tata Motors',
          model: 'Ultra T.7 Electric',
          manufacturingYear: mfgYear,
          purchasePriceInr: 1000000,
        },
      },
      ['RC_BOOK', 'INSURANCE_POLICY', 'FITNESS_CERT']
    );

    const res = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.method, 'DEPRECIATED_COST');
    assert.equal(res.body.data.workings.ageYears, 2);
    assert.equal(res.body.data.recommendedPaise, Math.round(1000000 * 100 * Math.pow(0.85, 2)));
  });

  it('indicates SPOT_MARKET_BENCHMARK from supplied mandi price and rejects missing price', async () => {
    const suffix = `VIND-${Date.now()}`;
    const assetId = `AST-${suffix}`;
    await registerAndVerify(
      issuerToken,
      verifierToken,
      {
        id: assetId,
        typeKey: 'COMMODITY',
        displayName: 'Indication Test Commodity',
        attributes: {
          batchId: `BATCH-${suffix}`,
          warehouseReceiptNo: `EWR-${suffix}`,
          commodityType: 'TURMERIC',
          quantityKg: 200,
          storageLocation: 'Hubballi WDRA Warehouse 7',
        },
      },
      ['WAREHOUSE_RECEIPT', 'ASSAYING_CERT']
    );

    const missing = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId },
    });
    assert.equal(missing.status, 400);

    const res = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId, marketPricePerKg: 45.5, marketName: 'Hubballi', priceDate: '2026-10-01' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.recommendedPaise, Math.round(200 * 45.5 * 100));
    assert.equal(res.body.data.workings.market, 'Hubballi');
  });

  it('indicates CIRCLE_RATE from guidance rate and rejects missing rate source', async () => {
    const suffix = `VIND-${Date.now()}`;
    const assetId = `AST-${suffix}`;
    await registerAndVerify(
      issuerToken,
      verifierToken,
      {
        id: assetId,
        typeKey: 'LAND',
        displayName: 'Indication Test Land',
        attributes: {
          surveyNumber: `SY-${suffix}`,
          district: 'Mysuru',
          state: 'Karnataka',
          areaSqMeters: 2000,
          landUse: 'AGRICULTURAL',
        },
      },
      ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'SURVEY_MAP']
    );

    const missing = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId },
    });
    assert.equal(missing.status, 400);

    const res = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId, ratePerSqM: 600, rateSource: 'Kaveri guidance 2024-25, Mysuru rural zone' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.recommendedPaise, 2000 * 600 * 100);
  });

  it('refuses open methods, non-verified assets and non-valuer roles', async () => {
    const suffix = `VIND-${Date.now()}`;
    const assetId = `AST-${suffix}`;
    await registerAndVerify(
      issuerToken,
      verifierToken,
      {
        id: assetId,
        typeKey: 'LAND',
        displayName: 'Indication Negative Test Land',
        attributes: {
          surveyNumber: `SYN-${suffix}`,
          district: 'Mysuru',
          state: 'Karnataka',
          areaSqMeters: 1000,
          landUse: 'AGRICULTURAL',
        },
      },
      ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'SURVEY_MAP']
    );

    const openMethod = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId, method: 'MARKET_COMPARABLE' },
    });
    assert.equal(openMethod.status, 400);

    const draftId = `AST-DRAFT-${suffix}`;
    const draft = await requestApp('POST', '/api/v1/assets', {
      headers: { Authorization: `Bearer ${issuerToken}` },
      body: {
        id: draftId,
        typeKey: 'LAND',
        displayName: 'Draft asset',
        attributes: {
          surveyNumber: `SYD-${suffix}`,
          district: 'Mysuru',
          state: 'Karnataka',
          areaSqMeters: 500,
          landUse: 'AGRICULTURAL',
        },
      },
    });
    assert.equal(draft.status, 201);
    const draftInd = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${valuerToken}` },
      body: { assetId: draftId },
    });
    assert.equal(draftInd.status, 400);

    const forbidden = await requestApp('POST', '/api/v1/valuation/indication', {
      headers: { Authorization: `Bearer ${investorToken}` },
      body: { assetId },
    });
    assert.equal(forbidden.status, 403);
  });
});
