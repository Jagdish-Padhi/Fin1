import crypto from 'crypto';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { SEED_DATA } from '../../../../../db/seeds/seed.js';

export class ParticipantsService {
  async listParticipants(caller) {
    const list = await chainBridge.evaluate(caller, 'listParticipants');
    // Also include seed participants if not on chain yet
    if (list.length === 0) {
      return SEED_DATA.participants;
    }
    return list;
  }

  async getParticipant(caller, id) {
    const p = await chainBridge.evaluate(caller, 'getParticipant', { id });
    if (!p) {
      return SEED_DATA.participants.find((x) => x.id === id) || null;
    }
    return p;
  }

  async registerParticipant(caller, data) {
    const id = `PRT-${Date.now()}`;
    const piiHash = crypto.createHash('sha256').update(JSON.stringify(data.pii)).digest('hex');

    const result = await chainBridge.submit(caller, 'registerParticipant', {
      id,
      orgId: data.orgId || caller.orgId,
      kind: data.kind,
      jurisdiction: data.jurisdiction || 'IN',
      investorClass: data.investorClass || 'RETAIL',
      piiHash,
    });

    return result;
  }

  async updateKycStatus(caller, participantId, kycStatus, reason) {
    const result = await chainBridge.submit(caller, 'updateKycStatus', {
      participantId,
      kycStatus,
      reason,
    });
    return result;
  }
}

export const participantsService = new ParticipantsService();
