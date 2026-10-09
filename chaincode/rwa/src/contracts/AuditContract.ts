import { Contract, Context, Info, Transaction, Returns } from 'fabric-contract-api';
import crypto from 'crypto';
import { Keys } from '../lib/Keys.js';

@Info({ title: 'AuditContract', description: 'Governs immutable audit trail queries and state hashes' })
export class AuditContract extends Contract {
  constructor() {
    super('AuditContract');
  }

  @Transaction(false)
  @Returns('string')
  async getAuditTrail(ctx: Context, entityType: string, entityId: string): Promise<string> {
    // Explorer mode: empty entityId returns all entries.
    const filterId = (entityId || '').trim();
    const filterType = (entityType || '').trim();
    const collect = async (start: string, end: string): Promise<any[]> => {
      const out: any[] = [];
      const it = await ctx.stub.getStateByRange(start, end);
      try {
        let r = await it.next();
        while (!r.done) {
          if ((r as any).value && (r as any).value.value) {
            try {
              out.push(JSON.parse(Buffer.from((r as any).value.value).toString('utf8')));
            } catch {
              // ignore
            }
          }
          r = await it.next();
        }
      } finally {
        await it.close();
      }
      return out;
    };
    if (!filterId) {
      const all = await collect(`${Keys.AUDIT}:`, `${Keys.AUDIT}:\uffff`);
      const filtered = filterType && filterType !== 'ALL' ? all.filter((e) => e.entityType === filterType) : all;
      filtered.sort((a, b) => String(a.timestamp || a.occurredAt || '').localeCompare(String(b.timestamp || b.occurredAt || '')));
      return JSON.stringify(filtered);
    }
    const id = filterId;
    // Primary: direct AUD:{entityId}:{txId} keys
    const direct: any[] = [];
    const prefix = `${Keys.AUDIT}:${id}:`;
    const it = await ctx.stub.getStateByRange(prefix, `${prefix}\uffff`);
    try {
      let r = await it.next();
      while (!r.done) {
        if ((r as any).value && (r as any).value.value) {
          try {
            direct.push(JSON.parse(Buffer.from((r as any).value.value).toString('utf8')));
          } catch {
            // ignore
          }
        }
        r = await it.next();
      }
    } finally {
      await it.close();
    }
    // Secondary: full AUD scan filtered by entityId / entityType (covers legacy keys)
    if (direct.length === 0) {
      const all = await ctx.stub.getStateByRange(`${Keys.AUDIT}:`, `${Keys.AUDIT}:\uffff`);
      try {
        let r = await all.next();
        while (!r.done) {
          if ((r as any).value && (r as any).value.value) {
            try {
              const rec = JSON.parse(Buffer.from((r as any).value.value).toString('utf8'));
              if (rec.entityId === id && (!entityType || entityType === 'ALL' || rec.entityType === entityType)) {
                direct.push(rec);
              }
            } catch {
              // ignore
            }
          }
          r = await all.next();
        }
      } finally {
        await all.close();
      }
    }
    direct.sort((a, b) => String(a.timestamp || a.occurredAt || '').localeCompare(String(b.timestamp || b.occurredAt || '')));
    return JSON.stringify(direct);
  }

  @Transaction(false)
  @Returns('string')
  async getStateHash(ctx: Context, entityId: string): Promise<string> {
    if (!entityId || entityId.trim() === '') {
      throw new Error('entityId is required');
    }
    const id = entityId.trim();
    const candidates = [`${Keys.ASSET}:${id}`, `${Keys.TOKEN}:${id}`, `${Keys.TRANSFER}:${id}`, `${Keys.VALUATION}:${id}`, `${Keys.VERIFICATION}:${id}`, `${Keys.PARTICIPANT}:${id}`];
    for (const k of candidates) {
      const bytes = await ctx.stub.getState(k);
      if (bytes && bytes.length > 0) {
        const stateHash = crypto.createHash('sha256').update(bytes).digest('hex');
        return JSON.stringify({ entityId: id, stateKey: k, stateHash });
      }
    }
    throw new Error(`State not found: ${id}`);
  }
}
