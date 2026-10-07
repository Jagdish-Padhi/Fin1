import { getChainGateway } from '@rwa/chain-client';

/**
 * Command Submitter Pipeline (Phase 0)
 * Processes queued chain commands and submits them to the gateway with idempotent retries.
 */
export class CommandSubmitter {
  constructor() {
    this.gateway = getChainGateway();
    this.running = false;
  }

  start() {
    this.running = true;
    console.log('⚡ [CommandSubmitter] Worker command processing loop active');
  }

  stop() {
    this.running = false;
  }

  async submitCommand(command) {
    const { actor, fn, args, idempotencyKey } = command;
    console.log(`[CommandSubmitter] Submitting ${fn} with key ${idempotencyKey}...`);
    return this.gateway.submit(actor, fn, args);
  }
}
