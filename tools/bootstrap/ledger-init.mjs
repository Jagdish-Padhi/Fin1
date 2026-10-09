import { getChainGateway } from '../../packages/chain-client/src/index.js';
import { DEFAULT_ASSET_TYPES, Role } from '@rwa/contracts';
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

  const issuerCaller = { userId: 'USR-ISSUER', participantId: 'PRT-ISSUER-01', role: Role.ISSUER, mspId: 'Org1MSP' };
  const verifierCaller = { userId: 'USR-VERIFIER', role: Role.VERIFIER, mspId: 'Org2MSP' };
  const valuerCaller = { userId: 'USR-VALUER', role: Role.VALUER, mspId: 'Org2MSP' };

  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const daysFromNow = (d) => new Date(Date.now() + d * 24 * 3600 * 1000).toISOString();

  async function getAsset(id) {
    try {
      return await gateway.evaluate(issuerCaller, 'getAsset', { id });
    } catch {
      return null;
    }
  }

  async function findCaseFor(assetId) {
    try {
      const cases = await gateway.evaluate(verifierCaller, 'listVerificationCases', {});
      return (cases || []).find((c) => c.assetId === assetId && !c.decision) || null;
    } catch {
      return null;
    }
  }

  async function findValuationFor(assetId, status) {
    try {
      const vals = await gateway.evaluate(valuerCaller, 'listValuations', {});
      return (vals || []).find((v) => v.assetId === assetId && (!status || v.status === status)) || null;
    } catch {
      return null;
    }
  }

  async function findTokenFor(assetId) {
    try {
      const tokens = await gateway.evaluate(issuerCaller, 'listTokens', {});
      return (tokens || []).find((t) => t.assetId === assetId) || null;
    } catch {
      return null;
    }
  }

  // 3. Demo portfolio: 5 real assets across lifecycle stages (real chain writes only).
  // A1 REAL_ESTATE -> TOKENIZED + transfer | A2 VEHICLE -> TOKENIZED |
  // A3 LAND -> VALUED | A4 INVOICE -> UNDER_VERIFICATION | A5 COMMODITY -> REGISTERED
  console.log('\n3. Bootstrapping demo portfolio (real on-chain assets)...');
  const portfolio = [
    {
      id: 'AST-DEMO-RE-01',
      typeKey: 'REAL_ESTATE',
      displayName: 'Whitefield Tech Park Wing D (Demo)',
      attributes: {
        surveyNumber: 'SY-DEMO-101',
        propertyId: 'PID-DEMO-101',
        locality: 'Whitefield, Bengaluru',
        builtUpSqFt: 12000,
      },
      evidence: ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'TAX_RECEIPT'],
      checkKey: 'TITLE_SEARCH',
      valuation: { amountPaise: 8500000000, method: 'DISCOUNTED_CASH_FLOW' },
      mint: {
        standard: 'FRACTIONAL', totalUnits: 10000, unitLabel: 'SQFT',
        rightsType: 'UNDIVIDED_FRACTION',
        representation: '1 Unit = 1.2 SQFT undivided interest in Whitefield Tech Park Wing D (Demo)',
      },
      transfer: { id: 'TRF-DEMO-RE-01', toParticipantId: 'PRT-INVESTOR-01', units: 800, pricePaise: 75000000, paymentRef: 'NEFT-DEMO-101' },
    },
    {
      id: 'AST-DEMO-VH-01',
      typeKey: 'VEHICLE',
      displayName: 'Demo Fleet Hauler EV-01',
      attributes: {
        registrationNumber: 'KA-05-DEMO-01',
        chassisNumber: 'VINDEMO0000000001',
        make: 'Tata Motors',
        model: 'Ultra T.7 Electric',
        manufacturingYear: 2024,
        fuelType: 'ELECTRIC',
      },
      evidence: ['RC_BOOK', 'INSURANCE_POLICY', 'FITNESS_CERT'],
      checkKey: 'RC_VALID',
      valuation: { amountPaise: 320000000, method: 'DEPRECIATED_COST' },
      mint: {
        standard: 'WHOLE', totalUnits: 1, unitLabel: 'VEHICLE',
        rightsType: 'FULL_OWNERSHIP',
        representation: 'Whole title ownership of Demo Fleet Hauler EV-01 KA-05-DEMO-01',
      },
    },
    {
      id: 'AST-DEMO-LD-01',
      typeKey: 'LAND',
      displayName: 'Mysuru Agro Parcel Demo-301',
      attributes: {
        surveyNumber: 'SY-DEMO-301',
        district: 'Mysuru',
        state: 'Karnataka',
        areaSqMeters: 8000,
        landUse: 'AGRICULTURAL',
      },
      evidence: ['TITLE_DEED', 'ENCUMBRANCE_CERT', 'SURVEY_MAP'],
      checkKey: 'TITLE_CHAIN',
      valuation: { amountPaise: 420000000, method: 'CIRCLE_RATE' },
    },
    {
      id: 'AST-DEMO-IN-01',
      typeKey: 'INVOICE',
      displayName: 'Demo Invoice INV-DEMO-401',
      attributes: {
        invoiceNumber: 'INV-DEMO-401',
        supplierGstin: '27AABCU9603R1ZM',
        buyerGstin: '29AABCU9603R1ZN',
        amountPaise: 25000000,
        dueDate: '2027-06-30',
      },
      evidence: ['INVOICE_PDF', 'EWAY_BILL'],
    },
    {
      id: 'AST-DEMO-CM-01',
      typeKey: 'COMMODITY',
      displayName: 'Demo Turmeric Batch-501',
      attributes: {
        batchId: 'BATCH-DEMO-501',
        warehouseReceiptNo: 'EWR-DEMO-501',
        commodityType: 'TURMERIC',
        quantityKg: 5000,
        storageLocation: 'Hubballi WDRA Warehouse 7',
      },
      evidence: ['WAREHOUSE_RECEIPT'],
    },
  ];

  for (const spec of portfolio) {
    console.log(`\n  Asset ${spec.id} (${spec.typeKey})...`);
    let asset = await getAsset(spec.id);

    // Stage 1: register
    if (!asset) {
      try {
        const res = await gateway.submit(issuerCaller, 'registerAsset', {
          id: spec.id,
          typeKey: spec.typeKey,
          typeVersion: 1,
          displayName: spec.displayName,
          attributes: spec.attributes,
        });
        asset = res.result || res;
        console.log(`    registered (tx ${res.txId.slice(0, 12)}...)`);
      } catch (err) {
        if (/already exists|already registered|duplicate asset/i.test(err.message || '')) {
          console.log('    already on ledger, resuming from current status');
          asset = await getAsset(spec.id);
        } else {
          console.warn(`    register failed: ${err.message}`);
          continue;
        }
      }
    } else {
      console.log(`    exists with status ${asset.status}, resuming`);
    }
    if (!asset) continue;

    // Stage 2: evidence (attach any missing required docs)
    if (['REGISTERED', 'CHANGES_REQUESTED'].includes(asset.status)) {
      const attached = new Set((asset.evidence || []).map((e) => e.docType));
      for (const docType of spec.evidence) {
        if (attached.has(docType)) continue;
        try {
          await gateway.submit(issuerCaller, 'attachEvidence', {
            assetId: spec.id,
            docType,
            fileName: `${docType.toLowerCase()}-demo.pdf`,
            mimeType: 'application/pdf',
            fileSize: 512000,
            sha256: sha(`${spec.id}:${docType}:demo`),
          });
          console.log(`    evidence attached: ${docType}`);
        } catch (err) {
          if (!/already attached|duplicate evidence|already exists/i.test(err.message || '')) {
            console.warn(`    evidence ${docType} failed: ${err.message}`);
          }
        }
      }
      asset = (await getAsset(spec.id)) || asset;
    }

    // Stage 3: submit for verification
    if (['REGISTERED', 'CHANGES_REQUESTED'].includes(asset.status)) {
      // Only submit when all mandatory docs are present (A5 stays REGISTERED by design).
      try {
        const res = await gateway.submit(issuerCaller, 'submitForVerification', { assetId: spec.id });
        const out = res.result || res;
        asset = out.status ? out : asset;
        console.log(`    submitted, case ${out.verificationCase?.id || ''}`);
      } catch (err) {
        console.log(`    submit skipped: ${(err.message || '').slice(0, 110)}`);
        asset = (await getAsset(spec.id)) || asset;
      }
    }

    // Stage 4: verify (assets with checkKey + valuation/mint/transfer specs)
    if (asset.status === 'UNDER_VERIFICATION' && spec.checkKey && (spec.valuation || spec.mint)) {
      let vCase = await findCaseFor(spec.id);
      if (vCase) {
        try {
          await gateway.submit(verifierCaller, 'recordVerificationCheck', {
            caseId: vCase.id, checkKey: spec.checkKey, result: 'PASS', notes: 'Bootstrap demo check passed',
          });
          console.log(`    check recorded: ${spec.checkKey}=PASS`);
        } catch (err) {
          console.log(`    check skipped: ${(err.message || '').slice(0, 100)}`);
        }
        try {
          const res = await gateway.submit(verifierCaller, 'decideVerification', {
            caseId: vCase.id, decision: 'APPROVED', reasonCode: 'BOOTSTRAP_DEMO_OK', reasonText: 'Approved during ledger bootstrap',
          });
          asset = (res.result || res).asset || asset;
          console.log('    verification APPROVED');
        } catch (err) {
          console.log(`    decide skipped: ${(err.message || '').slice(0, 100)}`);
          asset = (await getAsset(spec.id)) || asset;
        }
      } else {
        console.log('    no pending verification case found');
        asset = (await getAsset(spec.id)) || asset;
      }
    }

    // Stage 5: valuation
    if (asset.status === 'VERIFIED' && spec.valuation) {
      let val = await findValuationFor(spec.id, 'PROPOSED');
      if (!val) {
        const approved = await findValuationFor(spec.id, 'APPROVED');
        if (!approved) {
          try {
            const res = await gateway.submit(valuerCaller, 'proposeValuation', {
              assetId: spec.id,
              amountPaise: spec.valuation.amountPaise,
              currency: 'INR',
              method: spec.valuation.method,
              methodDetails: {},
              source: {
                valuerName: 'Ananya Roy',
                valuerOrg: 'TUV SGS Certified Inspection',
                reportHash: sha(`${spec.id}:valuation-report`),
              },
              valuationDate: daysFromNow(-1),
              validUntil: daysFromNow(150),
            });
            val = res.result || res;
            console.log(`    valuation proposed: ${val.id}`);
          } catch (err) {
            console.log(`    propose skipped: ${(err.message || '').slice(0, 110)}`);
          }
        } else {
          console.log(`    valuation already approved: ${approved.id}`);
        }
      }
      val = val || (await findValuationFor(spec.id, 'PROPOSED'));
      if (val) {
        try {
          await gateway.submit(complianceCaller, 'approveValuation', { valuationId: val.id });
          console.log('    valuation APPROVED -> VALUED');
        } catch (err) {
          console.log(`    approve skipped: ${(err.message || '').slice(0, 110)}`);
        }
        asset = (await getAsset(spec.id)) || asset;
      }
    }

    // Stage 6: mint
    if (asset.status === 'VALUED' && spec.mint) {
      const existing = await findTokenFor(spec.id);
      if (!existing) {
        try {
          const res = await gateway.submit(complianceCaller, 'mintToken', { assetId: spec.id, ...spec.mint });
          console.log(`    token minted: ${(res.result || res).id}`);
        } catch (err) {
          console.log(`    mint skipped: ${(err.message || '').slice(0, 110)}`);
        }
        asset = (await getAsset(spec.id)) || asset;
      } else {
        console.log(`    already tokenized: ${existing.id}`);
      }
    }

    // Stage 7: transfer
    if (asset.status === 'TOKENIZED' && spec.transfer) {
      let tr = null;
      try {
        tr = await gateway.evaluate(issuerCaller, 'getTransfer', { id: spec.transfer.id });
      } catch {
        tr = null;
      }
      if (!tr) {
        try {
          const res = await gateway.submit(issuerCaller, 'proposeTransfer', {
            id: spec.transfer.id,
            tokenId: asset.tokenId,
            fromParticipantId: 'PRT-ISSUER-01',
            toParticipantId: spec.transfer.toParticipantId,
            units: spec.transfer.units,
            pricePaise: spec.transfer.pricePaise,
            paymentRef: spec.transfer.paymentRef,
          });
          tr = res.result || res;
          console.log(`    transfer proposed: ${tr.id}`);
        } catch (err) {
          console.log(`    propose transfer skipped: ${(err.message || '').slice(0, 110)}`);
        }
      }
      if (tr && tr.status === 'PROPOSED') {
        try {
          const res = await gateway.submit(issuerCaller, 'executeTransfer', { transferId: tr.id });
          console.log(`    transfer ${(res.result || res).status}: ${tr.units} units -> ${spec.transfer.toParticipantId}`);
        } catch (err) {
          console.log(`    execute skipped: ${(err.message || '').slice(0, 110)}`);
        }
      } else if (tr) {
        console.log(`    transfer ${tr.id} already ${tr.status}`);
      }
    }

    const final = await getAsset(spec.id);
    console.log(`    final status: ${final ? final.status : 'unknown'}`);
  }

  console.log('\nLedger bootstrap completed successfully!');
}

main().catch((err) => {
  console.error('Ledger bootstrap failed:', err);
  process.exit(1);
});
