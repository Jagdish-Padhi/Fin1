import crypto from 'crypto';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { SEED_DATA } from '../../../../../db/seeds/seed.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role, InvestorClass } from '@rwa/contracts';
import { scopeParticipants } from '../../core/visibility/index.js';

// In-memory store for encrypted off-chain PII (mirrors Postgres pii_encrypted column)
const offchainPiiStore = new Map();
// In-memory store for KYC documents
const kycDocStore = new Map();

const SALT = 'ekamvistar-consortium-pii-salt-v1';

function redactParticipant(participant, caller) {
  if (!participant) return null;
  const copy = { ...participant };

  // ADMINISTRATOR must NOT see PII or KYC data
  if (caller.role === Role.ADMINISTRATOR) {
    delete copy.pii;
    delete copy.piiHash;
    delete copy.kycDocs;
    delete copy.kycReason;
    delete copy.kycStatus;
    delete copy.kycExpiry;
    delete copy.suspendReason;
    delete copy.blacklistReason;
    return copy;
  }

  const isSelf =
    (caller.participantId && caller.participantId === participant.id) ||
    (caller.userId && caller.userId === participant.userId);

  // If not Compliance or Auditor, and not the user themselves, redact sensitive KYC & reasons & PII
  if (caller.role !== Role.COMPLIANCE && caller.role !== Role.AUDITOR && !isSelf) {
    delete copy.pii;
    delete copy.piiHash;
    delete copy.kycReason;
    delete copy.suspendReason;
    delete copy.blacklistReason;
    delete copy.kycDocs;
    return copy;
  }

  // Attach off-chain PII ONLY if Compliance, Auditor, or own account (NEVER Administrator)
  if (caller.role === Role.AUDITOR || caller.role === Role.COMPLIANCE || isSelf) {
    const storedPii = offchainPiiStore.get(participant.id);
    if (storedPii) {
      copy.pii = storedPii;
    } else {
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
    const participants = list || [];
    // Scope participants by role (no SEED_DATA fallback in real path)
    const redacted = participants.map((p) => redactParticipant(p, caller)).filter(Boolean);
    return scopeParticipants(caller, redacted);
  }

  async lookupCounterparties(caller, query = '') {
    const list = await chainBridge.evaluate(caller, 'listParticipants');
    const participants = list || [];

    const normalizedQ = (query || '').toLowerCase().trim();

    return participants
      .filter((p) => {
        if (p.status !== 'ACTIVE' || p.kycStatus !== 'APPROVED') return false;
        // Don't include self
        if (caller.participantId && p.id === caller.participantId) return false;
        if (!normalizedQ) return true;
        const idMatch = p.id.toLowerCase().includes(normalizedQ);
        const nameMatch = (p.displayName || p.legalName || '').toLowerCase().includes(normalizedQ);
        return idMatch || nameMatch;
      })
      .map((p) => ({
        id: p.id,
        displayName: p.displayName || p.legalName || p.id,
        kycStatus: p.kycStatus,
      }));
  }

  async getParticipant(caller, id) {
    const p = await chainBridge.evaluate(caller, 'getParticipant', { id });
    if (!p) return null;
    return redactParticipant(p, caller);
  }

  async registerParticipant(caller, data) {
    const id = data.id || `PRT-${Date.now()}`;

    // Non-admin can only self-onboard
    if (caller.role !== Role.ADMINISTRATOR) {
      if (data.id && caller.participantId && data.id !== caller.participantId) {
        throw AppError.forbidden('Self-registering participants can only register their own account');
      }
    }

    const piiString = JSON.stringify(data.pii || {});
    const piiHash = crypto.createHash('sha256').update(SALT + piiString).digest('hex');

    if (data.pii) {
      offchainPiiStore.set(id, data.pii);
    }

    const result = await chainBridge.submit(caller, 'registerParticipant', {
      id,
      userId: caller.userId,
      orgId: data.orgId || caller.orgId,
      kind: data.kind || 'INDIVIDUAL',
      jurisdiction: data.jurisdiction || 'IN',
      investorClass: data.investorClass || InvestorClass.RETAIL,
      limits: data.limits || { maxHoldingBps: 2500, maxTransferPaise: 100000000 },
      piiHash,
    });

    return redactParticipant(result.result || result, caller);
  }

  async updateKycStatus(caller, participantId, kycStatus, reason, expiryDate) {
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
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Segregation of Duties: Only Compliance can set investor classification');
    }

    const result = await chainBridge.submit(caller, 'setInvestorClass', {
      participantId,
      investorClass,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async setLimits(caller, participantId, maxHoldingBps, maxTransferPaise, reason) {
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Segregation of Duties: Only Compliance can set participant limits');
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
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Segregation of Duties: Only Compliance can suspend participants');
    }

    const result = await chainBridge.submit(caller, 'suspendParticipant', {
      participantId,
      reason,
    });

    return redactParticipant(result.result || result, caller);
  }

  async reinstateParticipant(caller, participantId, reason) {
    if (caller.role !== Role.COMPLIANCE) {
      throw AppError.forbidden('Segregation of Duties: Only Compliance can reinstate participants');
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
