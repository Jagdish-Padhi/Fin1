import { chainBridge } from '../../core/chain/chain-bridge.js';

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
