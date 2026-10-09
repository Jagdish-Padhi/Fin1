import { Router } from 'express';
import { verificationController } from './verification.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const verificationRouter = Router();

verificationRouter.use(authenticate);

// Admin is strictly excluded from verification work
verificationRouter.get(
  '/cases',
  requireCapability('readVerification'),
  (req, res, next) => verificationController.list(req, res, next)
);

verificationRouter.get(
  '/cases/:caseId',
  requireCapability('readVerification'),
  (req, res, next) => verificationController.getById(req, res, next)
);

verificationRouter.post(
  '/cases/:caseId/checks',
  requireCapability('recordCheck'),
  (req, res, next) => verificationController.recordCheck(req, res, next)
);

verificationRouter.post(
  '/cases/:caseId/decide',
  requireCapability('decideVerification'),
  (req, res, next) => verificationController.decide(req, res, next)
);
