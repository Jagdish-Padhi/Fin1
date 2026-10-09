import { chainBridge } from '../../core/chain/chain-bridge.js';
import { scopeValuations } from '../../core/visibility/index.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '@rwa/contracts';

export class ValuationService {
  async listValuations(caller) {
    const rawValuations = await chainBridge.evaluate(caller, 'listValuations', {});
    const rawAssets = caller.role === Role.ISSUER ? await chainBridge.evaluate(caller, 'listAssets') : [];
    return scopeValuations(caller, rawValuations || [], rawAssets || []);
  }

  async getValuationById(caller, id) {
    const valuation = await chainBridge.evaluate(caller, 'getValuation', { id });
    if (!valuation) return null;
    const rawAssets = caller.role === Role.ISSUER ? await chainBridge.evaluate(caller, 'listAssets') : [];
    const scoped = scopeValuations(caller, [valuation], rawAssets || []);
    if (scoped.length === 0) {
      throw AppError.notFound(`Valuation ${id} not found or access restricted`);
    }
    return valuation;
  }

  async proposeValuation(caller, data) {
    const submission = await chainBridge.submit(caller, 'proposeValuation', data);
    return submission.result || submission;
  }

  async approveValuation(caller, valuationId) {
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Segregation of Duties: Only Compliance role can approve valuations');
    }
    const submission = await chainBridge.submit(caller, 'approveValuation', { valuationId });
    return submission.result || submission;
  }
}

export const valuationService = new ValuationService();
