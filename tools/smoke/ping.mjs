import { getChainGateway } from '../../packages/chain-client/src/index.js';
import { Role } from '@rwa/contracts';

async function main() {
  console.log('Testing Fabric connectivity via FabricGateway ping...');
  const gateway = getChainGateway({ mode: 'fabric' });

  const adminCaller = {
    userId: 'ledger-bootstrap-admin',
    role: Role.ADMINISTRATOR,
  };

  const assetTypes = await gateway.evaluate(
    adminCaller,
    'listAssetTypes',
    {}
  );

  console.log('✅ Successfully evaluated listAssetTypes on Fabric channel!');
  console.log('Asset Types returned:', Array.isArray(assetTypes) ? assetTypes.length : assetTypes);
}

main().catch((err) => {
  console.error('❌ Ping failed:', err);
  process.exit(1);
});
