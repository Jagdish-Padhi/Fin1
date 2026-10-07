import { transfersService } from './transfers.service.js';

export class TransfersController {
  async list(req, res, next) {
    try {
      const data = await transfersService.listTransfers(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await transfersService.getTransfer(req.user, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Transfer record not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async propose(req, res, next) {
    try {
      const data = await transfersService.proposeTransfer(req.user, req.body);
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
}

export const transfersController = new TransfersController();
