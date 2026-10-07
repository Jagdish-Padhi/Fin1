import { chainBridge } from '../../core/chain/chain-bridge.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '@rwa/contracts';

export class AssetTypesService {
  async listTypes(caller) {
    return chainBridge.evaluate(caller, 'listAssetTypes');
  }

  async getType(caller, key, version = 1) {
    return chainBridge.evaluate(caller, 'getAssetType', { key, version });
  }

  async defineType(caller, data) {
    if (caller.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Administrator can define asset types');
    }

    const res = await chainBridge.submit(caller, 'defineAssetType', data);
    return res.result || res;
  }

  async deprecateType(caller, key, version = 1, reason = 'Deprecated by administrator') {
    if (caller.role !== Role.ADMINISTRATOR && caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Only Administrator or Compliance can deprecate asset types');
    }

    const res = await chainBridge.submit(caller, 'deprecateAssetType', { key, version, reason });
    return res.result || res;
  }
}

export const assetTypesService = new AssetTypesService();
