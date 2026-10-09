import { Router } from 'express';
import { participantsController } from './participants.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const participantsRouter = Router();

participantsRouter.use(authenticate);

// Directory list (scoped per role)
participantsRouter.get(
  '/',
  requireCapability('readParticipants'),
  (req, res, next) => participantsController.list(req, res, next)
);

// Counterparty lookup for transfers (Issuer, Investor, Compliance)
participantsRouter.get(
  '/lookup',
  requireCapability('lookupCounterparty'),
  (req, res, next) => participantsController.lookup(req, res, next)
);

// Participant detail lookup
participantsRouter.get(
  '/:id',
  requireCapability('readParticipants'),
  (req, res, next) => participantsController.getById(req, res, next)
);

// Registration / Onboarding (Admin, Issuer, Investor)
participantsRouter.post(
  '/',
  requireCapability('registerParticipant'),
  (req, res, next) => participantsController.register(req, res, next)
);

// Document upload for participant KYC
participantsRouter.post(
  '/:id/kyc-docs',
  (req, res, next) => participantsController.uploadKycDoc(req, res, next)
);

// Segregation of Duties: ONLY Compliance can approve or update KYC status!
participantsRouter.patch(
  '/:id/kyc',
  requireCapability('reviewKyc'),
  (req, res, next) => participantsController.updateKyc(req, res, next)
);

// Classification and Limits - COMPLIANCE ONLY (Admin strictly prohibited)
participantsRouter.patch(
  '/:id/investor-class',
  requireCapability('setInvestorClass'),
  (req, res, next) => participantsController.setInvestorClass(req, res, next)
);

participantsRouter.patch(
  '/:id/limits',
  requireCapability('setLimits'),
  (req, res, next) => participantsController.setLimits(req, res, next)
);

// Lifecycle holds & suspension - COMPLIANCE ONLY (Admin strictly prohibited)
participantsRouter.post(
  '/:id/suspend',
  requireCapability('suspendParticipant'),
  (req, res, next) => participantsController.suspend(req, res, next)
);

participantsRouter.post(
  '/:id/reinstate',
  requireCapability('reinstateParticipant'),
  (req, res, next) => participantsController.reinstate(req, res, next)
);

// Compliance blacklist
participantsRouter.post(
  '/:id/blacklist',
  requireCapability('addToBlacklist'),
  (req, res, next) => participantsController.addToBlacklist(req, res, next)
);

participantsRouter.delete(
  '/:id/blacklist',
  requireCapability('removeFromBlacklist'),
  (req, res, next) => participantsController.removeFromBlacklist(req, res, next)
);
