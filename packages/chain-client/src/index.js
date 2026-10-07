import { MockGateway } from './mock-gateway.js';
import { FabricGateway } from './fabric-gateway.js';

let activeGateway = null;

export function getChainGateway(options = {}) {
  if (activeGateway) return activeGateway;

  const mode = options.mode || process.env.CHAIN_GATEWAY_MODE || 'mock';

  if (mode === 'fabric') {
    activeGateway = new FabricGateway(options);
  } else {
    activeGateway = new MockGateway();
  }

  return activeGateway;
}

export { MockGateway, FabricGateway };
