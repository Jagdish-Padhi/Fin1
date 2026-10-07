import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import type { Context } from 'fabric-contract-api';
import { getCaller, requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import { Role, AssetTypeStatus, EventName } from '@rwa/contracts';

export interface AssetTypeRecord {
  key: string;
  version: number;
  displayName: string;
  status: 'ACTIVE' | 'DEPRECATED';
  attributeSchema: Record<string, any>;
  evidenceRequirements: Array<{ docType: string; required: boolean; description?: string }>;
  verificationChecklist: Array<{ key: string; label: string; required: boolean }>;
  valuation: { methods: string[]; validityDays: number };
  token: { standard: 'WHOLE' | 'FRACTIONAL'; minUnits?: number; maxUnits?: number };
  transferRules: Array<{ id: string; type: string; params?: Record<string, any> }>;
  terminalReasons: { REDEEMED: string[]; RETIRED: string[] };
  createdAt: string;
  updatedAt: string;
}

@Info({ title: 'AssetTypeContract', description: 'Governs versioned asset type definitions and schemas on Hyperledger Fabric' })
export class AssetTypeContract extends Contract {
  constructor() {
    super('AssetTypeContract');
  }

  private _getKey(key: string, version: number = 1): string {
    return `${Keys.ASSET_TYPE}:${key}:${version}`;
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
  async defineAssetType(ctx: Context, definitionJson: string): Promise<string> {
    const caller = requireRole(ctx, Role.ADMINISTRATOR);
    const def = JSON.parse(definitionJson);

    const version = Number(def.version) || 1;
    const key = this._getKey(def.key, version);

    const exists = await ctx.stub.getState(key);
    if (exists && exists.length > 0) {
      throw new Error(`Asset type ${def.key} version ${version} already exists`);
    }

    const now = this._getTxTimestamp(ctx);
    const record: AssetTypeRecord = {
      key: def.key,
      version,
      displayName: def.displayName || def.key,
      status: AssetTypeStatus.ACTIVE,
      attributeSchema: def.attributeSchema || {},
      evidenceRequirements: def.evidenceRequirements || [],
      verificationChecklist: def.verificationChecklist || [],
      valuation: def.valuation || { methods: ['MARKET_COMPARABLE'], validityDays: 180 },
      token: def.token || { standard: 'WHOLE' },
      transferRules: def.transferRules || [],
      terminalReasons: def.terminalReasons || { REDEEMED: [], RETIRED: [] },
      createdAt: now,
      updatedAt: now,
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));

    await AuditLog.append(
      ctx,
      'ASSET_TYPE',
      `${def.key}:${version}`,
      'NONE',
      AssetTypeStatus.ACTIVE,
      'TYPE_PUBLISHED',
      `Asset type ${def.key} v${version} published`
    );

    const events = new EventAggregator();
    events.add(EventName.ASSET_TYPE_DEFINED, { key: def.key, version });
    events.commit(ctx);

    return JSON.stringify(record);
  }

  @Transaction()
  @Returns('string')
  async deprecateAssetType(ctx: Context, typeKey: string, versionStr: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.ADMINISTRATOR, Role.COMPLIANCE);
    const version = Number(versionStr) || 1;
    const key = this._getKey(typeKey, version);

    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset type ${typeKey} v${version} not found`);
    }

    const record: AssetTypeRecord = JSON.parse(bytes.toString());
    const prev = record.status;
    record.status = AssetTypeStatus.DEPRECATED;
    record.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));

    await AuditLog.append(
      ctx,
      'ASSET_TYPE',
      `${typeKey}:${version}`,
      prev,
      AssetTypeStatus.DEPRECATED,
      'TYPE_DEPRECATED',
      reason || ''
    );

    const events = new EventAggregator();
    events.add('AssetTypeDeprecated', { key: typeKey, version });
    events.commit(ctx);

    return JSON.stringify(record);
  }

  @Transaction(false)
  @Returns('string')
  async getAssetType(ctx: Context, typeKey: string, versionStr: string = '1'): Promise<string> {
    const version = Number(versionStr) || 1;
    const key = this._getKey(typeKey, version);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset type ${typeKey} v${version} not found`);
    }
    return bytes.toString();
  }

  @Transaction(false)
  @Returns('string')
  async listAssetTypes(ctx: Context): Promise<string> {
    const startKey = `${Keys.ASSET_TYPE}:`;
    const endKey = `${Keys.ASSET_TYPE}:\uffff`;

    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const allResults: AssetTypeRecord[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
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
}
