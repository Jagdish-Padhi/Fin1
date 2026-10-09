import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import type { Context } from 'fabric-contract-api';
import { getCaller, requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import {
  Role,
  AssetStatus,
  TokenStandard,
  TransferStatus,
  TransferRuleReason,
  EventName,
} from '@rwa/contracts';

export interface TransferRecord {
  id: string;
  tokenId: string;
  fromParticipantId: string;
  toParticipantId: string;
  units: number;
  pricePaise: number;
  paymentRef?: string;
  status: string;
  ruleResults: Record<string, any>;
  rejectionReasons: Array<{
    code: string;
    message: string;
    observedValue?: any;
    limit?: any;
  }>;
  proposedBy: string;
  proposedByMspId: string;
  createdAt: string;
  executedAt?: string;
  executedTxId?: string;
  decidedBy?: string;
  decidedByMspId?: string;
}

export interface RuleEvaluationResult {
  passed: boolean;
  results: Record<string, any>;
  rejectionReasons: Array<{
    code: string;
    message: string;
    observedValue?: any;
    limit?: any;
  }>;
}

@Info({
  title: 'TransferContract',
  description:
    'Governs transfer proposals, comprehensive rule checks, and first-class rejected transfer audit on Hyperledger Fabric',
})
export class TransferContract extends Contract {
  constructor() {
    super('TransferContract');
  }

  private _transferKey(id: string): string {
    return `${Keys.TRANSFER}:${id}`;
  }

  private _tokenKey(id: string): string {
    return `${Keys.TOKEN}:${id}`;
  }

  private _balanceKey(tokenId: string, participantId: string): string {
    return `${Keys.BALANCE}:${tokenId}:${participantId}`;
  }

  private _assetKey(id: string): string {
    return `${Keys.ASSET}:${id}`;
  }

  private _assetTypeKey(key: string, version: number = 1): string {
    return `${Keys.ASSET_TYPE}:${key}:${version}`;
  }

  private _participantKey(id: string): string {
    return `${Keys.PARTICIPANT}:${id}`;
  }

  private _parseObject(
    input: string,
    description: string
  ): Record<string, any> {
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error(`Invalid ${description} JSON`);
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${description} must be a JSON object`);
    }
    return value as Record<string, any>;
  }

  private _requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${field} is required`);
    }
    return value.trim();
  }

  private _parseId(input: string, property: string): string {
    if (typeof input !== 'string' || input.trim() === '') {
      throw new Error(`${property} is required`);
    }
    const trimmed = input.trim();
    if (!trimmed.startsWith('{')) return trimmed;
    const value = this._parseObject(trimmed, property);
    return this._requiredString(value[property] || value.id, property);
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

  private async _evaluateRules(
    ctx: Context,
    transferData: {
      tokenId: string;
      fromParticipantId: string;
      toParticipantId: string;
      units: number;
      pricePaise?: number;
    }
  ): Promise<RuleEvaluationResult> {
    const results: Record<string, any> = {};
    const rejectionReasons: Array<{
      code: string;
      message: string;
      observedValue?: any;
      limit?: any;
    }> = [];

    // 1. Load Token
    const tokenBytes = await ctx.stub.getState(
      this._tokenKey(transferData.tokenId)
    );
    if (!tokenBytes || tokenBytes.length === 0) {
      throw new Error(`Token not found: ${transferData.tokenId}`);
    }
    const token = JSON.parse(tokenBytes.toString());

    // 2. Load Asset (if available)
    let asset: any = null;
    if (token.assetId) {
      const assetBytes = await ctx.stub.getState(
        this._assetKey(token.assetId)
      );
      if (assetBytes && assetBytes.length > 0) {
        asset = JSON.parse(assetBytes.toString());
      }
    }

    // 3. Load Asset Type (if available)
    let assetType: any = null;
    if (asset?.typeKey) {
      const typeBytes = await ctx.stub.getState(
        this._assetTypeKey(asset.typeKey, asset.typeVersion || 1)
      );
      if (typeBytes && typeBytes.length > 0) {
        assetType = JSON.parse(typeBytes.toString());
      }
    }

    // 4. Load Participants
    const senderBytes = await ctx.stub.getState(
      this._participantKey(transferData.fromParticipantId)
    );
    const receiverBytes = await ctx.stub.getState(
      this._participantKey(transferData.toParticipantId)
    );
    const sender =
      senderBytes && senderBytes.length > 0
        ? JSON.parse(senderBytes.toString())
        : null;
    const receiver =
      receiverBytes && receiverBytes.length > 0
        ? JSON.parse(receiverBytes.toString())
        : null;

    // 5. Load Balances
    const senderBalBytes = await ctx.stub.getState(
      this._balanceKey(transferData.tokenId, transferData.fromParticipantId)
    );
    const receiverBalBytes = await ctx.stub.getState(
      this._balanceKey(transferData.tokenId, transferData.toParticipantId)
    );
    const senderBalRecord =
      senderBalBytes && senderBalBytes.length > 0
        ? JSON.parse(senderBalBytes.toString())
        : null;
    const receiverBalRecord =
      receiverBalBytes && receiverBalBytes.length > 0
        ? JSON.parse(receiverBalBytes.toString())
        : null;
    const senderBal = senderBalRecord?.units || 0;
    const receiverBal = receiverBalRecord?.units || 0;

    // RULE: PARTICIPANT_ACTIVE (both parties must exist and be ACTIVE)
    if (
      !sender ||
      sender.status !== 'ACTIVE' ||
      !receiver ||
      receiver.status !== 'ACTIVE'
    ) {
      rejectionReasons.push({
        code: TransferRuleReason.PARTICIPANT_INACTIVE.code,
        message: TransferRuleReason.PARTICIPANT_INACTIVE.message,
        observedValue: {
          senderExists: !!sender,
          senderStatus: sender?.status,
          receiverExists: !!receiver,
          receiverStatus: receiver?.status,
        },
      });
      results.PARTICIPANT_ACTIVE = {
        passed: false,
        senderStatus: sender?.status,
        receiverStatus: receiver?.status,
      };
    } else {
      results.PARTICIPANT_ACTIVE = { passed: true };
    }

    // RULE: PARTY_KYC_VERIFIED (both parties must have APPROVED KYC)
    if (
      !sender ||
      sender.kycStatus !== 'APPROVED' ||
      !receiver ||
      receiver.kycStatus !== 'APPROVED'
    ) {
      rejectionReasons.push({
        code: TransferRuleReason.KYC_NOT_VERIFIED.code,
        message: TransferRuleReason.KYC_NOT_VERIFIED.message,
        observedValue: {
          senderKyc: sender?.kycStatus,
          receiverKyc: receiver?.kycStatus,
        },
      });
      results.KYC_VERIFIED = {
        passed: false,
        senderKyc: sender?.kycStatus,
        receiverKyc: receiver?.kycStatus,
      };
    } else {
      results.KYC_VERIFIED = { passed: true };
    }

    // RULE: NOT_SELF_TRANSFER (sender and receiver cannot be identical)
    if (transferData.fromParticipantId === transferData.toParticipantId) {
      rejectionReasons.push({
        code: TransferRuleReason.SELF_TRANSFER_PROHIBITED.code,
        message: TransferRuleReason.SELF_TRANSFER_PROHIBITED.message,
        observedValue: transferData.fromParticipantId,
      });
      results.SELF_TRANSFER = { passed: false };
    } else {
      results.SELF_TRANSFER = { passed: true };
    }

    // RULE: ASSET_TRANSFERABLE (token must be ACTIVE, asset not FROZEN/RETIRED/REDEEMED)
    if (
      token.status === 'FROZEN' ||
      (asset &&
        (asset.status === AssetStatus.FROZEN ||
          asset.status === AssetStatus.RETIRED ||
          asset.status === AssetStatus.REDEEMED))
    ) {
      rejectionReasons.push({
        code: TransferRuleReason.ASSET_FROZEN.code,
        message: TransferRuleReason.ASSET_FROZEN.message,
        observedValue: {
          tokenStatus: token.status,
          assetStatus: asset?.status,
        },
      });
      results.ASSET_TRANSFERABLE = { passed: false };
    } else {
      results.ASSET_TRANSFERABLE = { passed: true };
    }

    // RULE: SELLER_BALANCE (seller must hold sufficient units)
    if (senderBal < transferData.units) {
      rejectionReasons.push({
        code: TransferRuleReason.INSUFFICIENT_UNITS.code,
        message: TransferRuleReason.INSUFFICIENT_UNITS.message,
        observedValue: senderBal,
        limit: transferData.units,
      });
      results.SELLER_BALANCE = {
        passed: false,
        currentBal: senderBal,
        required: transferData.units,
      };
    } else {
      results.SELLER_BALANCE = { passed: true };
    }

    // RULE: WHOLE_TOKEN_SPLIT_FORBIDDEN (whole tokens cannot be split)
    if (
      token.standard === TokenStandard.WHOLE &&
      transferData.units !== 1
    ) {
      rejectionReasons.push({
        code: TransferRuleReason.WHOLE_TOKEN_SPLIT_FORBIDDEN.code,
        message: TransferRuleReason.WHOLE_TOKEN_SPLIT_FORBIDDEN.message,
        observedValue: transferData.units,
        limit: 1,
      });
      results.WHOLE_ONLY = { passed: false };
    } else {
      results.WHOLE_ONLY = { passed: true };
    }

    // RULE: MIN_TRANSFER_THRESHOLD (if configured on asset type)
    if (
      assetType?.token?.minUnits &&
      transferData.units < assetType.token.minUnits
    ) {
      rejectionReasons.push({
        code: TransferRuleReason.MIN_TRANSFER_THRESHOLD.code,
        message: TransferRuleReason.MIN_TRANSFER_THRESHOLD.message,
        observedValue: transferData.units,
        limit: assetType.token.minUnits,
      });
      results.MIN_TRANSFER_THRESHOLD = {
        passed: false,
        units: transferData.units,
        minAllowed: assetType.token.minUnits,
      };
    }

    // RULE: MAX_HOLDING_CAP_EXCEEDED (for fractional tokens)
    if (token.standard === TokenStandard.FRACTIONAL) {
      const futureBal = receiverBal + transferData.units;
      const maxBps = receiver?.limits?.maxHoldingBps || 2500; // default 25%
      const maxUnitsAllowed = Math.floor(
        token.totalUnits * (maxBps / 10000)
      );
      if (futureBal > maxUnitsAllowed) {
        rejectionReasons.push({
          code: TransferRuleReason.MAX_HOLDING_CAP_EXCEEDED.code,
          message: TransferRuleReason.MAX_HOLDING_CAP_EXCEEDED.message,
          observedValue: futureBal,
          limit: maxUnitsAllowed,
        });
        results.MAX_HOLDING_CAP = {
          passed: false,
          futureBal,
          maxAllowed: maxUnitsAllowed,
          maxHoldingBps: maxBps,
        };
      } else {
        results.MAX_HOLDING_CAP = { passed: true };
      }
    }

    // RULE: MAX_VALUE_CAP_EXCEEDED (if transfer valuation price exceeds cap)
    const pricePaise = transferData.pricePaise || 0;
    if (pricePaise > 0) {
      const senderMax = sender?.limits?.maxTransferPaise;
      const receiverMax = receiver?.limits?.maxTransferPaise;
      if (
        (senderMax && pricePaise > senderMax) ||
        (receiverMax && pricePaise > receiverMax)
      ) {
        rejectionReasons.push({
          code: TransferRuleReason.MAX_VALUE_CAP_EXCEEDED.code,
          message: TransferRuleReason.MAX_VALUE_CAP_EXCEEDED.message,
          observedValue: pricePaise,
          limit: Math.min(senderMax || Infinity, receiverMax || Infinity),
        });
        results.MAX_VALUE_CAP = { passed: false, pricePaise };
      } else {
        results.MAX_VALUE_CAP = { passed: true };
      }
    }

    // Transaction timestamp for time-based rules
    let txTimeMs = Date.now();
    try {
      const ts = ctx.stub.getTxTimestamp();
      if (ts && ts.seconds) {
        txTimeMs = ts.seconds.low * 1000;
      }
    } catch {
      // fallback
    }

    // RULE: LOCK_IN_PERIOD (seller's units held less than lockInDays)
    const lockInDays =
      assetType?.complianceRules?.lockInDays ??
      assetType?.token?.lockInDays ??
      assetType?.rules?.lockInDays ??
      0;
    if (lockInDays > 0) {
      const acquiredAt = senderBalRecord?.acquiredAt;
      if (acquiredAt) {
        const acquiredAtMs = new Date(acquiredAt).getTime() || 0;
        const elapsedDays = (txTimeMs - acquiredAtMs) / (24 * 60 * 60 * 1000);
        if (elapsedDays < lockInDays) {
          rejectionReasons.push({
            code: TransferRuleReason.LOCK_IN_ACTIVE.code,
            message: TransferRuleReason.LOCK_IN_ACTIVE.message,
            observedValue: Math.floor(elapsedDays),
            limit: lockInDays,
          });
          results.LOCK_IN_PERIOD = {
            passed: false,
            elapsedDays: Math.floor(elapsedDays),
            lockInDays,
          };
        } else {
          results.LOCK_IN_PERIOD = { passed: true };
        }
      } else {
        results.LOCK_IN_PERIOD = { passed: true };
      }
    }

    // RULE: BUYER_CLASS_INSUFFICIENT (investor class tier below minBuyerClass)
    const minBuyerClass =
      assetType?.complianceRules?.minBuyerClass ??
      assetType?.token?.minBuyerClass ??
      assetType?.rules?.minBuyerClass;
    if (minBuyerClass) {
      const CLASS_TIER: Record<string, number> = {
        RETAIL: 1,
        QUALIFIED: 2,
        INSTITUTIONAL: 3,
      };
      const buyerTier = CLASS_TIER[receiver?.investorClass] || 0;
      const requiredTier = CLASS_TIER[minBuyerClass] || 0;
      if (buyerTier < requiredTier) {
        rejectionReasons.push({
          code: TransferRuleReason.BUYER_CLASS_INSUFFICIENT.code,
          message: TransferRuleReason.BUYER_CLASS_INSUFFICIENT.message,
          observedValue: receiver?.investorClass || 'NONE',
          limit: minBuyerClass,
        });
        results.BUYER_CLASS = {
          passed: false,
          buyerClass: receiver?.investorClass,
          minBuyerClass,
        };
      } else {
        results.BUYER_CLASS = { passed: true };
      }
    }

    // RULE: JURISDICTION_NOT_ALLOWED (buyer jurisdiction restricted)
    const allowedJurisdictions =
      assetType?.complianceRules?.allowedJurisdictions ??
      assetType?.token?.allowedJurisdictions ??
      assetType?.rules?.allowedJurisdictions;
    if (
      Array.isArray(allowedJurisdictions) &&
      allowedJurisdictions.length > 0
    ) {
      if (
        receiver?.jurisdiction &&
        !allowedJurisdictions.includes(receiver.jurisdiction)
      ) {
        rejectionReasons.push({
          code: TransferRuleReason.JURISDICTION_RESTRICTED.code,
          message: TransferRuleReason.JURISDICTION_RESTRICTED.message,
          observedValue: receiver.jurisdiction,
          limit: allowedJurisdictions,
        });
        results.JURISDICTION = {
          passed: false,
          buyerJurisdiction: receiver.jurisdiction,
          allowedJurisdictions,
        };
      } else {
        results.JURISDICTION = { passed: true };
      }
    }

    // RULE: KYC_EXPIRED (participant KYC expiry timestamp exceeded)
    const senderExp = (sender as any)?.kycExpiresAt || (sender as any)?.kycExpiryDate;
    const receiverExp = (receiver as any)?.kycExpiresAt || (receiver as any)?.kycExpiryDate;
    const senderKycExpired =
      senderExp &&
      new Date(senderExp).getTime() <= txTimeMs;
    const receiverKycExpired =
      receiverExp &&
      new Date(receiverExp).getTime() <= txTimeMs;
    if (senderKycExpired || receiverKycExpired) {
      rejectionReasons.push({
        code: (TransferRuleReason as any).KYC_EXPIRED?.code || 'RULE_KYC_EXPIRED',
        message:
          (TransferRuleReason as any).KYC_EXPIRED?.message ||
          'One or both parties have expired KYC accreditation',
        observedValue: {
          senderKycExpiresAt: sender?.kycExpiresAt,
          receiverKycExpiresAt: receiver?.kycExpiresAt,
        },
      });
      results.KYC_EXPIRED = {
        passed: false,
        senderKycExpiresAt: sender?.kycExpiresAt,
        receiverKycExpiresAt: receiver?.kycExpiresAt,
      };
    } else {
      results.KYC_EXPIRED = { passed: true };
    }

    // RULE: VALUATION_STALE (asset valuation validUntil window has passed)
    const blockOnStaleValuation =
      assetType?.complianceRules?.blockOnStaleValuation ??
      assetType?.token?.blockOnStaleValuation ??
      assetType?.rules?.blockOnStaleValuation;
    if (blockOnStaleValuation && asset?.valuation?.validUntil) {
      const validUntilMs = new Date(asset.valuation.validUntil).getTime();
      if (validUntilMs > 0 && validUntilMs <= txTimeMs) {
        rejectionReasons.push({
          code: TransferRuleReason.VALUATION_STALE.code,
          message: TransferRuleReason.VALUATION_STALE.message,
          observedValue: asset.valuation.validUntil,
          limit: new Date(txTimeMs).toISOString(),
        });
        results.VALUATION_STALE = {
          passed: false,
          validUntil: asset.valuation.validUntil,
        };
      } else {
        results.VALUATION_STALE = { passed: true };
      }
    }

    return {
      passed: rejectionReasons.length === 0,
      results,
      rejectionReasons,
    };
  }

  @Transaction()
  @Returns('string')
  async proposeTransfer(
    ctx: Context,
    transferJson: string
  ): Promise<string> {
    const caller = requireRole(
      ctx,
      Role.ISSUER,
      Role.INVESTOR,
      Role.COMPLIANCE,
      Role.ADMINISTRATOR
    );
    const data = this._parseObject(transferJson, 'transfer proposal');

    const tokenId = this._requiredString(data.tokenId, 'tokenId');
    const toParticipantId = this._requiredString(
      data.toParticipantId,
      'toParticipantId'
    );
    const units = data.units as number;

    if (!Number.isSafeInteger(units) || units <= 0) {
      throw new Error('units must be a positive safe integer');
    }

    const tokenBytes = await ctx.stub.getState(this._tokenKey(tokenId));
    if (!tokenBytes || tokenBytes.length === 0) {
      throw new Error(`Token not found: ${tokenId}`);
    }
    const token = JSON.parse(tokenBytes.toString());

    const fromParticipantId =
      (data.fromParticipantId as string) ||
      caller.participantId ||
      caller.userId;
    if (!fromParticipantId) {
      throw new Error('fromParticipantId is required');
    }
    // Real anti-spoof: ISSUER/INVESTOR can only propose from their own identity.
    if ((caller.role === Role.ISSUER || caller.role === Role.INVESTOR) && data.fromParticipantId) {
      const selfId = caller.participantId || caller.userId;
      if (selfId && data.fromParticipantId !== selfId) {
        throw new Error('Unauthorized: fromParticipantId must match caller identity');
      }
    }

    const txId = ctx.stub.getTxID();
    const timestamp = this._getTxTimestamp(ctx);
    const id = data.id || `TRF-${txId}`;
    const existingTransfer = await ctx.stub.getState(this._transferKey(id));
    if (existingTransfer && existingTransfer.length > 0) {
      throw new Error(`Transfer with ID ${id} already exists`);
    }

    const transfer: TransferRecord = {
      id,
      tokenId,
      fromParticipantId,
      toParticipantId,
      units,
      pricePaise: Number(data.pricePaise) || 0,
      paymentRef: (data.paymentRef as string) || '',
      status: TransferStatus.PROPOSED,
      ruleResults: {},
      rejectionReasons: [],
      proposedBy: caller.participantId || caller.userId || 'UNKNOWN',
      proposedByMspId: caller.mspId,
      createdAt: timestamp,
    };

    await ctx.stub.putState(
      this._transferKey(id),
      Buffer.from(JSON.stringify(transfer))
    );

    await AuditLog.append(
      ctx,
      'TRANSFER',
      id,
      'NONE',
      TransferStatus.PROPOSED,
      'TRANSFER_PROPOSED',
      `${units} units proposed to ${toParticipantId}`
    );

    const events = new EventAggregator();
    events.add(EventName.TRANSFER_PROPOSED, transfer);
    events.commit(ctx);

    return JSON.stringify(transfer);
  }

  @Transaction(false)
  @Returns('string')
  async evaluateTransfer(
    ctx: Context,
    inputJson: string
  ): Promise<string> {
    const input = this._parseObject(inputJson, 'transfer evaluation input');

    let transferData: {
      tokenId: string;
      fromParticipantId: string;
      toParticipantId: string;
      units: number;
      pricePaise?: number;
    };

    if (input.transferId || input.id) {
      const transferId = (input.transferId || input.id) as string;
      const transferBytes = await ctx.stub.getState(
        this._transferKey(transferId)
      );
      if (!transferBytes || transferBytes.length === 0) {
        throw new Error(`Transfer not found: ${transferId}`);
      }
      const transfer = JSON.parse(transferBytes.toString());
      transferData = {
        tokenId: transfer.tokenId,
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        units: transfer.units,
        pricePaise: transfer.pricePaise,
      };
    } else {
      transferData = {
        tokenId: this._requiredString(input.tokenId, 'tokenId'),
        fromParticipantId: this._requiredString(
          input.fromParticipantId || input.fromHolder,
          'fromParticipantId'
        ),
        toParticipantId: this._requiredString(
          input.toParticipantId || input.toHolder,
          'toParticipantId'
        ),
        units: Number(input.units || input.amount || 0),
        pricePaise: Number(input.pricePaise || 0),
      };
    }

    const evaluation = await this._evaluateRules(ctx, transferData);
    return JSON.stringify(evaluation);
  }

  @Transaction()
  @Returns('string')
  async executeTransfer(
    ctx: Context,
    executeInput: string
  ): Promise<string> {
    const caller = requireRole(
      ctx,
      Role.ISSUER,
      Role.INVESTOR,
      Role.COMPLIANCE,
      Role.ADMINISTRATOR
    );
    const transferId = this._parseId(executeInput, 'transferId');

    const transferKey = this._transferKey(transferId);
    const transferBytes = await ctx.stub.getState(transferKey);
    if (!transferBytes || transferBytes.length === 0) {
      throw new Error(`Transfer not found: ${transferId}`);
    }
    const transfer: TransferRecord = JSON.parse(
      transferBytes.toString()
    );

    if (transfer.status !== TransferStatus.PROPOSED) {
      throw new Error(
        `Transfer must be in PROPOSED status to execute, currently ${transfer.status}`
      );
    }

    const txId = ctx.stub.getTxID();
    const timestamp = this._getTxTimestamp(ctx);

    // Evaluate all business rules deterministically
    const ruleOutcomes = await this._evaluateRules(ctx, {
      tokenId: transfer.tokenId,
      fromParticipantId: transfer.fromParticipantId,
      toParticipantId: transfer.toParticipantId,
      units: transfer.units,
      pricePaise: transfer.pricePaise,
    });

    transfer.ruleResults = ruleOutcomes.results;
    transfer.decidedBy = caller.participantId || caller.userId;
    transfer.decidedByMspId = caller.mspId;
    transfer.executedAt = timestamp;
    transfer.executedTxId = txId;

    // CRITICAL FABRIC DESIGN RULE 3.4-1:
    // A rejected transfer MUST NOT fail or revert the blockchain transaction.
    // It returns successfully after persisting REJECTED status and reason codes!
    if (!ruleOutcomes.passed) {
      transfer.status = TransferStatus.REJECTED;
      transfer.rejectionReasons = ruleOutcomes.rejectionReasons;

      await ctx.stub.putState(
        transferKey,
        Buffer.from(JSON.stringify(transfer))
      );

      await AuditLog.append(
        ctx,
        'TRANSFER',
        transfer.id,
        TransferStatus.PROPOSED,
        TransferStatus.REJECTED,
        'RULES_FAILED',
        ruleOutcomes.rejectionReasons.map((r) => r.code).join(', ')
      );

      const events = new EventAggregator();
      events.add(EventName.TRANSFER_REJECTED, transfer);
      events.commit(ctx);

      return JSON.stringify(transfer);
    }

    // Rules passed -> Execute balance transfer atomically
    const senderBalKey = this._balanceKey(
      transfer.tokenId,
      transfer.fromParticipantId
    );
    const receiverBalKey = this._balanceKey(
      transfer.tokenId,
      transfer.toParticipantId
    );

    const senderBalBytes = await ctx.stub.getState(senderBalKey);
    const receiverBalBytes = await ctx.stub.getState(receiverBalKey);

    const currentSenderBal =
      senderBalBytes && senderBalBytes.length > 0
        ? JSON.parse(senderBalBytes.toString()).units || 0
        : 0;
    const currentReceiverBal =
      receiverBalBytes && receiverBalBytes.length > 0
        ? JSON.parse(receiverBalBytes.toString()).units || 0
        : 0;

    const newSenderBal = currentSenderBal - transfer.units;
    const newReceiverBal = currentReceiverBal + transfer.units;

    const senderBalRecord =
      senderBalBytes && senderBalBytes.length > 0
        ? JSON.parse(senderBalBytes.toString())
        : null;

    await ctx.stub.putState(
      senderBalKey,
      Buffer.from(
        JSON.stringify({
          tokenId: transfer.tokenId,
          participantId: transfer.fromParticipantId,
          units: newSenderBal,
          acquiredAt: senderBalRecord?.acquiredAt,
        })
      )
    );

    await ctx.stub.putState(
      receiverBalKey,
      Buffer.from(
        JSON.stringify({
          tokenId: transfer.tokenId,
          participantId: transfer.toParticipantId,
          units: newReceiverBal,
          acquiredAt: timestamp,
        })
      )
    );

    transfer.status = TransferStatus.EXECUTED;
    transfer.rejectionReasons = [];

    await ctx.stub.putState(
      transferKey,
      Buffer.from(JSON.stringify(transfer))
    );

    await AuditLog.append(
      ctx,
      'TRANSFER',
      transfer.id,
      TransferStatus.PROPOSED,
      TransferStatus.EXECUTED,
      'TRANSFER_EXECUTED',
      `Settled ${transfer.units} units from ${transfer.fromParticipantId} to ${transfer.toParticipantId}`
    );

    const events = new EventAggregator();
    events.add(EventName.TRANSFER_EXECUTED, transfer);
    events.commit(ctx);

    return JSON.stringify(transfer);
  }

  @Transaction(false)
  @Returns('string')
  async getTransfer(
    ctx: Context,
    transferInput: string
  ): Promise<string> {
    const transferId = this._parseId(transferInput, 'id');
    const bytes = await ctx.stub.getState(this._transferKey(transferId));
    if (!bytes || bytes.length === 0) {
      throw new Error(`Transfer not found: ${transferId}`);
    }
    return bytes.toString();
  }

  @Transaction(false)
  @Returns('string')
  async listTransfers(
    ctx: Context,
    query: string = '{}'
  ): Promise<string> {
    this._parseObject(query, 'query');
    const iterator = await ctx.stub.getStateByRange(
      `${Keys.TRANSFER}:`,
      `${Keys.TRANSFER}:\uffff`
    );
    const records: TransferRecord[] = [];
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          records.push(
            JSON.parse(
              Buffer.from(result.value.value).toString('utf8')
            ) as TransferRecord
          );
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    return JSON.stringify(records);
  }

  @Transaction(false)
  @Returns('string')
  async getTransferHistory(
    ctx: Context,
    historyInput: string
  ): Promise<string> {
    const tokenId = this._parseId(historyInput, 'tokenId');
    const iterator = await ctx.stub.getStateByRange(
      `${Keys.TRANSFER}:`,
      `${Keys.TRANSFER}:\uffff`
    );
    const records: TransferRecord[] = [];
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          const rec = JSON.parse(
            Buffer.from(result.value.value).toString('utf8')
          ) as TransferRecord;
          if (rec.tokenId === tokenId) {
            records.push(rec);
          }
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    return JSON.stringify(records);
  }

  @Transaction()
  @Returns('string')
  async cancelTransfer(
    ctx: Context,
    cancelInput: string
  ): Promise<string> {
    const caller = requireRole(
      ctx,
      Role.ISSUER,
      Role.INVESTOR,
      Role.COMPLIANCE,
      Role.ADMINISTRATOR
    );
    const data = this._parseObject(cancelInput, 'cancel transfer input');
    const transferId = this._requiredString(
      data.transferId || data.id,
      'transferId'
    );

    const transferKey = this._transferKey(transferId);
    const bytes = await ctx.stub.getState(transferKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Transfer not found: ${transferId}`);
    }
    const transfer: TransferRecord = JSON.parse(bytes.toString());
    if (transfer.status !== TransferStatus.PROPOSED) {
      throw new Error(
        `Cannot cancel transfer with status ${transfer.status}`
      );
    }

    const prevStatus = transfer.status;
    transfer.status = TransferStatus.CANCELLED;
    transfer.decidedBy = caller.participantId || caller.userId;
    transfer.decidedByMspId = caller.mspId;
    transfer.executedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(
      transferKey,
      Buffer.from(JSON.stringify(transfer))
    );

    await AuditLog.append(
      ctx,
      'TRANSFER',
      transfer.id,
      prevStatus,
      TransferStatus.CANCELLED,
      'TRANSFER_CANCELLED',
      (data.reason as string) || 'Cancelled by user'
    );

    const events = new EventAggregator();
    events.add('TransferCancelled', transfer);
    events.commit(ctx);

    return JSON.stringify(transfer);
  }
}
