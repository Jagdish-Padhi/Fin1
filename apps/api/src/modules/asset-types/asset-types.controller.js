import { assetTypesService } from './asset-types.service.js';

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
      const data = await assetTypesService.getType(req.user, req.params.key, parseInt(req.query.version || '1', 10));
      if (!data) return res.status(404).json({ success: false, message: 'Asset type not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async define(req, res, next) {
    try {
      const data = await assetTypesService.defineType(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const assetTypesController = new AssetTypesController();
