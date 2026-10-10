import { MockGateway } from './mock-gateway.js';
import { FabricGateway } from './fabric-gateway.js';

let activeGateway = null;

export function getChainGateway(options = {}) {
  if (activeGateway) return activeGateway;

  // The in-memory MockGateway is a test double only; real runs always use Fabric.
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
  const mode = options.mode || process.env.CHAIN_GATEWAY_MODE || (isTest ? 'mock' : 'fabric');
  if (mode === 'mock' && !isTest) {
    throw new Error('CHAIN_GATEWAY_MODE=mock is only allowed in tests. Use CHAIN_GATEWAY_MODE=fabric.');
  }

  if (mode === 'fabric') {
    activeGateway = new FabricGateway(options);
  } else {
    activeGateway = new MockGateway();
  }

  return activeGateway;
}

export { MockGateway, FabricGateway };
