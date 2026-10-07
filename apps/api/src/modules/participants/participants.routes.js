import { Router } from 'express';
import { participantsController } from './participants.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const participantsRouter = Router();

participantsRouter.use(authenticate);

// Directory & detail lookup (role-redacted)
participantsRouter.get('/', (req, res, next) => participantsController.list(req, res, next));
participantsRouter.get('/:id', (req, res, next) => participantsController.getById(req, res, next));

// Registration / Onboarding
participantsRouter.post(
  '/',
  requireRole(Role.ADMINISTRATOR, Role.ISSUER, Role.INVESTOR),
  (req, res, next) => participantsController.register(req, res, next)
);

// Document upload for participant KYC
participantsRouter.post(
  '/:id/kyc-docs',
  requireRole(Role.ADMINISTRATOR, Role.ISSUER, Role.INVESTOR),
  (req, res, next) => participantsController.uploadKycDoc(req, res, next)
);

// Segregation of Duties: ONLY Compliance can approve or update KYC status! (Admin is prohibited)
participantsRouter.patch(
  '/:id/kyc',
  requireRole(Role.COMPLIANCE),
  (req, res, next) => participantsController.updateKyc(req, res, next)
);

// Classification and Limits
participantsRouter.patch(
  '/:id/investor-class',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => participantsController.setInvestorClass(req, res, next)
);

participantsRouter.patch(
  '/:id/limits',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => participantsController.setLimits(req, res, next)
);

// Lifecycle holds & suspension
participantsRouter.post(
  '/:id/suspend',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => participantsController.suspend(req, res, next)
);

participantsRouter.post(
  '/:id/reinstate',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => participantsController.reinstate(req, res, next)
);

// Compliance blacklist
participantsRouter.post(
  '/:id/blacklist',
  requireRole(Role.COMPLIANCE),
  (req, res, next) => participantsController.addToBlacklist(req, res, next)
);

participantsRouter.delete(
  '/:id/blacklist',
  requireRole(Role.COMPLIANCE),
  (req, res, next) => participantsController.removeFromBlacklist(req, res, next)
);
