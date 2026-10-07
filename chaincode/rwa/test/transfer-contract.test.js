import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransferContract } from '../dist/contracts/TransferContract.js';
import {
  AssetStatus,
  Role,
  TokenStandard,
  TransferStatus,
  TransferRuleReason,
  EventName,
} from '@rwa/contracts';

function createMockCtx(
  {
    mspId = 'InvestorMSP',
    role = Role.INVESTOR,
    userId = 'USR-INVESTOR-01',
    participantId = 'PRT-INVESTOR-01',
  } = {},
  stateMap = new Map(),
  txId = `tx-${userId}`
) {
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
      getTxID: () => txId,
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
    stateMap,
  };
}

function seedEnvironment(stateMap) {
  // Participants
  stateMap.set(
    'PRT:PRT-SELLER',
    Buffer.from(
      JSON.stringify({
        id: 'PRT-SELLER',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        limits: { maxHoldingBps: 5000, maxTransferPaise: 100000000 },
      })
    )
  );

  stateMap.set(
    'PRT:PRT-BUYER',
    Buffer.from(
      JSON.stringify({
        id: 'PRT-BUYER',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        limits: { maxHoldingBps: 2500, maxTransferPaise: 100000000 }, // 25% max
      })
    )
  );

  stateMap.set(
    'PRT:PRT-SUSPENDED',
    Buffer.from(
      JSON.stringify({
        id: 'PRT-SUSPENDED',
        status: 'SUSPENDED',
        kycStatus: 'APPROVED',
      })
    )
  );

  stateMap.set(
    'PRT:PRT-NOKYC',
    Buffer.from(
      JSON.stringify({
        id: 'PRT-NOKYC',
        status: 'ACTIVE',
        kycStatus: 'SUBMITTED',
      })
    )
  );

  // Fractional Token
  stateMap.set(
    'TKN:TKN-LAND-01',
    Buffer.from(
      JSON.stringify({
        id: 'TKN-LAND-01',
        assetId: 'AST-LAND-01',
        standard: TokenStandard.FRACTIONAL,
        totalUnits: 10000,
        unitLabel: 'SQM',
        status: 'ACTIVE',
      })
    )
  );

  // Whole Token
  stateMap.set(
    'TKN:TKN-TRACTOR-01',
    Buffer.from(
      JSON.stringify({
        id: 'TKN-TRACTOR-01',
        assetId: 'AST-TRACTOR-01',
        standard: TokenStandard.WHOLE,
        totalUnits: 1,
        unitLabel: 'UNIT',
        status: 'ACTIVE',
      })
    )
  );

  // Frozen Token
  stateMap.set(
    'TKN:TKN-FROZEN-01',
    Buffer.from(
      JSON.stringify({
        id: 'TKN-FROZEN-01',
        assetId: 'AST-FROZEN-01',
        standard: TokenStandard.FRACTIONAL,
        totalUnits: 10000,
        unitLabel: 'SQM',
        status: 'FROZEN',
      })
    )
  );

  // Assets
  stateMap.set(
    'AST:AST-LAND-01',
    Buffer.from(
      JSON.stringify({
        id: 'AST-LAND-01',
        typeKey: 'LAND',
        typeVersion: 1,
        status: AssetStatus.TOKENIZED,
      })
    )
  );

  stateMap.set(
    'AST:AST-TRACTOR-01',
    Buffer.from(
      JSON.stringify({
        id: 'AST-TRACTOR-01',
        typeKey: 'VEHICLE',
        typeVersion: 1,
        status: AssetStatus.TOKENIZED,
      })
    )
  );

  stateMap.set(
    'AST:AST-FROZEN-01',
    Buffer.from(
      JSON.stringify({
        id: 'AST-FROZEN-01',
        typeKey: 'LAND',
        typeVersion: 1,
        status: AssetStatus.FROZEN,
      })
    )
  );

  // Balances
  stateMap.set(
    'BAL:TKN-LAND-01:PRT-SELLER',
    Buffer.from(
      JSON.stringify({
        tokenId: 'TKN-LAND-01',
        participantId: 'PRT-SELLER',
        units: 5000,
      })
    )
  );

  stateMap.set(
    'BAL:TKN-LAND-01:PRT-BUYER',
    Buffer.from(
      JSON.stringify({
        tokenId: 'TKN-LAND-01',
        participantId: 'PRT-BUYER',
        units: 500, // 5% currently
      })
    )
  );

  stateMap.set(
    'BAL:TKN-TRACTOR-01:PRT-SELLER',
    Buffer.from(
      JSON.stringify({
        tokenId: 'TKN-TRACTOR-01',
        participantId: 'PRT-SELLER',
        units: 1,
      })
    )
  );
}

