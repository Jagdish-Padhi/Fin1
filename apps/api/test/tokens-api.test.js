import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { createServer } from 'http';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';

async function requestApp(method, path, { token, body } = {}) {
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

describe('Phase 5: Tokens API', () => {
  let issuerToken;
  let valuerToken;
  let verifierToken;
  let complianceToken;
  let adminToken;
  let assetId;
  let token;

  before(async () => {
    issuerToken = (
      await authService.login('issuer@originator.com', 'Password@123')
    ).token;
    valuerToken = (
      await authService.login('valuer@valuationpartners.com', 'Password@123')
    ).token;
    verifierToken = (
      await authService.login('verifier@auditfirm.com', 'Password@123')
    ).token;
    complianceToken = (
      await authService.login('compliance@regulatory.gov.in', 'Password@123')
    ).token;
    adminToken = (
      await authService.login('admin@ekamvistar.com', 'Password@123')
    ).token;

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    assetId = `AST-TOKEN-${suffix}`;
    const created = await requestApp('POST', '/api/v1/assets', {
      token: issuerToken,
      body: {
        id: assetId,
        typeKey: 'LAND',
        typeVersion: 1,
        displayName: `Token API test asset ${suffix}`,
        attributes: {
          surveyNumber: `TOKEN-${suffix}`,
          district: 'Mysuru',
          state: 'Karnataka',
          areaSqMeters: 1200,
          landUse: 'AGRICULTURAL',
        },
      },
    });
    assert.equal(created.status, 201);

    for (const docType of ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'SURVEY_MAP']) {
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
            sha256: createHash('sha256')
              .update(`${assetId}:${docType}`)
              .digest('hex'),
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
    const verification = await requestApp(
      'POST',
      `/api/v1/verification/cases/${caseId}/decide`,
      {
        token: verifierToken,
        body: {
          decision: 'APPROVED',
          reasonCode: 'CHECKS_PASSED',
          reasonText: 'Verification approved for token API test.',
        },
      }
    );
    assert.equal(verification.status, 200);

    const proposed = await requestApp('POST', '/api/v1/valuation/propose', {
      token: valuerToken,
      body: {
        assetId,
        amountPaise: 125000000,
        currency: 'INR',
        method: 'CIRCLE_RATE',
        methodDetails: { ratePerSqMeterPaise: 104166 },
        source: {
          valuerName: 'Independent Test Valuer',
          valuerOrg: 'Valuation Partners',
        },
        valuationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
    assert.equal(proposed.status, 201);

    const approved = await requestApp(
      'POST',
      `/api/v1/valuation/${proposed.body.data.id}/approve`,
      {
        token: complianceToken,
      }
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.asset.status, 'VALUED');
  });

  it('mints a token for a VALUED asset and exposes balance, holders, and trace', async () => {
    const denied = await requestApp('POST', '/api/v1/tokens/mint', {
      token: issuerToken,
      body: {
        assetId,
        standard: 'FRACTIONAL',
        totalUnits: 10000,
        rightsType: 'UNDIVIDED_FRACTION',
        representation: 'Undivided economic interest in the asset',
      },
    });
    assert.equal(denied.status, 403);

    const invalid = await requestApp('POST', '/api/v1/tokens/mint', {
      token: complianceToken,
      body: {
        assetId,
        standard: 'FRACTIONAL',
        totalUnits: 0,
        rightsType: 'UNDIVIDED_FRACTION',
        representation: 'Undivided economic interest in the asset',
      },
    });
    assert.equal(invalid.status, 400);

    const minted = await requestApp('POST', '/api/v1/tokens/mint', {
      token: complianceToken,
      body: {
        assetId,
        standard: 'FRACTIONAL',
        totalUnits: 10000,
        rightsType: 'UNDIVIDED_FRACTION',
        representation: 'Undivided economic interest in the asset',
      },
    });
    assert.equal(minted.status, 201);
    assert.equal(minted.body.success, true);
    token = minted.body.data;
    assert.match(token.id, /^TKN-/);
    assert.equal(token.assetId, assetId);
    assert.equal(token.initialHolderId, 'PRT-ISSUER-01');
    assert.equal(token.totalUnits, 10000);
    assert.equal(token.unitLabel, 'UNITS');

    const tokenRead = await requestApp('GET', `/api/v1/tokens/${token.id}`, {
      token: complianceToken,
    });
    assert.equal(tokenRead.status, 200);
    assert.equal(tokenRead.body.data.id, token.id);
    const tokenList = await requestApp('GET', '/api/v1/tokens', {
      token: complianceToken,
    });
    assert.equal(tokenList.status, 200);
    assert.ok(tokenList.body.data.some((record) => record.id === token.id));

    const balance = await requestApp(
      'GET',
      `/api/v1/tokens/${token.id}/balance/PRT-ISSUER-01`,
      { token: complianceToken }
    );
    assert.equal(balance.status, 200);
    assert.deepEqual(balance.body.data, { units: 10000 });
    const emptyBalance = await requestApp(
      'GET',
      `/api/v1/tokens/${token.id}/balance/PRT-NON-HOLDER`,
      { token: complianceToken }
    );
    assert.equal(emptyBalance.status, 200);
    assert.deepEqual(emptyBalance.body.data, { units: 0 });

    const holders = await requestApp(
      'GET',
      `/api/v1/tokens/${token.id}/holders`,
      {
        token: complianceToken,
      }
    );
    assert.equal(holders.status, 200);
    assert.deepEqual(holders.body.data, [
      { participantId: 'PRT-ISSUER-01', units: 10000 },
    ]);

    const trace = await requestApp('GET', `/api/v1/tokens/${token.id}/trace`, {
      token: complianceToken,
    });
    assert.equal(trace.status, 200);
    assert.equal(trace.body.data.token.id, token.id);
    assert.equal(trace.body.data.asset.status, 'TOKENIZED');
    assert.equal(trace.body.data.holders[0].units, 10000);
    assert.equal(trace.body.data.auditTrail.length, 1);

    const passport = await requestApp(
      'GET',
      `/api/v1/tokens/public-verify/${token.id}`
    );
    assert.equal(passport.status, 200);
    assert.equal(passport.body.data.status, 'ACTIVE');
    assert.equal(passport.body.data.holderCount, 1);

    const asset = await requestApp('GET', `/api/v1/assets/${assetId}`, {
      token: complianceToken,
    });
    assert.equal(asset.status, 200);
    assert.equal(asset.body.data.status, 'TOKENIZED');
    assert.equal(asset.body.data.tokenId, token.id);

    const duplicate = await requestApp('POST', '/api/v1/tokens/mint', {
      token: adminToken,
      body: {
        assetId,
        standard: 'FRACTIONAL',
        totalUnits: 10000,
        rightsType: 'UNDIVIDED_FRACTION',
        representation: 'Undivided economic interest in the asset',
      },
    });
    assert.equal(duplicate.status, 409);
  });
});
