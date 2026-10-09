import { Router } from 'express';
import { tokensController } from './tokens.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const tokensRouter = Router();

// Public verification passport endpoint - NO LOGIN REQUIRED
tokensRouter.get('/public-verify/:id', (req, res, next) =>
  tokensController.publicVerify(req, res, next)
);

// Authenticated endpoints
tokensRouter.use(authenticate);

tokensRouter.get(
  '/',
  requireCapability('readTokens'),
  (req, res, next) => tokensController.list(req, res, next)
);

tokensRouter.get(
  '/:id',
  requireCapability('readTokens'),
  (req, res, next) => tokensController.getById(req, res, next)
);

tokensRouter.get(
  '/:id/balance/:participantId',
  (req, res, next) => tokensController.getBalance(req, res, next)
);

tokensRouter.get(
  '/:id/holders',
  requireCapability('viewHolders'),
  (req, res, next) => tokensController.getHolders(req, res, next)
);

tokensRouter.get(
  '/:id/trace',
  requireCapability('readTokens'),
  (req, res, next) => tokensController.getTrace(req, res, next)
);

// Minting is strictly restricted to Compliance
tokensRouter.post(
  '/mint',
  requireCapability('mintToken'),
  (req, res, next) => tokensController.mint(req, res, next)
);
