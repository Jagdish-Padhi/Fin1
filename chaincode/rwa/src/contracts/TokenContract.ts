import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'TokenContract', description: 'Governs token minting, balances, and public disclosure' })
export class TokenContract extends Contract {
  constructor() {
    super('TokenContract');
  }

  @Transaction()
  async mintToken(ctx: Context, tokenJson: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction(false)
  async getBalance(ctx: Context, tokenId: string, participantId: string): Promise<string> {
    return JSON.stringify({ units: 0 });
  }
}
