import { Router } from 'express';
import { transfersController } from './transfers.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const transfersRouter = Router();

transfersRouter.use(authenticate);

transfersRouter.get(
  '/',
  requireCapability('readTransfers'),
  (req, res, next) => transfersController.list(req, res, next)
);

transfersRouter.get(
  '/token/:tokenId/history',
  requireCapability('readTransfers'),
  (req, res, next) => transfersController.getHistory(req, res, next)
);

transfersRouter.get(
  '/:id',
  requireCapability('readTransfers'),
  (req, res, next) => transfersController.getById(req, res, next)
);

// Propose transfer - Token holders (Issuer, Investor) only
transfersRouter.post(
  '/propose',
  requireCapability('proposeTransfer'),
  (req, res, next) => transfersController.propose(req, res, next)
);

// Pre-flight evaluate - Token holders only
transfersRouter.post(
  '/evaluate',
  requireCapability('evaluateTransfer'),
  (req, res, next) => transfersController.evaluate(req, res, next)
);

// Execute transfer - Parties to transfer or Compliance (PENDING_COMPLIANCE)
transfersRouter.post(
  '/:id/execute',
  requireCapability('executeTransfer'),
  (req, res, next) => transfersController.execute(req, res, next)
);

// Cancel transfer - Parties to transfer or Compliance
transfersRouter.post(
  '/:id/cancel',
  requireCapability('cancelTransfer'),
  (req, res, next) => transfersController.cancel(req, res, next)
);
