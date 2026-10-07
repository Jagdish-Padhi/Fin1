import { chainBridge } from '../../core/chain/chain-bridge.js';

export class AssetTypesService {
  async listTypes(caller) {
    return chainBridge.evaluate(caller, 'listAssetTypes');
  }

  async getType(caller, key, version = 1) {
    return chainBridge.evaluate(caller, 'getAssetType', { key, version });
  }

  async defineType(caller, data) {
    return chainBridge.submit(caller, 'defineAssetType', data);
  }
}

export const assetTypesService = new AssetTypesService();
