import { chainBridge } from '../../core/chain/chain-bridge.js';
import { scopeAudit } from '../../core/visibility/index.js';

/**
 * Normalize chaincode audit records (AuditLog.ts / mock-gateway _appendAudit)
 * into the UI-facing shape { action, performedBy, timestamp }.
 * Chaincode uses reasonCode/fromState/toState + actorUserId/actorOrg/actorRole
 * + timestamp, while the mock gateway emits occurredAt. Accept both.
 */
function normalizeEntry(e = {}) {
  const action =
    e.action ||
    e.reasonCode ||
    (e.fromState && e.toState ? `${e.fromState} → ${e.toState}` : 'RECORDED');
  const performedBy =
    e.performedBy ||
    [e.actorUserId, e.actorOrg, e.actorRole].filter(Boolean).join(' · ') ||
    e.actorOrg ||
    'SystemMSP';
  return {
    ...e,
    action,
    performedBy,
    timestamp: e.timestamp || e.occurredAt || null,
  };
}

export class AuditService {
  async getAuditTrail(caller, entityId = null) {
    const entries = await chainBridge.evaluate(caller, 'getAuditTrail', { entityId });
    return (Array.isArray(entries) ? entries : []).map(normalizeEntry);
  }

  async getExplorerStats(caller) {
    const assets = await chainBridge.evaluate(caller, 'listAssets');
    const tokens = await chainBridge.evaluate(caller, 'listTokens');
    const transfers = await chainBridge.evaluate(caller, 'listTransfers');
    const auditLogs = await chainBridge.evaluate(caller, 'getAuditTrail');

    const normalized = (Array.isArray(auditLogs) ? auditLogs : []).map(normalizeEntry);
    const blockHeight = normalized.length + 1;

    return {
      blockHeight,
      latestBlock: blockHeight,
      totalAssets: assets.length,
      totalTokens: tokens.length,
      totalTransfers: transfers.length,
      totalAuditEntries: normalized.length,
      txCount: normalized.length,
      peers: 6,
      channel: 'rwa-channel',
      recentEntries: normalized.slice(-15).reverse(),
    };
  }
}

export const auditService = new AuditService();
