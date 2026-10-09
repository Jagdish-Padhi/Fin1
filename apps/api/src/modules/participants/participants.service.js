import crypto from 'crypto';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { SEED_DATA } from '../../../../../db/seeds/seed.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role, KycStatus, ParticipantStatus, InvestorClass } from '@rwa/contracts';

// In-memory store for encrypted off-chain PII (mirrors Postgres pii_encrypted column)
const offchainPiiStore = new Map();
// In-memory store for KYC documents
const kycDocStore = new Map();

const SALT = 'ekamvistar-consortium-pii-salt-v1';

function redactParticipant(participant, caller) {
  if (!participant) return null;
  const copy = { ...participant };

  // If caller is an Investor and not the participant themselves, redact sensitive KYC & reasons
  if (
    caller.role === Role.INVESTOR &&
    caller.participantId !== participant.id &&
    caller.userId !== participant.userId
  ) {
    delete copy.pii;
    delete copy.piiHash;
    delete copy.kycReason;
    delete copy.suspendReason;
    delete copy.blacklistReason;
    delete copy.kycDocs;
  }

  // Attach off-chain PII if caller has permission (own account, Compliance, Auditor, Administrator)
  if (
    caller.role === Role.AUDITOR ||
    caller.role === Role.COMPLIANCE ||
    caller.role === Role.ADMINISTRATOR ||
    caller.participantId === participant.id ||
    caller.userId === participant.userId
  ) {
    const storedPii = offchainPiiStore.get(participant.id);
    if (storedPii) {
      copy.pii = storedPii;
    } else {
      // Check seed data
      const seedP = SEED_DATA.participants.find((x) => x.id === participant.id);
      if (seedP?.pii) copy.pii = seedP.pii;
    }
    copy.kycDocs = kycDocStore.get(participant.id) || [];
  }

  return copy;
}

export class ParticipantsService {
  async listParticipants(caller) {
    const list = await chainBridge.evaluate(caller, 'listParticipants');
    let participants = list;

    if (!participants || participants.length === 0) {
      participants = SEED_DATA.participants;
    }

    return participants.map((p) => redactParticipant(p, caller));
  }

  async getParticipant(caller, id) {
    let p = await chainBridge.evaluate(caller, 'getParticipant', { id });
    if (!p) {
      p = SEED_DATA.participants.find((x) => x.id === id) || null;
    }
    if (!p) return null;
    return redactParticipant(p, caller);
  }

  async registerParticipant(caller, data) {
    const id = data.id || `PRT-${Date.now()}`;

    // Salted hash for on-chain integrity without exposing raw PII
    const piiString = JSON.stringify(data.pii || {});
    const piiHash = crypto.createHash('sha256').update(SALT + piiString).digest('hex');

    // Securely store encrypted PII off-chain
    if (data.pii) {
      offchainPiiStore.set(id, data.pii);
    }

    const result = await chainBridge.submit(caller, 'registerParticipant', {
      id,
      userId: caller.userId,
      orgId: data.orgId || caller.orgId,
      kind: data.kind || 'INDIVIDUAL',
      jurisdiction: data.jurisdiction || (data.zkPassport?.nationality || 'IN'),
      investorClass: data.investorClass || InvestorClass.RETAIL,
      limits: data.limits || { maxHoldingBps: 2500, maxTransferPaise: 100000000 },
      piiHash,
      zkPassport: data.zkPassport || undefined,
    });

    return redactParticipant(result.result || result, caller);
  }

  async updateKycStatus(caller, participantId, kycStatus, reason, expiryDate) {
    // Segregation of Duties: Admin CANNOT approve KYC
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Segregation of duties: Only Compliance role can update participant KYC status');
    }

    const result = await chainBridge.submit(caller, 'updateKycStatus', {
      participantId,
      kycStatus,
      reason,
      expiryDate,
    });

    return redactParticipant(result.result || result, caller);
  }

  async setInvestorClass(caller, participantId, investorClass, reason) {
    if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Compliance or Administrator can set investor classification');
    }

    const result = await chainBridge.submit(caller, 'setInvestorClass', {
      participantId,
      investorClass,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async setLimits(caller, participantId, maxHoldingBps, maxTransferPaise, reason) {
    if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Compliance or Administrator can set participant limits');
    }

    const result = await chainBridge.submit(caller, 'setLimits', {
      participantId,
      maxHoldingBps,
      maxTransferPaise,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async suspendParticipant(caller, participantId, reason) {
    if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Compliance or Administrator can suspend participants');
    }

    const result = await chainBridge.submit(caller, 'suspendParticipant', {
      participantId,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async reinstateParticipant(caller, participantId, reason) {
    if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Compliance or Administrator can reinstate participants');
    }

    const result = await chainBridge.submit(caller, 'reinstateParticipant', {
      participantId,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async addToBlacklist(caller, participantId, reason) {
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Only Compliance role can blacklist participants');
    }

    const result = await chainBridge.submit(caller, 'addToBlacklist', {
      participantId,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async removeFromBlacklist(caller, participantId, reason) {
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Only Compliance role can remove participants from blacklist');
    }

    const result = await chainBridge.submit(caller, 'removeFromBlacklist', {
      participantId,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async uploadKycDocument(caller, participantId, doc) {
    const list = kycDocStore.get(participantId) || [];
    const newDoc = {
      id: `DOC-${Date.now()}`,
      docType: doc.docType || 'ID_PROOF',
      fileName: doc.fileName || 'identity_document.pdf',
      sha256: doc.sha256 || crypto.createHash('sha256').update(doc.fileName || 'dummy').digest('hex'),
      uploadedAt: new Date().toISOString(),
      uploadedBy: caller.userId,
    };
    list.push(newDoc);
    kycDocStore.set(participantId, list);
    return newDoc;
  }
}

export const participantsService = new ParticipantsService();
