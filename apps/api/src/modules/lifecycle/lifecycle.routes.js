import { Router } from 'express';
import { lifecycleController } from './lifecycle.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const lifecycleRouter = Router();

lifecycleRouter.use(authenticate);

lifecycleRouter.post(
  '/freeze',
  requireCapability('freezeAsset'),
  (req, res, next) => lifecycleController.freeze(req, res, next)
);

lifecycleRouter.post(
  '/unfreeze',
  requireCapability('unfreezeAsset'),
  (req, res, next) => lifecycleController.unfreeze(req, res, next)
);

// Administrator is strictly blocked from redeem/retire
lifecycleRouter.post(
  '/redeem',
  requireCapability('redeemAsset'),
  (req, res, next) => lifecycleController.redeem(req, res, next)
);

lifecycleRouter.post(
  '/retire',
  requireCapability('retireAsset'),
  (req, res, next) => lifecycleController.retire(req, res, next)
);
