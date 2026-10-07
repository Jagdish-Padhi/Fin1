import { verificationService } from './verification.service.js';
import {
  RecordVerificationCheckSchema,
  VerificationDecisionSchema,
} from '@rwa/contracts';

export class VerificationController {
  async list(req, res, next) {
    try {
      const data = await verificationService.listCases(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { caseId } = req.params;
      const data = await verificationService.getCaseById(req.user, caseId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async recordCheck(req, res, next) {
    try {
      const { caseId } = req.params;
      const payload = RecordVerificationCheckSchema.parse({
        ...req.body,
        caseId,
      });
      const { checkKey, result, notes, sourceRef } = payload;
      const data = await verificationService.recordCheck(
        req.user,
        caseId,
        checkKey,
        result,
        notes,
        sourceRef
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async decide(req, res, next) {
    try {
      const { caseId } = req.params;
      const { decision, reasonCode, reasonText } =
        VerificationDecisionSchema.parse(req.body);
      const data = await verificationService.decideVerification(
        req.user,
        caseId,
        decision,
        reasonCode,
        reasonText
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const verificationController = new VerificationController();
