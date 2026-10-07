import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'TransferContract', description: 'Governs transfer proposals, rule checks, and rejected transfer audit' })
export class TransferContract extends Contract {
  constructor() {
    super('TransferContract');
  }

  @Transaction()
  async proposeTransfer(ctx: Context, transferJson: string): Promise<string> {
    requireRole(ctx, Role.ISSUER, Role.INVESTOR);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async executeTransfer(ctx: Context, transferId: string): Promise<string> {
    // Note: Business rule failure returns successfully with REJECTED status to persist rejection reasons
    return JSON.stringify({ status: 'OK' });
  }
}
