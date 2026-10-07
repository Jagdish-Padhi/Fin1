export declare const Role: {
  ADMINISTRATOR: 'ADMINISTRATOR';
  ISSUER: 'ISSUER';
  VERIFIER: 'VERIFIER';
  VALUER: 'VALUER';
  COMPLIANCE: 'COMPLIANCE';
  INVESTOR: 'INVESTOR';
  AUDITOR: 'AUDITOR';
};
export type RoleType = (typeof Role)[keyof typeof Role];

export declare const OrgMsp: {
  EkamVistarMSP: 'EkamVistarMSP';
  IssuerMSP: 'IssuerMSP';
  VerifierMSP: 'VerifierMSP';
  ComplianceMSP: 'ComplianceMSP';
  InvestorMSP: 'InvestorMSP';
  AuditorMSP: 'AuditorMSP';
};

export declare const ParticipantKind: {
  INDIVIDUAL: 'INDIVIDUAL';
  ENTITY: 'ENTITY';
};

export declare const KycStatus: {
  SUBMITTED: 'SUBMITTED';
  UNDER_REVIEW: 'UNDER_REVIEW';
  APPROVED: 'APPROVED';
  REJECTED: 'REJECTED';
};

export declare const ParticipantStatus: {
  ACTIVE: 'ACTIVE';
  SUSPENDED: 'SUSPENDED';
  BLACKLISTED: 'BLACKLISTED';
  INACTIVE: 'INACTIVE';
};

export declare const InvestorClass: {
  RETAIL: 'RETAIL';
  QUALIFIED: 'QUALIFIED';
  INSTITUTIONAL: 'INSTITUTIONAL';
};

export declare const AssetStatus: {
  REGISTERED: 'REGISTERED';
  UNDER_VERIFICATION: 'UNDER_VERIFICATION';
  CHANGES_REQUESTED: 'CHANGES_REQUESTED';
  REJECTED: 'REJECTED';
  VERIFIED: 'VERIFIED';
  VALUED: 'VALUED';
  TOKENIZED: 'TOKENIZED';
  FROZEN: 'FROZEN';
  REDEEMED: 'REDEEMED';
  RETIRED: 'RETIRED';
};

export declare const AssetTypeStatus: {
  ACTIVE: 'ACTIVE';
  DEPRECATED: 'DEPRECATED';
};

export declare const FieldVisibility: {
  PUBLIC: 'PUBLIC';
  CONSORTIUM: 'CONSORTIUM';
  RESTRICTED: 'RESTRICTED';
};

export declare const TokenStandard: {
  WHOLE: 'WHOLE';
  FRACTIONAL: 'FRACTIONAL';
};

export declare const RightsType: {
  FULL_OWNERSHIP: 'FULL_OWNERSHIP';
  UNDIVIDED_FRACTION: 'UNDIVIDED_FRACTION';
  RECEIVABLE_CLAIM: 'RECEIVABLE_CLAIM';
};

export declare const TransferStatus: {
  PROPOSED: 'PROPOSED';
  ACCEPTED: 'ACCEPTED';
  RULES_EVALUATED: 'RULES_EVALUATED';
  EXECUTED: 'EXECUTED';
  REJECTED: 'REJECTED';
  PENDING_COMPLIANCE: 'PENDING_COMPLIANCE';
  CANCELLED: 'CANCELLED';
  EXPIRED: 'EXPIRED';
};

export declare const VerificationDecision: {
  APPROVED: 'APPROVED';
  REJECTED: 'REJECTED';
  CHANGES_REQUESTED: 'CHANGES_REQUESTED';
};

export declare const CheckResult: {
  PASS: 'PASS';
  FAIL: 'FAIL';
  NOT_APPLICABLE: 'NOT_APPLICABLE';
};

export declare const ValuationStatus: {
  PROPOSED: 'PROPOSED';
  APPROVED: 'APPROVED';
  REJECTED: 'REJECTED';
  SUPERSEDED: 'SUPERSEDED';
  EXPIRED: 'EXPIRED';
};

export declare const ChainCommandStatus: {
  QUEUED: 'QUEUED';
  SUBMITTED: 'SUBMITTED';
  COMMITTED: 'COMMITTED';
  FAILED: 'FAILED';
};

export declare const ErrorCode: {
  UNAUTHORIZED: 'UNAUTHORIZED';
  FORBIDDEN: 'FORBIDDEN';
  NOT_FOUND: 'NOT_FOUND';
  BAD_REQUEST: 'BAD_REQUEST';
  CONFLICT: 'CONFLICT';
  PRECONDITION_FAILED: 'PRECONDITION_FAILED';
  RULE_VIOLATION: 'RULE_VIOLATION';
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION';
  SEGREGATION_OF_DUTIES_VIOLATION: 'SEGREGATION_OF_DUTIES_VIOLATION';
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE';
  CHAIN_COMMUNICATION_ERROR: 'CHAIN_COMMUNICATION_ERROR';
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR';
};

export declare const EventName: {
  PARTICIPANT_REGISTERED: 'ParticipantRegistered';
  KYC_UPDATED: 'KycUpdated';
  INVESTOR_CLASS_UPDATED: 'InvestorClassUpdated';
  LIMITS_UPDATED: 'LimitsUpdated';
  PARTICIPANT_SUSPENDED: 'ParticipantSuspended';
  PARTICIPANT_REINSTATED: 'ParticipantReinstated';
  BLACKLIST_ADDED: 'BlacklistAdded';
  BLACKLIST_REMOVED: 'BlacklistRemoved';
  ASSET_TYPE_DEFINED: 'AssetTypeDefined';
  ASSET_REGISTERED: 'AssetRegistered';
  EVIDENCE_ATTACHED: 'EvidenceAttached';
  VERIFICATION_STARTED: 'VerificationStarted';
  VERIFICATION_DECIDED: 'VerificationDecided';
  VALUATION_PROPOSED: 'ValuationProposed';
  VALUATION_APPROVED: 'ValuationApproved';
  TOKEN_MINTED: 'TokenMinted';
  TRANSFER_PROPOSED: 'TransferProposed';
  TRANSFER_EXECUTED: 'TransferExecuted';
  TRANSFER_REJECTED: 'TransferRejected';
  LIFECYCLE_TRANSITIONED: 'LifecycleTransitioned';
  ASSET_FROZEN: 'AssetFrozen';
  ASSET_UNFROZEN: 'AssetUnfrozen';
  ASSET_REDEEMED: 'AssetRedeemed';
  ASSET_RETIRED: 'AssetRetired';
};

export declare const TransferRuleReason: Record<string, { code: string; message: string }>;
export declare const LifecycleReason: Record<string, string>;

export declare const RegisterParticipantSchema: any;
export declare const UpdateKycSchema: any;
export declare const SetInvestorClassSchema: any;
export declare const SetLimitsSchema: any;
export declare const SuspendParticipantSchema: any;
export declare const AssetTypeDefinitionSchema: any;
export declare const RegisterAssetSchema: any;
export declare const AttachEvidenceSchema: any;
export declare const RecordVerificationCheckSchema: any;
export declare const VerificationDecisionSchema: any;
export declare const ProposeValuationSchema: any;
export declare const RequestMintTokenSchema: any;
export declare const ProposeTransferSchema: any;
export declare const ExecuteTransferSchema: any;
export declare const LifecycleTransitionSchema: any;
