import { chainBridge } from '../../core/chain/chain-bridge.js';

export class LifecycleService {
  async freeze(caller, assetId, reasonText) {
    return chainBridge.submit(caller, 'freezeAsset', { assetId, reasonText });
  }

  async unfreeze(caller, assetId, reasonText) {
    return chainBridge.submit(caller, 'unfreezeAsset', { assetId, reasonText });
  }

  async redeem(caller, assetId, reasonText) {
    return chainBridge.submit(caller, 'redeemAsset', { assetId, reasonText });
  }

  async retire(caller, assetId, reasonCode, reasonText) {
    return chainBridge.submit(caller, 'retireAsset', { assetId, reasonCode, reasonText });
  }
}

export const lifecycleService = new LifecycleService();
