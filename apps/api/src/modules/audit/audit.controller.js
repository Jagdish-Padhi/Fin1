import { auditService } from './audit.service.js';

export class AuditController {
  async getTrail(req, res, next) {
    try {
      const data = await auditService.getAuditTrail(req.user, req.query.entityId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getExplorer(req, res, next) {
    try {
      const data = await auditService.getExplorerStats(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
