import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TransferContract } from '../dist/contracts/TransferContract.js';
import { MockGateway } from '../../../packages/chain-client/src/mock-gateway.js';
import { Role } from '@rwa/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vectorsPath = path.resolve(
  __dirname,
  '../../../packages/contracts/test-vectors/transfer-rules.json'
);
const testVectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));

function createMockCtx(stateMap = new Map(), txTimestampMs = 1791517800000) {
  const seconds = Math.floor(txTimestampMs / 1000);
  return {
    clientIdentity: {
      getMSPID: () => 'InvestorMSP',
      getAttributeValue: (attr) => {
        if (attr === 'role') return Role.INVESTOR;
        if (attr === 'userId') return 'USR-01';
        if (attr === 'participantId') return 'PRT-ALICE';
        return null;
      },
    },
    stub: {
      getTxID: () => 'tx-vector-eval',
      getTxTimestamp: () => ({ seconds: { low: seconds } }),
      getState: async (key) => stateMap.get(key) || Buffer.alloc(0),
      putState: async (key, value) => stateMap.set(key, value),
    },
  };
}

describe('Transfer Rules Parity: Chaincode vs MockGateway', () => {
  const contract = new TransferContract();

  for (const vector of testVectors) {
    it(`evaluates identical outcome for [${vector.id}]: ${vector.description}`, async () => {
      // 1. Prepare Chaincode state
      const stateMap = new Map();
      const txTimeMs = vector.txTimeMs || 1791517800000;
      const ctx = createMockCtx(stateMap, txTimeMs);

      if (vector.assetType) {
        stateMap.set(
          `TYPE:${vector.assetType.key}:${vector.assetType.version || 1}`,
          Buffer.from(JSON.stringify(vector.assetType))
        );
      }
      if (vector.asset) {
        stateMap.set(
          `AST:${vector.asset.id}`,
          Buffer.from(JSON.stringify(vector.asset))
        );
      }
      if (vector.token) {
        stateMap.set(
          `TKN:${vector.token.id}`,
          Buffer.from(JSON.stringify(vector.token))
        );
      }
      if (vector.sender) {
        stateMap.set(
          `PRT:${vector.sender.id}`,
          Buffer.from(JSON.stringify(vector.sender))
        );
      }
      if (vector.receiver) {
        stateMap.set(
          `PRT:${vector.receiver.id}`,
          Buffer.from(JSON.stringify(vector.receiver))
        );
      }
      if (vector.senderBalance && vector.token) {
        stateMap.set(
          `BAL:${vector.token.id}:${vector.transfer.fromParticipantId}`,
          Buffer.from(JSON.stringify(vector.senderBalance))
        );
      }
      if (vector.receiverBalance && vector.token) {
        stateMap.set(
          `BAL:${vector.token.id}:${vector.transfer.toParticipantId}`,
          Buffer.from(JSON.stringify(vector.receiverBalance))
        );
      }

      const evalPayload = {
        tokenId: vector.transfer.tokenId,
        fromParticipantId: vector.transfer.fromParticipantId,
        toParticipantId: vector.transfer.toParticipantId,
        units: vector.transfer.units,
        pricePaise: vector.transfer.pricePaise,
      };

      const ccEvaluationRaw = await contract.evaluateTransfer(
        ctx,
        JSON.stringify(evalPayload)
      );
      const ccResult = JSON.parse(ccEvaluationRaw);

      // 2. Prepare Mock Gateway state
      const mock = new MockGateway();
      if (vector.assetType) {
        mock.assetTypes.set(
          `${vector.assetType.key}:${vector.assetType.version || 1}`,
          vector.assetType
        );
      }
      if (vector.asset) {
        mock.assets.set(vector.asset.id, vector.asset);
      }
      if (vector.token) {
        mock.tokens.set(vector.token.id, vector.token);
      }
      if (vector.sender) {
        mock.participants.set(vector.sender.id, vector.sender);
      }
      if (vector.receiver) {
        mock.participants.set(vector.receiver.id, vector.receiver);
      }
      if (vector.senderBalance && vector.token) {
        const key = `${vector.token.id}:${vector.transfer.fromParticipantId}`;
        mock.balances.set(key, vector.senderBalance.units || 0);
        if (vector.senderBalance.acquiredAt) {
          mock.balanceAcquiredAt.set(key, vector.senderBalance.acquiredAt);
        }
      }
      if (vector.receiverBalance && vector.token) {
        const key = `${vector.token.id}:${vector.transfer.toParticipantId}`;
        mock.balances.set(key, vector.receiverBalance.units || 0);
        if (vector.receiverBalance.acquiredAt) {
          mock.balanceAcquiredAt.set(key, vector.receiverBalance.acquiredAt);
        }
      }

      const caller = {
        role: Role.INVESTOR,
        userId: 'USR-01',
        participantId: vector.transfer.fromParticipantId,
      };

      const mockResult = await mock.evaluate(
        caller,
        'evaluateTransfer',
        vector.transfer
      );

      // 3. Parity checks
      assert.strictEqual(
        ccResult.passed,
        vector.expectedPassed,
        `Chaincode passed status mismatch for ${vector.id}`
      );
      assert.strictEqual(
        mockResult.passed,
        vector.expectedPassed,
        `MockGateway passed status mismatch for ${vector.id}`
      );
      assert.strictEqual(
        ccResult.passed,
        mockResult.passed,
        `Chaincode vs MockGateway agreement mismatch for ${vector.id}`
      );

      const ccCodes = (ccResult.rejectionReasons || []).map((r) => r.code);
      const mockCodes = (mockResult.rejectionReasons || []).map((r) => r.code);

      for (const expectedCode of vector.expectedReasonCodes) {
        assert.ok(
          ccCodes.includes(expectedCode),
          `Chaincode missing expected reason code ${expectedCode} for ${vector.id}. Got: ${ccCodes.join(',')}`
        );
        assert.ok(
          mockCodes.includes(expectedCode),
          `MockGateway missing expected reason code ${expectedCode} for ${vector.id}. Got: ${mockCodes.join(',')}`
        );
      }
    });
  }
});
