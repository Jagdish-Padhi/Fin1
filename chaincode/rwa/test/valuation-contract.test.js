import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValuationContract } from '../dist/contracts/ValuationContract.js';
import { AssetStatus, Role, ValuationStatus, VerificationDecision } from '@rwa/contracts';

const now = Date.now();

function createMockCtx(
  { mspId = 'ValuerMSP', role = Role.VALUER, userId = 'USR-VALUER', participantId = 'PRT-VALUER' } = {},
  stateMap = new Map()
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
      getTxID: () => `tx-${userId}`,
      getTxTimestamp: () => ({ seconds: { low: Math.floor(now / 1000) } }),
      getState: async (key) => stateMap.get(key) || Buffer.alloc(0),
      putState: async (key, value) => stateMap.set(key, value),
      getStateByRange: async (start, end) => {
        const entries = [...stateMap.entries()]
          .filter(([key]) => key >= start && key <= end)
          .sort(([a], [b]) => a.localeCompare(b));
        let index = 0;
        return {
          next: async () => (index < entries.length
            ? { value: { key: entries[index][0], value: entries[index++][1] }, done: false }
            : { done: true }),
          close: async () => {},
        };
      },
      setEvent: (name, payload) => events.push({ name, payload }),
    },
    events,
    stateMap,
  };
}

function seedValuationState(stateMap, assetOverrides = {}) {
  const valuationDate = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const validUntil = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  const asset = {
    id: 'AST-VALUATION-01',
    typeKey: 'LAND',
    typeVersion: 1,
    originatorParticipantId: 'PRT-ISSUER-01',
    status: AssetStatus.VERIFIED,
    ...assetOverrides,
  };

  stateMap.set('AST:AST-VALUATION-01', Buffer.from(JSON.stringify(asset)));
  stateMap.set('TYPE:LAND:1', Buffer.from(JSON.stringify({
    key: 'LAND',
    version: 1,
    status: 'ACTIVE',
    valuation: { methods: ['MARKET_COMPARABLE', 'CIRCLE_RATE'], validityDays: 180 },
  })));
  stateMap.set('PRT:PRT-ISSUER-01', Buffer.from(JSON.stringify({
    id: 'PRT-ISSUER-01',
    mspId: 'IssuerMSP',
  })));
  stateMap.set('VER:VER-01', Buffer.from(JSON.stringify({
    id: 'VER-01',
    assetId: 'AST-VALUATION-01',
    decision: VerificationDecision.APPROVED,
    decidedBy: 'USR-VERIFIER',
  })));
  return { valuationDate, validUntil };
}

function proposal(dates, overrides = {}) {
  return JSON.stringify({
    id: 'VAL-01',
    assetId: 'AST-VALUATION-01',
    amountPaise: 125000000,
    currency: 'INR',
    method: 'MARKET_COMPARABLE',
    methodDetails: { comparableCount: 3 },
    source: {
      valuerName: 'Independent Valuer',
      valuerOrg: 'Valuation Partners',
      reportReference: 'REPORT-01',
      reportHash: 'a'.repeat(64),
    },
    valuationDate: dates.valuationDate,
    validUntil: dates.validUntil,
    ...overrides,
  });
}

