import { registryOracleService } from './registry-oracle.service.js';
import { RegistryCheckSchema } from '@rwa/contracts';

export class RegistryOracleController {
  async capabilities(req, res, next) {
    try {
      const data = registryOracleService.capabilities();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async runCheck(req, res, next) {
    try {
      const { caseId } = req.params;
      const parsed = RegistryCheckSchema.parse({ ...req.body, caseId });
      const data = await registryOracleService.runRegistryCheck(req.user, caseId, parsed);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const registryOracleController = new RegistryOracleController();
