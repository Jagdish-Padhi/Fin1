import { transfersService } from './transfers.service.js';
import { ProposeTransferSchema } from '@rwa/contracts';

export class TransfersController {
  async list(req, res, next) {
    try {
      const data = await transfersService.listTransfers(req.user);
      res.json({ success: true, data: data || [] });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await transfersService.getTransfer(req.user, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Transfer record not found' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const data = await transfersService.getTransferHistory(req.user, req.params.tokenId);
      res.json({ success: true, data: data || [] });
    } catch (err) {
      next(err);
    }
  }

  async propose(req, res, next) {
    try {
      const parsed = ProposeTransferSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.format(),
        });
      }
      const data = await transfersService.proposeTransfer(req.user, parsed.data);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async evaluate(req, res, next) {
    try {
      const data = await transfersService.evaluateTransfer(req.user, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async execute(req, res, next) {
    try {
      const data = await transfersService.executeTransfer(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const data = await transfersService.cancelTransfer(req.user, req.params.id, req.body?.reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const transfersController = new TransfersController();
