import { Router } from 'express';
import { assetTypesController } from './asset-types.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireCapability } from '../../core/middleware/role.guard.js';

export const assetTypesRouter = Router();

// All asset-types endpoints are authenticated
assetTypesRouter.use(authenticate);

assetTypesRouter.get(
  '/',
  requireCapability('readAssetTypes'),
  (req, res, next) => assetTypesController.list(req, res, next)
);

assetTypesRouter.get(
  '/:key',
  requireCapability('readAssetTypes'),
  (req, res, next) => assetTypesController.getByKey(req, res, next)
);

// Only Administrator can define new asset type schemas
assetTypesRouter.post(
  '/',
  requireCapability('defineAssetType'),
  (req, res, next) => assetTypesController.define(req, res, next)
);

// Administrator or Compliance can deprecate an asset type
assetTypesRouter.post(
  '/:key/deprecate',
  requireCapability('deprecateAssetType'),
  (req, res, next) => assetTypesController.deprecate(req, res, next)
);
