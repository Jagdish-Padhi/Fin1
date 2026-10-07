import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { participantsService } from '../src/modules/participants/participants.service.js';
import { identityAdminService } from '../src/modules/identity-admin/identity-admin.service.js';
import { Role, KycStatus, ParticipantStatus, InvestorClass } from '@rwa/contracts';

// Simple request helper against express app without external agent dependencies
async function requestApp(method, path, { headers = {}, body } = {}) {
  const url = `http://localhost${path}`;
  // Use http server listening on ephemeral port for tests
  return new Promise((resolve, reject) => {
    import('http').then(({ createServer }) => {
      const server = createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        const targetUrl = `http://127.0.0.1:${port}${path}`;

        fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
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

describe('Phase 1: Participants, Identity & Access (API Integration)', () => {
  let adminToken;
  let issuerToken;
  let complianceToken;
  let investorToken;
  let auditorToken;

  it('Requirement: All 6 consortium role logins work end-to-end', async () => {
    const rolesToTest = [
      { email: 'admin@ekamvistar.com', expectedRole: Role.ADMINISTRATOR },
      { email: 'issuer@originator.com', expectedRole: Role.ISSUER },
      { email: 'verifier@auditfirm.com', expectedRole: Role.VERIFIER },
      { email: 'valuer@valuationpartners.com', expectedRole: Role.VALUER },
      { email: 'compliance@regulatory.gov.in', expectedRole: Role.COMPLIANCE },
      { email: 'investor@capitalfund.com', expectedRole: Role.INVESTOR },
      { email: 'auditor@kpmg-audit.com', expectedRole: Role.AUDITOR },
    ];

    for (const item of rolesToTest) {
      const res = await requestApp('POST', '/api/v1/auth/login', {
        body: { email: item.email, password: 'Password@123' },
      });
      assert.equal(res.status, 200, `Login should succeed for ${item.email}`);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.role, item.expectedRole);
      assert.ok(res.body.data.token, 'Should return JWT token');

      if (item.expectedRole === Role.ADMINISTRATOR) adminToken = res.body.data.token;
      if (item.expectedRole === Role.ISSUER) issuerToken = res.body.data.token;
      if (item.expectedRole === Role.COMPLIANCE) complianceToken = res.body.data.token;
      if (item.expectedRole === Role.INVESTOR) investorToken = res.body.data.token;
      if (item.expectedRole === Role.AUDITOR) auditorToken = res.body.data.token;
    }
  });

  let createdParticipantId;

  it('Issuer onboards a participant with salted PII hash on-chain and off-chain storage', async () => {
    const res = await requestApp('POST', '/api/v1/participants', {
      headers: { Authorization: `Bearer ${issuerToken}` },
      body: {
        kind: 'INDIVIDUAL',
        orgId: 'ORG-ISSUER',
        jurisdiction: 'IN',
        investorClass: 'RETAIL',
        pii: {
          legalName: 'Devendra Sharma',
          identifierType: 'PAN',
          identifierValue: 'DSVR98765A',
          contactEmail: 'devendra@farmeragro.in',
        },
        limits: {
          maxHoldingBps: 2500,
          maxTransferPaise: 150000000,
        },
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.status, ParticipantStatus.ACTIVE);
    assert.equal(res.body.data.kycStatus, KycStatus.SUBMITTED);
    createdParticipantId = res.body.data.id;
  });

  it('Enforces Segregation of Duties: Admin is rejected from approving KYC (403 Forbidden)', async () => {
    const res = await requestApp('PATCH', `/api/v1/participants/${createdParticipantId}/kyc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        kycStatus: 'APPROVED',
        reason: 'Admin approval attempt',
      },
    });

    assert.equal(res.status, 403, 'Administrator cannot approve KYC (Segregation of Duties)');
    assert.equal(res.body.success, false);
  });

  it('Compliance role approves participant KYC successfully', async () => {
    const res = await requestApp('PATCH', `/api/v1/participants/${createdParticipantId}/kyc`, {
      headers: { Authorization: `Bearer ${complianceToken}` },
      body: {
        kycStatus: 'APPROVED',
        reason: 'UIDAI Aadhaar and Income Tax PAN verification completed without discrepancy',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.kycStatus, KycStatus.APPROVED);
  });

  it('Field-level redaction: Investor role cannot view another participant PII details', async () => {
    const res = await requestApp('GET', `/api/v1/participants/${createdParticipantId}`, {
      headers: { Authorization: `Bearer ${investorToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // PII must be redacted for unrelated investor
    assert.equal(res.body.data.pii, undefined);
    assert.equal(res.body.data.piiHash, undefined);
    assert.equal(res.body.data.kycReason, undefined);
  });

  it('Field-level redaction: Auditor can view full unredacted audit profile read-only', async () => {
    const res = await requestApp('GET', `/api/v1/participants/${createdParticipantId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.pii, 'Auditor must have access to full PII');
    assert.equal(res.body.data.pii.legalName, 'Devendra Sharma');
  });

  it('Admin manages user provisioning with Fabric CA identity binding', async () => {
    const res = await requestApp('POST', '/api/v1/identity-admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Tarun Saxena',
        email: 'tarun@originator.com',
        orgId: 'ORG-ISSUER',
        role: 'ISSUER',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.fabricIdentity);
    assert.equal(res.body.data.fabricIdentity.status, 'ENROLLED');
    assert.equal(res.body.data.fabricIdentity.role, 'ISSUER');
  });

  it('Edge case: User provisioning fails if role does not belong to organization (Role Mismatch)', async () => {
    const res = await requestApp('POST', '/api/v1/identity-admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Invalid Org Role',
        email: 'invalid@originator.com',
        orgId: 'ORG-ISSUER',
        role: 'COMPLIANCE', // Issuer org cannot host Compliance role!
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /Role mismatch/);
  });

  it('Edge case: Deactivated user login is blocked while holdings remain', async () => {
    // 1. Deactivate test user
    const deactivateRes = await requestApp('PATCH', '/api/v1/identity-admin/users/USR-INVESTOR/status', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'INACTIVE',
        reason: 'Temporary regulatory inquiry',
      },
    });
    assert.equal(deactivateRes.status, 200);

    // 2. Attempt login as deactivated user -> MUST FAIL (403 Forbidden)
    const loginRes = await requestApp('POST', '/api/v1/auth/login', {
      body: { email: 'investor@capitalfund.com', password: 'Password@123' },
    });
    assert.equal(loginRes.status, 403);
    assert.match(loginRes.body.error.message, /deactivated/);

    // 3. Reactivate user
    await requestApp('PATCH', '/api/v1/identity-admin/users/USR-INVESTOR/status', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'ACTIVE', reason: 'Reactivated' },
    });
  });

  it('Suspension propagates to transfer rules: suspended participant fails transfer validation', async () => {
    // 1. Suspend participant
    const suspendRes = await requestApp('POST', `/api/v1/participants/${createdParticipantId}/suspend`, {
      headers: { Authorization: `Bearer ${complianceToken}` },
      body: { reason: 'Pending audit clarification' },
    });
    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.data.status, ParticipantStatus.SUSPENDED);

    // 2. Evaluate mock transfer where this participant is receiver or sender
    const evalRes = await requestApp('POST', '/api/v1/transfers/evaluate', {
      headers: { Authorization: `Bearer ${issuerToken}` },
      body: {
        fromParticipantId: 'PRT-ISSUER-01',
        toParticipantId: createdParticipantId,
        units: 10,
        tokenId: 'TKN-MOCK-01',
      },
    });

    // The transfer evaluation must fail because receiver is suspended
    assert.equal(evalRes.status, 200);
    assert.equal(evalRes.body.data.passed, false);
    assert.ok(
      evalRes.body.data.rejectionReasons.some((r) => r.code === 'RULE_PARTICIPANT_INACTIVE'),
      'Must contain RULE_PARTICIPANT_INACTIVE rejection code'
    );
  });
});
