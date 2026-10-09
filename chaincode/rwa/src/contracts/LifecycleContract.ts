import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import { validateTransition } from '../lib/StateMachine.js';
import { Role, AssetStatus, EventName } from '@rwa/contracts';

@Info({ title: 'LifecycleContract', description: 'Governs freeze, unfreeze, redeem, and retire operations' })
export class LifecycleContract extends Contract {
  constructor() {
    super('LifecycleContract');
  }

  private _assetKey(id: string): string {
    return `${Keys.ASSET}:${id}`;
  }

  private _tokenKey(id: string): string {
    return `${Keys.TOKEN}:${id}`;
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

  private _requireReason(reasonText: string): string {
    if (!reasonText || reasonText.trim() === '') {
      throw new Error('reasonText is required');
    }
    return reasonText.trim();
  }

  @Transaction()
  async freezeAsset(ctx: Context, assetId: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE);
    const reason = this._requireReason(reasonText);
    const aKey = this._assetKey(assetId);
    const bytes = await ctx.stub.getState(aKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    const asset = JSON.parse(bytes.toString());
    if (asset.status === AssetStatus.FROZEN) {
      throw new Error(`Asset ${assetId} is already frozen`);
    }
    validateTransition(asset.status, AssetStatus.FROZEN);
    const prev = asset.status;
    asset.status = AssetStatus.FROZEN;
    (asset as any).freezeReason = reason;
    (asset as any).frozenAt = this._getTxTimestamp(ctx);
    asset.updatedAt = (asset as any).frozenAt;
    await ctx.stub.putState(aKey, Buffer.from(JSON.stringify(asset)));
    if (asset.tokenId) {
      const tKey = this._tokenKey(asset.tokenId);
      const tBytes = await ctx.stub.getState(tKey);
      if (tBytes && tBytes.length > 0) {
        const token = JSON.parse(tBytes.toString());
        token.status = 'FROZEN';
        await ctx.stub.putState(tKey, Buffer.from(JSON.stringify(token)));
      }
    }
    await AuditLog.append(ctx, 'ASSET', assetId, prev, AssetStatus.FROZEN, 'COMPLIANCE_HOLD', reason);
    const events = new EventAggregator();
    events.add(EventName.ASSET_FROZEN, { assetId, reason });
    events.commit(ctx);
    return JSON.stringify(asset);
  }

  @Transaction()
  async unfreezeAsset(ctx: Context, assetId: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE);
    const reason = this._requireReason(reasonText);
    const aKey = this._assetKey(assetId);
    const bytes = await ctx.stub.getState(aKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    const asset = JSON.parse(bytes.toString());
    if (asset.status !== AssetStatus.FROZEN) {
      throw new Error('Asset is not currently frozen');
    }
    const restored = asset.tokenId ? AssetStatus.TOKENIZED : AssetStatus.VALUED;
    validateTransition(AssetStatus.FROZEN, restored);
    const prev = asset.status;
    asset.status = restored;
    delete (asset as any).freezeReason;
    asset.updatedAt = this._getTxTimestamp(ctx);
    await ctx.stub.putState(aKey, Buffer.from(JSON.stringify(asset)));
    if (asset.tokenId) {
      const tKey = this._tokenKey(asset.tokenId);
      const tBytes = await ctx.stub.getState(tKey);
      if (tBytes && tBytes.length > 0) {
        const token = JSON.parse(tBytes.toString());
        token.status = 'ACTIVE';
        await ctx.stub.putState(tKey, Buffer.from(JSON.stringify(token)));
      }
    }
    await AuditLog.append(ctx, 'ASSET', assetId, prev, restored, 'COMPLIANCE_RELEASE', reason);
    const events = new EventAggregator();
    events.add(EventName.ASSET_UNFROZEN, { assetId, reason });
    events.commit(ctx);
    return JSON.stringify(asset);
  }

  @Transaction()
  async redeemAsset(ctx: Context, assetId: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
    const reason = this._requireReason(reasonText);
    const aKey = this._assetKey(assetId);
    const bytes = await ctx.stub.getState(aKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    const asset = JSON.parse(bytes.toString());
    if (asset.status === AssetStatus.REDEEMED) {
      throw new Error(`Asset ${assetId} is already redeemed`);
    }
    validateTransition(asset.status, AssetStatus.REDEEMED);
    const prev = asset.status;
    asset.status = AssetStatus.REDEEMED;
    (asset as any).redeemReason = reason;
    asset.updatedAt = this._getTxTimestamp(ctx);
    await ctx.stub.putState(aKey, Buffer.from(JSON.stringify(asset)));
    if (asset.tokenId) {
      const tKey = this._tokenKey(asset.tokenId);
      const tBytes = await ctx.stub.getState(tKey);
      if (tBytes && tBytes.length > 0) {
        const token = JSON.parse(tBytes.toString());
        token.status = 'BURNED';
        await ctx.stub.putState(tKey, Buffer.from(JSON.stringify(token)));
      }
    }
    await AuditLog.append(ctx, 'ASSET', assetId, prev, AssetStatus.REDEEMED, 'CONSOLIDATED_REDEMPTION', reason);
    const events = new EventAggregator();
    events.add(EventName.ASSET_REDEEMED, { assetId, reason });
    events.commit(ctx);
    return JSON.stringify(asset);
  }

  @Transaction()
  async retireAsset(ctx: Context, assetId: string, reasonCode: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
    const reason = this._requireReason(reasonText || reasonCode);
    const code = (reasonCode || 'SCRAPPED_OR_DESTROYED').trim() || 'SCRAPPED_OR_DESTROYED';
    const aKey = this._assetKey(assetId);
    const bytes = await ctx.stub.getState(aKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    const asset = JSON.parse(bytes.toString());
    if (asset.status === AssetStatus.RETIRED) {
      throw new Error(`Asset ${assetId} is already retired`);
    }
    validateTransition(asset.status, AssetStatus.RETIRED);
    // Validate against asset-type terminal reasons when defined.
    try {
      const tBytes = await ctx.stub.getState(`${Keys.ASSET_TYPE}:${asset.typeKey}:${asset.typeVersion || 1}`);
      if (tBytes && tBytes.length > 0) {
        const typeDef = JSON.parse(tBytes.toString());
        const allowed: string[] = typeDef?.terminalReasons?.RETIRED || [];
        if (allowed.length > 0 && !allowed.includes(code)) {
          throw new Error(`Invalid retire reasonCode '${code}'. Allowed: ${allowed.join(', ')}`);
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Invalid retire reasonCode')) throw e;
    }
    const prev = asset.status;
    asset.status = AssetStatus.RETIRED;
    (asset as any).retireReasonCode = code;
    (asset as any).retireReason = reason;
    asset.updatedAt = this._getTxTimestamp(ctx);
    await ctx.stub.putState(aKey, Buffer.from(JSON.stringify(asset)));
    if (asset.tokenId) {
      const tKey = this._tokenKey(asset.tokenId);
      const tBytes = await ctx.stub.getState(tKey);
      if (tBytes && tBytes.length > 0) {
        const token = JSON.parse(tBytes.toString());
        token.status = 'BURNED';
        await ctx.stub.putState(tKey, Buffer.from(JSON.stringify(token)));
      }
    }
    await AuditLog.append(ctx, 'ASSET', assetId, prev, AssetStatus.RETIRED, code, reason);
    const events = new EventAggregator();
    events.add(EventName.ASSET_RETIRED, { assetId, reasonCode: code, reason });
    events.commit(ctx);
    return JSON.stringify(asset);
  }
}
