import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TokenContract } from '../dist/contracts/TokenContract.js';
import { AssetStatus, Role, RightsType, TokenStandard } from '@rwa/contracts';

function createMockCtx(
  {
    mspId = 'ComplianceMSP',
    role = Role.COMPLIANCE,
    userId = 'USR-COMPLIANCE',
    participantId = 'PRT-COMPLIANCE',
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

function seedAsset(stateMap, overrides = {}) {
  stateMap.set(
    'AST:AST-TOKEN-01',
    Buffer.from(
      JSON.stringify({
        id: 'AST-TOKEN-01',
        originatorParticipantId: 'PRT-ISSUER-01',
        status: AssetStatus.VALUED,
        ...overrides,
      })
    )
  );
}

function mintInput(overrides = {}) {
  return JSON.stringify({
    assetId: 'AST-TOKEN-01',
    standard: TokenStandard.FRACTIONAL,
    totalUnits: 10000,
    unitLabel: 'UNITS',
    rightsType: RightsType.UNDIVIDED_FRACTION,
    representation: 'Undivided economic interest in the asset',
    ...overrides,
  });
}

describe('Phase 5: TokenContract', () => {
  const contract = new TokenContract();
  let state;

  beforeEach(() => {
    state = new Map();
    seedAsset(state);
  });

  it('mints to the asset originator, tokenizes the asset, and records audit/event data', async () => {
    const ctx = createMockCtx({}, state, 'tx-mint-01');
    const token = JSON.parse(await contract.mintToken(ctx, mintInput()));
    const asset = JSON.parse(state.get('AST:AST-TOKEN-01').toString());
    const balance = JSON.parse(
      state.get(`BAL:${token.id}:PRT-ISSUER-01`).toString()
    );

    assert.equal(token.id, 'TKN-tx-mint-01');
    assert.equal(token.initialHolderId, 'PRT-ISSUER-01');
    assert.equal(token.totalUnits, 10000);
    assert.equal(token.status, 'ACTIVE');
    assert.equal(asset.status, AssetStatus.TOKENIZED);
    assert.equal(asset.tokenId, token.id);
    assert.equal(balance.units, 10000);
    assert.ok(state.has(`AUD:${token.id}:tx-mint-01`));
    assert.ok(state.has('AUD:AST-TOKEN-01:tx-mint-01'));
    assert.equal(ctx.events[0].name, 'TxEvents');
    assert.equal(
      JSON.parse(ctx.events[0].payload.toString()).events[0].name,
      'TokenMinted'
    );
  });

  it('enforces mint roles, valid token fields, and valued/un-tokenized asset state', async () => {
    const unauthorized = createMockCtx({ role: Role.ISSUER }, state);
    await assert.rejects(
      contract.mintToken(unauthorized, mintInput()),
      /Unauthorized/
    );

    const ctx = createMockCtx({}, state);
    await assert.rejects(
      contract.mintToken(ctx, mintInput({ totalUnits: 0 })),
      /totalUnits/
    );
    await assert.rejects(
      contract.mintToken(ctx, mintInput({ standard: 'UNKNOWN' })),
      /standard/
    );
    await assert.rejects(
      contract.mintToken(ctx, mintInput({ rightsType: 'UNKNOWN' })),
      /rightsType/
    );

    seedAsset(state, { status: AssetStatus.VERIFIED });
    await assert.rejects(contract.mintToken(ctx, mintInput()), /VALUED state/);

    seedAsset(state, {
      tokenId: 'TKN-EXISTING',
      status: AssetStatus.TOKENIZED,
    });
    await assert.rejects(
      contract.mintToken(ctx, mintInput()),
      /already tokenized/
    );
  });

  it('rejects an administrator from minting a token (separation of duties)', async () => {
    const adminCtx = createMockCtx(
      {
        mspId: 'EkamVistarMSP',
        role: Role.ADMINISTRATOR,
        userId: 'USR-ADMIN',
        participantId: null,
      },
      state,
      'tx-mint-admin'
    );
    await assert.rejects(
      contract.mintToken(adminCtx, mintInput()),
      /Unauthorized/
    );
  });

  it('returns token, balance, holders, and token trace from ledger state', async () => {
    const ctx = createMockCtx({}, state, 'tx-mint-02');
    const token = JSON.parse(await contract.mintToken(ctx, mintInput()));

    assert.deepEqual(
      JSON.parse(
        await contract.getToken(ctx, JSON.stringify({ id: token.id }))
      ),
      token
    );
    assert.deepEqual(
      JSON.parse(
        await contract.getBalance(
          ctx,
          JSON.stringify({
            tokenId: token.id,
            participantId: 'PRT-ISSUER-01',
          })
        )
      ),
      { units: 10000 }
    );
    assert.deepEqual(
      JSON.parse(
        await contract.listHolders(ctx, JSON.stringify({ tokenId: token.id }))
      ),
      [{ participantId: 'PRT-ISSUER-01', units: 10000 }]
    );
    const trace = JSON.parse(
      await contract.getTokenTrace(ctx, JSON.stringify({ tokenId: token.id }))
    );
    assert.equal(trace.token.id, token.id);
    assert.equal(trace.asset.id, 'AST-TOKEN-01');
    assert.equal(trace.holders[0].participantId, 'PRT-ISSUER-01');
    assert.equal(trace.auditTrail.length, 1);

    assert.deepEqual(
      JSON.parse(
        await contract.getBalance(
          ctx,
          JSON.stringify({
            tokenId: token.id,
            participantId: 'PRT-OTHER',
          })
        )
      ),
      { units: 0 }
    );
    assert.deepEqual(JSON.parse(await contract.listTokens(ctx)), [token]);
    await assert.rejects(
      contract.getBalance(
        ctx,
        JSON.stringify({ tokenId: 'TKN-MISSING', participantId: 'PRT-OTHER' })
      ),
      /Token not found/
    );
    assert.equal(
      JSON.parse(
        await contract.getTokenTrace(
          ctx,
          JSON.stringify({ tokenId: 'TKN-MISSING' })
        )
      ),
      null
    );
  });
});
