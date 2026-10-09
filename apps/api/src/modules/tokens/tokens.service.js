import crypto from 'crypto';
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
          const leaves = (assetDirect.evidence || []).map((e) => e.sha256).filter(Boolean).sort();
          const computedEvidenceRoot = leaves.length > 0
            ? crypto.createHash('sha256').update(leaves.join(':')).digest('hex')
            : (assetDirect.evidenceRoot || '');
          const stateValid = !assetDirect.evidenceRoot || computedEvidenceRoot === assetDirect.evidenceRoot;

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
            evidenceRoot: assetDirect.evidenceRoot || computedEvidenceRoot,
            valuation: null,
            verifiedBy: assetDirect.verifiedBy || null,
            verifiedAt: assetDirect.verifiedAt || null,
            verifiedLedgerProof: {
              network: 'Hyperledger Fabric 2.5',
              channel: 'rwa-channel',
              chaincode: 'rwa',
              mintedTxId: assetDirect.attributesHash || null,
              blockNumber: 1,
              stateValid,
            },
          };
        }
      }
    }

    if (!token) return null;

    const asset = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getAsset', { id: token.assetId });
    const holders = await chainBridge.evaluate({ role: 'PUBLIC' }, 'listHolders', { tokenId: token.id });

    // Recompute evidence root from asset's evidence leaves
    const leaves = (asset?.evidence || []).map((e) => e.sha256).filter(Boolean).sort();
    const computedEvidenceRoot = leaves.length > 0
      ? crypto.createHash('sha256').update(leaves.join(':')).digest('hex')
      : (asset?.evidenceRoot || '');

    const evidenceRootMatches = !asset?.evidenceRoot || computedEvidenceRoot === asset.evidenceRoot;
    const statusConsistent = token.status === 'ACTIVE' && asset?.status === 'TOKENIZED' && asset?.tokenId === token.id;
    const stateValid = Boolean(evidenceRootMatches && statusConsistent);

    let valuationSummary = null;
    let verifiedBy = asset?.verifiedBy || null;
    let verifiedAt = asset?.verifiedAt || null;

    try {
      const trace = await chainBridge.evaluate({ role: 'PUBLIC' }, 'getTokenTrace', { tokenId: token.id });
      if (trace && trace.asset) {
        verifiedBy = trace.asset.verifiedBy || verifiedBy;
        verifiedAt = trace.asset.verifiedAt || verifiedAt;
        if (trace.asset.valuation) {
          valuationSummary = {
            amountPaise: trace.asset.valuation.amountPaise || trace.asset.valuation.amount || null,
            method: trace.asset.valuation.method || null,
            date: trace.asset.valuation.date || trace.asset.valuation.createdAt || null,
            valuerOrg: trace.asset.valuation.valuerOrg || trace.asset.valuation.proposedByMspId || null,
          };
        }
      }
    } catch {
      // Ignore optional trace failure
    }

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
      holderCount: holders ? holders.length : 0,
      evidenceRoot: asset?.evidenceRoot || computedEvidenceRoot,
      valuation: valuationSummary,
      verifiedBy,
      verifiedAt,
      verifiedLedgerProof: {
        network: 'Hyperledger Fabric 2.5',
        channel: 'rwa-channel',
        chaincode: 'rwa',
        mintedTxId: token.mintedTxId,
        blockNumber: token.blockNumber || 1,
        stateValid,
      },
    };
  }
}

export const tokensService = new TokensService();
