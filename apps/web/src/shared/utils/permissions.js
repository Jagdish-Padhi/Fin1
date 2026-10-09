/**
 * Web RBAC adapter re-exporting the single source of truth from @rwa/contracts
 */
import { TABS, TAB_ACCESS, CAPABILITIES, can, tabAccess, ROLES } from '@rwa/contracts';

export { TABS, TAB_ACCESS, CAPABILITIES, can, tabAccess, ROLES };

export const ROLE_PERMISSIONS = {
  [ROLES.ADMINISTRATOR]: {
    label: 'Consortium Administrator',
    badge: 'System Admin',
<<<<<<< HEAD
=======
    tabs: ['dashboard', 'participants', 'assets', 'identity', 'identity-admin', 'asset-types', 'audit'],
    canRegisterAsset: false,
    canVerify: false,
    canValue: false,
    canMint: false,
    canFreeze: false,
    canManageUsers: true,
>>>>>>> 3acd21411c5b9f7d11e403d7eb4aa0a33256278c
  },
  [ROLES.ISSUER]: {
    label: 'Asset Originator / Issuer',
    badge: 'Issuer',
  },
  [ROLES.VERIFIER]: {
    label: 'Independent Verifier',
    badge: 'Verifier',
  },
  [ROLES.VALUER]: {
    label: 'Certified Valuer',
    badge: 'Valuer',
  },
  [ROLES.COMPLIANCE]: {
    label: 'Compliance Officer',
    badge: 'Compliance',
  },
  [ROLES.INVESTOR]: {
    label: 'Accredited Investor',
    badge: 'Investor',
  },
  [ROLES.AUDITOR]: {
    label: 'Consortium Auditor',
    badge: 'Auditor',
  },
};

/**
 * Check if a role can access a navigation tab (either Read or Write access)
 */
export function canAccessTab(role, tabId) {
  return Boolean(role && tabAccess(role, tabId) !== null);
}

/**
 * Returns available tabs list with metadata for a given role
 */
export function getAllowedTabs(role, allNavItems) {
  if (!role) return [];
  return allNavItems.filter((item) => tabAccess(role, item.id) !== null);
}
