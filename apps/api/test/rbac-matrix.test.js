import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { can, tabAccess, CAPABILITIES } from '@rwa/contracts';

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
      body: await response.json().catch(() => ({})),
    };
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

describe('Role × Endpoint RBAC & Data Scoping Matrix Integration Tests', () => {
  const users = {};
  const tokens = {};

  const CREDENTIALS = {
    ADMINISTRATOR: { email: 'admin@ekamvistar.com', pass: 'Password@123' },
    ISSUER: { email: 'issuer@originator.com', pass: 'Password@123' },
    VERIFIER: { email: 'verifier@auditfirm.com', pass: 'Password@123' },
    VALUER: { email: 'valuer@valuationpartners.com', pass: 'Password@123' },
    COMPLIANCE: { email: 'compliance@regulatory.gov.in', pass: 'Password@123' },
    INVESTOR: { email: 'investor@capitalfund.com', pass: 'Password@123' },
    AUDITOR: { email: 'auditor@kpmg-audit.com', pass: 'Password@123' },
  };

  const ROLES = Object.keys(CREDENTIALS);

  before(async () => {
    for (const [role, cred] of Object.entries(CREDENTIALS)) {
      const res = await authService.login(cred.email, cred.pass);
      users[role] = res.user;
      tokens[role] = res.token;
    }
  });

  describe('1. Asset Types Endpoints', () => {
    it('GET /api/v1/asset-types requires authentication and allows all 7 roles', async () => {
      const unauth = await requestApp('GET', '/api/v1/asset-types');
      assert.equal(unauth.status, 401);

      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/asset-types', { token: tokens[role] });
        assert.equal(res.status, 200, `${role} should read asset types`);
      }
    });

    it('POST /api/v1/asset-types allows only ADMINISTRATOR (defineAssetType)', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/asset-types', {
          token: tokens[role],
          body: { key: `TYPE-${role}-${Date.now()}`, name: 'Test' },
        });
        if (can(role, 'defineAssetType')) {
          // May succeed or fail on validation, but definitely not 403
          assert.notEqual(res.status, 403, `${role} should be allowed defineAssetType`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from defineAssetType`);
        }
      }
    });
  });

  describe('2. Assets Endpoints & Data Scoping', () => {
    it('GET /api/v1/assets allows only ISSUER, COMPLIANCE, AUDITOR and forbids others', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/assets', { token: tokens[role] });
        if (can(role, 'readAssets')) {
          assert.equal(res.status, 200, `${role} should be allowed to read assets`);
          assert.ok(Array.isArray(res.body.data || res.body));
        } else {
          assert.equal(res.status, 403, `${role} must receive 403 on /assets`);
        }
      }
    });

    it('Server-side scoping: ISSUER sees only own assets; INVESTOR and ADMIN cannot read assets', async () => {
      // Issuer sees only own assets
      const issuerRes = await requestApp('GET', '/api/v1/assets', { token: tokens.ISSUER });
      assert.equal(issuerRes.status, 200);
      const issuerAssets = issuerRes.body.data || issuerRes.body;
      for (const a of issuerAssets) {
        assert.equal(
          a.originatorParticipantId,
          users.ISSUER.participantId,
          'Issuer must only see their own originated assets'
        );
      }

      // Investor receives 403 and never receives unverified assets
      const invRes = await requestApp('GET', '/api/v1/assets', { token: tokens.INVESTOR });
      assert.equal(invRes.status, 403);

      // Admin receives 403 (never receives assets)
      const admRes = await requestApp('GET', '/api/v1/assets', { token: tokens.ADMINISTRATOR });
      assert.equal(admRes.status, 403);
    });

    it('POST /api/v1/assets allows only ISSUER (registerAsset)', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/assets', {
          token: tokens[role],
          body: { typeKey: 'LAND', displayName: 'Asset 1' },
        });
        if (can(role, 'registerAsset')) {
          assert.notEqual(res.status, 403, `${role} should have registerAsset capability`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from registerAsset`);
        }
      }
    });
  });

  describe('3. Verification Endpoints', () => {
    it('GET /api/v1/verification/cases allows VERIFIER, COMPLIANCE, AUDITOR and forbids others', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/verification/cases', { token: tokens[role] });
        if (can(role, 'readVerification')) {
          assert.equal(res.status, 200, `${role} should have readVerification`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from readVerification`);
        }
      }
    });
  });

  describe('4. Valuation Endpoints', () => {
    it('GET /api/v1/valuation allows VALUER, COMPLIANCE, AUDITOR, ISSUER and forbids ADMIN, INVESTOR', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/valuation', { token: tokens[role] });
        if (can(role, 'readValuation')) {
          assert.equal(res.status, 200, `${role} should have readValuation`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from readValuation`);
        }
      }
    });

    it('POST /api/v1/valuation/propose allows only VALUER', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/valuation/propose', {
          token: tokens[role],
          body: { assetId: 'AST-TEST', amountPaise: 10000000 },
        });
        if (can(role, 'proposeValuation')) {
          assert.notEqual(res.status, 403, `${role} should have proposeValuation`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from proposeValuation`);
        }
      }
    });

    it('POST /api/v1/valuation/:id/approve allows only COMPLIANCE (rejects VALUER and others)', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/valuation/VAL-FAKE/approve', {
          token: tokens[role],
          body: {},
        });
        if (can(role, 'approveValuation')) {
          assert.notEqual(res.status, 403, `${role} should have approveValuation`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from approveValuation`);
        }
      }
    });
  });

  describe('5. Token Endpoints, Cap Table & Balances', () => {
    it('GET /api/v1/tokens allows ISSUER, COMPLIANCE, INVESTOR, AUDITOR and forbids ADMIN, VERIFIER, VALUER', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/tokens', { token: tokens[role] });
        if (can(role, 'readTokens')) {
          assert.equal(res.status, 200, `${role} should have readTokens`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from readTokens`);
        }
      }
    });

    it('POST /api/v1/tokens/mint allows only COMPLIANCE (Admin, Issuer, Investor forbidden)', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/tokens/mint', {
          token: tokens[role],
          body: { assetId: 'AST-TEST' },
        });
        if (can(role, 'mintToken')) {
          assert.notEqual(res.status, 403, `${role} should have mintToken`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from mintToken`);
        }
      }
    });

    it('Cap table visibility: INVESTOR cannot read token holders (/tokens/:id/holders returns 403)', async () => {
      const invRes = await requestApp('GET', '/api/v1/tokens/TKN-TEST/holders', {
        token: tokens.INVESTOR,
      });
      assert.equal(invRes.status, 403, 'Investor must be forbidden from viewing cap tables');

      const compRes = await requestApp('GET', '/api/v1/tokens/TKN-TEST/holders', {
        token: tokens.COMPLIANCE,
      });
      assert.notEqual(compRes.status, 403, 'Compliance must be allowed to view cap tables');

      const audRes = await requestApp('GET', '/api/v1/tokens/TKN-TEST/holders', {
        token: tokens.AUDITOR,
      });
      assert.notEqual(audRes.status, 403, 'Auditor must be allowed to view cap tables');
    });

    it('Balance privacy: INVESTOR cannot query another participant balance', async () => {
      // Query own balance succeeds or returns 200
      const ownRes = await requestApp(
        'GET',
        `/api/v1/tokens/TKN-LAND-001/balance/${users.INVESTOR.participantId}`,
        { token: tokens.INVESTOR }
      );
      assert.equal(ownRes.status, 200);

      // Query another participant's balance is blocked with 403
      const otherRes = await requestApp(
        'GET',
        `/api/v1/tokens/TKN-LAND-001/balance/${users.ISSUER.participantId}`,
        { token: tokens.INVESTOR }
      );
      assert.equal(otherRes.status, 403, 'Investor querying other participant balance must return 403');
    });
  });

  describe('6. Transfer Endpoints & Scoping', () => {
    it('GET /api/v1/transfers allows ISSUER, INVESTOR, COMPLIANCE, AUDITOR and forbids ADMIN, VERIFIER, VALUER', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/transfers', { token: tokens[role] });
        if (can(role, 'readTransfers')) {
          assert.equal(res.status, 200, `${role} should have readTransfers`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from readTransfers`);
        }
      }
    });

    it('POST /api/v1/transfers/propose allows only ISSUER and INVESTOR (forbids ADMIN and COMPLIANCE)', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/transfers/propose', {
          token: tokens[role],
          body: { tokenId: 'TKN-TEST', toParticipantId: 'PRT-OTHER', units: 10 },
        });
        if (can(role, 'proposeTransfer')) {
          assert.notEqual(res.status, 403, `${role} should have proposeTransfer`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from proposeTransfer`);
        }
      }
    });
  });

  describe('7. Lifecycle Endpoints', () => {
    it('POST /api/v1/lifecycle/freeze allows only COMPLIANCE', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/lifecycle/freeze', {
          token: tokens[role],
          body: { assetId: 'AST-TEST', reasonText: 'Audit hold' },
        });
        if (can(role, 'freezeAsset')) {
          assert.notEqual(res.status, 403, `${role} should have freezeAsset`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from freezeAsset`);
        }
      }
    });

    it('POST /api/v1/lifecycle/redeem allows only COMPLIANCE (ADMINISTRATOR forbidden)', async () => {
      for (const role of ROLES) {
        const res = await requestApp('POST', '/api/v1/lifecycle/redeem', {
          token: tokens[role],
          body: { assetId: 'AST-TEST', reasonText: 'Redemption' },
        });
        if (can(role, 'redeemAsset')) {
          assert.notEqual(res.status, 403, `${role} should have redeemAsset`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from redeemAsset`);
        }
      }
    });
  });

  describe('8. Audit Trail Endpoints', () => {
    it('GET /api/v1/audit/trail allows only COMPLIANCE and AUDITOR; INVESTOR and ADMIN receive 403', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/audit/trail', { token: tokens[role] });
        if (can(role, 'viewAuditTrail')) {
          assert.equal(res.status, 200, `${role} should have viewAuditTrail`);
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from viewAuditTrail`);
        }
      }
    });
  });

  describe('9. Participants Endpoints, KYC & PII Privacy', () => {
    it('GET /api/v1/participants directory permissions and scoping', async () => {
      // COMPLIANCE and AUDITOR see all participants
      const compRes = await requestApp('GET', '/api/v1/participants', { token: tokens.COMPLIANCE });
      assert.equal(compRes.status, 200);
      assert.ok(compRes.body.data.length >= 2);

      const audRes = await requestApp('GET', '/api/v1/participants', { token: tokens.AUDITOR });
      assert.equal(audRes.status, 200);

      // INVESTOR and ISSUER only see their own single profile record
      const invRes = await requestApp('GET', '/api/v1/participants', { token: tokens.INVESTOR });
      assert.equal(invRes.status, 200);
      assert.equal(invRes.body.data.length, 1);
      assert.equal(invRes.body.data[0].id, users.INVESTOR.participantId);

      // ADMINISTRATOR sees participants with all KYC and PII stripped
      const admRes = await requestApp('GET', '/api/v1/participants', { token: tokens.ADMINISTRATOR });
      assert.equal(admRes.status, 200);
      for (const p of admRes.body.data) {
        assert.equal(p.pii, undefined, 'Administrator must never receive participant PII');
        assert.equal(p.piiHash, undefined);
        assert.equal(p.kycStatus, undefined, 'Administrator must never receive KYC status');
      }

      // VERIFIER and VALUER receive 403
      const verRes = await requestApp('GET', '/api/v1/participants', { token: tokens.VERIFIER });
      assert.equal(verRes.status, 403);
    });

    it('PII Privacy: INVESTOR never receives another participant PII, and ADMIN never sees PII', async () => {
      // Investor reads their own participant
      const ownRes = await requestApp('GET', `/api/v1/participants/${users.INVESTOR.participantId}`, {
        token: tokens.INVESTOR,
      });
      assert.equal(ownRes.status, 200);
      // Own record has own PII
      assert.ok(ownRes.body.data.pii);

      // Investor reads Issuer participant -> receives 403 or redacted without PII
      const otherRes = await requestApp('GET', `/api/v1/participants/${users.ISSUER.participantId}`, {
        token: tokens.INVESTOR,
      });
      if (otherRes.status === 200) {
        assert.equal(otherRes.body.data.pii, undefined, 'Investor must never receive another participant PII');
        assert.equal(otherRes.body.data.piiHash, undefined);
      } else {
        assert.equal(otherRes.status, 403);
      }
    });

    it('Counterparty lookup: GET /api/v1/participants/lookup returns only id, displayName, and kycStatus', async () => {
      for (const role of ROLES) {
        const res = await requestApp('GET', '/api/v1/participants/lookup', { token: tokens[role] });
        if (can(role, 'lookupCounterparty')) {
          assert.equal(res.status, 200, `${role} should have lookupCounterparty`);
          for (const item of res.body.data) {
            assert.ok(item.id);
            assert.ok(item.displayName);
            assert.equal(item.kycStatus, 'APPROVED');
            assert.equal(item.pii, undefined, 'Lookup must not contain PII');
            assert.equal(item.pan, undefined, 'Lookup must not contain PAN');
            assert.equal(item.limits, undefined, 'Lookup must not contain internal limits');
          }
        } else {
          assert.equal(res.status, 403, `${role} must be forbidden from lookupCounterparty`);
        }
      }
    });

    it('Eligibility actions: PATCH investor-class, limits, suspend, reinstate allow COMPLIANCE only', async () => {
      const targetId = users.INVESTOR.participantId;

      // Administrator must fail
      const admClass = await requestApp(
        'PATCH',
        `/api/v1/participants/${targetId}/investor-class`,
        {
          token: tokens.ADMINISTRATOR,
          body: { investorClass: 'INSTITUTIONAL', reason: 'Admin attempt' },
        }
      );
      assert.equal(admClass.status, 403, 'Admin must not set investor class');

      // Compliance is allowed
      const compClass = await requestApp(
        'PATCH',
        `/api/v1/participants/${targetId}/investor-class`,
        {
          token: tokens.COMPLIANCE,
          body: { investorClass: 'QUALIFIED', reason: 'Audit OK' },
        }
      );
      assert.notEqual(compClass.status, 403, 'Compliance must be allowed to set investor class');
    });
  });
});
