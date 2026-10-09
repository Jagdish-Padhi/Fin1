import { Router } from 'express';
import { valuationIndicationController } from './valuation-indication.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const valuationIndicationRouter = Router();

valuationIndicationRouter.use(authenticate);

valuationIndicationRouter.post(
  '/indication',
  requireRole(Role.VALUER, Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => valuationIndicationController.indicate(req, res, next)
);
