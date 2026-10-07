import { Router } from 'express';
import { participantsController } from './participants.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const participantsRouter = Router();

participantsRouter.use(authenticate);

participantsRouter.get('/', (req, res, next) => participantsController.list(req, res, next));
participantsRouter.get('/:id', (req, res, next) => participantsController.getById(req, res, next));
participantsRouter.post(
  '/',
  requireRole(Role.ADMINISTRATOR, Role.ISSUER),
  (req, res, next) => participantsController.register(req, res, next)
);
participantsRouter.patch(
  '/:id/kyc',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => participantsController.updateKyc(req, res, next)
);
