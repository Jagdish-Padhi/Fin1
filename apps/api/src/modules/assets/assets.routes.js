import { Router } from 'express';
import { assetsController } from './assets.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const assetsRouter = Router();

assetsRouter.use(authenticate);

assetsRouter.get('/', (req, res, next) => assetsController.list(req, res, next));
assetsRouter.get('/:id', (req, res, next) => assetsController.getById(req, res, next));

// Issuer asset registration
assetsRouter.post(
  '/',
  requireRole(Role.ISSUER),
  (req, res, next) => assetsController.register(req, res, next)
);

// Issuer attribute modification prior to submission
assetsRouter.patch(
  '/:id/attributes',
  requireRole(Role.ISSUER),
  (req, res, next) => assetsController.updateAttributes(req, res, next)
);

// Evidence attachment
assetsRouter.post(
  '/:id/evidence',
  requireRole(Role.ISSUER),
  (req, res, next) => assetsController.attachEvidence(req, res, next)
);

// Submit asset for independent verification
assetsRouter.post(
  '/:id/submit-verification',
  requireRole(Role.ISSUER),
  (req, res, next) => assetsController.submitForVerification(req, res, next)
);
