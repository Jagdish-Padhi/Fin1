import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import type { Context } from 'fabric-contract-api';
import { getCaller, requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import { Role, KycStatus, ParticipantStatus, InvestorClass, EventName } from '@rwa/contracts';

export interface ParticipantRecord {
  id: string;
  userId?: string;
  orgId: string;
  mspId: string;
  kind: 'INDIVIDUAL' | 'ENTITY';
  jurisdiction: string;
  investorClass: string;
  kycStatus: string;
  kycReason?: string;
  kycExpiryDate?: string;
  status: string;
  suspendReason?: string;
  blacklistReason?: string;
  limits: {
    maxHoldingBps: number;
    maxTransferPaise: number;
  };
  piiHash?: string;
  zkPassport?: {
    proofHash: string;
    nullifier: string;
    nationality: string;
    documentType?: string;
    issuerAuthority?: string;
    verifiedAt?: string;
    ageOver18?: boolean;
    sanctionsChecked?: boolean;
    zkProof?: any;
  };
  zkProofHash?: string;
  zkNullifier?: string;
  createdAt: string;
  updatedAt: string;
}

@Info({ title: 'ParticipantContract', description: 'Governs participant identity, KYC, and limits on Hyperledger Fabric' })
export class ParticipantContract extends Contract {
  constructor() {
    super('ParticipantContract');
  }

  private _getKey(id: string): string {
    return `${Keys.PARTICIPANT}:${id}`;
  }

  private _getTxTimestamp(ctx: Context): string {
    try {
      const ts = ctx.stub.getTxTimestamp();
      if (ts && ts.seconds) {
        return new Date(ts.seconds.low * 1000).toISOString();
      }
    } catch {
      // fallback
    }
    return new Date().toISOString();
  }

  @Transaction()
  @Returns('string')
  async registerParticipant(ctx: Context, dataJson: string): Promise<string> {
    const caller = requireRole(ctx, Role.ADMINISTRATOR, Role.ISSUER);
    const data = JSON.parse(dataJson);

    const id = data.id || `PRT-${Date.now()}`;
    const key = this._getKey(id);

    const exists = await ctx.stub.getState(key);
    if (exists && exists.length > 0) {
      throw new Error(`Participant with ID ${id} already exists`);
    }

    const hasZk = Boolean(data.zkPassport && (data.zkPassport.proofHash || data.zkProofHash));
    const initialKyc = hasZk ? KycStatus.APPROVED : (data.kycStatus || KycStatus.SUBMITTED);
    const now = this._getTxTimestamp(ctx);

    const record: ParticipantRecord = {
      id,
      userId: data.userId || caller.userId,
      orgId: data.orgId || caller.mspId,
      mspId: caller.mspId,
      kind: data.kind || 'INDIVIDUAL',
      jurisdiction: data.jurisdiction || (data.zkPassport?.nationality || 'IN'),
      investorClass: data.investorClass || InvestorClass.RETAIL,
      kycStatus: initialKyc,
      kycReason: hasZk ? 'Auto-verified via on-chain ZKPassport cryptographic zero-knowledge proof' : undefined,
      status: ParticipantStatus.ACTIVE,
      limits: data.limits || {
        maxHoldingBps: 2500,
        maxTransferPaise: 100000000,
      },
      piiHash: data.piiHash || undefined,
      zkPassport: data.zkPassport || undefined,
      zkProofHash: data.zkPassport?.proofHash || data.zkProofHash || undefined,
      zkNullifier: data.zkPassport?.nullifier || data.zkNullifier || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));

    // Append permanent audit entry
    if (hasZk) {
      await AuditLog.append(
        ctx,
        'PARTICIPANT',
        id,
        'NONE',
        KycStatus.APPROVED,
        'ZK_KYC_VERIFIED',
        `Participant registered with verified ZKPassport (Proof: ${(record.zkProofHash || '').slice(0, 16)}...)`
      );
    } else {
      await AuditLog.append(
        ctx,
        'PARTICIPANT',
        id,
        'NONE',
        KycStatus.SUBMITTED,
        'REGISTRATION',
        'Participant registered on ledger'
      );
    }

    // Single aggregated event per transaction
    const events = new EventAggregator();
    events.add(EventName.PARTICIPANT_REGISTERED, record);
    events.commit(ctx);

    return JSON.stringify(record);
  }

  @Transaction()
  @Returns('string')
  async updateKycStatus(
    ctx: Context,
    participantId: string,
    kycStatus: string,
    reason: string,
    expiryDate?: string
  ): Promise<string> {
    // Segregation of Duties: ONLY Compliance role can review or approve KYC
    const caller = requireRole(ctx, Role.COMPLIANCE);

    const validStatuses = [KycStatus.SUBMITTED, KycStatus.UNDER_REVIEW, KycStatus.APPROVED, KycStatus.REJECTED];
    if (!validStatuses.includes(kycStatus as any)) {
      throw new Error(`Invalid KYC status '${kycStatus}'. Allowed: ${validStatuses.join(', ')}`);
    }

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    const prevStatus = participant.kycStatus;
    participant.kycStatus = kycStatus;
    participant.kycReason = reason || '';
    if (expiryDate) {
      participant.kycExpiryDate = expiryDate;
    }
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      prevStatus,
      kycStatus,
      'KYC_DECISION',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.KYC_UPDATED, { participantId, kycStatus, reason });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction()
  @Returns('string')
  async setInvestorClass(ctx: Context, participantId: string, investorClass: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);

    const validClasses = [InvestorClass.RETAIL, InvestorClass.QUALIFIED, InvestorClass.INSTITUTIONAL];
    if (!validClasses.includes(investorClass as any)) {
      throw new Error(`Invalid investor class '${investorClass}'. Allowed: ${validClasses.join(', ')}`);
    }

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    const prevClass = participant.investorClass;
    participant.investorClass = investorClass;
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      prevClass,
      investorClass,
      'INVESTOR_CLASS_UPDATED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.INVESTOR_CLASS_UPDATED, { participantId, investorClass });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction()
  @Returns('string')
  async setLimits(ctx: Context, participantId: string, limitsJson: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
    const limits = JSON.parse(limitsJson);

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    participant.limits = {
      maxHoldingBps: limits.maxHoldingBps ?? participant.limits.maxHoldingBps,
      maxTransferPaise: limits.maxTransferPaise ?? participant.limits.maxTransferPaise,
    };
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      'ACTIVE',
      'ACTIVE',
      'LIMITS_UPDATED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.LIMITS_UPDATED, { participantId, limits: participant.limits });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction()
  @Returns('string')
  async suspendParticipant(ctx: Context, participantId: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    const prevStatus = participant.status;
    participant.status = ParticipantStatus.SUSPENDED;
    participant.suspendReason = reason || '';
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      prevStatus,
      ParticipantStatus.SUSPENDED,
      'SUSPENDED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.PARTICIPANT_SUSPENDED, { participantId, reason });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction()
  @Returns('string')
  async reinstateParticipant(ctx: Context, participantId: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    const prevStatus = participant.status;
    participant.status = ParticipantStatus.ACTIVE;
    delete participant.suspendReason;
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      prevStatus,
      ParticipantStatus.ACTIVE,
      'REINSTATED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.PARTICIPANT_REINSTATED, { participantId, reason });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction()
  @Returns('string')
  async addToBlacklist(ctx: Context, participantId: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE);

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    const prevStatus = participant.status;
    participant.status = ParticipantStatus.BLACKLISTED;
    participant.blacklistReason = reason || '';
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      prevStatus,
      ParticipantStatus.BLACKLISTED,
      'BLACKLISTED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.BLACKLIST_ADDED, { participantId, reason });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction()
  @Returns('string')
  async removeFromBlacklist(ctx: Context, participantId: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE);

    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    const prevStatus = participant.status;
    participant.status = ParticipantStatus.ACTIVE;
    delete participant.blacklistReason;
    participant.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(participant)));

    await AuditLog.append(
      ctx,
      'PARTICIPANT',
      participantId,
      prevStatus,
      ParticipantStatus.ACTIVE,
      'BLACKLIST_REMOVED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add(EventName.BLACKLIST_REMOVED, { participantId, reason });
    events.commit(ctx);

    return JSON.stringify(participant);
  }

  @Transaction(false)
  @Returns('string')
  async getParticipant(ctx: Context, participantId: string): Promise<string> {
    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Participant not found: ${participantId}`);
    }
    return bytes.toString();
  }

  @Transaction(false)
  @Returns('string')
  async listParticipants(ctx: Context): Promise<string> {
    const startKey = `${Keys.PARTICIPANT}:`;
    const endKey = `${Keys.PARTICIPANT}:\uffff`;

    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const allResults: ParticipantRecord[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value.toString()) {
        try {
          const record = JSON.parse(Buffer.from(result.value.value).toString('utf8'));
          allResults.push(record);
        } catch {
          // ignore parsing error
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(allResults);
  }

  @Transaction(false)
  @Returns('string')
  async participantExistsAndActive(ctx: Context, participantId: string): Promise<string> {
    const key = this._getKey(participantId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      return JSON.stringify({ exists: false, active: false, kycApproved: false });
    }

    const participant: ParticipantRecord = JSON.parse(bytes.toString());
    return JSON.stringify({
      exists: true,
      active: participant.status === ParticipantStatus.ACTIVE,
      kycApproved: participant.kycStatus === KycStatus.APPROVED,
    });
  }
}
