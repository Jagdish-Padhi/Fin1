import { Router } from 'express';
import { valuationController } from './valuation.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const valuationRouter = Router();

valuationRouter.use(authenticate);

valuationRouter.get('/', (req, res, next) => valuationController.list(req, res, next));
valuationRouter.get('/:id', (req, res, next) => valuationController.getById(req, res, next));

valuationRouter.post(
  '/propose',
  requireRole(Role.VALUER),
  (req, res, next) => valuationController.propose(req, res, next)
);

valuationRouter.post(
  '/:id/approve',
  requireRole(Role.COMPLIANCE, Role.VALUER),
  (req, res, next) => valuationController.approve(req, res, next)
);
