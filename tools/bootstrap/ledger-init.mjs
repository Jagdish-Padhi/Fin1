import { getChainGateway } from '../../packages/chain-client/src/index.js';
import { DEFAULT_ASSET_TYPES, Role } from '../../packages/contracts/src/index.js';
import { SEED_DATA } from '../../db/seeds/seed.js';
import crypto from 'node:crypto';

async function main() {
  console.log('====================================================');
  console.log('🚀 Initializing Fabric Ledger with Default State');
  console.log('====================================================');

  const gateway = getChainGateway({ mode: 'fabric' });

  const adminCaller = {
    userId: 'ledger-bootstrap-admin',
    role: Role.ADMINISTRATOR,
  };

  const complianceCaller = {
    userId: 'ledger-bootstrap-compliance',
    role: Role.COMPLIANCE,
  };

  // 1. Define Asset Types
  console.log('\n1. Bootstrapping Asset Types...');
  for (const assetType of DEFAULT_ASSET_TYPES) {
    try {
      console.log(`  Defining asset type: ${assetType.key} (v${assetType.version || 1})`);
      await gateway.submit(adminCaller, 'defineAssetType', assetType);
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('Already exists'))) {
        console.log(`  Asset type ${assetType.key} already defined, skipping.`);
      } else {
        console.warn(`  Warning defining ${assetType.key}:`, err.message);
      }
    }
  }

  // 2. Register Seed Participants
  console.log('\n2. Bootstrapping Seed Participants...');
  for (const p of SEED_DATA.participants) {
    try {
      console.log(`  Registering participant: ${p.id} (${p.kind})`);
      const piiHash = p.pii ? crypto.createHash('sha256').update(JSON.stringify(p.pii)).digest('hex') : undefined;
      await gateway.submit(adminCaller, 'registerParticipant', {
        id: p.id,
        userId: p.userId,
        orgId: p.orgId,
        kind: p.kind,
        jurisdiction: p.jurisdiction,
        investorClass: p.investorClass,
        piiHash,
      });
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('Already exists'))) {
        console.log(`  Participant ${p.id} already registered, skipping.`);
      } else {
        console.warn(`  Warning registering ${p.id}:`, err.message);
      }
    }

    // Set KYC Status
    if (p.kycStatus) {
      try {
        await gateway.submit(complianceCaller, 'updateKycStatus', {
          participantId: p.id,
          kycStatus: p.kycStatus,
          reason: 'Initial bootstrap verification',
          expiryDate: '2030-01-01T00:00:00.000Z',
        });
      } catch (err) {
        console.warn(`  Warning setting KYC for ${p.id}:`, err.message);
      }
    }

    // Set Investor Class
    if (p.investorClass) {
      try {
        await gateway.submit(complianceCaller, 'setInvestorClass', {
          participantId: p.id,
          investorClass: p.investorClass,
          reason: 'Initial bootstrap classification',
        });
      } catch (err) {
        console.warn(`  Warning setting investor class for ${p.id}:`, err.message);
      }
    }
  }

  console.log('\nLedger bootstrap completed successfully!');
}

main().catch((err) => {
  console.error('Ledger bootstrap failed:', err);
  process.exit(1);
});
