import { Router } from 'express';
import { registryOracleController } from './registry-oracle.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const registryOracleRouter = Router();

registryOracleRouter.use(authenticate);

registryOracleRouter.get(
  '/registries',
  requireRole(Role.VERIFIER, Role.COMPLIANCE, Role.ADMINISTRATOR),
  (req, res, next) => registryOracleController.capabilities(req, res, next)
);

registryOracleRouter.post(
  '/cases/:caseId/registry-check',
  requireRole(Role.VERIFIER),
  (req, res, next) => registryOracleController.runCheck(req, res, next)
);
