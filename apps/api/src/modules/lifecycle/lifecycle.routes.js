import { Router } from 'express';
import { lifecycleController } from './lifecycle.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const lifecycleRouter = Router();

lifecycleRouter.use(authenticate);

lifecycleRouter.post(
  '/freeze',
  requireRole(Role.COMPLIANCE),
  (req, res, next) => lifecycleController.freeze(req, res, next)
);

lifecycleRouter.post(
  '/unfreeze',
  requireRole(Role.COMPLIANCE),
  (req, res, next) => lifecycleController.unfreeze(req, res, next)
);

lifecycleRouter.post(
  '/redeem',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => lifecycleController.redeem(req, res, next)
);

lifecycleRouter.post(
  '/retire',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => lifecycleController.retire(req, res, next)
);
