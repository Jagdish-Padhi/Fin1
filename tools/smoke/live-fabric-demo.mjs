import crypto from 'node:crypto';
import { getChainGateway } from '../../packages/chain-client/src/index.js';
import { Role } from '../../packages/contracts/src/index.js';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const uniq = Date.now().toString().slice(-6);

async function main() {
  console.log('======================================================');
  console.log('LIVE Hyperledger Fabric demo - real endorsements');
  console.log('Channel: rwa-channel | Chaincode: rwa');
  console.log('======================================================');
  const gw = getChainGateway({ mode: 'fabric' });
  const admin = { userId: 'ledger-bootstrap-admin', role: Role.ADMINISTRATOR, mspId: 'Org1MSP' };
  const issuer = { userId: 'USR-ISSUER', participantId: 'PRT-ISSUER-01', role: Role.ISSUER, mspId: 'Org1MSP' };
  const verifier = { userId: 'USR-VERIFIER', role: Role.VERIFIER, mspId: 'Org2MSP' };
  const valuer = { userId: 'USR-VALUER', role: Role.VALUER, mspId: 'Org2MSP' };
  const compliance = { userId: 'USR-COMPLIANCE', role: Role.COMPLIANCE, mspId: 'Org2MSP' };

  // 1. Ping
  const types = await gw.evaluate(admin, 'listAssetTypes', {});
  console.log(`\n[1] listAssetTypes on Fabric: ${Array.isArray(types) ? types.length : 0} types`);
  console.log(`    keys: ${(types || []).map((t) => t.key).join(', ')}`);

  // 2. Register asset with unique fields
  const survey = `SY-DEMO-${uniq}`;
  const prop = `PID-DEMO-${uniq}`;
  console.log(`\n[2] registerAsset REAL_ESTATE survey=${survey}`);
  const reg = await gw.submit(issuer, 'registerAsset', {
    typeKey: 'REAL_ESTATE',
    displayName: `Live Demo Tower ${uniq}`,
    attributes: { surveyNumber: survey, propertyId: prop, locality: 'Whitefield, Bengaluru', builtUpSqFt: 5000 },
  });
  console.log(`    COMMITTED tx=${reg.txId} block=${reg.blockNumber} id=${reg.result.id}`);

  // 3. Duplicate must fail on-chain
  console.log('\n[3] duplicate registerAsset (same surveyNumber) must REJECT');
  try {
    await gw.submit(issuer, 'registerAsset', {
      typeKey: 'REAL_ESTATE',
      displayName: 'Fraudulent Duplicate',
      attributes: { surveyNumber: survey, propertyId: `PID-OTHER-${uniq}`, locality: 'Whitefield', builtUpSqFt: 100 },
    });
    console.log('    UNEXPECTED: duplicate committed (FAIL)');
    process.exitCode = 1;
  } catch (e) {
    console.log(`    REJECTED as expected: ${e.message.slice(0, 120)}`);
  }

  // 4. Attach evidence + duplicate sha
  const assetId = reg.result.id;
  console.log(`\n[4] attachEvidence TITLE_DEED to ${assetId}`);
  const ev1 = await gw.submit(issuer, 'attachEvidence', {
    assetId, docType: 'TITLE_DEED', fileName: 'title.pdf', sha256: sha(`title-${uniq}`),
  });
  console.log(`    evidenceRoot=${ev1.result.evidenceRoot || ev1.result.sha256}`);
  console.log('    duplicate sha256 on second asset must REJECT');
  const reg2 = await gw.submit(issuer, 'registerAsset', {
    typeKey: 'INVOICE',
    displayName: `Invoice ${uniq}`,
    attributes: { invoiceNumber: `INV-${uniq}`, supplierGstin: '27AABCU9603R1ZM', buyerGstin: '29AABCU9603R1ZN', amountPaise: 1000000, dueDate: '2027-01-31' },
  });
  try {
    await gw.submit(issuer, 'attachEvidence', {
      assetId: reg2.result.id, docType: 'INVOICE_PDF', fileName: 'dup.pdf', sha256: sha(`title-${uniq}`),
    });
    console.log('    UNEXPECTED: duplicate evidence committed (FAIL)');
    process.exitCode = 1;
  } catch (e) {
    console.log(`    REJECTED as expected: ${e.message.slice(0, 120)}`);
  }

  // 5. Submit -> verification case created on-chain
  for (const [doc, seed] of [['ENCUMBRANCE_CERT', `enc-${uniq}`], ['TAX_RECEIPT', `tax-${uniq}`]]) {
    await gw.submit(issuer, 'attachEvidence', { assetId, docType: doc, fileName: `${doc}.pdf`, sha256: sha(seed) });
  }
  console.log(`\n[5] submitForVerification ${assetId}`);
  const sub = await gw.submit(issuer, 'submitForVerification', { assetId });
  console.log(`    status=${sub.result.status} case=${sub.result.verificationCase?.id}`);
  const caseId = sub.result.verificationCase?.id || sub.result.verificationCaseId;

  // 6. Verifier decides (SoD enforced on-chain)
  if (caseId) {
    try {
      await gw.submit(verifier, 'recordVerificationCheck', { caseId, checkKey: 'TITLE_SEARCH', result: 'PASS', notes: 'Live demo check' });
      console.log('    check recorded: TITLE_SEARCH=PASS');
    } catch (e) {
      console.log(`    check note: ${e.message.slice(0, 100)}`);
    }
    const dec = await gw.submit(verifier, 'decideVerification', { caseId, decision: 'APPROVED', reasonCode: 'LIVE_DEMO_OK', reasonText: 'Approved live on Fabric' });
    console.log(`    decided: asset=${dec.result.asset.status}`);
  }

  // 7. Valuation + mint (shows VALUED -> TOKENIZED)
  console.log('\n[6] propose/approve valuation + mint');
  const now = Date.now();
  const val = await gw.submit(valuer, 'proposeValuation', {
    assetId,
    amountPaise: 500000000,
    currency: 'INR',
    method: 'DISCOUNTED_CASH_FLOW',
    source: { valuerName: 'Ananya Roy', valuerOrg: 'TUV SGS', reportHash: sha(`rep-${uniq}`) },
    valuationDate: new Date(now - 86400000).toISOString(),
    validUntil: new Date(now + 150 * 86400000).toISOString(),
  });
  console.log(`    proposed ${val.result.id}`);
  await gw.submit(compliance, 'approveValuation', { valuationId: val.result.id });
  console.log('    approved -> VALUED');
  const mint = await gw.submit(compliance, 'mintToken', {
    assetId, standard: 'FRACTIONAL', totalUnits: 1000, unitLabel: 'SQFT',
    rightsType: 'UNDIVIDED_FRACTION', representation: `Live demo fractional interest in ${assetId} Bangalore corridor`,
  });
  console.log(`    minted ${mint.result.id} tx=${mint.txId} block=${mint.blockNumber}`);

  // 8. Lifecycle freeze/unfreeze + audit/state hash (real queries)
  console.log('\n[7] freeze/unfreeze + audit/stateHash');
  const fr = await gw.submit(compliance, 'freezeAsset', { assetId, reasonText: 'Live demo compliance hold HC-001' });
  console.log(`    frozen: ${fr.result.status} tx=${fr.txId}`);
  const uf = await gw.submit(compliance, 'unfreezeAsset', { assetId, reasonText: 'Hold released live' });
  console.log(`    unfrozen: ${uf.result.status}`);
  const trail = await gw.evaluate(compliance, 'getAuditTrail', { entityType: 'ASSET', entityId: assetId });
  console.log(`    audit entries for ${assetId}: ${Array.isArray(trail) ? trail.length : 0}`);
  const sh = await gw.evaluate(compliance, 'getStateHash', { entityId: assetId });
  console.log(`    stateHash: ${sh.stateHash?.slice(0, 16)}... key=${sh.stateKey}`);

  console.log('\nALL LIVE FABRIC STEPS COMMITTED. Show peer logs:');
  console.log('  docker logs peer0.org1.example.com --tail 20');
  console.log('  peer channel getinfo -c rwa-channel  (inside CLI container)');
  console.log('  peer chaincode query -C rwa-channel -n rwa -c \'{"Args":["AssetContract:getAsset","' + assetId + '"]}\'');
}

main().catch((e) => {
  console.error('LIVE DEMO FAILED:', e.message);
  process.exit(1);
});
