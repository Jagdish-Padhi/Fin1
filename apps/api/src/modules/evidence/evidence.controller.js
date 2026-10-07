import { evidenceService } from './evidence.service.js';

export class EvidenceController {
  async upload(req, res, next) {
    try {
      const { assetId, docType } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'File is required' });
      }

      const result = await evidenceService.attachDocument(
        req.user,
        assetId,
        docType,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const evidenceController = new EvidenceController();
