import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'VerificationContract', description: 'Governs verification checklist execution and approval' })
export class VerificationContract extends Contract {
  constructor() {
    super('VerificationContract');
  }

  @Transaction()
  async recordCheck(ctx: Context, caseId: string, checkKey: string, result: string, notes: string): Promise<string> {
    requireRole(ctx, Role.VERIFIER);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async decideVerification(ctx: Context, caseId: string, decision: string, reasonCode: string): Promise<string> {
    requireRole(ctx, Role.VERIFIER);
    return JSON.stringify({ status: 'OK' });
  }
}
