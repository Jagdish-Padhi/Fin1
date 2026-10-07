import { assetTypesService } from './asset-types.service.js';
import { AssetTypeDefinitionSchema } from '@rwa/contracts';

export class AssetTypesController {
  async list(req, res, next) {
    try {
      const data = await assetTypesService.listTypes(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getByKey(req, res, next) {
    try {
      const version = req.query.version ? Number(req.query.version) : 1;
      const data = await assetTypesService.getType(req.user, req.params.key, version);
      if (!data) return res.status(404).json({ success: false, message: 'Asset type not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async define(req, res, next) {
    try {
      const parsed = AssetTypeDefinitionSchema.parse(req.body);
      const data = await assetTypesService.defineType(req.user, parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deprecate(req, res, next) {
    try {
      const version = req.body.version ? Number(req.body.version) : 1;
      const data = await assetTypesService.deprecateType(
        req.user,
        req.params.key,
        version,
        req.body.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const assetTypesController = new AssetTypesController();
