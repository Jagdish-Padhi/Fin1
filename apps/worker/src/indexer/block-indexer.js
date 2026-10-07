import { getChainGateway } from '@rwa/chain-client';

/**
 * Block & Event Indexer Skeleton (Phase 0)
 * Subscribes to chaincode event envelopes and manages projection updates.
 */
export class BlockIndexer {
  constructor() {
    this.gateway = getChainGateway();
    this.handlers = new Map();
  }

  registerProjection(eventName, handler) {
    this.handlers.set(eventName, handler);
  }

  start() {
    console.log('📡 [Indexer] Starting block & event listener from latest checkpoint...');
    if (this.gateway.subscribe) {
      this.gateway.subscribe((event) => {
        this.processEvent(event);
      });
    }
  }

  processEvent(envelope) {
    const handler = this.handlers.get(envelope.name);
    if (handler) {
      try {
        handler(envelope.payload, envelope);
        console.log(`[Indexer] Processed event ${envelope.name} (Tx: ${envelope.txId})`);
      } catch (err) {
        console.error(`[Indexer] Error processing ${envelope.name}:`, err);
      }
    } else {
      console.log(`[Indexer] Unhandled event type ${envelope.name} at block ${envelope.blockNumber}`);
    }
  }
}
