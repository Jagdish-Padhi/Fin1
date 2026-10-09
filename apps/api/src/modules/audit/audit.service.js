import { chainBridge } from '../../core/chain/chain-bridge.js';
import { scopeAudit } from '../../core/visibility/index.js';

export class AuditService {
  async getAuditTrail(caller, entityId = null) {
    const raw = await chainBridge.evaluate(caller, 'getAuditTrail', { entityId });
    return scopeAudit(caller, raw || [], entityId);
  }

  async getExplorerStats(caller) {
    const assets = await chainBridge.evaluate(caller, 'listAssets');
    const tokens = await chainBridge.evaluate(caller, 'listTokens');
    const transfers = await chainBridge.evaluate(caller, 'listTransfers');
    const auditLogs = await chainBridge.evaluate(caller, 'getAuditTrail');

    return {
      blockHeight: (auditLogs?.length || 0) + 1,
      totalAssets: assets?.length || 0,
      totalTokens: tokens?.length || 0,
      totalTransfers: transfers?.length || 0,
      totalAuditEntries: auditLogs?.length || 0,
      recentEntries: (auditLogs || []).slice(-15).reverse(),
    };
  }
}

export const auditService = new AuditService();
