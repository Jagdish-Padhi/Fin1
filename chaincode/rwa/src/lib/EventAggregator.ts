import { Context } from 'fabric-contract-api';

export interface ChainEventItem {
  name: string;
  payload: any;
}

export class EventAggregator {
  private events: ChainEventItem[] = [];

  add(name: string, payload: any): void {
    this.events.push({ name, payload });
  }

  commit(ctx: Context): void {
    if (this.events.length === 0) return;

    // Package into single event envelope
    const envelope = {
      txId: ctx.stub.getTxID(),
      timestamp: ctx.stub.getTxTimestamp().seconds.low,
      events: this.events,
    };

    ctx.stub.setEvent('TxEvents', Buffer.from(JSON.stringify(envelope)));
  }
}
