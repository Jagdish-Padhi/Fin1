import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { getChainGateway } from '@rwa/chain-client';

async function requestApp(method, path, { token, body } = {}) {
  const { createServer } = await import('http');
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }
    );
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

describe('Phase 4: Valuation API', () => {
  let issuerToken;
  let verifierToken;
  let valuerToken;
  let complianceToken;
  let adminToken;

  before(async () => {
    issuerToken = (
      await authService.login('issuer@originator.com', 'Password@123')
    ).token;
    verifierToken = (
      await authService.login('verifier@auditfirm.com', 'Password@123')
    ).token;
    valuerToken = (
      await authService.login('valuer@valuationpartners.com', 'Password@123')
    ).token;
    complianceToken = (
      await authService.login('compliance@regulatory.gov.in', 'Password@123')
    ).token;
    adminToken = (
      await authService.login('admin@ekamvistar.com', 'Password@123')
    ).token;
  });

  it('proposes and approves a valuation, enforcing API roles and asset state', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const assetId = `AST-VAL-${suffix}`;
    const asset = await requestApp('POST', '/api/v1/assets', {
      token: issuerToken,
      body: {
        id: assetId,
        typeKey: 'LAND',
        typeVersion: 1,
        displayName: `Valuation API test asset ${suffix}`,
        attributes: {
          surveyNumber: `VAL-${suffix}`,
          district: 'Mysuru',
          state: 'Karnataka',
          areaSqMeters: 1200,
          landUse: 'AGRICULTURAL',
        },
      },
    });
    assert.equal(asset.status, 201);

    for (const docType of ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'SURVEY_MAP']) {
      const digest = await import('crypto').then(({ createHash }) =>
        createHash('sha256').update(`${assetId}:${docType}`).digest('hex')
      );
      const evidence = await requestApp(
        'POST',
        `/api/v1/assets/${assetId}/evidence`,
        {
          token: issuerToken,
          body: {
            docType,
            fileName: `${docType}.pdf`,
            mimeType: 'application/pdf',
            fileSize: 1024,
            sha256: digest,
          },
        }
      );
      assert.equal(evidence.status, 201);
    }

    const submission = await requestApp(
      'POST',
      `/api/v1/assets/${assetId}/submit-verification`,
      {
        token: issuerToken,
      }
    );
    assert.equal(submission.status, 200);
    const caseId = submission.body.data.verificationCase.id;
    assert.ok(caseId);

    const invalidCheck = await requestApp(
      'POST',
      `/api/v1/verification/cases/${caseId}/checks`,
      {
        token: verifierToken,
        body: { checkKey: 'TITLE_CHAIN', result: 'INVALID' },
      }
    );
    assert.equal(invalidCheck.status, 400);

    const gateway = getChainGateway();
    const observedEvents = [];
    const unsubscribe = gateway.subscribe((event) =>
      observedEvents.push(event)
    );
    for (const checkKey of [
      'TITLE_CHAIN',
      'ENCUMBRANCE_CLEAR',
      'SURVEY_MATCH',
    ]) {
      const check = await requestApp(
        'POST',
        `/api/v1/verification/cases/${caseId}/checks`,
        {
          token: verifierToken,
          body: {
            checkKey,
            result: 'PASS',
            notes: 'Verification API test.',
            sourceRef: `TEST:${checkKey}`,
          },
        }
      );
      assert.equal(check.status, 200);
      assert.equal(check.body.data.result.status, 'IN_PROGRESS');
      assert.equal(check.body.data.result.checks[checkKey].result, 'PASS');
    }
    unsubscribe();
    assert.equal(
      gateway.auditTrail.filter(
        (entry) =>
          entry.entityId === caseId && entry.reasonCode === 'CHECK_RECORDED'
      ).length,
      3
    );
    assert.equal(
      observedEvents.filter(
        (event) => event.name === 'VerificationCheckRecorded'
      ).length,
      3
    );

    const invalidDecision = await requestApp(
      'POST',
      `/api/v1/verification/cases/${caseId}/decide`,
      {
        token: verifierToken,
        body: { decision: 'INVALID', reasonCode: 'TEST' },
      }
    );
    assert.equal(invalidDecision.status, 400);

    const verification = await requestApp(
      'POST',
      `/api/v1/verification/cases/${caseId}/decide`,
      {
        token: verifierToken,
        body: {
          decision: 'APPROVED',
          reasonCode: 'CHECKS_PASSED',
          reasonText: 'Verification approved for valuation API test.',
        },
      }
    );
    assert.equal(verification.status, 200);
    assert.equal(
      verification.body.data.result.verificationCase.status,
      'APPROVED'
    );
    assert.equal(verification.body.data.result.asset.status, 'VERIFIED');

    const checkAfterDecision = await requestApp(
      'POST',
      `/api/v1/verification/cases/${caseId}/checks`,
      {
        token: verifierToken,
        body: { checkKey: 'LATE_CHECK', result: 'PASS' },
      }
    );
    assert.equal(checkAfterDecision.status, 409);

    const proposal = {
      assetId,
      amountPaise: 125000000,
      currency: 'INR',
      method: 'CIRCLE_RATE',
      methodDetails: { ratePerSqMeterPaise: 104166 },
      source: {
        valuerName: 'Independent Test Valuer',
        valuerOrg: 'Valuation Partners',
        reportReference: `REPORT-${suffix}`,
        reportHash: 'a'.repeat(64),
      },
      valuationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const deniedProposal = await requestApp(
      'POST',
      '/api/v1/valuation/propose',
      {
        token: issuerToken,
        body: proposal,
      }
    );
    assert.equal(deniedProposal.status, 403);

    const invalidProposal = await requestApp(
      'POST',
      '/api/v1/valuation/propose',
      {
        token: valuerToken,
        body: { ...proposal, currency: 'USD' },
      }
    );
    assert.equal(invalidProposal.status, 400);

    const proposed = await requestApp('POST', '/api/v1/valuation/propose', {
      token: valuerToken,
      body: proposal,
    });
    assert.equal(proposed.status, 201);
    assert.equal(proposed.body.success, true);
    assert.match(proposed.body.data.id, /^VAL-/);
    assert.equal(proposed.body.data.status, 'PROPOSED');
    assert.equal(proposed.body.data.assetId, assetId);
    const valuationId = proposed.body.data.id;

    const adminApproval = await requestApp(
      'POST',
      `/api/v1/valuation/${valuationId}/approve`,
      {
        token: adminToken,
      }
    );
    assert.equal(adminApproval.status, 403);

    const approved = await requestApp(
      'POST',
      `/api/v1/valuation/${valuationId}/approve`,
      {
        token: complianceToken,
      }
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.body.success, true);
    assert.equal(approved.body.data.valuation.status, 'APPROVED');
    assert.equal(approved.body.data.asset.status, 'VALUED');
    assert.equal(approved.body.data.asset.valuationId, valuationId);

    const valuationRead = await requestApp(
      'GET',
      `/api/v1/valuation/${valuationId}`,
      {
        token: complianceToken,
      }
    );
    assert.equal(valuationRead.status, 200);
    assert.equal(valuationRead.body.data.status, 'APPROVED');

    const assetRead = await requestApp('GET', `/api/v1/assets/${assetId}`, {
      token: complianceToken,
    });
    assert.equal(assetRead.status, 200);
    assert.equal(assetRead.body.data.status, 'VALUED');
  });
});
