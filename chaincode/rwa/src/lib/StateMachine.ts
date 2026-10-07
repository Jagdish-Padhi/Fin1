import { AssetStatus } from '@rwa/contracts';

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  REGISTERED: [AssetStatus.UNDER_VERIFICATION],
  UNDER_VERIFICATION: [AssetStatus.VERIFIED, AssetStatus.CHANGES_REQUESTED, AssetStatus.REJECTED],
  CHANGES_REQUESTED: [AssetStatus.UNDER_VERIFICATION],
  REJECTED: [], // Terminal
  VERIFIED: [AssetStatus.VALUED],
  VALUED: [AssetStatus.TOKENIZED, AssetStatus.FROZEN, AssetStatus.RETIRED],
  TOKENIZED: [AssetStatus.FROZEN, AssetStatus.REDEEMED, AssetStatus.RETIRED],
  FROZEN: [AssetStatus.TOKENIZED, AssetStatus.VALUED], // Reversible by compliance
  REDEEMED: [], // Terminal
  RETIRED: [], // Terminal
};

export function validateTransition(fromState: string, toState: string): void {
  const allowed = ALLOWED_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`Illegal state transition from '${fromState}' to '${toState}'`);
  }
}
