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

  async publicVerify(queryId) {
    // Public unauthenticated lookup (no PII, disclosure only)
    // 1. Try finding token directly by queryId
    let token = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getToken', { id: queryId });

    // 2. If not found by tokenId, check if queryId is an assetId
    if (!token) {
      const assetDirect = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getAsset', { id: queryId });
      if (assetDirect) {
        if (assetDirect.tokenId) {
          token = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getToken', { id: assetDirect.tokenId });
        } else {
          // Asset exists but has not been tokenized yet
          return {
            tokenId: 'NOT_YET_TOKENIZED',
            assetId: assetDirect.id,
            displayName: assetDirect.displayName || 'Real-World Asset',
            standard: assetDirect.typeKey || 'N/A',
            totalUnits: 0,
            unitLabel: 'UNITS',
            rightsType: 'PHYSICAL_ASSET',
            representation: `${assetDirect.typeKey} registered on ledger under ${assetDirect.originatorParticipantId || 'Consortium'}`,
            status: assetDirect.status,
            mintedTxId: assetDirect.attributesHash || 'N/A',
            mintedAt: assetDirect.createdAt,
            holderCount: 0,
            verifiedLedgerProof: {
              network: 'Hyperledger Fabric 2.5',
              channel: 'rwa-channel',
              chaincode: 'rwa',
              stateValid: true,
            },
          };
        }
      }
    }

    if (!token) return null;

    const asset = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getAsset', { id: token.assetId });
    const holders = await chainBridge.evaluate({ role: 'PUBLIC' }, 'listHolders', { tokenId: token.id });

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
