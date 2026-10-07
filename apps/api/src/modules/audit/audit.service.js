import { chainBridge } from '../../core/chain/chain-bridge.js';

export class AuditService {
  async getAuditTrail(caller, entityId = null) {
    return chainBridge.evaluate(caller, 'getAuditTrail', { entityId });
  }

  async getExplorerStats(caller) {
    const assets = await chainBridge.evaluate(caller, 'listAssets');
    const tokens = await chainBridge.evaluate(caller, 'listTokens');
    const transfers = await chainBridge.evaluate(caller, 'listTransfers');
    const auditLogs = await chainBridge.evaluate(caller, 'getAuditTrail');

    return {
      blockHeight: auditLogs.length + 1,
      totalAssets: assets.length,
      totalTokens: tokens.length,
      totalTransfers: transfers.length,
      totalAuditEntries: auditLogs.length,
      recentEntries: auditLogs.slice(-15).reverse(),
    };
  }
}

export const auditService = new AuditService();