describe('Phase 6: TransferContract', () => {
  const contract = new TransferContract();
  let state;

  beforeEach(() => {
    state = new Map();
    seedEnvironment(state);
  });

  it('proposes a valid transfer and records PROPOSED status and event', async () => {
    const ctx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-prop-01'
    );
    const input = JSON.stringify({
      tokenId: 'TKN-LAND-01',
      toParticipantId: 'PRT-BUYER',
      units: 1000,
      pricePaise: 5000000,
      paymentRef: 'NEFT-12345',
    });

    const transfer = JSON.parse(await contract.proposeTransfer(ctx, input));

    assert.equal(transfer.id, 'TRF-tx-prop-01');
    assert.equal(transfer.fromParticipantId, 'PRT-SELLER');
    assert.equal(transfer.toParticipantId, 'PRT-BUYER');
    assert.equal(transfer.units, 1000);
    assert.equal(transfer.status, TransferStatus.PROPOSED);
    assert.ok(state.has('TRF:TRF-tx-prop-01'));
    assert.ok(state.has('AUD:TRF-tx-prop-01:tx-prop-01'));
    assert.equal(ctx.events[0].name, 'TxEvents');
  });

  it('dry-runs evaluation via evaluateTransfer showing rule results', async () => {
    const ctx = createMockCtx({}, state);
    const evalInput = JSON.stringify({
      tokenId: 'TKN-LAND-01',
      fromParticipantId: 'PRT-SELLER',
      toParticipantId: 'PRT-BUYER',
      units: 1000,
    });

    const res = JSON.parse(await contract.evaluateTransfer(ctx, evalInput));

    assert.equal(res.passed, true);
    assert.equal(res.results.PARTICIPANT_ACTIVE.passed, true);
    assert.equal(res.results.KYC_VERIFIED.passed, true);
    assert.equal(res.results.SELLER_BALANCE.passed, true);
    assert.equal(res.results.MAX_HOLDING_CAP.passed, true);
    assert.equal(res.rejectionReasons.length, 0);
  });

  it('executes a valid fractional transfer atomically, debits/credits balances, and records audit', async () => {
    const propCtx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-prop-02'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-LAND-01',
          toParticipantId: 'PRT-BUYER',
          units: 1000,
        })
      )
    );

    const execCtx = createMockCtx(
      { role: Role.INVESTOR, userId: 'USR-BUYER' },
      state,
      'tx-exec-02'
    );
    const executed = JSON.parse(
      await contract.executeTransfer(
        execCtx,
        JSON.stringify({ transferId: transfer.id })
      )
    );

    assert.equal(executed.status, TransferStatus.EXECUTED);
    assert.equal(executed.rejectionReasons.length, 0);

    const sellerBal = JSON.parse(
      state.get('BAL:TKN-LAND-01:PRT-SELLER').toString()
    );
    const buyerBal = JSON.parse(
      state.get('BAL:TKN-LAND-01:PRT-BUYER').toString()
    );

    assert.equal(sellerBal.units, 4000); // 5000 - 1000
    assert.equal(buyerBal.units, 1500); // 500 + 1000
    assert.ok(state.has(`AUD:${transfer.id}:tx-exec-02`));
  });

  it('executes a whole token transfer successfully for full balance of 1 unit', async () => {
    const propCtx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-whole-prop'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-TRACTOR-01',
          toParticipantId: 'PRT-BUYER',
          units: 1,
        })
      )
    );

    const execCtx = createMockCtx(
      { role: Role.COMPLIANCE },
      state,
      'tx-whole-exec'
    );
    const executed = JSON.parse(
      await contract.executeTransfer(
        execCtx,
        JSON.stringify({ transferId: transfer.id })
      )
    );

    assert.equal(executed.status, TransferStatus.EXECUTED);
    const sellerBal = JSON.parse(
      state.get('BAL:TKN-TRACTOR-01:PRT-SELLER').toString()
    );
    const buyerBal = JSON.parse(
      state.get('BAL:TKN-TRACTOR-01:PRT-BUYER').toString()
    );

    assert.equal(sellerBal.units, 0);
    assert.equal(buyerBal.units, 1);
  });

  it('RULE 3.4-1: Persists REJECTED transfer on-chain with reasons without failing the tx (Max holding cap exceeded)', async () => {
    // PRT-BUYER has 500 units already. Max cap is 25% = 2500 units of 10,000 supply.
    // Transferring 2100 units would result in 2600 units > 2500 limit.
    const propCtx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-rej-cap-prop'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-LAND-01',
          toParticipantId: 'PRT-BUYER',
          units: 2100,
        })
      )
    );

    const execCtx = createMockCtx(
      { role: Role.COMPLIANCE },
      state,
      'tx-rej-cap-exec'
    );
    const rejected = JSON.parse(
      await contract.executeTransfer(
        execCtx,
        JSON.stringify({ transferId: transfer.id })
      )
    );

    assert.equal(rejected.status, TransferStatus.REJECTED);
    assert.ok(rejected.rejectionReasons.length >= 1);
    assert.equal(
      rejected.rejectionReasons[0].code,
      TransferRuleReason.MAX_HOLDING_CAP_EXCEEDED.code
    );

    // Balances MUST NOT change
    const sellerBal = JSON.parse(
      state.get('BAL:TKN-LAND-01:PRT-SELLER').toString()
    );
    const buyerBal = JSON.parse(
      state.get('BAL:TKN-LAND-01:PRT-BUYER').toString()
    );
    assert.equal(sellerBal.units, 5000);
    assert.equal(buyerBal.units, 500);

    // Audit and event must record rejection
    assert.ok(state.has(`AUD:${transfer.id}:tx-rej-cap-exec`));
    const persisted = JSON.parse(state.get(`TRF:${transfer.id}`).toString());
    assert.equal(persisted.status, TransferStatus.REJECTED);
  });

  it('RULE 3.4-1: Persists REJECTED transfer on whole token split attempt', async () => {
    const propCtx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-split-prop'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-TRACTOR-01',
          toParticipantId: 'PRT-BUYER',
          units: 2, // Cannot transfer 2 units on a WHOLE token of 1 unit
        })
      )
    );

    const execCtx = createMockCtx(
      { role: Role.ADMINISTRATOR },
      state,
      'tx-split-exec'
    );
    const rejected = JSON.parse(
      await contract.executeTransfer(
        execCtx,
        JSON.stringify({ transferId: transfer.id })
      )
    );

    assert.equal(rejected.status, TransferStatus.REJECTED);
    const codes = rejected.rejectionReasons.map((r) => r.code);
    assert.ok(
      codes.includes(TransferRuleReason.WHOLE_TOKEN_SPLIT_FORBIDDEN.code) ||
        codes.includes(TransferRuleReason.INSUFFICIENT_UNITS.code)
    );
  });

  it('RULE 3.4-1: Collects ALL failing reasons together (Suspended party + Unapproved KYC + Frozen asset + Self transfer)', async () => {
    const propCtx = createMockCtx(
      { participantId: 'PRT-SUSPENDED', role: Role.INVESTOR },
      state,
      'tx-multi-prop'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-FROZEN-01',
          fromParticipantId: 'PRT-SUSPENDED',
          toParticipantId: 'PRT-SUSPENDED', // self transfer + suspended
          units: 500,
        })
      )
    );

    const execCtx = createMockCtx(
      { role: Role.COMPLIANCE },
      state,
      'tx-multi-exec'
    );
    const rejected = JSON.parse(
      await contract.executeTransfer(
        execCtx,
        JSON.stringify({ transferId: transfer.id })
      )
    );

    assert.equal(rejected.status, TransferStatus.REJECTED);
    const codes = rejected.rejectionReasons.map((r) => r.code);
    assert.ok(codes.includes(TransferRuleReason.PARTICIPANT_INACTIVE.code));
    assert.ok(codes.includes(TransferRuleReason.SELF_TRANSFER_PROHIBITED.code));
    assert.ok(codes.includes(TransferRuleReason.ASSET_FROZEN.code));
    assert.ok(codes.includes(TransferRuleReason.INSUFFICIENT_UNITS.code));
  });

  it('queries transfer, lists transfers, and gets token transfer history', async () => {
    const propCtx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-hist-prop'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-LAND-01',
          toParticipantId: 'PRT-BUYER',
          units: 100,
        })
      )
    );

    const ctx = createMockCtx({}, state);
    const fetched = JSON.parse(
      await contract.getTransfer(ctx, JSON.stringify({ id: transfer.id }))
    );
    assert.equal(fetched.id, transfer.id);

    const list = JSON.parse(await contract.listTransfers(ctx));
    assert.ok(list.length >= 1);

    const history = JSON.parse(
      await contract.getTransferHistory(
        ctx,
        JSON.stringify({ tokenId: 'TKN-LAND-01' })
      )
    );
    assert.ok(history.some((t) => t.id === transfer.id));
  });

  it('cancels a proposed transfer with audit logging', async () => {
    const propCtx = createMockCtx(
      { participantId: 'PRT-SELLER', role: Role.INVESTOR },
      state,
      'tx-cancel-prop'
    );
    const transfer = JSON.parse(
      await contract.proposeTransfer(
        propCtx,
        JSON.stringify({
          tokenId: 'TKN-LAND-01',
          toParticipantId: 'PRT-BUYER',
          units: 100,
        })
      )
    );

    const cancelCtx = createMockCtx(
      { role: Role.INVESTOR },
      state,
      'tx-cancel-exec'
    );
    const cancelled = JSON.parse(
      await contract.cancelTransfer(
        cancelCtx,
        JSON.stringify({
          transferId: transfer.id,
          reason: 'Price renegotiated',
        })
      )
    );

    assert.equal(cancelled.status, TransferStatus.CANCELLED);
    assert.ok(state.has(`AUD:${transfer.id}:tx-cancel-exec`));
  });
});
