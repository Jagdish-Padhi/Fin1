import { Router } from 'express';
import { verificationController } from './verification.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const verificationRouter = Router();

verificationRouter.use(authenticate);

verificationRouter.get(
  '/cases',
  requireRole(Role.VERIFIER, Role.AUDITOR, Role.ADMINISTRATOR, Role.COMPLIANCE),
  (req, res, next) => verificationController.list(req, res, next)
);

verificationRouter.get(
  '/cases/:caseId',
  requireRole(Role.VERIFIER, Role.AUDITOR, Role.ADMINISTRATOR, Role.COMPLIANCE),
  (req, res, next) => verificationController.getById(req, res, next)
);

verificationRouter.post(
  '/cases/:caseId/checks',
  requireRole(Role.VERIFIER),
  (req, res, next) => verificationController.recordCheck(req, res, next)
);

verificationRouter.post(
  '/cases/:caseId/integrity-check',
  requireRole(Role.VERIFIER),
  (req, res, next) => verificationController.integrityCheck(req, res, next)
);

verificationRouter.post(
  '/cases/:caseId/decide',
  requireRole(Role.VERIFIER),
  (req, res, next) => verificationController.decide(req, res, next)
);
