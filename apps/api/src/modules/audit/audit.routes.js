import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get(
  '/trail',
  requireCapability('viewAuditTrail'),
  (req, res, next) => auditController.getTrail(req, res, next)
);

auditRouter.get(
  '/explorer',
  requireCapability('viewAuditExplorer'),
  (req, res, next) => auditController.getExplorer(req, res, next)
);
