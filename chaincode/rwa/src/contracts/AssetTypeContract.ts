import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'AssetTypeContract', description: 'Governs versioned asset type definitions and schemas' })
export class AssetTypeContract extends Contract {
  constructor() {
    super('AssetTypeContract');
  }

  @Transaction()
  async defineAssetType(ctx: Context, definitionJson: string): Promise<string> {
    requireRole(ctx, Role.ADMINISTRATOR);
    return JSON.stringify({ status: 'OK' });
  }
}
