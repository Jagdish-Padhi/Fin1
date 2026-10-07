import { lifecycleService } from './lifecycle.service.js';

export class LifecycleController {
  async freeze(req, res, next) {
    try {
      const { assetId, reasonText } = req.body;
      const data = await lifecycleService.freeze(req.user, assetId, reasonText);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async unfreeze(req, res, next) {
    try {
      const { assetId, reasonText } = req.body;
      const data = await lifecycleService.unfreeze(req.user, assetId, reasonText);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async redeem(req, res, next) {
    try {
      const { assetId, reasonText } = req.body;
      const data = await lifecycleService.redeem(req.user, assetId, reasonText);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async retire(req, res, next) {
    try {
      const { assetId, reasonCode, reasonText } = req.body;
      const data = await lifecycleService.retire(req.user, assetId, reasonCode, reasonText);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const lifecycleController = new LifecycleController();
