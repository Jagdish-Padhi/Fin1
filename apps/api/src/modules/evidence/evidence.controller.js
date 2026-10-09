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

  async download(req, res, next) {
    try {
      const { id } = req.params;
      const fileData = await evidenceService.downloadDocument(req.user, id);

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.fileName)}"`);
      res.setHeader('X-Evidence-SHA256', fileData.sha256);
      res.status(200).send(fileData.buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const evidenceController = new EvidenceController();
