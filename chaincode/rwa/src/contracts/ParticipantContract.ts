import { Contract, Context, Info, Transaction, Returns } from 'fabric-contract-api';
import { requireRole } from '../lib/ctx.js';
import { Role } from '@rwa/contracts';

@Info({ title: 'ParticipantContract', description: 'Governs participant identity, KYC, and limits' })
export class ParticipantContract extends Contract {
  constructor() {
    super('ParticipantContract');
  }

  @Transaction()
  async registerParticipant(ctx: Context, dataJson: string): Promise<string> {
    requireRole(ctx, Role.ADMINISTRATOR, Role.ISSUER);
    return JSON.stringify({ status: 'OK' });
  }

  @Transaction()
  async updateKycStatus(ctx: Context, participantId: string, kycStatus: string, reason: string): Promise<string> {
    requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
    return JSON.stringify({ status: 'OK' });
  }
}
