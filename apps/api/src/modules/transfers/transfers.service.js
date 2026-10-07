import { chainBridge } from '../../core/chain/chain-bridge.js';

export class TransfersService {
  async listTransfers(caller) {
    return chainBridge.evaluate(caller, 'listTransfers');
  }

  async getTransfer(caller, id) {
    return chainBridge.evaluate(caller, 'getTransfer', { id });
  }

  async getTransferHistory(caller, tokenId) {
    return chainBridge.evaluate(caller, 'getTransferHistory', { tokenId });
  }

  async proposeTransfer(caller, data) {
    const submission = await chainBridge.submit(caller, 'proposeTransfer', {
      tokenId: data.tokenId,
      fromParticipantId: data.fromParticipantId || caller.participantId || caller.userId,
      toParticipantId: data.toParticipantId,
      units: data.units,
      pricePaise: data.pricePaise || 0,
      paymentRef: data.paymentRef || '',
    });
    return submission.result || submission;
  }

  async evaluateTransfer(caller, data) {
    return chainBridge.evaluate(caller, 'evaluateTransfer', data);
  }

  async executeTransfer(caller, transferId) {
    const submission = await chainBridge.submit(caller, 'executeTransfer', { transferId });
    return submission.result || submission;
  }

  async cancelTransfer(caller, transferId, reason) {
    const submission = await chainBridge.submit(caller, 'cancelTransfer', { transferId, reason });
    return submission.result || submission;
  }
}

export const transfersService = new TransfersService();
