import { Router } from 'express';
import { tokensController } from './tokens.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const tokensRouter = Router();

// Public verification passport endpoint - NO LOGIN REQUIRED
tokensRouter.get('/public-verify/:id', (req, res, next) => tokensController.publicVerify(req, res, next));

// Authenticated endpoints
tokensRouter.use(authenticate);

tokensRouter.get('/', (req, res, next) => tokensController.list(req, res, next));
tokensRouter.get('/:id', (req, res, next) => tokensController.getById(req, res, next));
tokensRouter.get('/:id/balance/:participantId', (req, res, next) =>
  tokensController.getBalance(req, res, next)
);
tokensRouter.get('/:id/holders', (req, res, next) => tokensController.getHolders(req, res, next));
tokensRouter.get('/:id/trace', (req, res, next) => tokensController.getTrace(req, res, next));

tokensRouter.post(
  '/mint',
  requireRole(Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => tokensController.mint(req, res, next)
);
