import { storageService } from '../../core/storage/storage.service.js';
import { chainBridge } from '../../core/chain/chain-bridge.js';

export class EvidenceService {
  async attachDocument(caller, assetId, docType, fileBuffer, fileName, mimeType) {
    // 1. Store in encrypted storage and compute SHA-256
    const stored = await storageService.storeDocument(fileBuffer, fileName, mimeType);

    // 2. Submit on-chain evidence leaf
    const chainRecord = await chainBridge.submit(caller, 'attachEvidence', {
      assetId,
      docType,
      fileName,
      mimeType,
      fileSize: stored.size,
      sha256: stored.sha256,
      storageKey: stored.storageKey,
    });

    return {
      evidence: chainRecord,
      sha256: stored.sha256,
      storageKey: stored.storageKey,
    };
  }
}

export const evidenceService = new EvidenceService();
