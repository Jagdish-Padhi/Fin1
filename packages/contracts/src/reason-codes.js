/**
 * PS-01: EkamVistar Real-World Asset Tokenization Platform
 * Standard Reason Codes for Rejections, Transitions, and Rule Checks
 */

export const TransferRuleReason = {
  PARTICIPANT_INACTIVE: {
    code: 'RULE_PARTICIPANT_INACTIVE',
    message: 'One or both parties are inactive, suspended, or blacklisted',
  },
  KYC_NOT_VERIFIED: {
    code: 'RULE_KYC_NOT_VERIFIED',
    message: 'One or both parties do not possess approved KYC status',
  },
  KYC_EXPIRED: {
    code: 'RULE_KYC_EXPIRED',
    message: 'One or both parties have expired KYC accreditation',
  },
  BUYER_CLASS_INSUFFICIENT: {
    code: 'RULE_BUYER_CLASS_INSUFFICIENT',
    message: 'Buyer investor class does not satisfy required tier for this asset',
  },
  JURISDICTION_RESTRICTED: {
    code: 'RULE_JURISDICTION_RESTRICTED',
    message: 'Buyer jurisdiction is restricted from acquiring this asset',
  },
  INSUFFICIENT_UNITS: {
    code: 'RULE_INSUFFICIENT_UNITS',
    message: 'Seller does not hold sufficient unlocked units',
  },
  MIN_TRANSFER_THRESHOLD: {
    code: 'RULE_MIN_TRANSFER_THRESHOLD',
    message: 'Transfer amount is below minimum allowed transfer unit threshold',
  },
  WHOLE_TOKEN_SPLIT_FORBIDDEN: {
    code: 'RULE_WHOLE_TOKEN_SPLIT_FORBIDDEN',
    message: 'Whole tokens cannot be fractionally divided',
  },
  MAX_HOLDING_CAP_EXCEEDED: {
    code: 'RULE_MAX_HOLDING_CAP_EXCEEDED',
    message: 'Resulting buyer holding would exceed maximum percentage cap of supply',
  },
  MAX_VALUE_CAP_EXCEEDED: {
    code: 'RULE_MAX_VALUE_CAP_EXCEEDED',
    message: 'Transfer value exceeds per-transaction or daily cap',
  },
  LOCK_IN_ACTIVE: {
    code: 'RULE_LOCK_IN_ACTIVE',
    message: 'Units are within mandatory lock-in retention period',
  },
  ASSET_FROZEN: {
    code: 'RULE_ASSET_FROZEN',
    message: 'Asset or token is currently frozen by compliance hold',
  },
  VALUATION_STALE: {
    code: 'RULE_VALUATION_STALE',
    message: 'Active asset valuation has expired beyond allowed validity window',
  },
  ENCUMBRANCE_ACTIVE: {
    code: 'RULE_ENCUMBRANCE_ACTIVE',
    message: 'Active encumbrance, hypothecation, or legal lien exists on asset',
  },
  SELF_TRANSFER_PROHIBITED: {
    code: 'RULE_SELF_TRANSFER_PROHIBITED',
    message: 'Sender and recipient participant cannot be identical',
  },
};

export const LifecycleReason = {
  VERIFICATION_APPROVED: 'VERIFICATION_CHECKS_PASSED',
  VERIFICATION_REJECTED: 'EVIDENCE_DISCREPANCY_OR_UNVERIFIED',
  CHANGES_REQUESTED: 'MISSING_ADDITIONAL_EVIDENCE',
  COMPLIANCE_HOLD: 'REGULATORY_INVESTIGATION_OR_COURT_ORDER',
  COMPLIANCE_RELEASE: 'HOLD_CONDITIONS_SATISFIED',
  CONSOLIDATED_REDEMPTION: 'SOLE_HOLDER_CONSOLIDATION_REDEMPTION',
  SCRAPPED_OR_DESTROYED: 'PHYSICAL_ASSET_SCRAPPED_OR_TOTAL_LOSS',
  LEGAL_INVALIDATION: 'STATUTORY_INVALIDATION_OR_DISPUTE_VOID',
};
