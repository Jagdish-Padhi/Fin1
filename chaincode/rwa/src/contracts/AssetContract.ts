import crypto from 'crypto';
import fabricContractPkg from 'fabric-contract-api';
const { Contract, Info, Transaction, Returns } = fabricContractPkg as any;
import type { Context } from 'fabric-contract-api';
import { getCaller, requireRole } from '../lib/ctx.js';
import { Keys } from '../lib/Keys.js';
import { AuditLog } from '../lib/AuditLog.js';
import { EventAggregator } from '../lib/EventAggregator.js';
import { Role, AssetStatus, AssetTypeStatus, EventName } from '@rwa/contracts';

export interface AssetRecord {
  id: string;
  typeKey: string;
  typeVersion: number;
  originatorParticipantId: string;
  displayName: string;
  attributes: Record<string, any>;
  attributesHash: string;
  status: string;
  evidenceRoot: string;
  version: number;
  evidence: Array<{
    id: string;
    docType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    sha256: string;
    storageKey?: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

@Info({ title: 'AssetContract', description: 'Governs asset registration, evidence attachment, and header state' })
export class AssetContract extends Contract {
  constructor() {
    super('AssetContract');
  }

  private _getKey(id: string): string {
    return `${Keys.ASSET}:${id}`;
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

  private _hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  @Transaction()
  @Returns('string')
  async registerAsset(ctx: Context, assetJson: string): Promise<string> {
    const caller = requireRole(ctx, Role.ISSUER);
    const data = JSON.parse(assetJson);

    const typeVersion = Number(data.typeVersion) || 1;
    const typeKey = `${Keys.ASSET_TYPE}:${data.typeKey}:${typeVersion}`;
    const typeBytes = await ctx.stub.getState(typeKey);
    if (!typeBytes || typeBytes.length === 0) {
      throw new Error(`Asset type ${data.typeKey} v${typeVersion} not found`);
    }

    const typeDef = JSON.parse(typeBytes.toString());
    if (typeDef.status === AssetTypeStatus.DEPRECATED) {
      throw new Error(`Cannot register asset under deprecated asset type (${data.typeKey} v${typeVersion})`);
    }

    // Schema validation on required fields
    const schema = typeDef.attributeSchema || {};
    const attrs = data.attributes || {};
    for (const [field, rule] of Object.entries<any>(schema)) {
      if (rule.required && (attrs[field] === undefined || attrs[field] === null || attrs[field] === '')) {
        throw new Error(`Schema validation error: Missing required field '${field}'`);
      }
    }

    const id = data.id || `AST-${Date.now()}`;
    const key = this._getKey(id);
    const exists = await ctx.stub.getState(key);
    if (exists && exists.length > 0) {
      throw new Error(`Asset with ID ${id} already exists`);
    }

    const now = this._getTxTimestamp(ctx);
    const attributesHash = this._hash(JSON.stringify(attrs));

    const asset: AssetRecord = {
      id,
      typeKey: data.typeKey,
      typeVersion,
      originatorParticipantId: caller.participantId || caller.userId || 'UNKNOWN_ORIGINATOR',
      displayName: data.displayName || `${data.typeKey} Asset`,
      attributes: attrs,
      attributesHash,
      status: AssetStatus.REGISTERED,
      evidenceRoot: '',
      version: 1,
      evidence: [],
      createdAt: now,
      updatedAt: now,
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'ASSET',
      id,
      'NONE',
      AssetStatus.REGISTERED,
      'ASSET_REGISTERED',
      'Asset passport registered on ledger'
    );

    const events = new EventAggregator();
    events.add(EventName.ASSET_REGISTERED, asset);
    events.commit(ctx);

    return JSON.stringify(asset);
  }

  @Transaction()
  @Returns('string')
  async updateAssetAttributes(ctx: Context, assetId: string, attributesJson: string, reason: string): Promise<string> {
    const caller = requireRole(ctx, Role.ISSUER);
    const key = this._getKey(assetId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const asset: AssetRecord = JSON.parse(bytes.toString());

    // Segregation: Originator check
    if (caller.participantId && asset.originatorParticipantId !== caller.participantId && asset.originatorParticipantId !== caller.userId) {
      throw new Error('Unauthorized: Originator mismatch');
    }

    // Edge case: Attribute change after submission is blocked
    if (asset.status !== AssetStatus.REGISTERED && asset.status !== AssetStatus.CHANGES_REQUESTED) {
      throw new Error(`Attribute change blocked: Asset is in status '${asset.status}'`);
    }

    const newAttrs = JSON.parse(attributesJson);
    asset.attributes = { ...asset.attributes, ...newAttrs };
    asset.attributesHash = this._hash(JSON.stringify(asset.attributes));
    asset.version++;
    asset.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'ASSET',
      assetId,
      asset.status,
      asset.status,
      'ATTRIBUTES_UPDATED',
      reason || 'Attributes modified prior to verification'
    );

    const events = new EventAggregator();
    events.add('AssetAttributesUpdated', { assetId, version: asset.version });
    events.commit(ctx);

    return JSON.stringify(asset);
  }

  @Transaction()
  @Returns('string')
  async attachEvidence(ctx: Context, evidenceJson: string): Promise<string> {
    const caller = requireRole(ctx, Role.ISSUER);
    const data = JSON.parse(evidenceJson);

    const key = this._getKey(data.assetId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${data.assetId}`);
    }

    const asset: AssetRecord = JSON.parse(bytes.toString());
    if (asset.status !== AssetStatus.REGISTERED && asset.status !== AssetStatus.CHANGES_REQUESTED) {
      throw new Error(`Cannot attach evidence when asset is in status '${asset.status}'`);
    }

    const now = this._getTxTimestamp(ctx);
    const evId = data.id || `EVD-${Date.now()}`;
    const evidenceItem = {
      id: evId,
      docType: data.docType,
      fileName: data.fileName,
      mimeType: data.mimeType || 'application/pdf',
      fileSize: Number(data.fileSize) || 0,
      sha256: data.sha256,
      storageKey: data.storageKey,
      uploadedAt: now,
    };

    // Store evidence leaf state
    const evKey = `${Keys.EVIDENCE}:${evId}`;
    await ctx.stub.putState(evKey, Buffer.from(JSON.stringify(evidenceItem)));

    // Replace if docType already uploaded, or append
    asset.evidence = asset.evidence || [];
    asset.evidence = asset.evidence.filter((e) => e.docType !== data.docType);
    asset.evidence.push(evidenceItem);

    // Compute Merkle / aggregate root across active leaves
    const leaves = asset.evidence.map((e) => e.sha256).sort();
    asset.evidenceRoot = this._hash(leaves.join(':'));
    asset.updatedAt = now;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'EVIDENCE',
      evId,
      'NONE',
      'ATTACHED',
      'EVIDENCE_ATTACHED',
      data.fileName
    );

    const events = new EventAggregator();
    events.add(EventName.EVIDENCE_ATTACHED, evidenceItem);
    events.commit(ctx);

    return JSON.stringify(evidenceItem);
  }

  @Transaction()
  @Returns('string')
  async submitForVerification(ctx: Context, assetId: string): Promise<string> {
    const caller = requireRole(ctx, Role.ISSUER);
    const key = this._getKey(assetId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const asset: AssetRecord = JSON.parse(bytes.toString());
    if (asset.status !== AssetStatus.REGISTERED && asset.status !== AssetStatus.CHANGES_REQUESTED) {
      throw new Error(`Cannot submit asset for verification from status '${asset.status}'`);
    }

    // Verify mandatory evidence documents
    const typeKey = `${Keys.ASSET_TYPE}:${asset.typeKey}:${asset.typeVersion}`;
    const typeBytes = await ctx.stub.getState(typeKey);
    if (typeBytes && typeBytes.length > 0) {
      const typeDef = JSON.parse(typeBytes.toString());
      if (typeDef.evidenceRequirements) {
        const attachedTypes = new Set((asset.evidence || []).map((e) => e.docType));
        for (const req of typeDef.evidenceRequirements) {
          if (req.required && !attachedTypes.has(req.docType)) {
            throw new Error(`Missing mandatory evidence document: '${req.description || req.docType}'`);
          }
        }
      }
    }

    const prev = asset.status;
    asset.status = AssetStatus.UNDER_VERIFICATION;
    asset.updatedAt = this._getTxTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));

    await AuditLog.append(
      ctx,
      'ASSET',
      assetId,
      prev,
      AssetStatus.UNDER_VERIFICATION,
      'SUBMITTED_TO_VERIFIER',
      'Asset submitted for independent verification'
    );

    const events = new EventAggregator();
    events.add(EventName.VERIFICATION_STARTED, { assetId });
    events.commit(ctx);

    return JSON.stringify(asset);
  }

  @Transaction(false)
  @Returns('string')
  async getAsset(ctx: Context, assetId: string): Promise<string> {
    const key = this._getKey(assetId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    return bytes.toString();
  }

  @Transaction(false)
  @Returns('string')
  async listAssets(ctx: Context): Promise<string> {
    const startKey = `${Keys.ASSET}:`;
    const endKey = `${Keys.ASSET}:\uffff`;

    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const allResults: AssetRecord[] = [];

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

  @Transaction(false)
  @Returns('string')
  async getEvidenceRoot(ctx: Context, assetId: string): Promise<string> {
    const key = this._getKey(assetId);
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    const asset: AssetRecord = JSON.parse(bytes.toString());
    return asset.evidenceRoot || '';
  }
}
