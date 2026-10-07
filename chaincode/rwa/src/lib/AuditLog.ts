import { Context } from 'fabric-contract-api';
import { getCaller } from './ctx.js';
import { Keys } from './Keys.js';

export interface AuditRecord {
  id: string;
  actorUserId?: string;
  actorOrg: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  reasonCode: string;
  reasonText?: string;
  txId: string;
  timestamp: string;
}

export class AuditLog {
  static async append(
    ctx: Context,
    entityType: string,
    entityId: string,
    fromState: string,
    toState: string,
    reasonCode: string,
    reasonText: string = ''
  ): Promise<AuditRecord> {
    const caller = getCaller(ctx);
    const txId = ctx.stub.getTxID();
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

    const recordId = `${Keys.AUDIT}:${entityId}:${txId}`;
    const record: AuditRecord = {
      id: recordId,
      actorUserId: caller.userId,
      actorOrg: caller.mspId,
      actorRole: caller.role,
      entityType,
      entityId,
      fromState,
      toState,
      reasonCode,
      reasonText,
      txId,
      timestamp,
    };

    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
    return record;
  }
}
