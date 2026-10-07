import { chainBridge } from '../../core/chain/chain-bridge.js';

export class ValuationService {
  async proposeValuation(caller, data) {
    return chainBridge.submit(caller, 'proposeValuation', data);
  }

  async approveValuation(caller, valuationId) {
    return chainBridge.submit(caller, 'approveValuation', { valuationId });
  }
}

export const valuationService = new ValuationService();
