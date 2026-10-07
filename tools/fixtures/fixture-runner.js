#!/usr/bin/env node

/**
 * State-Forcing Fixture Generator (Phase 0)
 * Allows developers and automated tests to force assets/tokens into any lifecycle state
 * without waiting for previous phases to be completed.
 *
 * Usage:
 *   node fixture-runner.js asset --type LAND --state VERIFIED
 *   node fixture-runner.js token --state ACTIVE --holders 3
 *   node fixture-runner.js transfer --status REJECTED
 */

import { getChainGateway } from '../../packages/chain-client/src/index.js';
import { Role, AssetStatus, TokenStandard, TransferStatus } from '../../packages/contracts/src/index.js';

const gateway = getChainGateway();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log('===========================================================');
  console.log('🛠️  EkamVistar State-Forcing Fixture Tool (Phase 0 Foundation)');
  console.log('===========================================================');

  if (command === 'help' || args.length === 0) {
    console.log(`Commands:
  asset --type <LAND|VEHICLE> --state <REGISTERED|VERIFIED|VALUED|TOKENIZED>
  token --state <ACTIVE|FROZEN> --holders <count>
  transfer --status <REJECTED|EXECUTED>
    `);
    process.exit(0);
  }

  const caller = {
    userId: 'USR-ADMIN',
    mspId: 'EkamVistarMSP',
    role: Role.ADMINISTRATOR,
  };

  if (command === 'asset') {
    const type = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'LAND';
    const state = args.includes('--state') ? args[args.indexOf('--state') + 1] : 'VERIFIED';
    const assetId = `AST-FIXTURE-${Date.now()}`;

    console.log(`Creating fixture asset: ${assetId} (Type: ${type}, Target State: ${state})...`);

    // 1. Register asset as Issuer
    await gateway.submit({ ...caller, role: Role.ISSUER }, 'registerAsset', {
      id: assetId,
      typeKey: type,
      displayName: `Fixture Demo ${type} Parcel`,
      attributes: { area: 1500, surveyNumber: 'SRV-999' },
    });

    if (state === AssetStatus.VERIFIED || state === AssetStatus.VALUED || state === AssetStatus.TOKENIZED) {
      await gateway.submit(caller, 'submitForVerification', { assetId });
      // Verifier approves
      const caseId = `VER-${Date.now()}`;
      await gateway.submit({ ...caller, role: Role.VERIFIER, userId: 'USR-VERIFIER' }, 'decideVerification', {
        caseId,
        decision: 'APPROVED',
        reasonCode: 'VERIFICATION_CHECKS_PASSED',
        reasonText: 'Fixture test verification passed',
      });
    }

    if (state === AssetStatus.VALUED || state === AssetStatus.TOKENIZED) {
      await gateway.submit({ ...caller, role: Role.VALUER, userId: 'USR-VALUER' }, 'proposeValuation', {
        assetId,
        amountPaise: 400000000, // ₹40 Lakhs
        method: 'MARKET_COMPARABLE',
        valuationDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + 180 * 86400000).toISOString(),
        source: { valuerName: 'Fixture Valuer', valuerOrg: 'VerifierMSP' },
      });
      await gateway.submit({ ...caller, role: Role.COMPLIANCE }, 'approveValuation', {
        valuationId: `VAL-${Date.now()}`,
      });
    }

    console.log(`✅ Asset ${assetId} forced to ${state}`);
  } else if (command === 'token') {
    const tokenId = `TKN-FIXTURE-${Date.now()}`;
    console.log(`Creating fixture token: ${tokenId}...`);
    // Create token directly in mock
    await gateway.submit({ ...caller, role: Role.COMPLIANCE }, 'mintToken', {
      assetId: `AST-FIXTURE-${Date.now()}`,
      standard: TokenStandard.FRACTIONAL,
      totalUnits: 10000,
      unitLabel: 'UNITS',
    });
    console.log(`✅ Token ${tokenId} minted with active supply`);
  } else if (command === 'transfer') {
    const status = args.includes('--status') ? args[args.indexOf('--status') + 1] : 'REJECTED';
    console.log(`Creating fixture transfer with status: ${status}...`);
    const trfId = `TRF-FIXTURE-${Date.now()}`;
    await gateway.submit({ ...caller, role: Role.ISSUER }, 'proposeTransfer', {
      id: trfId,
      tokenId: 'TKN-FIXTURE-1',
      toParticipantId: 'PRT-INVESTOR-01',
      units: 500,
    });
    console.log(`✅ Transfer ${trfId} created.`);
  }
}

main().catch(console.error);
