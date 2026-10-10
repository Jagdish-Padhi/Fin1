import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import { Context } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import {
  AssetStatus,
  EventName,
  RightsType,
  Role,
  TokenStandard,
} from '@rwa/contracts';

export interface TokenRecord {
  id: string;
  assetId: string;
  standard: string;
  totalUnits: number;
  unitLabel: string;
  rightsType: string;
  representation: string;
  initialHolderId: string;
  status: string;
  mintedAt: string;
  mintedTxId: string;
}

interface MintTokenInput {
  assetId: string;
  standard: string;
  totalUnits: number;
  unitLabel: string;
  rightsType: string;
  representation: string;
}

@Info({
  title: 'TokenContract',
  description: 'Governs token minting, balances, and public disclosure',
})
export class TokenContract extends Contract {
  constructor() {
    super('TokenContract');
  }

  private _tokenKey(id: string): string {
    return `${Keys.TOKEN}:${id}`;
  }

  private _assetKey(id: string): string {
    return `${Keys.ASSET}:${id}`;
  }

  private _balanceKey(tokenId: string, participantId: string): string {
    return `${Keys.BALANCE}:${tokenId}:${participantId}`;
  }

  private _parseObject(
    input: string,
    description: string
  ): Record<string, unknown> {
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error(`Invalid ${description} JSON`);
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${description} must be a JSON object`);
    }
    return value as Record<string, unknown>;
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
    return this._requiredString(value[property], property);
  }

  private async _getToken(
    ctx: Context,
    tokenId: string
  ): Promise<TokenRecord | null> {
    const bytes = await ctx.stub.getState(this._tokenKey(tokenId));
    if (!bytes || bytes.length === 0) return null;
    return JSON.parse(bytes.toString()) as TokenRecord;
  }

  private async _listHolders(
    ctx: Context,
    tokenId: string
  ): Promise<Array<{ participantId: string; units: number }>> {
    const start = `${Keys.BALANCE}:${tokenId}:`;
    const iterator = await ctx.stub.getStateByRange(start, `${start}\uffff`);
    const holders: Array<{ participantId: string; units: number }> = [];
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          const record = JSON.parse(
            Buffer.from(result.value.value).toString('utf8')
          );
          if (Number.isSafeInteger(record.units) && record.units > 0) {
            holders.push({
              participantId: record.participantId,
              units: record.units,
            });
          }
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    return holders;
  }

  @Transaction()
  @Returns('string')
  async mintToken(ctx: Context, tokenJson: string): Promise<string> {
    const caller = requireRole(ctx, Role.COMPLIANCE);
    const data = this._parseObject(tokenJson, 'token');
    const input: MintTokenInput = {
      assetId: this._requiredString(data.assetId, 'assetId'),
      standard: this._requiredString(data.standard, 'standard'),
      totalUnits: data.totalUnits as number,
      unitLabel: this._requiredString(data.unitLabel, 'unitLabel'),
      rightsType: this._requiredString(data.rightsType, 'rightsType'),
      representation: this._requiredString(
        data.representation,
        'representation'
      ),
    };

    if (
      !Object.values(TokenStandard).some(
        (standard) => standard === input.standard
      )
    ) {
      throw new Error(`Invalid token standard '${input.standard}'`);
    }
    if (!Number.isSafeInteger(input.totalUnits) || input.totalUnits <= 0) {
      throw new Error('totalUnits must be a positive safe integer');
    }
    if (input.unitLabel.length > 32) {
      throw new Error('unitLabel must contain no more than 32 characters');
    }
    if (
      !Object.values(RightsType).some(
        (rightsType) => rightsType === input.rightsType
      )
    ) {
      throw new Error(`Invalid rightsType '${input.rightsType}'`);
    }
    if (input.representation.length < 10) {
      throw new Error('representation must contain at least 10 characters');
    }

    const assetKey = this._assetKey(input.assetId);
    const assetBytes = await ctx.stub.getState(assetKey);
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`Asset not found: ${input.assetId}`);
    }
    const asset = JSON.parse(assetBytes.toString());
    if (asset.tokenId) {
      throw new Error(`Asset ${asset.id} is already tokenized`);
    }
    if (asset.status !== AssetStatus.VALUED) {
      throw new Error(
        `Asset must be in VALUED state before tokenization, currently ${asset.status}`
      );
    }
    // Enforce asset-type token standard and unit bounds when defined.
    try {
      const typeBytes = await ctx.stub.getState(`${Keys.ASSET_TYPE}:${asset.typeKey}:${asset.typeVersion || 1}` as any);
      if (typeBytes && typeBytes.length > 0) {
        const typeDef = JSON.parse(typeBytes.toString());
        if (typeDef?.token?.standard && typeDef.token.standard !== input.standard) {
          throw new Error(`Token standard '${input.standard}' not allowed for asset type ${asset.typeKey} (expected ${typeDef.token.standard})`);
        }
        if (typeDef?.token?.minUnits && input.totalUnits < typeDef.token.minUnits) {
          throw new Error(`totalUnits ${input.totalUnits} below minimum ${typeDef.token.minUnits} for asset type ${asset.typeKey}`);
        }
        if (typeDef?.token?.maxUnits && input.totalUnits > typeDef.token.maxUnits) {
          throw new Error(`totalUnits ${input.totalUnits} exceeds maximum ${typeDef.token.maxUnits} for asset type ${asset.typeKey}`);
        }
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('not allowed') || e.message.includes('below minimum') || e.message.includes('exceeds maximum'))) throw e;
    }
    const initialHolderId = this._requiredString(
      asset.originatorParticipantId,
      'asset.originatorParticipantId'
    );
    const timestamp = ctx.stub.getTxTimestamp();
    if (!timestamp?.seconds) {
      throw new Error('Transaction timestamp is unavailable');
    }
    const mintedAt = new Date(timestamp.seconds.low * 1000).toISOString();
    const txId = ctx.stub.getTxID();
    if (typeof txId !== 'string' || txId.trim() === '') {
      throw new Error('Transaction ID is unavailable');
    }
    const id = `TKN-${txId}`;
    const tokenKey = this._tokenKey(id);
    const existingToken = await ctx.stub.getState(tokenKey);
    if (existingToken && existingToken.length > 0) {
      throw new Error(`Token with ID ${id} already exists`);
    }

    const token: TokenRecord = {
      id,
      assetId: input.assetId,
      standard: input.standard,
      totalUnits: input.totalUnits,
      unitLabel: input.unitLabel,
      rightsType: input.rightsType,
      representation: input.representation,
      initialHolderId,
      status: 'ACTIVE',
      mintedAt,
      mintedTxId: txId,
    };
    const previousAssetStatus = asset.status;
    asset.status = AssetStatus.TOKENIZED;
    asset.tokenId = id;
    asset.updatedAt = mintedAt;

    await ctx.stub.putState(tokenKey, Buffer.from(JSON.stringify(token)));
    await ctx.stub.putState(
      this._balanceKey(id, initialHolderId),
      Buffer.from(
        JSON.stringify({
          tokenId: id,
          participantId: initialHolderId,
          units: input.totalUnits,
        })
      )
    );
    await ctx.stub.putState(assetKey, Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'TOKEN',
      id,
      'NONE',
      token.status,
      'TOKEN_MINTED',
      `Minted ${token.totalUnits} ${token.unitLabel}`
    );
    await AuditLog.append(
      ctx,
      'ASSET',
      asset.id,
      previousAssetStatus,
      AssetStatus.TOKENIZED,
      'TOKEN_MINTED',
      `Asset tokenized into ${id}`
    );

    const events = new EventAggregator();
    events.add(EventName.TOKEN_MINTED, token);
    events.commit(ctx);

    return JSON.stringify(token);
  }

  @Transaction(false)
  @Returns('string')
  async getToken(ctx: Context, tokenInput: string): Promise<string> {
    const tokenId = this._parseId(tokenInput, 'id');
    const token = await this._getToken(ctx, tokenId);
    if (!token) {
      throw new Error(`Token not found: ${tokenId}`);
    }
    return JSON.stringify(token);
  }

  @Transaction(false)
  @Returns('string')
  async listTokens(ctx: Context, query: string = '{}'): Promise<string> {
    this._parseObject(query, 'query');
    const iterator = await ctx.stub.getStateByRange(
      `${Keys.TOKEN}:`,
      `${Keys.TOKEN}:\uffff`
    );
    const records: TokenRecord[] = [];
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          records.push(
            JSON.parse(
              Buffer.from(result.value.value).toString('utf8')
            ) as TokenRecord
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
  async getBalance(ctx: Context, balanceInput: string): Promise<string> {
    const input = this._parseObject(balanceInput, 'balance query');
    const tokenId = this._requiredString(input.tokenId, 'tokenId');
    const participantId = this._requiredString(
      input.participantId,
      'participantId'
    );
    const token = await this._getToken(ctx, tokenId);
    if (!token) throw new Error(`Token not found: ${tokenId}`);

    const bytes = await ctx.stub.getState(
      this._balanceKey(tokenId, participantId)
    );
    if (!bytes || bytes.length === 0) return JSON.stringify({ units: 0 });
    const balance = JSON.parse(bytes.toString());
    if (!Number.isSafeInteger(balance.units) || balance.units < 0) {
      throw new Error(
        `Invalid balance state for token ${tokenId} and participant ${participantId}`
      );
    }
    return JSON.stringify({ units: balance.units });
  }

  @Transaction(false)
  @Returns('string')
  async listHolders(ctx: Context, holdersInput: string): Promise<string> {
    const input = this._parseObject(holdersInput, 'holders query');
    const tokenId = this._requiredString(input.tokenId, 'tokenId');
    if (!(await this._getToken(ctx, tokenId))) {
      throw new Error(`Token not found: ${tokenId}`);
    }
    return JSON.stringify(await this._listHolders(ctx, tokenId));
  }

  @Transaction(false)
  @Returns('string')
  async getTokenTrace(ctx: Context, traceInput: string): Promise<string> {
    const input = this._parseObject(traceInput, 'token trace query');
    const tokenId = this._requiredString(input.tokenId, 'tokenId');
    const token = await this._getToken(ctx, tokenId);
    if (!token) {
      return JSON.stringify(null);
    }

    const assetBytes = await ctx.stub.getState(this._assetKey(token.assetId));
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`Asset not found for token ${tokenId}: ${token.assetId}`);
    }
    const auditStart = `${Keys.AUDIT}:${tokenId}:`;
    const iterator = await ctx.stub.getStateByRange(
      auditStart,
      `${auditStart}\uffff`
    );
    const auditTrail = [];
    try {
      let result = await iterator.next();
      while (!result.done) {
        if (result.value?.value) {
          auditTrail.push(
            JSON.parse(Buffer.from(result.value.value).toString('utf8'))
          );
        }
        result = await iterator.next();
      }
    } finally {
      await iterator.close();
    }

    return JSON.stringify({
      token,
      asset: JSON.parse(assetBytes.toString()),
      holders: await this._listHolders(ctx, tokenId),
      auditTrail,
    });
  }
}
