import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import type { Context } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import { Role, AssetStatus, EventName, VerificationDecision, CheckResult } from '@rwa/contracts';

export interface VerificationCheckRecord {
  result: string;
  notes: string;
  sourceRef?: string;
  checkedBy?: string;
  checkedAt: string;
}

export interface VerificationCaseRecord {
  id: string;
  assetId: string;
  status: string;
  assignedTo?: string | null;
  checks: Record<string, VerificationCheckRecord>;
  decision?: string;
  reasonCode?: string;
  reasonText?: string;
  decidedBy?: string;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
}

@Info({ title: 'VerificationContract', description: 'Governs verification checklist execution and approval' })
export class VerificationContract extends Contract {
  constructor() {
    super('VerificationContract');
  }

  private _getKey(id: string): string {
    return `${Keys.VERIFICATION}:${id}`;
  }

  private _getAssetKey(assetId: string): string {
    return `${Keys.ASSET}:${assetId}`;
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
  async assignVerifier(ctx: Context, caseId: string, verifierUserId?: string): Promise<string> {
    requireRole(ctx, Role.ADMINISTRATOR, Role.COMPLIANCE, Role.VERIFIER);

    const key = this._getKey(caseId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Verification case not found: ${caseId}`);
    }

    const record: VerificationCaseRecord = JSON.parse(bytes.toString());
    const caller = requireRole(ctx, Role.ADMINISTRATOR, Role.COMPLIANCE, Role.VERIFIER);
    record.assignedTo = verifierUserId || caller.userId || caller.participantId || null;
    record.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    return JSON.stringify(record);
  }

  @Transaction()
  @Returns('string')
  async recordCheck(ctx: Context, caseId: string, checkKey: string, result: string, notes: string = '', sourceRef?: string): Promise<string> {
    const caller = requireRole(ctx, Role.VERIFIER);

    const key = this._getKey(caseId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Verification case not found: ${caseId}`);
    }

    const validResultValues = [CheckResult.PASS, CheckResult.FAIL, CheckResult.NOT_APPLICABLE];
    if (!validResultValues.includes(result as any)) {
      throw new Error(`Invalid verification check result '${result}'. Allowed: ${validResultValues.join(', ')}`);
    }

    const record: VerificationCaseRecord = JSON.parse(bytes.toString());
    record.checks[checkKey] = {
      result,
      notes: notes || '',
      sourceRef: sourceRef || '',
      checkedBy: caller.userId || caller.participantId || caller.mspId,
      checkedAt: this._getTxTimestamp(ctx),
    };
    record.status = 'IN_PROGRESS';
    record.updatedAt = record.checks[checkKey].checkedAt;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));

    const events = new EventAggregator();
    events.add('VerificationCheckRecorded', { caseId, checkKey, result, checkedBy: record.checks[checkKey].checkedBy });
    events.commit(ctx);

    await AuditLog.append(
      ctx,
      'VERIFICATION',
      caseId,
      record.status,
      'CHECK_RECORDED',
      'CHECK_RECORDED',
      `${checkKey}:${result}`
    );

    return JSON.stringify(record);
  }

  @Transaction()
  @Returns('string')
  async recordVerificationCheck(ctx: Context, caseId: string, checkKey: string, result: string, notes: string = '', sourceRef?: string): Promise<string> {
    return this.recordCheck(ctx, caseId, checkKey, result, notes, sourceRef);
  }

  @Transaction()
  @Returns('string')
  async decideVerification(
    ctx: Context,
    caseId: string,
    decision: string,
    reasonCode: string,
    reasonText?: string
  ): Promise<string> {
    const caller = requireRole(ctx, Role.VERIFIER);
    const allowedDecisions = [VerificationDecision.APPROVED, VerificationDecision.REJECTED, VerificationDecision.CHANGES_REQUESTED];
    if (!allowedDecisions.includes(decision as any)) {
      throw new Error(`Invalid verification decision '${decision}'. Allowed: ${allowedDecisions.join(', ')}`);
    }
    if (!reasonCode || reasonCode.trim().length === 0) {
      throw new Error('A reasonCode is required for every verification decision');
    }

    const key = this._getKey(caseId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Verification case not found: ${caseId}`);
    }

    const record: VerificationCaseRecord = JSON.parse(bytes.toString());
    const assetKey = this._getAssetKey(record.assetId);
    const assetBytes = await ctx.stub.getState(assetKey);
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`Asset not found for verification case ${caseId}: ${record.assetId}`);
    }

    const asset = JSON.parse(assetBytes.toString());
    if (asset.originatorParticipantId === caller.participantId || asset.originatorParticipantId === caller.userId) {
      throw new Error('Segregation of duties violation: Originator cannot verify their own asset');
    }

    const priorStatus = asset.status;
    record.decision = decision;
    record.reasonCode = reasonCode;
    record.reasonText = reasonText || '';
    record.decidedBy = caller.userId || caller.participantId || caller.mspId;
    record.status = decision;
    record.updatedAt = this._getTxTimestamp(ctx);

    if (decision === VerificationDecision.APPROVED) {
      asset.status = AssetStatus.VERIFIED;
    } else if (decision === VerificationDecision.CHANGES_REQUESTED) {
      asset.status = AssetStatus.CHANGES_REQUESTED;
    } else if (decision === VerificationDecision.REJECTED) {
      asset.status = AssetStatus.REJECTED;
    }
    asset.updatedAt = record.updatedAt;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    await ctx.stub.putState(assetKey, Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'VERIFICATION',
      caseId,
      priorStatus,
      asset.status,
      'VERIFICATION_DECIDED',
      reasonText || reasonCode
    );

    const events = new EventAggregator();
    events.add(EventName.VERIFICATION_DECIDED, {
      caseId,
      assetId: asset.id,
      decision,
      reasonCode,
    });
    events.commit(ctx);

    return JSON.stringify({ asset, verificationCase: record });
  }

  @Transaction()
  @Returns('string')
  async approveVerification(ctx: Context, caseId: string, reasonCode: string = 'APPROVED', reasonText?: string): Promise<string> {
    return this.decideVerification(ctx, caseId, VerificationDecision.APPROVED, reasonCode, reasonText || 'Approved by verifier');
  }

  @Transaction()
  @Returns('string')
  async rejectVerification(ctx: Context, caseId: string, reasonCode: string, reasonText?: string): Promise<string> {
    return this.decideVerification(ctx, caseId, VerificationDecision.REJECTED, reasonCode, reasonText || 'Rejected by verifier');
  }

  @Transaction()
  @Returns('string')
  async requestChanges(ctx: Context, caseId: string, reasonCode: string, reasonText?: string): Promise<string> {
    return this.decideVerification(ctx, caseId, VerificationDecision.CHANGES_REQUESTED, reasonCode, reasonText || 'Changes requested by verifier');
  }

  @Transaction()
  @Returns('string')
  async reopenVerification(ctx: Context, caseId: string, reasonText: string = 'Verification reopened for resubmission'): Promise<string> {
    requireRole(ctx, Role.VERIFIER, Role.ADMINISTRATOR, Role.COMPLIANCE);

    const key = this._getKey(caseId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Verification case not found: ${caseId}`);
    }

    const record: VerificationCaseRecord = JSON.parse(bytes.toString());
    const previous = record.status;
    record.status = 'PENDING_REVIEW';
    record.reasonText = reasonText;
    record.updatedAt = this._getTxTimestamp(ctx);
    delete record.decision;
    delete record.reasonCode;
    delete record.decidedBy;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    await AuditLog.append(ctx, 'VERIFICATION', caseId, previous, 'PENDING_REVIEW', 'VERIFICATION_REOPENED', reasonText);

    return JSON.stringify(record);
  }

  @Transaction(false)
  @Returns('string')
  async getVerificationCase(ctx: Context, caseId: string): Promise<string> {
    const key = this._getKey(caseId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Verification case not found: ${caseId}`);
    }
    return bytes.toString();
  }

  @Transaction(false)
  @Returns('string')
  async listVerificationCases(ctx: Context): Promise<string> {
    const startKey = `${Keys.VERIFICATION}:`;
    const endKey = `${Keys.VERIFICATION}:\uffff`;
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const cases: VerificationCaseRecord[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
        try {
          const record = JSON.parse(Buffer.from(result.value.value).toString('utf8'));
          cases.push(record);
        } catch {
          // ignore parse errors
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(cases);
  }
}
