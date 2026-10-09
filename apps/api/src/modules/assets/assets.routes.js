import { Router } from 'express';
import { assetsController } from './assets.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability, requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const assetsRouter = Router();

assetsRouter.use(authenticate);

// List assets - ISSUER (own), COMPLIANCE, AUDITOR (Admin, Investor, Verifier, Valuer cannot list)
assetsRouter.get(
  '/',
  requireCapability('readAssets'),
  (req, res, next) => assetsController.list(req, res, next)
);

// Detail lookup - scoped to allowed participants; Admin strictly blocked
assetsRouter.get(
  '/:id',
  requireRole(
    Role.ISSUER,
    Role.COMPLIANCE,
    Role.AUDITOR,
    Role.VERIFIER,
    Role.VALUER,
    Role.INVESTOR
  ),
  (req, res, next) => assetsController.getById(req, res, next)
);

// Issuer asset registration
assetsRouter.post(
  '/',
  requireCapability('registerAsset'),
  (req, res, next) => assetsController.register(req, res, next)
);

// Issuer attribute modification prior to submission
assetsRouter.patch(
  '/:id/attributes',
  requireCapability('editAsset'),
  (req, res, next) => assetsController.updateAttributes(req, res, next)
);

// Evidence attachment
assetsRouter.post(
  '/:id/evidence',
  requireCapability('attachEvidence'),
  (req, res, next) => assetsController.attachEvidence(req, res, next)
);

// Submit asset for independent verification
assetsRouter.post(
  '/:id/submit-verification',
  requireCapability('submitForVerification'),
  (req, res, next) => assetsController.submitForVerification(req, res, next)
);
