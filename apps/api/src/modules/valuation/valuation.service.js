import { chainBridge } from '../../core/chain/chain-bridge.js';

export class ValuationService {
  async listValuations(caller) {
    return chainBridge.evaluate(caller, 'listValuations', {});
  }

  async getValuationById(caller, id) {
    return chainBridge.evaluate(caller, 'getValuation', { id });
  }

  async proposeValuation(caller, data) {
    return chainBridge.submit(caller, 'proposeValuation', data);
  }

  async approveValuation(caller, valuationId) {
    return chainBridge.submit(caller, 'approveValuation', { valuationId });
  }
}

export const valuationService = new ValuationService();
