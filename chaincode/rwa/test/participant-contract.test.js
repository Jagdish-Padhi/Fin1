import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ParticipantContract } from '../dist/contracts/ParticipantContract.js';
import { Role, KycStatus, ParticipantStatus, InvestorClass } from '@rwa/contracts';

function createMockCtx({ mspId = 'IssuerMSP', role = Role.ISSUER, userId = 'USR-ISSUER', participantId = 'PRT-01' } = {}, stateMap = new Map()) {
  const events = [];
  return {
    clientIdentity: {
      getMSPID: () => mspId,
      getAttributeValue: (attr) => {
        if (attr === 'role') return role;
        if (attr === 'userId') return userId;
        if (attr === 'participantId') return participantId;
        return null;
      },
    },
    stub: {
      getTxID: () => '0x' + Math.random().toString(16).slice(2).padStart(64, '0'),
      getTxTimestamp: () => ({ seconds: { low: Math.floor(Date.now() / 1000) } }),
      getState: async (key) => stateMap.get(key) || Buffer.alloc(0),
      putState: async (key, val) => stateMap.set(key, val),
      getStateByRange: async (start, end) => {
        const entries = [];
        for (const [k, v] of stateMap.entries()) {
          if (k >= start && k <= end) {
            entries.push({ key: k, value: v });
          }
        }
        let idx = 0;
        return {
          next: async () => {
            if (idx < entries.length) {
              return { value: entries[idx++], done: false };
            }
            return { done: true };
          },
          close: async () => {},
        };
      },
      setEvent: (name, payload) => events.push({ name, payload }),
    },
    events,
    stateMap,
  };
}

