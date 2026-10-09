import { Role } from './enums.js';

export const TABS = [
  'dashboard',
  'participants',
  'identity-admin',
  'asset-types',
  'assets',
  'verification',
  'valuation',
  'tokens',
  'transfers',
  'lifecycle',
  'audit',
];

/**
 * Single source of truth for Role-to-Tab visibility.
 * Access levels:
 * 'W' = Write / Active participant access
 * 'R' = Read-only access
 * null / undefined = No access (hidden from sidebar, route blocked, API denied)
 */
export const TAB_ACCESS = {
  [Role.ADMINISTRATOR]: {
    dashboard: 'W',
    'identity-admin': 'W',
    'asset-types': 'W',
  },
  [Role.ISSUER]: {
    dashboard: 'W',
    participants: 'R', // own profile & KYC document upload
    assets: 'W', // own assets only
    tokens: 'R', // own tokenized assets
    transfers: 'W', // own transfers
  },
  [Role.VERIFIER]: {
    dashboard: 'W',
    verification: 'W', // verification work queue only
  },
  [Role.VALUER]: {
    dashboard: 'W',
    valuation: 'W', // valuation proposal queue only
  },
  [Role.COMPLIANCE]: {
    dashboard: 'W',
    participants: 'W', // KYC review, investor class, limits, suspensions
    'asset-types': 'W', // deprecate / rule check
    assets: 'R', // regulatory oversight
    verification: 'R', // regulatory oversight
    valuation: 'W', // valuation approval/rejection
    tokens: 'W', // minting tokens
    transfers: 'R', // regulatory oversight + resolve escalations
    lifecycle: 'W', // freeze, unfreeze, redeem, retire
    audit: 'W', // compliance audit reviews
  },
  [Role.INVESTOR]: {
    dashboard: 'W',
    participants: 'R', // own profile & KYC upload
    tokens: 'R', // marketplace public disclosure & own holdings
    transfers: 'W', // own transfers
  },
  [Role.AUDITOR]: {
    dashboard: 'W',
    participants: 'R',
    'asset-types': 'R',
    assets: 'R',
    verification: 'R',
    valuation: 'R',
    tokens: 'R', // cap tables & balances
    transfers: 'R',
    lifecycle: 'R',
    audit: 'R', // full audit trail & state hash explorer
  },
};

/**
 * Granular capabilities per role
 */
export const CAPABILITIES = {
  // Asset Management
  registerAsset: [Role.ISSUER],
  editAsset: [Role.ISSUER],
  attachEvidence: [Role.ISSUER],
  submitForVerification: [Role.ISSUER],
  readAssets: [Role.ISSUER, Role.COMPLIANCE, Role.AUDITOR],

  // Verification Pipeline
  assignVerifier: [Role.VERIFIER, Role.COMPLIANCE],
  recordCheck: [Role.VERIFIER],
  decideVerification: [Role.VERIFIER],
  reopenVerification: [Role.VERIFIER],
  readVerification: [Role.VERIFIER, Role.COMPLIANCE, Role.AUDITOR],

  // Valuation Pipeline
  proposeValuation: [Role.VALUER],
  approveValuation: [Role.COMPLIANCE],
  readValuation: [Role.VALUER, Role.COMPLIANCE, Role.AUDITOR, Role.ISSUER],

  // Token Operations
  mintToken: [Role.COMPLIANCE],
  readTokens: [Role.ISSUER, Role.COMPLIANCE, Role.INVESTOR, Role.AUDITOR],
  viewCapTable: [Role.COMPLIANCE, Role.AUDITOR],
  viewHolders: [Role.ISSUER, Role.COMPLIANCE, Role.AUDITOR],

  // Transfers
  proposeTransfer: [Role.ISSUER, Role.INVESTOR],
  executeTransfer: [Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE],
  cancelTransfer: [Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE],
  evaluateTransfer: [Role.ISSUER, Role.INVESTOR],
  resolveEscalation: [Role.COMPLIANCE],
  readTransfers: [Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE, Role.AUDITOR],

  // Lifecycle
  freezeAsset: [Role.COMPLIANCE],
  unfreezeAsset: [Role.COMPLIANCE],
  redeemAsset: [Role.COMPLIANCE],
  retireAsset: [Role.COMPLIANCE],
  readLifecycle: [Role.COMPLIANCE, Role.AUDITOR],

  // Participant & KYC Management
  registerParticipant: [Role.ADMINISTRATOR, Role.ISSUER, Role.INVESTOR],
  reviewKyc: [Role.COMPLIANCE],
  setInvestorClass: [Role.COMPLIANCE],
  setLimits: [Role.COMPLIANCE],
  suspendParticipant: [Role.COMPLIANCE],
  reinstateParticipant: [Role.COMPLIANCE],
  addToBlacklist: [Role.COMPLIANCE],
  removeFromBlacklist: [Role.COMPLIANCE],
  lookupCounterparty: [Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE],
  viewAllPII: [Role.COMPLIANCE, Role.AUDITOR],
  readParticipants: [
    Role.ADMINISTRATOR,
    Role.ISSUER,
    Role.COMPLIANCE,
    Role.INVESTOR,
    Role.AUDITOR,
  ],

  // Asset Type Schemas & System Governance
  defineAssetType: [Role.ADMINISTRATOR],
  deprecateAssetType: [Role.ADMINISTRATOR, Role.COMPLIANCE],
  readAssetTypes: [
    Role.ADMINISTRATOR,
    Role.ISSUER,
    Role.VERIFIER,
    Role.VALUER,
    Role.COMPLIANCE,
    Role.INVESTOR,
    Role.AUDITOR,
  ],
  manageUsers: [Role.ADMINISTRATOR],

  // Audit
  viewAuditTrail: [Role.COMPLIANCE, Role.AUDITOR],
  viewAuditExplorer: [Role.COMPLIANCE, Role.AUDITOR],
};

/**
 * Checks if a role has permission for a specific capability.
 * Fails closed if role or capability is unknown.
 */
export function can(role, capability) {
  if (!role || typeof role !== 'string') return false;
  const allowed = CAPABILITIES[capability];
  if (!allowed || !Array.isArray(allowed)) return false;
  return allowed.includes(role);
}

/**
 * Returns access level ('W' | 'R' | null) for a given role and tab.
 * Fails closed (returns null) if unknown.
 */
export function tabAccess(role, tab) {
  if (!role || typeof role !== 'string') return null;
  const roleTabs = TAB_ACCESS[role];
  if (!roleTabs) return null;
  return roleTabs[tab] || null;
}
