import { chainBridge } from '../../core/chain/chain-bridge.js';

export class AssetsService {
  async listAssets(caller) {
    return chainBridge.evaluate(caller, 'listAssets');
  }

  async getAsset(caller, id) {
    return chainBridge.evaluate(caller, 'getAsset', { id });
  }

  async registerAsset(caller, data) {
    return chainBridge.submit(caller, 'registerAsset', {
      typeKey: data.typeKey,
      typeVersion: data.typeVersion || 1,
      displayName: data.displayName,
      attributes: data.attributes,
    });
  }

  async submitForVerification(caller, assetId) {
    return chainBridge.submit(caller, 'submitForVerification', { assetId });
  }
}

export const assetsService = new AssetsService();
