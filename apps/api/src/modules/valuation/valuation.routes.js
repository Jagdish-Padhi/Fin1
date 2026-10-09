import { Router } from 'express';
import { valuationController } from './valuation.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const valuationRouter = Router();

valuationRouter.use(authenticate);

valuationRouter.get(
  '/',
  requireCapability('readValuation'),
  (req, res, next) => valuationController.list(req, res, next)
);

valuationRouter.get(
  '/:id',
  requireCapability('readValuation'),
  (req, res, next) => valuationController.getById(req, res, next)
);

// Only Valuer can propose valuations
valuationRouter.post(
  '/propose',
  requireCapability('proposeValuation'),
  (req, res, next) => valuationController.propose(req, res, next)
);

// Segregation of Duties: ONLY Compliance can approve valuations (Valuer is strictly blocked)
valuationRouter.post(
  '/:id/approve',
  requireCapability('approveValuation'),
  (req, res, next) => valuationController.approve(req, res, next)
);
