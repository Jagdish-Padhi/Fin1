import { chainBridge } from '../../core/chain/chain-bridge.js';

export class VerificationService {
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
