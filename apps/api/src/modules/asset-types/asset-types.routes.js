import { Router } from 'express';
import { assetTypesController } from './asset-types.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const assetTypesRouter = Router();

assetTypesRouter.get('/', (req, res, next) => assetTypesController.list(req, res, next));
assetTypesRouter.get('/:key', (req, res, next) => assetTypesController.getByKey(req, res, next));

assetTypesRouter.use(authenticate);

// Only Administrator can define new asset type schemas
assetTypesRouter.post(
  '/',
  requireRole(Role.ADMINISTRATOR),
  (req, res, next) => assetTypesController.define(req, res, next)
);

// Administrator or Compliance can deprecate an asset type
assetTypesRouter.post(
  '/:key/deprecate',
  requireRole(Role.ADMINISTRATOR, Role.COMPLIANCE),
  (req, res, next) => assetTypesController.deprecate(req, res, next)
);
