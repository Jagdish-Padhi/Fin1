import { Contract, Context, Info, Transaction } from 'fabric-contract-api';

@Info({ title: 'AuditContract', description: 'Governs immutable audit trail queries and state hashes' })
export class AuditContract extends Contract {
  constructor() {
    super('AuditContract');
  }

  @Transaction(false)
  async getAuditTrail(ctx: Context, entityType: string, entityId: string): Promise<string> {
    return JSON.stringify({ entries: [] });
  }

  @Transaction(false)
  async getStateHash(ctx: Context, entityId: string): Promise<string> {
    return JSON.stringify({ stateHash: '' });
  }
}
