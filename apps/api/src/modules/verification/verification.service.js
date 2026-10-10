import crypto from 'crypto';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { storageService } from '../../core/storage/storage.service.js';
import { AppError } from '../../core/errors/app-error.js';

const INTEGRITY_CHECK_KEY = 'DOCUMENT_INTEGRITY';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

export class VerificationService {
  async listCases(caller) {
    return chainBridge.evaluate(caller, 'listVerificationCases', {});
  }

  async getCaseById(caller, caseId) {
    return chainBridge.evaluate(caller, 'getVerificationCase', { caseId });
  }

  async recordCheck(caller, caseId, checkKey, result, notes, sourceRef) {
    return chainBridge.submit(caller, 'recordVerificationCheck', {
      caseId,
      checkKey,
      result,
      notes,
      sourceRef,
    });
  }

  /**
   * Evidence integrity check, computed server-side from real data:
   * - every evidence file attached to the asset is decrypted from the vault and
   *   re-hashed; the SHA-256 must equal the hash anchored on the ledger;
   * - every document the asset type marks as required must be attached.
   * The outcome (PASS or FAIL) is recorded as the DOCUMENT_INTEGRITY check, with a
   * sourceRef that hashes the per-document results so the record is reproducible.
   */
  async runIntegrityCheck(caller, caseId) {
    const vc = await this.getCaseById(caller, caseId);
    if (!vc) throw AppError.notFound(`Verification case not found: ${caseId}`);

    const asset = await chainBridge.evaluate(caller, 'getAsset', { id: vc.assetId });
    if (!asset) throw AppError.notFound(`Asset not found: ${vc.assetId}`);

    const typeDef = await chainBridge
      .evaluate(caller, 'getAssetType', { key: asset.typeKey, version: asset.typeVersion || 1 })
      .catch(() => null);
    const requiredDocs = (typeDef?.evidenceRequirements || []).filter((r) => r.required).map((r) => r.docType);

    const attached = Array.isArray(asset.evidence) ? asset.evidence : [];
    const documents = [];
    for (const item of attached) {
      try {
        const record = await chainBridge.evaluate(caller, 'getEvidence', { id: item.id });
        const buffer = await storageService.retrieveDocument(record.storageKey, record.encryptedDek);
        const computed = sha256(buffer);
        documents.push({ id: item.id, docType: item.docType, ledgerSha256: record.sha256, computedSha256: computed, match: computed === record.sha256 });
      } catch (err) {
        documents.push({ id: item.id, docType: item.docType, match: false, error: err.message || 'unreadable' });
      }
    }

    const missing = requiredDocs.filter((d) => !attached.some((e) => e.docType === d));
    const failed = documents.filter((d) => !d.match);
    const passed = attached.length > 0 && missing.length === 0 && failed.length === 0;

    const findings = [];
    if (attached.length === 0) findings.push('No evidence documents are attached to this asset');
    if (missing.length) findings.push(`Missing required documents: ${missing.join(', ')}`);
    if (failed.length) findings.push(`Hash mismatch or unreadable: ${failed.map((d) => d.docType).join(', ')}`);
    const notes = passed
      ? `All ${documents.length} documents decrypted and re-hashed; SHA-256 matches the ledger. Required documents present: ${requiredDocs.join(', ') || 'none defined'}.`
      : `${findings.join('. ')}.`;

    const sourceRef = `evidence:sha256:${sha256(JSON.stringify({ assetId: asset.id, documents, missing }))}`;
    await this.recordCheck(caller, caseId, INTEGRITY_CHECK_KEY, passed ? 'PASS' : 'FAIL', notes, sourceRef);

    return { passed, checkKey: INTEGRITY_CHECK_KEY, documents, missing, notes, sourceRef };
  }

  async decideVerification(caller, caseId, decision, reasonCode, reasonText) {
    return chainBridge.submit(caller, 'decideVerification', {
      caseId,
      decision,
      reasonCode,
      reasonText,
    });
  }
}

export const verificationService = new VerificationService();
