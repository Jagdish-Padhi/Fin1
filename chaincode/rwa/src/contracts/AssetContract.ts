import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'AssetContract', description: 'Governs asset registration, evidence attachment, and header state' })
export class AssetContract extends Contract {
  constructor() {
    super('AssetContract');
  }

  @Transaction()
  async registerAsset(ctx: Context, assetJson: string): Promise<string> {
    requireRole(ctx, Role.ISSUER);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async attachEvidence(ctx: Context, evidenceJson: string): Promise<string> {
    requireRole(ctx, Role.ISSUER);
    return JSON.stringify({ status: 'OK' });
  }
}
