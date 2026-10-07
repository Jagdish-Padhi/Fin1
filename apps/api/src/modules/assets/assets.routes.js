import { Router } from 'express';
import { assetsController } from './assets.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const assetsRouter = Router();

assetsRouter.use(authenticate);

assetsRouter.get('/', (req, res, next) => assetsController.list(req, res, next));
assetsRouter.get('/:id', (req, res, next) => assetsController.getById(req, res, next));
assetsRouter.post(
  '/',
  requireRole(Role.ISSUER),
  (req, res, next) => assetsController.register(req, res, next)
);
assetsRouter.post(
  '/:id/submit-verification',
  requireRole(Role.ISSUER),
  (req, res, next) => assetsController.submitVerification(req, res, next)
);
