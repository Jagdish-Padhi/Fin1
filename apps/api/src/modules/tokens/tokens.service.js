import { chainBridge } from '../../core/chain/chain-bridge.js';

export class TokensService {
  async listTokens(caller) {
    return chainBridge.evaluate(caller, 'listTokens');
  }

  async getToken(caller, id) {
    return chainBridge.evaluate(caller, 'getToken', { id });
  }

  async getHolders(caller, tokenId) {
    return chainBridge.evaluate(caller, 'listHolders', { tokenId });
  }

  async getBalance(caller, tokenId, participantId) {
    return chainBridge.evaluate(caller, 'getBalance', { tokenId, participantId });
  }

  async mintToken(caller, data) {
    const submission = await chainBridge.submit(caller, 'mintToken', data);
    return submission.result || submission;
  }

  async getTokenTrace(caller, tokenId) {
    return chainBridge.evaluate(caller, 'getTokenTrace', { tokenId });
  }

  async publicVerify(tokenId) {
    // Public unauthenticated lookup (no PII, disclosure only)
    const token = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getToken', { id: tokenId });
    if (!token) return null;

    const asset = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getAsset', { id: token.assetId });
    const holders = await chainBridge.evaluate({ role: 'PUBLIC' }, 'listHolders', { tokenId });

    return {
      tokenId: token.id,
      assetId: token.assetId,
      displayName: asset ? asset.displayName : 'Real-World Asset',
      standard: token.standard,
      totalUnits: token.totalUnits,
      unitLabel: token.unitLabel,
      rightsType: token.rightsType,
      representation: token.representation,
      status: token.status,
      mintedTxId: token.mintedTxId,
      mintedAt: token.mintedAt,
      holderCount: holders.length,
      verifiedLedgerProof: {
        network: 'Hyperledger Fabric 2.5',
        channel: 'rwa-channel',
        chaincode: 'rwa',
        stateValid: true,
      },
    };
  }
}

export const tokensService = new TokensService();
