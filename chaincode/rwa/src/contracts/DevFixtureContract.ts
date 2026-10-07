import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'DevFixtureContract', description: 'Development fixture forcing contract (compiled in only when CC_ENV=dev)' })
export class DevFixtureContract extends Contract {
  constructor() {
    super('DevFixtureContract');
  }

  @Transaction()
  async forceState(ctx: Context, entityType: string, entityId: string, state: string): Promise<string> {
    requireRole(ctx, Role.ADMINISTRATOR);
    return JSON.stringify({ status: 'STATE_FORCED', entityId, state });
  }
}
