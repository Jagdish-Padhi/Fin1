import { chainBridge } from '../../core/chain/chain-bridge.js';
import { scopeVerificationCases } from '../../core/visibility/index.js';
import { AppError } from '../../core/errors/app-error.js';

export class VerificationService {
  async listCases(caller) {
    const cases = await chainBridge.evaluate(caller, 'listVerificationCases', {});
    return scopeVerificationCases(caller, cases || []);
  }

  async getCaseById(caller, caseId) {
    const c = await chainBridge.evaluate(caller, 'getVerificationCase', { caseId });
    if (!c) return null;
    const scoped = scopeVerificationCases(caller, [c]);
    if (scoped.length === 0) {
      throw AppError.notFound(`Verification case ${caseId} not found or access restricted`);
    }
    return c;
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
