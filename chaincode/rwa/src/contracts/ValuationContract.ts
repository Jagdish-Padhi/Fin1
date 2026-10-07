import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'ValuationContract', description: 'Governs asset valuation proposals and maker-checker approval' })
export class ValuationContract extends Contract {
  constructor() {
    super('ValuationContract');
  }

  @Transaction()
  async proposeValuation(ctx: Context, valuationJson: string): Promise<string> {
    requireRole(ctx, Role.VERIFIER, Role.VALUER);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async approveValuation(ctx: Context, valuationId: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
    return JSON.stringify({ status: 'OK' });
  }
}
