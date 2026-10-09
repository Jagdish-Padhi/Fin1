import { chainBridge } from '../../core/chain/chain-bridge.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '@rwa/contracts';
import { scopeTransfers } from '../../core/visibility/index.js';

export class TransfersService {
  async listTransfers(caller) {
    const raw = await chainBridge.evaluate(caller, 'listTransfers');
    return scopeTransfers(caller, raw || []);
  }

  async getTransfer(caller, id) {
    const t = await chainBridge.evaluate(caller, 'getTransfer', { id });
    if (!t) return null;
    const scoped = scopeTransfers(caller, [t]);
    if (scoped.length === 0) {
      throw AppError.notFound(`Transfer ${id} not found or access restricted`);
    }
    return t;
  }

  async getTransferHistory(caller, tokenId) {
    const raw = await chainBridge.evaluate(caller, 'getTransferHistory', { tokenId });
    return scopeTransfers(caller, raw || []);
  }

  async proposeTransfer(caller, data) {
    if (caller.role !== Role.ISSUER && caller.role !== Role.INVESTOR) {
      throw AppError.forbidden('Only token holders (Issuer or Investor) can propose transfers');
    }

    const fromParticipantId = data.fromParticipantId || caller.participantId || caller.userId;
    if (caller.participantId && fromParticipantId !== caller.participantId) {
      throw AppError.forbidden('Cannot propose transfer from another participant account');
    }

    const submission = await chainBridge.submit(caller, 'proposeTransfer', {
      tokenId: data.tokenId,
      fromParticipantId,
      toParticipantId: data.toParticipantId,
      units: data.units,
      pricePaise: data.pricePaise || 0,
      paymentRef: data.paymentRef || '',
    });
    return submission.result || submission;
  }

  async evaluateTransfer(caller, data) {
    if (caller.role !== Role.ISSUER && caller.role !== Role.INVESTOR) {
      throw AppError.forbidden('Only token holders (Issuer or Investor) can evaluate transfers');
    }
    return chainBridge.evaluate(caller, 'evaluateTransfer', data);
  }

  async executeTransfer(caller, transferId) {
    const transfer = await chainBridge.evaluate(caller, 'getTransfer', { id: transferId });
    if (!transfer) {
      throw AppError.notFound(`Transfer ${transferId} not found`);
    }

    if (caller.role === Role.COMPLIANCE) {
      // Compliance is authorized to execute transfer
    } else {
      const isParty =
        transfer.fromParticipantId === caller.participantId ||
        transfer.toParticipantId === caller.participantId ||
        transfer.from === caller.participantId ||
        transfer.to === caller.participantId;
      if (!isParty) {
        throw AppError.forbidden('Only a party to the transfer or Compliance may execute this transfer');
      }
    }

    const submission = await chainBridge.submit(caller, 'executeTransfer', { transferId });
    return submission.result || submission;
  }

  async cancelTransfer(caller, transferId, reason) {
    const transfer = await chainBridge.evaluate(caller, 'getTransfer', { id: transferId });
    if (!transfer) {
      throw AppError.notFound(`Transfer ${transferId} not found`);
    }

    if (caller.role === Role.COMPLIANCE) {
      if (transfer.status !== 'PENDING_COMPLIANCE') {
        throw AppError.forbidden('Compliance can only resolve transfers with PENDING_COMPLIANCE status');
      }
    } else {
      const isParty =
        transfer.fromParticipantId === caller.participantId ||
        transfer.toParticipantId === caller.participantId ||
        transfer.from === caller.participantId ||
        transfer.to === caller.participantId;
      if (!isParty) {
        throw AppError.forbidden('Only a party to the transfer or Compliance may cancel this transfer');
      }
    }

    const submission = await chainBridge.submit(caller, 'cancelTransfer', { transferId, reason });
    return submission.result || submission;
  }
}

export const transfersService = new TransfersService();
