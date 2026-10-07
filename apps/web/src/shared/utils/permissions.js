/**
 * Role-Based Access Control (RBAC) & Segregation of Duties Matrix
 * Aligned strictly with Problem Statement (docs/ps.md & docs/plan.md)
 * 
 * Roles:
 * - ADMINISTRATOR: Consortium Operator (EkamVistarMSP). Schema configuration, user provisioning.
 *                  Segregation: CANNOT verify assets, value assets, or initiate transfers.
 * - ISSUER: Asset Originator (IssuerMSP). Registers assets, submits verification requests, proposes transfers.
 * - VERIFIER: Third-Party Inspector (VerifierMSP). Conducts independent audits, records checklist items, approves/rejects.
 * - VALUER: Independent Appraiser (VerifierMSP / Independent). Submits valuation models and certified amounts.
 * - COMPLIANCE: Regulatory / Legal Officer (ComplianceMSP). Approves valuations, mints tokens, freezes/unfreezes, revokes.
 * - INVESTOR: Qualified Buyer / Token Holder (InvestorMSP). Views portfolio, holds tokens, participates in secondary transfers.
 * - AUDITOR: Consortium Oversight (AuditorMSP). Read-only access across all operations, unredacted PDC audit logs.
 */

export const ROLES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ISSUER: 'ISSUER',
  VERIFIER: 'VERIFIER',
  VALUER: 'VALUER',
  COMPLIANCE: 'COMPLIANCE',
  INVESTOR: 'INVESTOR',
  AUDITOR: 'AUDITOR',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMINISTRATOR]: {
    label: 'Consortium Administrator',
    badge: 'System Admin',
    tabs: ['assets', 'identity', 'audit'],
    canRegisterAsset: false,
    canVerify: false,
    canValue: false,
    canMint: false,
    canFreeze: false,
    canManageUsers: true,
  },
  [ROLES.ISSUER]: {
    label: 'Asset Originator / Issuer',
    badge: 'Issuer',
    tabs: ['assets', 'tokens', 'transfers', 'lifecycle'],
    canRegisterAsset: true,
    canVerify: false,
    canValue: false,
    canMint: false,
    canFreeze: false,
    canManageUsers: false,
  },
  [ROLES.VERIFIER]: {
    label: 'Independent Verifier',
    badge: 'Verifier',
    tabs: ['assets', 'verification', 'audit'],
    canRegisterAsset: false,
    canVerify: true,
    canValue: false,
    canMint: false,
    canFreeze: false,
    canManageUsers: false,
  },
  [ROLES.VALUER]: {
    label: 'Certified Valuer',
    badge: 'Valuer',
    tabs: ['assets', 'valuation', 'audit'],
    canRegisterAsset: false,
    canVerify: false,
    canValue: true,
    canMint: false,
    canFreeze: false,
    canManageUsers: false,
  },
  [ROLES.COMPLIANCE]: {
    label: 'Compliance Officer',
    badge: 'Compliance',
    tabs: ['assets', 'verification', 'valuation', 'tokens', 'transfers', 'lifecycle', 'audit'],
    canRegisterAsset: false,
    canVerify: false,
    canValue: false,
    canMint: true,
    canFreeze: true,
    canManageUsers: false,
  },
  [ROLES.INVESTOR]: {
    label: 'Accredited Investor',
    badge: 'Investor',
    tabs: ['assets', 'tokens', 'transfers'],
    canRegisterAsset: false,
    canVerify: false,
    canValue: false,
    canMint: false,
    canFreeze: false,
    canManageUsers: false,
  },
  [ROLES.AUDITOR]: {
    label: 'Consortium Auditor',
    badge: 'Auditor',
    tabs: ['assets', 'verification', 'valuation', 'tokens', 'transfers', 'lifecycle', 'audit'],
    canRegisterAsset: false,
    canVerify: false,
    canValue: false,
    canMint: false,
    canFreeze: false,
    canManageUsers: false,
    isReadOnly: true,
  },
};

/**
 * Check if a role can view a specific navigation tab
 */
export function canAccessTab(role, tabId) {
  if (!role) return false;
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.tabs.includes(tabId);
}

/**
 * Returns available tabs list with metadata for a given role
 */
export function getAllowedTabs(role, allNavItems) {
  if (!role) return [];
  const allowedIds = ROLE_PERMISSIONS[role]?.tabs || [];
  return allNavItems.filter((item) => allowedIds.includes(item.id));
}