describe('Phase 1: ParticipantContract (Chaincode Engine)', () => {
  const contract = new ParticipantContract();

  it('allows ISSUER and ADMINISTRATOR to register a participant', async () => {
    const state = new Map();
    const ctx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP' }, state);

    const payload = JSON.stringify({
      id: 'PRT-TEST-01',
      orgId: 'ORG-ISSUER',
      kind: 'ENTITY',
      jurisdiction: 'IN',
      investorClass: InvestorClass.QUALIFIED,
      limits: { maxHoldingBps: 2000, maxTransferPaise: 50000000 },
      piiHash: 'abc123saltedhash',
    });

    const resStr = await contract.registerParticipant(ctx, payload);
    const res = JSON.parse(resStr);

    assert.equal(res.id, 'PRT-TEST-01');
    assert.equal(res.status, ParticipantStatus.ACTIVE);
    assert.equal(res.kycStatus, KycStatus.SUBMITTED);
    assert.equal(res.limits.maxHoldingBps, 2000);
    assert.equal(state.has('PRT:PRT-TEST-01'), true);
  });

  it('rejects duplicate participant registration on the same ID', async () => {
    const state = new Map();
    const ctx = createMockCtx({ role: Role.ISSUER }, state);

    const payload = JSON.stringify({ id: 'PRT-DUP-01', kind: 'INDIVIDUAL' });
    await contract.registerParticipant(ctx, payload);

    await assert.rejects(
      async () => contract.registerParticipant(ctx, payload),
      /already exists/
    );
  });

  it('enforces Segregation of Duties: Only COMPLIANCE can approve KYC, ADMINISTRATOR is rejected', async () => {
    const state = new Map();
    // 1. Register participant
    const issuerCtx = createMockCtx({ role: Role.ISSUER }, state);
    await contract.registerParticipant(issuerCtx, JSON.stringify({ id: 'PRT-KYC-01' }));

    // 2. Administrator attempts to approve KYC -> MUST FAIL (SoD violation)
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'EkamVistarMSP' }, state);
    await assert.rejects(
      async () => contract.updateKycStatus(adminCtx, 'PRT-KYC-01', KycStatus.APPROVED, 'Admin attempt'),
      /Unauthorized: Role 'ADMINISTRATOR' not permitted/
    );

    // 3. Compliance approves KYC -> MUST SUCCEED
    const complianceCtx = createMockCtx({ role: Role.COMPLIANCE, mspId: 'ComplianceMSP' }, state);
    const updatedStr = await contract.updateKycStatus(
      complianceCtx,
      'PRT-KYC-01',
      KycStatus.APPROVED,
      'Valid PAN and Aadhaar verified'
    );
    const updated = JSON.parse(updatedStr);
    assert.equal(updated.kycStatus, KycStatus.APPROVED);
    assert.equal(updated.kycReason, 'Valid PAN and Aadhaar verified');
  });

  it('generates negative permission matrix: Unauthorized roles fail updateKycStatus', async () => {
    const state = new Map();
    const issuerCtx = createMockCtx({ role: Role.ISSUER }, state);
    await contract.registerParticipant(issuerCtx, JSON.stringify({ id: 'PRT-MATRIX-01' }));

    const unauthorizedRoles = [
      Role.ADMINISTRATOR,
      Role.ISSUER,
      Role.VERIFIER,
      Role.VALUER,
      Role.INVESTOR,
      Role.AUDITOR,
    ];

    for (const role of unauthorizedRoles) {
      const ctx = createMockCtx({ role }, state);
      await assert.rejects(
        async () => contract.updateKycStatus(ctx, 'PRT-MATRIX-01', KycStatus.APPROVED, 'Unauthorized test'),
        /Unauthorized/
      );
    }
  });

  it('updates investor classification and participant limits', async () => {
    const state = new Map();
    const issuerCtx = createMockCtx({ role: Role.ISSUER }, state);
    await contract.registerParticipant(issuerCtx, JSON.stringify({ id: 'PRT-TIER-01' }));

    const complianceCtx = createMockCtx({ role: Role.COMPLIANCE }, state);

    // Set investor class to INSTITUTIONAL
    const resClass = JSON.parse(
      await contract.setInvestorClass(complianceCtx, 'PRT-TIER-01', InvestorClass.INSTITUTIONAL, 'Net worth verified')
    );
    assert.equal(resClass.investorClass, InvestorClass.INSTITUTIONAL);

    // Set limits
    const resLimits = JSON.parse(
      await contract.setLimits(
        complianceCtx,
        'PRT-TIER-01',
        JSON.stringify({ maxHoldingBps: 5000, maxTransferPaise: 200000000 }),
        'Tier upgrade'
      )
    );
    assert.equal(resLimits.limits.maxHoldingBps, 5000);
    assert.equal(resLimits.limits.maxTransferPaise, 200000000);
  });

  it('manages suspension lifecycle: suspendParticipant and reinstateParticipant', async () => {
    const state = new Map();
    const issuerCtx = createMockCtx({ role: Role.ISSUER }, state);
    await contract.registerParticipant(issuerCtx, JSON.stringify({ id: 'PRT-SUSPEND-01' }));

    const complianceCtx = createMockCtx({ role: Role.COMPLIANCE }, state);

    // Suspend
    const suspended = JSON.parse(
      await contract.suspendParticipant(complianceCtx, 'PRT-SUSPEND-01', 'Suspicious activity inquiry')
    );
    assert.equal(suspended.status, ParticipantStatus.SUSPENDED);
    assert.equal(suspended.suspendReason, 'Suspicious activity inquiry');

    // Reinstate
    const reinstated = JSON.parse(
      await contract.reinstateParticipant(complianceCtx, 'PRT-SUSPEND-01', 'Inquiry cleared')
    );
    assert.equal(reinstated.status, ParticipantStatus.ACTIVE);
    assert.equal(reinstated.suspendReason, undefined);
  });

  it('manages compliance blacklist: addToBlacklist and removeFromBlacklist', async () => {
    const state = new Map();
    const issuerCtx = createMockCtx({ role: Role.ISSUER }, state);
    await contract.registerParticipant(issuerCtx, JSON.stringify({ id: 'PRT-BL-01' }));

    const complianceCtx = createMockCtx({ role: Role.COMPLIANCE }, state);

    // Blacklist
    const blacklisted = JSON.parse(
      await contract.addToBlacklist(complianceCtx, 'PRT-BL-01', 'Sanctions enforcement')
    );
    assert.equal(blacklisted.status, ParticipantStatus.BLACKLISTED);

    // Only Compliance can blacklist/unblacklist (Admin fails)
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR }, state);
    await assert.rejects(
      async () => contract.removeFromBlacklist(adminCtx, 'PRT-BL-01', 'Admin try'),
      /Unauthorized/
    );

    // Remove blacklist
    const cleared = JSON.parse(
      await contract.removeFromBlacklist(complianceCtx, 'PRT-BL-01', 'Sanctions lift')
    );
    assert.equal(cleared.status, ParticipantStatus.ACTIVE);
  });

  it('correctly reports participantExistsAndActive for downstream contracts', async () => {
    const state = new Map();
    const issuerCtx = createMockCtx({ role: Role.ISSUER }, state);
    await contract.registerParticipant(issuerCtx, JSON.stringify({ id: 'PRT-CHECK-01' }));

    // Initial state: Exists=true, Active=true, KycApproved=false (SUBMITTED)
    let check = JSON.parse(await contract.participantExistsAndActive(issuerCtx, 'PRT-CHECK-01'));
    assert.equal(check.exists, true);
    assert.equal(check.active, true);
    assert.equal(check.kycApproved, false);

    // After KYC approved
    const compCtx = createMockCtx({ role: Role.COMPLIANCE }, state);
    await contract.updateKycStatus(compCtx, 'PRT-CHECK-01', KycStatus.APPROVED, 'Approved');
    check = JSON.parse(await contract.participantExistsAndActive(issuerCtx, 'PRT-CHECK-01'));
    assert.equal(check.kycApproved, true);

    // When suspended
    await contract.suspendParticipant(compCtx, 'PRT-CHECK-01', 'Freeze');
    check = JSON.parse(await contract.participantExistsAndActive(issuerCtx, 'PRT-CHECK-01'));
    assert.equal(check.active, false);

    // Non-existent participant
    const none = JSON.parse(await contract.participantExistsAndActive(issuerCtx, 'PRT-DOES-NOT-EXIST'));
    assert.equal(none.exists, false);
  });
});
