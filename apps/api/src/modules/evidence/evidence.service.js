import crypto from 'crypto';
import { storageService } from '../../core/storage/storage.service.js';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '@rwa/contracts';

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

  async downloadDocument(caller, evidenceId) {
    // Allowed roles = owning ISSUER, VERIFIER, COMPLIANCE, AUDITOR (investors & admins denied)
    const allowedRoles = [Role.ISSUER, Role.VERIFIER, Role.COMPLIANCE, Role.AUDITOR];
    if (!allowedRoles.includes(caller.role)) {
      throw AppError.forbidden('Forbidden: Role not authorized to download evidence');
    }

    const evidence = await chainBridge.evaluate(caller, 'getEvidence', { id: evidenceId });
    if (!evidence) {
      throw AppError.notFound(`Evidence document not found: ${evidenceId}`);
    }

    // If caller is ISSUER, verify ownership of the asset
    if (caller.role === Role.ISSUER && evidence.assetId) {
      const asset = await chainBridge.evaluate(caller, 'getAsset', { id: evidence.assetId });
      if (asset && caller.participantId && asset.originatorParticipantId !== caller.participantId) {
        throw AppError.forbidden('Forbidden: Issuer may only download evidence for owned assets');
      }
    }

    // Decrypt stored document
    const buffer = await storageService.retrieveDocument(evidence.storageKey, evidence.encryptedDek);

    // Recompute SHA-256 hash and verify integrity
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (computedHash !== evidence.sha256) {
      throw AppError.conflict('Evidence integrity failure: SHA-256 hash mismatch (EVIDENCE_TAMPERED)');
    }

    return {
      buffer,
      fileName: evidence.fileName || 'evidence.pdf',
      mimeType: evidence.mimeType || 'application/pdf',
      sha256: computedHash,
    };
  }
}

export const evidenceService = new EvidenceService();
