import { assetsService } from './assets.service.js';

export class AssetsController {
  async list(req, res, next) {
    try {
      const data = await assetsService.listAssets(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await assetsService.getAsset(req.user, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Asset not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const data = await assetsService.registerAsset(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async submitVerification(req, res, next) {
    try {
      const data = await assetsService.submitForVerification(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const assetsController = new AssetsController();