describe('Phase 4: ValuationContract', () => {
  const contract = new ValuationContract();
  let state;
  let dates;

  beforeEach(() => {
    state = new Map();
    dates = seedValuationState(state);
  });

  it('records a valid proposal with audit and event without changing the asset status', async () => {
    const ctx = createMockCtx({}, state);
    const record = JSON.parse(await contract.proposeValuation(ctx, proposal(dates)));

    assert.equal(record.id, 'VAL-01');
    assert.equal(record.status, ValuationStatus.PROPOSED);
    assert.equal(record.amountPaise, 125000000);
    assert.equal(record.proposedBy, 'USR-VALUER');
    assert.equal(JSON.parse(state.get('AST:AST-VALUATION-01').toString()).status, AssetStatus.VERIFIED);
    assert.ok(state.has('AUD:VAL-01:tx-USR-VALUER'));
    assert.equal(ctx.events[0].name, 'TxEvents');
    assert.equal(JSON.parse(ctx.events[0].payload.toString()).events[0].name, 'ValuationProposed');
  });

  it('rejects invalid roles, amounts, currency, methods, date windows, and non-VERIFIED assets', async () => {
    const investorCtx = createMockCtx({ role: Role.INVESTOR }, state);
    await assert.rejects(contract.proposeValuation(investorCtx, proposal(dates)), /Unauthorized/);

    const valuerCtx = createMockCtx({}, state);
    await assert.rejects(
      contract.proposeValuation(valuerCtx, proposal(dates, { amountPaise: 0 })),
      /amountPaise/
    );
    await assert.rejects(
      contract.proposeValuation(valuerCtx, proposal(dates, { currency: 'USD' })),
      /Only INR/
    );
    await assert.rejects(
      contract.proposeValuation(valuerCtx, proposal(dates, { method: 'UNLISTED' })),
      /not allowed/
    );
    await assert.rejects(
      contract.proposeValuation(valuerCtx, proposal(dates, {
        validUntil: new Date(now - 1000).toISOString(),
      })),
      /validUntil/
    );

    state.set('AST:AST-VALUATION-01', Buffer.from(JSON.stringify({
      id: 'AST-VALUATION-01',
      typeKey: 'LAND',
      typeVersion: 1,
      originatorParticipantId: 'PRT-ISSUER-01',
      status: AssetStatus.UNDER_VERIFICATION,
    })));
    await assert.rejects(
      contract.proposeValuation(valuerCtx, proposal(dates)),
      /must be VERIFIED/
    );
  });

  it('enforces issuer organization and verifier separation for proposal', async () => {
    const issuerOrgValuerCtx = createMockCtx({ mspId: 'IssuerMSP' }, state);
    await assert.rejects(
      contract.proposeValuation(issuerOrgValuerCtx, proposal(dates)),
      /cannot be the issuer organization/
    );

    const verifierCtx = createMockCtx({
      mspId: 'VerifierMSP',
      role: Role.VALUER,
      userId: 'USR-VERIFIER',
    }, state);
    await assert.rejects(
      contract.proposeValuation(verifierCtx, proposal(dates)),
      /Asset verifier cannot propose/
    );
  });

  it('approves with independent checker and atomically changes asset to VALUED', async () => {
    const proposerCtx = createMockCtx({}, state);
    await contract.proposeValuation(proposerCtx, proposal(dates));
    const approverCtx = createMockCtx({
      mspId: 'ComplianceMSP',
      role: Role.COMPLIANCE,
      userId: 'USR-COMPLIANCE',
      participantId: 'PRT-COMPLIANCE',
    }, state);

    const result = JSON.parse(await contract.approveValuation(approverCtx, 'VAL-01'));
    assert.equal(result.valuation.status, ValuationStatus.APPROVED);
    assert.equal(result.valuation.approvedBy, 'USR-COMPLIANCE');
    assert.equal(result.asset.status, AssetStatus.VALUED);
    assert.equal(result.asset.valuationId, 'VAL-01');
    assert.ok(state.has('AUD:VAL-01:tx-USR-COMPLIANCE'));
    assert.ok(state.has('AUD:AST-VALUATION-01:tx-USR-COMPLIANCE'));
    assert.equal(approverCtx.events[0].name, 'TxEvents');
    assert.equal(JSON.parse(approverCtx.events[0].payload.toString()).events[0].name, 'ValuationApproved');
  });

  it('rejects self-approval, verifier approval, unauthorized roles, and expired proposals', async () => {
    const proposerCtx = createMockCtx({}, state);
    await contract.proposeValuation(proposerCtx, proposal(dates));
    await assert.rejects(
      contract.approveValuation(proposerCtx, 'VAL-01'),
      /Unauthorized|Maker-checker/
    );

    const verifierCtx = createMockCtx({
      mspId: 'VerifierMSP',
      role: Role.VALUER,
      userId: 'USR-VERIFIER',
    }, state);
    await assert.rejects(
      contract.approveValuation(verifierCtx, 'VAL-01'),
      /Asset verifier cannot approve/
    );

    const issuerCtx = createMockCtx({ mspId: 'IssuerMSP', role: Role.ISSUER }, state);
    await assert.rejects(contract.approveValuation(issuerCtx, 'VAL-01'), /Unauthorized/);

    state.set('VAL:VAL-01', Buffer.from(JSON.stringify({
      ...JSON.parse(state.get('VAL:VAL-01').toString()),
      validUntil: new Date(now - 1000).toISOString(),
    })));
    const complianceCtx = createMockCtx({
      mspId: 'ComplianceMSP',
      role: Role.COMPLIANCE,
      userId: 'USR-COMPLIANCE',
    }, state);
    await assert.rejects(contract.approveValuation(complianceCtx, 'VAL-01'), /expired/);
  });

  it('provides valuation get/list queries and prevents duplicate pending proposals', async () => {
    const ctx = createMockCtx({}, state);
    await contract.proposeValuation(ctx, proposal(dates));
    await assert.rejects(contract.proposeValuation(ctx, proposal(dates)), /already pending/);

    assert.equal(JSON.parse(await contract.getValuation(ctx, 'VAL-01')).status, ValuationStatus.PROPOSED);
    assert.equal(JSON.parse(await contract.listValuations(ctx)).length, 1);
  });
});
