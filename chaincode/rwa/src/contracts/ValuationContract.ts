import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import type { Context } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import { Role, AssetStatus, EventName, ValuationStatus, VerificationDecision } from '@rwa/contracts';

export interface ValuationRecord {
  id: string;
  assetId: string;
  version: number;
  amountPaise: number;
  currency: string;
  method: string;
  methodDetails: Record<string, unknown>;
  source: {
    valuerName: string;
    valuerOrg: string;
    reportReference?: string;
    reportHash?: string;
  };
  valuationDate: string;
  validUntil: string;
  status: string;
  proposedBy: string;
  proposedByMspId: string;
  createdAt: string;
  approvedBy?: string;
  approvedByMspId?: string;
  approvedAt?: string;
}

@Info({ title: 'ValuationContract', description: 'Governs asset valuation proposals and maker-checker approval' })
export class ValuationContract extends Contract {
  constructor() {
    super('ValuationContract');
  }

  private _getKey(id: string): string {
    return `${Keys.VALUATION}:${id}`;
  }

  private _getAssetKey(assetId: string): string {
    return `${Keys.ASSET}:${assetId}`;
  }

  private _getTxTimestamp(ctx: Context): string {
    const ts = ctx.stub.getTxTimestamp();
    if (!ts || !ts.seconds) {
      throw new Error('Transaction timestamp is unavailable');
    }
    return new Date(ts.seconds.low * 1000).toISOString();
  }

