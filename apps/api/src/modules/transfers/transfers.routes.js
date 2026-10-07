import { Router } from 'express';
import { transfersController } from './transfers.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const transfersRouter = Router();

transfersRouter.use(authenticate);

transfersRouter.get('/', (req, res, next) => transfersController.list(req, res, next));
transfersRouter.get('/token/:tokenId/history', (req, res, next) => transfersController.getHistory(req, res, next));
transfersRouter.get('/:id', (req, res, next) => transfersController.getById(req, res, next));

transfersRouter.post(
  '/propose',
  requireRole(Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => transfersController.propose(req, res, next)
);

transfersRouter.post('/evaluate', (req, res, next) => transfersController.evaluate(req, res, next));

transfersRouter.post(
  '/:id/execute',
  requireRole(Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => transfersController.execute(req, res, next)
);

transfersRouter.post(
  '/:id/cancel',
  requireRole(Role.ISSUER, Role.INVESTOR, Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => transfersController.cancel(req, res, next)
);
