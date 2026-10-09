import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'LifecycleContract', description: 'Governs freeze, unfreeze, redeem, and retire operations' })
export class LifecycleContract extends Contract {
  constructor() {
    super('LifecycleContract');
  }

  @Transaction()
  async freezeAsset(ctx: Context, assetId: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async unfreezeAsset(ctx: Context, assetId: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async redeemAsset(ctx: Context, assetId: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async retireAsset(ctx: Context, assetId: string, reasonCode: string, reasonText: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE);
    return JSON.stringify({ status: 'OK' });
  }
}
