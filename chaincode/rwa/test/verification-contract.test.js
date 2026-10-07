import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VerificationContract } from '../dist/contracts/VerificationContract.js';
import { AssetStatus, Role, VerificationDecision } from '@rwa/contracts';

function createMockCtx(
  stateMap,
  {
    role = Role.VERIFIER,
    userId = 'USR-VERIFIER',
    participantId = 'PRT-VERIFIER',
  } = {}
) {
  const events = [];
  return {
    clientIdentity: {
      getMSPID: () => 'VerifierMSP',
      getAttributeValue: (attribute) =>
        ({
          role,
          userId,
          participantId,
        })[attribute] || null,
    },
    stub: {
      getTxID: () => `tx-${userId}`,
      getTxTimestamp: () => ({ seconds: { low: 1_800_000_000 } }),
      getState: async (key) => stateMap.get(key) || Buffer.alloc(0),
      putState: async (key, value) => stateMap.set(key, value),
      getStateByRange: async (start, end) => {
        const entries = [...stateMap.entries()]
          .filter(([key]) => key >= start && key <= end)
          .sort(([a], [b]) => a.localeCompare(b));
        let index = 0;
        return {
          next: async () =>
            index < entries.length
              ? {
                  value: { key: entries[index][0], value: entries[index++][1] },
                  done: false,
                }
              : { done: true },
          close: async () => {},
        };
      },
      setEvent: (name, payload) => events.push({ name, payload }),
    },
    events,
  };
}

function seedVerificationState() {
  const state = new Map();
  state.set(
    'VER:VER-01',
    Buffer.from(
      JSON.stringify({
        id: 'VER-01',
        assetId: 'AST-VERIFICATION-01',
        status: 'PENDING_REVIEW',
        checks: {},
        slaDueAt: '2027-01-01T00:00:00.000Z',
        createdAt: '2026-10-07T00:00:00.000Z',
        updatedAt: '2026-10-07T00:00:00.000Z',
      })
    )
  );
  state.set(
    'AST:AST-VERIFICATION-01',
    Buffer.from(
      JSON.stringify({
        id: 'AST-VERIFICATION-01',
        originatorParticipantId: 'PRT-ISSUER',
        status: AssetStatus.UNDER_VERIFICATION,
      })
    )
  );
  return state;
}

describe('Phase 3: VerificationContract', () => {
  const contract = new VerificationContract();

  it('records valid checks with status transition, audit, and event, then approves the asset', async () => {
    const state = seedVerificationState();
    const ctx = createMockCtx(state);
    const check = JSON.parse(
      await contract.recordCheck(
        ctx,
        'VER-01',
        ' TITLE_CHAIN ',
        'PASS',
        'Clear',
        'DOC-1'
      )
    );

    assert.equal(check.status, 'IN_PROGRESS');
    assert.equal(check.checks.TITLE_CHAIN.result, 'PASS');
    assert.equal(state.has('AUD:VER-01:tx-USR-VERIFIER'), true);
    const audit = JSON.parse(
      state.get('AUD:VER-01:tx-USR-VERIFIER').toString()
    );
    assert.equal(audit.fromState, 'PENDING_REVIEW');
    assert.equal(audit.toState, 'IN_PROGRESS');
    assert.equal(audit.reasonCode, 'CHECK_RECORDED');
    const checkEvent = JSON.parse(ctx.events[0].payload.toString()).events[0];
    assert.equal(checkEvent.name, 'VerificationCheckRecorded');
    assert.equal(checkEvent.payload.checkKey, 'TITLE_CHAIN');

    const decision = JSON.parse(
      await contract.decideVerification(
        ctx,
        'VER-01',
        VerificationDecision.APPROVED,
        'CHECKS_PASSED',
        'All checks passed'
      )
    );
    assert.equal(decision.asset.status, AssetStatus.VERIFIED);
    assert.equal(
      decision.verificationCase.status,
      VerificationDecision.APPROVED
    );
    assert.equal(decision.verificationCase.decidedBy, 'USR-VERIFIER');
  });

  it('rejects invalid check/decision inputs and changes after a terminal decision', async () => {
    const state = seedVerificationState();
    const ctx = createMockCtx(state);

    await assert.rejects(
      contract.recordCheck(ctx, 'VER-01', 'TITLE_CHAIN', 'INVALID'),
      /Invalid verification check result/
    );
    await assert.rejects(
      contract.recordCheck(ctx, 'VER-01', '  ', 'PASS'),
      /checkKey is required/
    );
    await assert.rejects(
      contract.decideVerification(ctx, 'VER-01', 'INVALID', 'TEST'),
      /Invalid verification decision/
    );
    await assert.rejects(
      contract.decideVerification(
        ctx,
        'VER-01',
        VerificationDecision.APPROVED,
        ''
      ),
      /reasonCode is required/
    );

    await contract.decideVerification(
      ctx,
      'VER-01',
      VerificationDecision.REJECTED,
      'CHECK_FAILED'
    );
    await assert.rejects(
      contract.recordCheck(ctx, 'VER-01', 'LATE_CHECK', 'PASS'),
      /already decided/
    );
    await assert.rejects(
      contract.decideVerification(
        ctx,
        'VER-01',
        VerificationDecision.APPROVED,
        'CHECKS_PASSED'
      ),
      /already decided/
    );
  });
});
