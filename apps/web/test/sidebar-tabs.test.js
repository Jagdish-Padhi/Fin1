import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, TABS, TAB_ACCESS, tabAccess } from '../../../packages/contracts/src/index.js';

describe('Sidebar Nav Items vs TAB_ACCESS Parity', () => {
  const allNavItems = [
    { id: 'dashboard', label: 'Executive Dashboard' },
    { id: 'participants', label: 'Participant Directory' },
    { id: 'identity-admin', label: 'Consortium Governance' },
    { id: 'asset-types', label: 'Asset Type Engine' },
    { id: 'assets', label: 'Real-World Assets' },
    { id: 'verification', label: 'Verification Audits' },
    { id: 'valuation', label: 'Valuation & Pricing' },
    { id: 'tokens', label: 'Tokenized Securities' },
    { id: 'transfers', label: 'Settlement & Transfer Rules' },
    { id: 'lifecycle', label: 'Lifecycle Governance' },
    { id: 'audit', label: 'Consortium Audit Trail' },
  ];

  it('all 11 nav items correspond 1:1 to TABS', () => {
    const navItemIds = allNavItems.map((n) => n.id);
    assert.deepEqual(navItemIds, TABS);
  });

  for (const role of Object.values(ROLES)) {
    it(`Sidebar visible tabs for ${role} match TAB_ACCESS exactly`, () => {
      const visibleTabs = allNavItems
        .filter((item) => tabAccess(role, item.id) !== null)
        .map((item) => item.id);

      const expectedTabs = TABS.filter((tab) => TAB_ACCESS[role]?.[tab] != null);
      assert.deepEqual(visibleTabs, expectedTabs);
    });
  }

  it('unauthenticated or unknown role gets empty sidebar (fail closed)', () => {
    const visibleAnonymous = allNavItems.filter((item) => tabAccess(null, item.id) !== null);
    assert.deepEqual(visibleAnonymous, []);

    const visibleUnknown = allNavItems.filter((item) => tabAccess('HACKER', item.id) !== null);
    assert.deepEqual(visibleUnknown, []);
  });

  it('ADMINISTRATOR visible tabs match PS requirements', () => {
    const adminTabs = allNavItems
      .filter((item) => tabAccess(ROLES.ADMINISTRATOR, item.id) !== null)
      .map((item) => item.id);

    // Admin MUST see dashboard, identity-admin, asset-types
    assert.deepEqual(adminTabs, ['dashboard', 'identity-admin', 'asset-types']);
    // Admin MUST NOT see assets, verification, valuation, tokens, transfers, lifecycle, participants, audit
    assert.ok(!adminTabs.includes('assets'));
    assert.ok(!adminTabs.includes('verification'));
    assert.ok(!adminTabs.includes('valuation'));
    assert.ok(!adminTabs.includes('tokens'));
    assert.ok(!adminTabs.includes('transfers'));
    assert.ok(!adminTabs.includes('lifecycle'));
    assert.ok(!adminTabs.includes('audit'));
    assert.ok(!adminTabs.includes('participants'));
  });

  it('ISSUER visible tabs match PS requirements', () => {
    const issuerTabs = allNavItems
      .filter((item) => tabAccess(ROLES.ISSUER, item.id) !== null)
      .map((item) => item.id);

    assert.deepEqual(issuerTabs, ['dashboard', 'participants', 'assets', 'tokens', 'transfers']);
  });

  it('VERIFIER and VALUER visible tabs match their work queues only', () => {
    const verifierTabs = allNavItems
      .filter((item) => tabAccess(ROLES.VERIFIER, item.id) !== null)
      .map((item) => item.id);
    assert.deepEqual(verifierTabs, ['dashboard', 'verification']);

    const valuerTabs = allNavItems
      .filter((item) => tabAccess(ROLES.VALUER, item.id) !== null)
      .map((item) => item.id);
    assert.deepEqual(valuerTabs, ['dashboard', 'valuation']);
  });

  it('INVESTOR visible tabs match portfolio requirements', () => {
    const investorTabs = allNavItems
      .filter((item) => tabAccess(ROLES.INVESTOR, item.id) !== null)
      .map((item) => item.id);

    assert.deepEqual(investorTabs, ['dashboard', 'participants', 'tokens', 'transfers']);
  });

  it('AUDITOR has read access across oversight tabs', () => {
    const auditorTabs = allNavItems
      .filter((item) => tabAccess(ROLES.AUDITOR, item.id) !== null)
      .map((item) => item.id);

    assert.deepEqual(auditorTabs, [
      'dashboard',
      'participants',
      'asset-types',
      'assets',
      'verification',
      'valuation',
      'tokens',
      'transfers',
      'lifecycle',
      'audit',
    ]);
  });
});
