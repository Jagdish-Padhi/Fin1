import { chainBridge } from '../../core/chain/chain-bridge.js';

export class ValuationService {
  async listValuations(caller) {
    return chainBridge.evaluate(caller, 'listValuations', {});
  }

  async getValuationById(caller, id) {
    return chainBridge.evaluate(caller, 'getValuation', { id });
  }

  async proposeValuation(caller, data) {
    const submission = await chainBridge.submit(caller, 'proposeValuation', data);
    return submission.result || submission;
  }

  async approveValuation(caller, valuationId) {
    const submission = await chainBridge.submit(caller, 'approveValuation', { valuationId });
    return submission.result || submission;
  }
}

export const valuationService = new ValuationService();
