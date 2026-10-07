import { verificationService } from './verification.service.js';

export class VerificationController {
  async recordCheck(req, res, next) {
    try {
      const { caseId } = req.params;
      const { checkKey, result, notes, sourceRef } = req.body;
      const data = await verificationService.recordCheck(req.user, caseId, checkKey, result, notes, sourceRef);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async decide(req, res, next) {
    try {
      const { caseId } = req.params;
      const { decision, reasonCode, reasonText } = req.body;
      const data = await verificationService.decideVerification(req.user, caseId, decision, reasonCode, reasonText);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const verificationController = new VerificationController();
