import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Role,
  TABS,
  TAB_ACCESS,
  CAPABILITIES,
  can,
  tabAccess,
} from '../src/index.js';

describe('Permissions Single Source of Truth', () => {
  it('defines 11 standard tabs', () => {
    assert.strictEqual(TABS.length, 11);
    assert.ok(TABS.includes('identity-admin'));
    assert.ok(TABS.includes('asset-types'));
  });

  it('fails closed when role is undefined or unknown', () => {
    assert.strictEqual(can(undefined, 'mintToken'), false);
    assert.strictEqual(can(null, 'mintToken'), false);
    assert.strictEqual(can('UNKNOWN_ROLE', 'mintToken'), false);
    assert.strictEqual(tabAccess(undefined, 'dashboard'), null);
    assert.strictEqual(tabAccess(null, 'dashboard'), null);
    assert.strictEqual(tabAccess('UNKNOWN_ROLE', 'dashboard'), null);
  });

  it('verifies ADMINISTRATOR access strictly according to PS rules', () => {
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'dashboard'), 'W');
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'identity-admin'), 'W');
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'asset-types'), 'W');
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'assets'), null);
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'valuation'), null);
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'verification'), null);
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'tokens'), null);
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'transfers'), null);
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'lifecycle'), null);
    assert.strictEqual(tabAccess(Role.ADMINISTRATOR, 'audit'), null);

    // Admin cannot mint, cannot approve valuation, cannot freeze
    assert.strictEqual(can(Role.ADMINISTRATOR, 'mintToken'), false);
    assert.strictEqual(can(Role.ADMINISTRATOR, 'approveValuation'), false);
    assert.strictEqual(can(Role.ADMINISTRATOR, 'freezeAsset'), false);
    assert.strictEqual(can(Role.ADMINISTRATOR, 'registerAsset'), false);
    assert.strictEqual(can(Role.ADMINISTRATOR, 'defineAssetType'), true);
  });

  it('verifies VERIFIER and VALUER see only their work queue', () => {
    // Verifier
    assert.strictEqual(tabAccess(Role.VERIFIER, 'verification'), 'W');
    assert.strictEqual(tabAccess(Role.VERIFIER, 'assets'), null);
    assert.strictEqual(tabAccess(Role.VERIFIER, 'tokens'), null);
    assert.strictEqual(tabAccess(Role.VERIFIER, 'audit'), null);
    assert.strictEqual(can(Role.VERIFIER, 'decideVerification'), true);
    assert.strictEqual(can(Role.VERIFIER, 'approveValuation'), false);

    // Valuer
    assert.strictEqual(tabAccess(Role.VALUER, 'valuation'), 'W');
    assert.strictEqual(tabAccess(Role.VALUER, 'assets'), null);
    assert.strictEqual(tabAccess(Role.VALUER, 'tokens'), null);
    assert.strictEqual(tabAccess(Role.VALUER, 'audit'), null);
    assert.strictEqual(can(Role.VALUER, 'proposeValuation'), true);
    assert.strictEqual(can(Role.VALUER, 'approveValuation'), false);
  });

  it('verifies COMPLIANCE is the regulatory gatekeeper', () => {
    assert.strictEqual(tabAccess(Role.COMPLIANCE, 'valuation'), 'W');
    assert.strictEqual(tabAccess(Role.COMPLIANCE, 'tokens'), 'W');
    assert.strictEqual(tabAccess(Role.COMPLIANCE, 'lifecycle'), 'W');
    assert.strictEqual(can(Role.COMPLIANCE, 'approveValuation'), true);
    assert.strictEqual(can(Role.COMPLIANCE, 'mintToken'), true);
    assert.strictEqual(can(Role.COMPLIANCE, 'freezeAsset'), true);
    assert.strictEqual(can(Role.COMPLIANCE, 'registerAsset'), false);
  });

  it('verifies AUDITOR is strictly read-only on every tab', () => {
    for (const tab of TABS) {
      const access = tabAccess(Role.AUDITOR, tab);
      if (tab === 'identity-admin') {
        assert.strictEqual(access, null);
      } else {
        assert.ok(
          access === 'R' || access === 'W',
          `Auditor should have access to ${tab}`
        );
        if (tab !== 'dashboard') {
          assert.strictEqual(
            access,
            'R',
            `Auditor must be strictly read-only on ${tab}`
          );
        }
      }
    }
  });
});
