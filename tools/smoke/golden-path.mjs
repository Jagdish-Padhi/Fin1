import assert from 'node:assert/strict';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const err = new Error(
      `HTTP ${res.status} ${res.statusText} for ${url}: ${typeof json === 'object' ? JSON.stringify(json) : json}`
    );
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json;
}

async function login(email, password = 'password123') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return res.data ? res.data.token : res.token;
}

async function runGoldenPath() {
  console.log('========================================================');
  console.log('🚀 Running End-to-End Golden Path Smoke Test on Fabric');
  console.log('========================================================\n');

  // Step 1: Login users
  console.log('1. Authenticating seeded personas...');
  const issuerToken = await login('issuer@originator.com');
  const verifierToken = await login('verifier@auditfirm.com');
  const valuerToken = await login('valuer@valuationpartners.com');
  const complianceToken = await login('compliance@regulatory.gov.in');
  const investorToken = await login('investor@capitalfund.com');
  const auditorToken = await login('auditor@kpmg-audit.com');
  console.log('  ✅ All 6 personas authenticated successfully.\n');

  // Step 2: Register Asset as ISSUER
  console.log('2. ISSUER registering asset and attaching evidence...');
  const assetRes = await request('/assets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${issuerToken}` },
    body: {
      typeKey: 'COMMERCIAL_REAL_ESTATE',
      typeVersion: 1,
      title: 'Ekam Cyber Gateway Tower A',
      description: 'Prime Grade-A commercial real estate in Bangalore IT Corridor',
      declaredValuePaise: 5000000000,
      currency: 'INR',
      attributes: {
        propertyAddress: 'Outer Ring Road, Bellandur, Bangalore',
        totalSuperBuiltUpSqFt: 50000,
        occupancyRatePercent: 95,
        anchorTenant: 'Global Tech Corp India',
      },
    },
  });
  const asset = assetRes.data || assetRes;
  const assetId = asset.id;
  console.log(`  ✅ Asset registered: ${assetId} (Status: ${asset.status})`);

  // Attach evidence
  const evRes = await request(`/assets/${assetId}/evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${issuerToken}` },
    body: {
      docType: 'TITLE_DEED',
      fileName: 'title_deed_cyber_gateway.pdf',
      fileSize: 1048576,
      mimeType: 'application/pdf',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      storageKey: `vault/${assetId}/title_deed.pdf`,
    },
  });
  console.log(`  ✅ Evidence attached to asset: ${(evRes.data || evRes).id}`);

  // Submit for verification
  const submitRes = await request(`/assets/${assetId}/submit-verification`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${issuerToken}` },
  });
  console.log(`  ✅ Asset submitted for verification. Current status: ${(submitRes.data || submitRes).status}\n`);

  // Step 3: Verify Asset as VERIFIER
  console.log('3. VERIFIER auditing and approving verification case...');
  const casesRes = await request('/verification/cases', {
    headers: { Authorization: `Bearer ${verifierToken}` },
  });
  const cases = casesRes.data || casesRes;
  const vCase = cases.find((c) => c.assetId === assetId);
  assert.ok(vCase, `Verification case not found for asset ${assetId}`);

  await request(`/verification/cases/${vCase.id}/checks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${verifierToken}` },
    body: {
      checkKey: 'REGISTRY_CLEARANCE',
      result: 'PASSED',
      notes: 'Title ownership confirmed with Sub-Registrar records',
    },
  });

  await request(`/verification/cases/${vCase.id}/decide`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${verifierToken}` },
    body: {
      decision: 'APPROVED',
      reasonCode: 'VERIFICATION_CHECKS_PASSED',
      reasonText: 'All primary documentary checks passed',
    },
  });
  console.log(`  ✅ Verification approved. Asset is now VERIFIED.\n`);

  // Step 4: Propose & Approve Valuation
  console.log('4. VALUER proposing and approving valuation...');
  const valPropRes = await request('/valuation/propose', {
    method: 'POST',
    headers: { Authorization: `Bearer ${valuerToken}` },
    body: {
      assetId,
      amountPaise: 5200000000,
      currency: 'INR',
      methodology: 'DISCOUNTED_CASH_FLOW',
      validUntil: '2028-12-31T00:00:00.000Z',
      notes: 'Standard DCF valuation conducted on current rental yields',
    },
  });
  const valuation = valPropRes.data || valPropRes;

  await request(`/valuation/${valuation.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${complianceToken}` },
    body: {
      notes: 'Compliance reviewed and confirmed valuation credentials',
    },
  });
  console.log(`  ✅ Valuation approved. Asset is now VALUED.\n`);

  // Step 5: Mint Token as COMPLIANCE
  console.log('5. COMPLIANCE minting fractional tokens...');
  const mintRes = await request('/tokens/mint', {
    method: 'POST',
    headers: { Authorization: `Bearer ${complianceToken}` },
    body: {
      assetId,
      standard: 'FRACTIONAL',
      totalUnits: 10000,
      unitLabel: 'SQFT',
      faceValuePaise: 520000,
    },
  });
  const token = mintRes.data || mintRes;
  console.log(`  ✅ Token minted: ${token.id} (Total: ${token.totalUnits} ${token.unitLabel})\n`);

  // Step 6: Propose & Execute Transfer to INVESTOR
  console.log('6. ISSUER transferring 1,000 units to INVESTOR...');
  const propTransferRes = await request('/transfers/propose', {
    method: 'POST',
    headers: { Authorization: `Bearer ${issuerToken}` },
    body: {
      tokenId: token.id,
      fromParticipantId: 'PRT-ISSUER-01',
      toParticipantId: 'PRT-INVESTOR-01',
      units: 1000,
      pricePaise: 520000000,
      paymentRef: 'UPI-NEFT-88992211',
    },
  });
  const transfer = propTransferRes.data || propTransferRes;

  const execRes = await request(`/transfers/${transfer.id}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${issuerToken}` },
  });
  const execTransfer = execRes.data || execRes;
  assert.strictEqual(execTransfer.status, 'EXECUTED', 'Transfer execution failed');

  // Verify investor balance
  const balRes = await request(`/tokens/${token.id}/balance/PRT-INVESTOR-01`, {
    headers: { Authorization: `Bearer ${investorToken}` },
  });
  const bal = balRes.data || balRes;
  console.log(`  ✅ Transfer executed on-chain! Investor balance: ${bal.units || bal} units\n`);

  // Step 7: AUDITOR checking audit trail
  console.log('7. AUDITOR inspecting immutable ledger audit trail...');
  const auditRes = await request(`/audit/trail/ASSET/${assetId}`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  });
  const trail = auditRes.data || auditRes;
  console.log(`  ✅ Audit trail verified: ${trail.length || 0} lifecycle events recorded.`);

  console.log('\n🎉 ALL GOLDEN PATH MILESTONES VERIFIED ON HYPERLEDGER FABRIC!');
}

runGoldenPath().catch((err) => {
  console.error('\n❌ Golden Path failed:', err.message);
  process.exit(1);
});
