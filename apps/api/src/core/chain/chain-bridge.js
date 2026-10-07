import { getChainGateway } from '@rwa/chain-client';
import { EventEmitter } from 'events';

class ChainBridge extends EventEmitter {
  constructor() {
    super();
    this.gateway = getChainGateway();
    // Forward gateway events to local EventEmitter for SSE stream and indexer
    if (this.gateway.subscribe) {
      this.gateway.subscribe((event) => {
        this.emit('chainEvent', event);
      });
    }
  }

  async submit(caller, fnName, args, opts) {
    return this.gateway.submit(caller, fnName, args, opts);
  }

  async evaluate(caller, fnName, args) {
    return this.gateway.evaluate(caller, fnName, args);
  }
}

export const chainBridge = new ChainBridge();