  private _isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private _validateDate(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${field} is required and must be a valid date`);
    }

    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field} must be a valid date`);
    }
    return new Date(parsed).toISOString();
  }

  private _getValuationId(input: string, property: 'id' | 'valuationId'): string {
    if (typeof input !== 'string' || input.trim() === '') {
      throw new Error(`${property} is required`);
    }
    const trimmed = input.trim();
    if (!trimmed.startsWith('{')) return trimmed;

    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      throw new Error(`Invalid ${property} JSON`);
    }
    if (!this._isRecord(payload) || typeof payload[property] !== 'string' || payload[property].trim() === '') {
      throw new Error(`${property} is required`);
    }
    return payload[property].trim();
  }

  private async _getAsset(ctx: Context, assetId: string): Promise<any> {
    const bytes = await ctx.stub.getState(this._getAssetKey(assetId));
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    return JSON.parse(bytes.toString());
  }

  private async _getApprovedVerifier(ctx: Context, asset: any): Promise<string> {
    if (asset.verifiedBy || asset.verification?.decidedBy) {
      return asset.verifiedBy || asset.verification.decidedBy;
    }

    const iterator = await ctx.stub.getStateByRange(
      `${Keys.VERIFICATION}:`,
      `${Keys.VERIFICATION}:\uffff`
    );
    let verifierId: string | undefined;
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          const record = JSON.parse(Buffer.from(result.value.value).toString('utf8'));
          if (
            record.assetId === asset.id &&
            record.decision === VerificationDecision.APPROVED &&
            record.decidedBy
          ) {
            verifierId = record.decidedBy;
          }
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }

    if (!verifierId) {
      throw new Error(`Approved verifier identity not found for asset ${asset.id}`);
    }
    return verifierId;
  }

  private async _getIssuerMspId(ctx: Context, asset: any): Promise<string> {
    if (asset.originatorMspId) return asset.originatorMspId;
    if (!asset.originatorParticipantId) {
      throw new Error(`Originator identity not found for asset ${asset.id}`);
    }

    const participantBytes = await ctx.stub.getState(`${Keys.PARTICIPANT}:${asset.originatorParticipantId}`);
    if (!participantBytes || participantBytes.length === 0) {
      throw new Error(`Originator participant not found: ${asset.originatorParticipantId}`);
    }
    const participant = JSON.parse(participantBytes.toString());
    if (!participant.mspId) {
      throw new Error(`Originator organization not found for participant ${asset.originatorParticipantId}`);
    }
    return participant.mspId;
  }

  @Transaction()
  @Returns('string')
  async proposeValuation(ctx: Context, valuationJson: string): Promise<string> {
    const caller = requireRole(ctx, Role.VALUER);
    let data: any;
    try {
      data = JSON.parse(valuationJson);
    } catch {
      throw new Error('Invalid valuation JSON');
    }

    if (!this._isRecord(data)) {
      throw new Error('Valuation payload must be a JSON object');
    }
    if (typeof data.assetId !== 'string' || data.assetId.trim() === '') {
      throw new Error('assetId is required');
    }
    const assetId = data.assetId.trim();
    if (typeof data.amountPaise !== 'number' || !Number.isSafeInteger(data.amountPaise) || data.amountPaise <= 0) {
      throw new Error('amountPaise must be a positive safe integer');
    }
    const amountPaise = data.amountPaise;
    if (data.currency !== 'INR') {
      throw new Error('Only INR valuations are supported');
    }
    const currency = data.currency;
    if (typeof data.method !== 'string' || data.method.trim() === '') {
      throw new Error('method is required');
    }
    const method = data.method.trim();
    if (data.methodDetails !== undefined && !this._isRecord(data.methodDetails)) {
      throw new Error('methodDetails must be a JSON object');
    }
    const methodDetails = (data.methodDetails === undefined ? {} : data.methodDetails) as Record<string, unknown>;
    if (!this._isRecord(data.source)) {
      throw new Error('source is required and must be a JSON object');
    }
    const source = data.source as {
      valuerName: string;
      valuerOrg: string;
      reportReference?: string;
      reportHash?: string;
    };
    if (typeof data.source.valuerName !== 'string' || data.source.valuerName.trim().length < 2) {
      throw new Error('source.valuerName must contain at least 2 characters');
    }
    if (typeof data.source.valuerOrg !== 'string' || data.source.valuerOrg.trim().length < 2) {
      throw new Error('source.valuerOrg must contain at least 2 characters');
    }
    if (
      data.source.reportHash !== undefined &&
      (typeof data.source.reportHash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(data.source.reportHash))
    ) {
      throw new Error('source.reportHash must be a 64-character SHA-256 hex digest');
    }

    const valuationDate = this._validateDate(data.valuationDate, 'valuationDate');
    const validUntil = this._validateDate(data.validUntil, 'validUntil');
    const now = this._getTxTimestamp(ctx);
    if (Date.parse(valuationDate) > Date.parse(now)) {
      throw new Error('valuationDate cannot be in the future');
    }
    if (Date.parse(validUntil) <= Date.parse(now) || Date.parse(validUntil) <= Date.parse(valuationDate)) {
      throw new Error('validUntil must be after valuationDate and the current transaction time');
    }

    const asset = await this._getAsset(ctx, assetId);
    if (asset.status !== AssetStatus.VERIFIED) {
      throw new Error(`Asset must be VERIFIED before valuation, currently: ${asset.status}`);
    }

    const typeKey = `${Keys.ASSET_TYPE}:${asset.typeKey}:${asset.typeVersion || 1}`;
    const typeBytes = await ctx.stub.getState(typeKey);
    if (!typeBytes || typeBytes.length === 0) {
      throw new Error(`Asset type not found: ${asset.typeKey} v${asset.typeVersion || 1}`);
    }
    const typeDef = JSON.parse(typeBytes.toString());
    const allowedMethods = typeDef.valuation?.methods;
    if (!Array.isArray(allowedMethods) || !allowedMethods.includes(method)) {
      throw new Error(`Valuation method '${method}' is not allowed for asset type ${asset.typeKey}`);
    }
    const validityDays = typeDef.valuation?.validityDays;
    if (Number.isSafeInteger(validityDays) && validityDays > 0) {
      const latestValidUntil = Date.parse(valuationDate) + validityDays * 24 * 60 * 60 * 1000;
      if (Date.parse(validUntil) > latestValidUntil) {
        throw new Error(`validUntil exceeds the asset type validity limit of ${validityDays} days`);
      }
    }

    const issuerMspId = await this._getIssuerMspId(ctx, asset);
    if (caller.mspId === issuerMspId) {
      throw new Error('Segregation of duties violation: Valuer organization cannot be the issuer organization');
    }
    const verifierId = await this._getApprovedVerifier(ctx, asset);
    const proposerId = caller.userId || caller.participantId || caller.mspId;
    if (proposerId === verifierId) {
      throw new Error('Segregation of duties violation: Asset verifier cannot propose its valuation');
    }

    const iterator = await ctx.stub.getStateByRange(`${Keys.VALUATION}:`, `${Keys.VALUATION}:\uffff`);
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          const existing: ValuationRecord = JSON.parse(Buffer.from(result.value.value).toString('utf8'));
          if (existing.assetId === asset.id && existing.status === ValuationStatus.PROPOSED) {
            throw new Error(`A valuation proposal is already pending for asset ${asset.id}`);
          }
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }

    if (data.id !== undefined && (typeof data.id !== 'string' || data.id.trim() === '')) {
      throw new Error('id must be a non-empty string when provided');
    }
    const id = typeof data.id === 'string' ? data.id.trim() : `VAL-${ctx.stub.getTxID()}`;
    const key = this._getKey(id);
    const existingBytes = await ctx.stub.getState(key);
    if (existingBytes && existingBytes.length > 0) {
      throw new Error(`Valuation with ID ${id} already exists`);
    }

    const record: ValuationRecord = {
      id,
      assetId: asset.id,
      version: 1,
      amountPaise,
      currency,
      method,
      methodDetails,
      source: {
        valuerName: source.valuerName.trim(),
        valuerOrg: source.valuerOrg.trim(),
        reportReference: source.reportReference,
        reportHash: source.reportHash?.toLowerCase(),
      },
      valuationDate,
      validUntil,
      status: ValuationStatus.PROPOSED,
      proposedBy: proposerId,
      proposedByMspId: caller.mspId,
      createdAt: now,
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    await AuditLog.append(
      ctx,
      'VALUATION',
      id,
      'NONE',
      ValuationStatus.PROPOSED,
      'VALUATION_PROPOSED',
      `Valuation proposed for asset ${asset.id}`
    );

    const events = new EventAggregator();
    events.add(EventName.VALUATION_PROPOSED, record);
    events.commit(ctx);

    return JSON.stringify(record);
  }

  @Transaction()
  @Returns('string')
  async approveValuation(ctx: Context, valuationInput: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE, Role.VALUER);
    const valuationId = this._getValuationId(valuationInput, 'valuationId');

    const valuationKey = this._getKey(valuationId);
    const valuationBytes = await ctx.stub.getState(valuationKey);
    if (!valuationBytes || valuationBytes.length === 0) {
      throw new Error(`Valuation not found: ${valuationId}`);
    }
    const valuation: ValuationRecord = JSON.parse(valuationBytes.toString());
    if (valuation.status !== ValuationStatus.PROPOSED) {
      throw new Error(`Only PROPOSED valuations can be approved, currently: ${valuation.status}`);
    }

    const callerId = caller.userId || caller.participantId || caller.mspId;
    if (valuation.proposedBy === callerId) {
      throw new Error('Maker-checker violation: Valuation proposer cannot approve their own valuation');
    }

    const asset = await this._getAsset(ctx, valuation.assetId);
    if (asset.status !== AssetStatus.VERIFIED) {
      throw new Error(`Asset must remain VERIFIED until valuation approval, currently: ${asset.status}`);
    }

    const verifierId = await this._getApprovedVerifier(ctx, asset);
    if (callerId === verifierId) {
      throw new Error('Segregation of duties violation: Asset verifier cannot approve its valuation');
    }

    const issuerMspId = await this._getIssuerMspId(ctx, asset);
    if (caller.mspId === issuerMspId) {
      throw new Error('Segregation of duties violation: Issuer organization cannot approve the valuation');
    }

    const now = this._getTxTimestamp(ctx);
    if (Date.parse(valuation.validUntil) <= Date.parse(now)) {
      throw new Error('Valuation has expired and cannot be approved');
    }

    const previousAssetStatus = asset.status;
    valuation.status = ValuationStatus.APPROVED;
    valuation.approvedBy = callerId;
    valuation.approvedByMspId = caller.mspId;
    valuation.approvedAt = now;
    asset.status = AssetStatus.VALUED;
    asset.valuationId = valuation.id;
    asset.updatedAt = now;

    await ctx.stub.putState(valuationKey, Buffer.from(JSON.stringify(valuation)));
    await ctx.stub.putState(this._getAssetKey(asset.id), Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'VALUATION',
      valuation.id,
      ValuationStatus.PROPOSED,
      ValuationStatus.APPROVED,
      'VALUATION_APPROVED',
      `Valuation approved for asset ${asset.id}`
    );
    await AuditLog.append(
      ctx,
      'ASSET',
      asset.id,
      previousAssetStatus,
      AssetStatus.VALUED,
      'VALUATION_APPROVED',
      `Valuation ${valuation.id} approved`
    );

    const events = new EventAggregator();
    events.add(EventName.VALUATION_APPROVED, { valuation, assetId: asset.id, assetStatus: asset.status });
    events.commit(ctx);

    return JSON.stringify({ valuation, asset });
  }

  @Transaction(false)
  @Returns('string')
  async getValuation(ctx: Context, valuationInput: string): Promise<string> {
    const valuationId = this._getValuationId(valuationInput, 'id');
    const bytes = await ctx.stub.getState(this._getKey(valuationId));
    if (!bytes || bytes.length === 0) {
      throw new Error(`Valuation not found: ${valuationId}`);
    }
    return bytes.toString();
  }

  @Transaction(false)
  @Returns('string')
  async listValuations(ctx: Context): Promise<string> {
    const iterator = await ctx.stub.getStateByRange(`${Keys.VALUATION}:`, `${Keys.VALUATION}:\uffff`);
    const records: ValuationRecord[] = [];
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          records.push(JSON.parse(Buffer.from(result.value.value).toString('utf8')));
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    return JSON.stringify(records);
  }
}
