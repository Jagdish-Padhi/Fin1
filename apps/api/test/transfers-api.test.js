import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { TransferStatus } from '@rwa/contracts';

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

describe('Phase 6: Transfers API', () => {
  let issuerToken;
  let investorToken;
  let complianceToken;
  let verifierToken;
  let adminToken;
  let tokenId;

  before(async () => {
    issuerToken = (
      await authService.login('issuer@originator.com', 'Password@123')
    ).token;
    investorToken = (
      await authService.login('investor@capitalfund.com', 'Password@123')
    ).token;
    complianceToken = (
      await authService.login('compliance@regulatory.gov.in', 'Password@123')
    ).token;
    verifierToken = (
      await authService.login('verifier@auditfirm.com', 'Password@123')
    ).token;
    adminToken = (
      await authService.login('admin@ekamvistar.com', 'Password@123')
    ).token;

    // Set up a fully verified, valued and minted token for transfer testing
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const assetId = `AST-TRF-${suffix}`;

    // 1. Register asset
    const created = await requestApp('POST', '/api/v1/assets', {
      token: issuerToken,
      body: {
        id: assetId,
        typeKey: 'LAND',
        typeVersion: 1,
        displayName: `Transfer API test land parcel ${suffix}`,
        attributes: {
          surveyNumber: `SY-${suffix}`,
          district: 'Mysuru',
          state: 'Karnataka',
          areaSqMeters: 10000,
          landUse: 'AGRICULTURAL',
        },
      },
    });
    assert.equal(created.status, 201);

    // 2. Attach evidence
    const docTypes = ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'SURVEY_MAP'];
    for (const docType of docTypes) {
      const evRes = await requestApp('POST', `/api/v1/assets/${assetId}/evidence`, {
        token: issuerToken,
        body: {
          docType,
          fileName: `${docType}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 1024,
          sha256: 'a'.repeat(64),
        },
      });
      assert.equal(evRes.status, 201);
    }

    // 3. Submit verification & verify
    const subRes = await requestApp(
      'POST',
      `/api/v1/assets/${assetId}/submit-verification`,
      {
        token: issuerToken,
      }
    );
    assert.equal(subRes.status, 200);
    const caseId = subRes.body.data.verificationCase.id;

    const verifyRes = await requestApp('POST', `/api/v1/verification/cases/${caseId}/decide`, {
      token: verifierToken,
      body: {
        decision: 'APPROVED',
        reasonCode: 'CHECKS_PASSED',
        reasonText: 'All land title checks passed',
      },
    });
    assert.equal(verifyRes.status, 200);

    // 4. Propose valuation & approve
    const valuerToken = (
      await authService.login('valuer@valuationpartners.com', 'Password@123')
    ).token;

    const valRes = await requestApp('POST', '/api/v1/valuation/propose', {
      token: valuerToken,
      body: {
        assetId,
        amountPaise: 500000000,
        currency: 'INR',
        method: 'CIRCLE_RATE',
        methodDetails: { ratePerSqMeterPaise: 50000 },
        source: {
          valuerName: 'Registered Valuer',
          valuerOrg: 'TUV SGS',
        },
        valuationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    assert.equal(valRes.status, 201);
    const valuationId = valRes.body.data.id;

    const approveValRes = await requestApp('POST', `/api/v1/valuation/${valuationId}/approve`, {
      token: complianceToken,
    });
    assert.equal(approveValRes.status, 200);

    // 5. Mint token (10,000 units to PRT-ISSUER-01)
    const mintRes = await requestApp('POST', '/api/v1/tokens/mint', {
      token: complianceToken,
      body: {
        assetId,
        standard: 'FRACTIONAL',
        totalUnits: 10000,
        unitLabel: 'SQM',
        rightsType: 'UNDIVIDED_FRACTION',
        representation: 'Undivided fractional interest in surveyed land parcel',
      },
    });
    assert.equal(mintRes.status, 201);
    tokenId = mintRes.body.data.id;
  });

  it('rejects unauthorized roles from proposing transfers', async () => {
    const res = await requestApp('POST', '/api/v1/transfers/propose', {
      token: verifierToken, // VERIFIER cannot propose transfers
      body: {
        tokenId,
        toParticipantId: 'PRT-INVESTOR-01',
        units: 500,
      },
    });

    assert.equal(res.status, 403);
  });

  it('proposes a transfer and returns 201 with PROPOSED status', async () => {
    const res = await requestApp('POST', '/api/v1/transfers/propose', {
      token: issuerToken,
      body: {
        tokenId,
        toParticipantId: 'PRT-INVESTOR-01',
        units: 1000,
        pricePaise: 50000000,
        paymentRef: 'NEFT-REF-1001',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, TransferStatus.PROPOSED);
    assert.equal(res.body.data.units, 1000);
    assert.equal(res.body.data.toParticipantId, 'PRT-INVESTOR-01');
  });

  it('performs pre-flight rule evaluation via /transfers/evaluate', async () => {
    const res = await requestApp('POST', '/api/v1/transfers/evaluate', {
      token: investorToken,
      body: {
        tokenId,
        fromParticipantId: 'PRT-ISSUER-01',
        toParticipantId: 'PRT-INVESTOR-01',
        units: 1000,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.passed, true);
    assert.equal(res.body.data.results.PARTICIPANT_ACTIVE.passed, true);
    assert.equal(res.body.data.results.KYC_VERIFIED.passed, true);
  });

  it('executes a valid transfer atomically and updates balances', async () => {
    // 1. Propose transfer of 1,000 units
    const propRes = await requestApp('POST', '/api/v1/transfers/propose', {
      token: issuerToken,
      body: {
        tokenId,
        toParticipantId: 'PRT-INVESTOR-01',
        units: 1000,
      },
    });
    assert.equal(propRes.status, 201);
    const transferId = propRes.body.data.id;

    // 2. Execute transfer
    const execRes = await requestApp(
      'POST',
      `/api/v1/transfers/${transferId}/execute`,
      {
        token: investorToken,
      }
    );

    assert.equal(execRes.status, 200);
    assert.equal(execRes.body.success, true);
    assert.equal(execRes.body.data.status, TransferStatus.EXECUTED);

    // 3. Verify balances updated
    const issuerBalRes = await requestApp(
      'GET',
      `/api/v1/tokens/${tokenId}/balance/PRT-ISSUER-01`,
      {
        token: issuerToken,
      }
    );
    const investorBalRes = await requestApp(
      'GET',
      `/api/v1/tokens/${tokenId}/balance/PRT-INVESTOR-01`,
      {
        token: investorToken,
      }
    );

    assert.equal(issuerBalRes.body.data.units, 9000); // 10,000 - 1,000
    assert.equal(investorBalRes.body.data.units, 1000);
  });

  it('persists REJECTED transfer with reason codes when business rules fail (RULE 3.4-1)', async () => {
    // PRT-INVESTOR-01 already holds 1,000 units (10% of 10,000). Max cap is 25% = 2,500 units.
    // Transferring 2,000 additional units would exceed the 2,500 max holding cap (3,000 > 2,500).
    const propRes = await requestApp('POST', '/api/v1/transfers/propose', {
      token: issuerToken,
      body: {
        tokenId,
        toParticipantId: 'PRT-INVESTOR-01',
        units: 2000,
      },
    });
    assert.equal(propRes.status, 201);
    const transferId = propRes.body.data.id;

    const execRes = await requestApp(
      'POST',
      `/api/v1/transfers/${transferId}/execute`,
      {
        token: complianceToken,
      }
    );

    assert.equal(execRes.status, 200);
    assert.equal(execRes.body.success, true);
    assert.equal(execRes.body.data.status, TransferStatus.REJECTED);
    assert.ok(execRes.body.data.rejectionReasons.length > 0);

    // Verify balances did not change
    const investorBalRes = await requestApp(
      'GET',
      `/api/v1/tokens/${tokenId}/balance/PRT-INVESTOR-01`,
      {
        token: investorToken,
      }
    );
    assert.equal(investorBalRes.body.data.units, 1000);
  });

  it('queries transfer by ID, list transfers, and retrieves token transfer history', async () => {
    // Admin is prohibited from viewing transfers under Segregation of Duties
    const adminRes = await requestApp('GET', '/api/v1/transfers', {
      token: adminToken,
    });
    assert.equal(adminRes.status, 403);

    const listRes = await requestApp('GET', '/api/v1/transfers', {
      token: complianceToken,
    });
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.length >= 2);

    const historyRes = await requestApp(
      'GET',
      `/api/v1/transfers/token/${tokenId}/history`,
      {
        token: complianceToken,
      }
    );
    assert.equal(historyRes.status, 200);
    assert.ok(Array.isArray(historyRes.body.data));
    assert.ok(historyRes.body.data.some((t) => t.status === TransferStatus.EXECUTED));
    assert.ok(historyRes.body.data.some((t) => t.status === TransferStatus.REJECTED));
  });
});
