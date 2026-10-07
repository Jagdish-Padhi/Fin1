import { chainBridge } from '../../core/chain/chain-bridge.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '@rwa/contracts';

export class AssetsService {
  async listAssets(caller) {
    return chainBridge.evaluate(caller, 'listAssets');
  }

  async getAsset(caller, id) {
    return chainBridge.evaluate(caller, 'getAsset', { id });
  }

  async registerAsset(caller, data) {
    if (caller.role !== Role.ISSUER) {
      throw AppError.forbidden('Only Issuer role can register real-world assets');
    }

    const result = await chainBridge.submit(caller, 'registerAsset', {
      id: data.id,
      typeKey: data.typeKey,
      typeVersion: data.typeVersion || 1,
      displayName: data.displayName,
      attributes: data.attributes,
    });

    return result.result || result;
  }

  async updateAttributes(caller, assetId, attributes, reason) {
    if (caller.role !== Role.ISSUER) {
      throw AppError.forbidden('Only Issuer role can update asset attributes');
    }

    const result = await chainBridge.submit(caller, 'updateAssetAttributes', {
      assetId,
      attributes,
      reason,
    });

    return result.result || result;
  }

  async attachEvidence(caller, data) {
    if (caller.role !== Role.ISSUER) {
      throw AppError.forbidden('Only Issuer role can attach evidence');
    }

    const result = await chainBridge.submit(caller, 'attachEvidence', {
      assetId: data.assetId,
      docType: data.docType,
      fileName: data.fileName,
      mimeType: data.mimeType || 'application/pdf',
      fileSize: data.fileSize || 1024,
      sha256: data.sha256,
      storageKey: data.storageKey,
    });

    return result.result || result;
  }

  async submitForVerification(caller, assetId) {
    if (caller.role !== Role.ISSUER) {
      throw AppError.forbidden('Only Issuer role can submit asset for verification');
    }

    const result = await chainBridge.submit(caller, 'submitForVerification', { assetId });
    return result.result || result;
  }
}

export const assetsService = new AssetsService();
