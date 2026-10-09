import { valuationIndicationService } from './valuation-indication.service.js';
import { ValuationIndicationSchema } from '@rwa/contracts';

export class ValuationIndicationController {
  async indicate(req, res, next) {
    try {
      const parsed = ValuationIndicationSchema.parse(req.body);
      const data = await valuationIndicationService.indicate(req.user, parsed);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const valuationIndicationController = new ValuationIndicationController();
