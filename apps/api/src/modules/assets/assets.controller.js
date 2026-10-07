import { assetsService } from './assets.service.js';
import { RegisterAssetSchema, UpdateAssetAttributesSchema, AttachEvidenceSchema } from '@rwa/contracts';

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
      const parsed = RegisterAssetSchema.parse(req.body);
      const data = await assetsService.registerAsset(req.user, parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateAttributes(req, res, next) {
    try {
      const parsed = UpdateAssetAttributesSchema.parse(req.body);
      const data = await assetsService.updateAttributes(
        req.user,
        req.params.id,
        parsed.attributes,
        parsed.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async attachEvidence(req, res, next) {
    try {
      const payload = { ...req.body, assetId: req.body.assetId || req.params.id };
      const parsed = AttachEvidenceSchema.parse(payload);
      const data = await assetsService.attachEvidence(req.user, parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async submitForVerification(req, res, next) {
    try {
      const data = await assetsService.submitForVerification(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const assetsController = new AssetsController();
