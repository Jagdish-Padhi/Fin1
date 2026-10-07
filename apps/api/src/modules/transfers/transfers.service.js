import { chainBridge } from '../../core/chain/chain-bridge.js';

export class TransfersService {
  async listTransfers(caller) {
    return chainBridge.evaluate(caller, 'listTransfers');
  }

  async getTransfer(caller, id) {
    return chainBridge.evaluate(caller, 'getTransfer', { id });
  }

  async proposeTransfer(caller, data) {
    return chainBridge.submit(caller, 'proposeTransfer', {
      tokenId: data.tokenId,
      fromParticipantId: caller.participantId,
      toParticipantId: data.toParticipantId,
      units: data.units,
      pricePaise: data.pricePaise || 0,
      paymentRef: data.paymentRef || '',
    });
  }

  async evaluateTransfer(caller, data) {
    return chainBridge.evaluate(caller, 'evaluateTransfer', data);
  }

  async executeTransfer(caller, transferId) {
    return chainBridge.submit(caller, 'executeTransfer', { transferId });
  }
}

export const transfersService = new TransfersService();
