/**
 * PS-01: EkamVistar Fabric Function Map
 * Maps API function names to Fabric chaincode contract and argument serializer
 */

export const FUNCTION_MAP = {
  // ParticipantContract
  registerParticipant: {
    contract: 'ParticipantContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  updateKycStatus: {
    contract: 'ParticipantContract',
    args: (obj) => [
      obj.participantId,
      obj.kycStatus,
      obj.reason || '',
      obj.expiryDate || '',
    ],
  },
  setInvestorClass: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId, obj.investorClass, obj.reason || ''],
  },
  setLimits: {
    contract: 'ParticipantContract',
    args: (obj) => [
      obj.participantId,
      typeof obj.limits === 'string'
        ? obj.limits
        : JSON.stringify(obj.limits || {}),
      obj.reason || '',
    ],
  },
  suspendParticipant: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId, obj.reason || ''],
  },
  reinstateParticipant: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId, obj.reason || ''],
  },
  addToBlacklist: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId, obj.reason || ''],
  },
  removeFromBlacklist: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId, obj.reason || ''],
  },
  getParticipant: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId || obj.id],
  },
  listParticipants: {
    contract: 'ParticipantContract',
    args: () => [],
  },
  participantExistsAndActive: {
    contract: 'ParticipantContract',
    args: (obj) => [obj.participantId || obj.id],
  },

  // AssetTypeContract
  defineAssetType: {
    contract: 'AssetTypeContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  deprecateAssetType: {
    contract: 'AssetTypeContract',
    args: (obj) => [
      obj.typeKey,
      String(obj.version || '1'),
      obj.reason || '',
    ],
  },
  getAssetType: {
    contract: 'AssetTypeContract',
    args: (obj) => [obj.typeKey || obj.key, String(obj.version || '1')],
  },
  listAssetTypes: {
    contract: 'AssetTypeContract',
    args: () => [],
  },

  // AssetContract
  registerAsset: {
    contract: 'AssetContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  updateAssetAttributes: {
    contract: 'AssetContract',
    args: (obj) => [
      obj.assetId || obj.id,
      JSON.stringify(obj.attributes || {}),
      obj.reason || '',
    ],
  },
  attachEvidence: {
    contract: 'AssetContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  submitForVerification: {
    contract: 'AssetContract',
    args: (obj) => [obj.assetId || obj.id],
  },
  getAsset: {
    contract: 'AssetContract',
    args: (obj) => [obj.assetId || obj.id],
  },
  listAssets: {
    contract: 'AssetContract',
    args: () => [],
  },
  getEvidenceRoot: {
    contract: 'AssetContract',
    args: (obj) => [obj.assetId || obj.id],
  },
  getEvidence: {
    contract: 'AssetContract',
    args: (obj) => [obj.evidenceId || obj.id],
  },

  // VerificationContract
  openVerificationCase: {
    contract: 'VerificationContract',
    args: (obj) => [obj.assetId || obj.id],
  },
  assignVerifier: {
    contract: 'VerificationContract',
    args: (obj) => [obj.caseId || obj.id, obj.verifierUserId || ''],
  },
  recordCheck: {
    contract: 'VerificationContract',
    args: (obj) => [
      obj.caseId || obj.id,
      obj.checkKey,
      obj.result,
      obj.notes || '',
      obj.sourceRef || '',
    ],
  },
  recordVerificationCheck: {
    contract: 'VerificationContract',
    args: (obj) => [
      obj.caseId || obj.id,
      obj.checkKey,
      obj.result,
      obj.notes || '',
      obj.sourceRef || '',
    ],
  },
  decideVerification: {
    contract: 'VerificationContract',
    args: (obj) => [
      obj.caseId || obj.id,
      obj.decision,
      obj.reasonCode || '',
      obj.reasonText || '',
    ],
  },
  approveVerification: {
    contract: 'VerificationContract',
    args: (obj) => [
      obj.caseId || obj.id,
      obj.reasonCode || 'APPROVED',
      obj.reasonText || '',
    ],
  },
  rejectVerification: {
    contract: 'VerificationContract',
    args: (obj) => [
      obj.caseId || obj.id,
      obj.reasonCode || '',
      obj.reasonText || '',
    ],
  },
  requestChanges: {
    contract: 'VerificationContract',
    args: (obj) => [
      obj.caseId || obj.id,
      obj.reasonCode || '',
      obj.reasonText || '',
    ],
  },
  reopenVerification: {
    contract: 'VerificationContract',
    args: (obj) => [obj.caseId || obj.id, obj.reasonText || ''],
  },
  getVerificationCase: {
    contract: 'VerificationContract',
    args: (obj) => [obj.caseId || obj.id],
  },
  listVerificationCases: {
    contract: 'VerificationContract',
    args: () => [],
  },

  // ValuationContract
  proposeValuation: {
    contract: 'ValuationContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  approveValuation: {
    contract: 'ValuationContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(
            obj.valuationId ? obj : { valuationId: obj.id, ...obj }
          ),
    ],
  },
  getValuation: {
    contract: 'ValuationContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj.id ? obj : { id: obj.valuationId, ...obj }),
    ],
  },
  listValuations: {
    contract: 'ValuationContract',
    args: () => [],
  },

  // TokenContract
  mintToken: {
    contract: 'TokenContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  getToken: {
    contract: 'TokenContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj.id ? obj : { id: obj.tokenId, ...obj }),
    ],
  },
  listTokens: {
    contract: 'TokenContract',
    args: (obj) => [
      obj ? (typeof obj === 'string' ? obj : JSON.stringify(obj)) : '{}',
    ],
  },
  getBalance: {
    contract: 'TokenContract',
    args: (obj) => [typeof obj === 'string' ? obj : JSON.stringify(obj)],
  },
  listHolders: {
    contract: 'TokenContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj.tokenId ? obj : { tokenId: obj.id, ...obj }),
    ],
  },
  getTokenTrace: {
    contract: 'TokenContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj.tokenId ? obj : { tokenId: obj.id, ...obj }),
    ],
  },

  // TransferContract
  proposeTransfer: {
    contract: 'TransferContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  evaluateTransfer: {
    contract: 'TransferContract',
    args: (obj) => [JSON.stringify(obj)],
  },
  executeTransfer: {
    contract: 'TransferContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(
            obj.transferId ? obj : { transferId: obj.id, ...obj }
          ),
    ],
  },
  getTransfer: {
    contract: 'TransferContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj.id ? obj : { id: obj.transferId, ...obj }),
    ],
  },
  listTransfers: {
    contract: 'TransferContract',
    args: (obj) => [
      obj ? (typeof obj === 'string' ? obj : JSON.stringify(obj)) : '{}',
    ],
  },
  getTransferHistory: {
    contract: 'TransferContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj.tokenId ? obj : { tokenId: obj.id, ...obj }),
    ],
  },
  cancelTransfer: {
    contract: 'TransferContract',
    args: (obj) => [
      typeof obj === 'string'
        ? obj
        : JSON.stringify(
            obj.transferId ? obj : { transferId: obj.id, ...obj }
          ),
    ],
  },

  // LifecycleContract
  freezeAsset: {
    contract: 'LifecycleContract',
    args: (obj) => [obj.assetId || obj.id, obj.reasonText || obj.reason || ''],
  },
  unfreezeAsset: {
    contract: 'LifecycleContract',
    args: (obj) => [obj.assetId || obj.id, obj.reasonText || obj.reason || ''],
  },
  redeemAsset: {
    contract: 'LifecycleContract',
    args: (obj) => [obj.assetId || obj.id, obj.reasonText || obj.reason || ''],
  },
  retireAsset: {
    contract: 'LifecycleContract',
    args: (obj) => [
      obj.assetId || obj.id,
      obj.reasonCode || 'SCRAPPED_OR_DESTROYED',
      obj.reasonText || obj.reason || '',
    ],
  },

  // AuditContract
  getAuditTrail: {
    contract: 'AuditContract',
    args: (obj) => [obj.entityType || 'ASSET', obj.entityId ?? obj.id ?? ''],
  },
  getStateHash: {
    contract: 'AuditContract',
    args: (obj) => [obj.entityId || obj.id],
  },
};
