import { valuationService } from './valuation.service.js';
import { ProposeValuationSchema } from '@rwa/contracts';

export class ValuationController {
  async list(req, res, next) {
    try {
      const data = await valuationService.listValuations(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await valuationService.getValuationById(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async propose(req, res, next) {
    try {
      const payload = ProposeValuationSchema.parse(req.body);
      const data = await valuationService.proposeValuation(req.user, payload);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async approve(req, res, next) {
    try {
      const data = await valuationService.approveValuation(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const valuationController = new ValuationController();
