import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { Role, AssetStatus, AssetTypeStatus } from '@rwa/contracts';

async function requestApp(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    import('http').then(({ createServer }) => {
      const server = createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        const targetUrl = `http://127.0.0.1:${port}${path}`;

        fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        })
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            server.close();
            resolve({ status: res.status, ok: res.ok, body: json });
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });
}

describe('Phase 2: Asset Type Engine, Registration & Evidence (API Integration)', () => {
  let adminToken;
  let issuerToken;
  let investorToken;
  let verifierToken;

  before(async () => {
    const adminLogin = await authService.login('admin@ekamvistar.com', 'Password@123');
    adminToken = adminLogin.token;

    const issuerLogin = await authService.login('issuer@originator.com', 'Password@123');
    issuerToken = issuerLogin.token;

    const investorLogin = await authService.login('investor@capitalfund.com', 'Password@123');
    investorToken = investorLogin.token;

    const verifierLogin = await authService.login('verifier@auditfirm.com', 'Password@123');
    verifierToken = verifierLogin.token;
  });

  describe('1. Asset Type Engine Endpoints', () => {
    it('GET /api/v1/asset-types lists default seeded asset types', async () => {
      const res = await requestApp('GET', '/api/v1/asset-types');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 4);

      const keys = res.body.data.map((t) => t.key);
      assert.ok(keys.includes('REAL_ESTATE'));
      assert.ok(keys.includes('INVOICE'));
      assert.ok(keys.includes('COMMODITY'));
      assert.ok(keys.includes('VEHICLE'));
    });

    it('GET /api/v1/asset-types/:key returns schema details for a specific type', async () => {
      const res = await requestApp('GET', '/api/v1/asset-types/REAL_ESTATE');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.key, 'REAL_ESTATE');
      assert.ok(res.body.data.attributeSchema);
      assert.ok(res.body.data.uniqueFields.includes('surveyNumber'));
    });

    it('POST /api/v1/asset-types enforces Admin role and defines custom type', async () => {
      const customType = {
        key: 'AIRCRAFT_ENGINE',
        name: 'Aviation Turbofan Engine',
        description: 'Commercial aircraft engine asset lease',
        category: 'AVIATION',
        defaultJurisdiction: 'IN',
        uniqueFields: ['esnNumber'],
        mandatoryEvidence: ['FAA_CERT', 'LOGBOOK_RECORDS'],
        attributeSchema: {
          esnNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
          cyclesSinceNew: { type: 'number', required: true, visibility: 'PUBLIC' },
          leaseRatePerMonth: { type: 'number', required: false, visibility: 'RESTRICTED' },
        },
      };

      // Denied for Issuer
      const failRes = await requestApp('POST', '/api/v1/asset-types', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: customType,
      });
      assert.equal(failRes.status, 403);

      // Allowed for Administrator
      const okRes = await requestApp('POST', '/api/v1/asset-types', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: customType,
      });
      assert.equal(okRes.status, 201);
      assert.equal(okRes.body.data.key, 'AIRCRAFT_ENGINE');
      assert.equal(okRes.body.data.status, 'ACTIVE');
    });

    it('POST /api/v1/asset-types/:key/deprecate deprecates an asset type', async () => {
      const res = await requestApp('POST', '/api/v1/asset-types/AIRCRAFT_ENGINE/deprecate', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { reason: 'Superseded by updated standard' },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'DEPRECATED');
    });
  });

  describe('2. Asset Registration, Attributes & Evidence Flow', () => {
    let createdAssetId;

    it('POST /api/v1/assets rejects non-issuer callers', async () => {
      const res = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${investorToken}` },
        body: {
          typeKey: 'VEHICLE',
          displayName: 'Unauthorized Asset',
          attributes: { chassisNumber: 'VIN-TEST-001', model: 'EV Bus' },
        },
      });
      assert.equal(res.status, 403);
    });

    it('POST /api/v1/assets rejects asset missing required schema attributes', async () => {
      const res = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          typeKey: 'VEHICLE',
          displayName: 'Incomplete Vehicle',
          attributes: {
            // Missing registrationNumber, chassisNumber, make, etc.
            color: 'Blue',
          },
        },
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.error?.message?.includes('Missing required field') || res.body.error?.message?.includes('Validation'));
    });

    it('POST /api/v1/assets rejects registration under a DEPRECATED asset type', async () => {
      const res = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          typeKey: 'AIRCRAFT_ENGINE',
          displayName: 'Engine Serial #1',
          attributes: {
            esnNumber: 'ESN-9999',
            cyclesSinceNew: 400,
          },
        },
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.error?.message?.includes('deprecated'));
    });

    it('POST /api/v1/assets registers a valid asset with computed attributesHash and REGISTERED status', async () => {
      const payload = {
        typeKey: 'VEHICLE',
        displayName: 'Electric Fleet Hauler #101',
        jurisdiction: 'IN',
        custodian: 'EkamSafe Vaults',
        attributes: {
          registrationNumber: 'KA-01-EQ-9001',
          chassisNumber: 'VIN-EVE-998877665544',
          make: 'Tata Motors',
          model: 'Ultra T.7 Electric',
          manufacturingYear: 2024,
          fuelType: 'ELECTRIC',
          fleetOperator: 'QuickLogistics India Ltd',
          purchasePriceInr: 2800000,
        },
      };

      const res = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: payload,
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.status, AssetStatus.REGISTERED);
      assert.ok(res.body.data.attributesHash);
      createdAssetId = res.body.data.id;
    });

    it('POST /api/v1/assets rejects duplicate registration with identical unique field (anti-fraud double-financing)', async () => {
      const duplicatePayload = {
        typeKey: 'VEHICLE',
        displayName: 'Fraudulent Duplicate Vehicle Claim',
        jurisdiction: 'IN',
        attributes: {
          registrationNumber: 'KA-01-EQ-9001', // Identical unique field
          chassisNumber: 'VIN-EVE-998877665544',
          make: 'Tata Motors',
          model: 'Ultra T.7 Electric',
          manufacturingYear: 2024,
          fuelType: 'ELECTRIC',
          fleetOperator: 'Other Operator',
          purchasePriceInr: 2800000,
        },
      };

      const res = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: duplicatePayload,
      });

      assert.equal(res.status, 409);
      assert.ok(res.body.error?.message?.includes('already registered'));
    });

    it('PATCH /api/v1/assets/:id/attributes updates attributes and recalculates hash prior to verification', async () => {
      const patchRes = await requestApp('PATCH', `/api/v1/assets/${createdAssetId}/attributes`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          attributes: {
            fleetOperator: 'QuickLogistics Green Fleet Division',
          },
        },
      });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.data.attributes.fleetOperator, 'QuickLogistics Green Fleet Division');
    });

    it('POST /api/v1/assets/:id/evidence attaches evidence document and updates Merkle root', async () => {
      const docPayload = {
        docType: 'RC_BOOK',
        title: 'Vehicle Registration Certificate (Smart Card)',
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
        mimeType: 'application/pdf',
        sizeBytes: 1548200,
      };

      const res = await requestApp('POST', `/api/v1/assets/${createdAssetId}/evidence`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: docPayload,
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.evidenceFiles.length >= 1);
      assert.ok(res.body.data.evidenceRoot, 'Evidence Merkle root must be calculated');

      // Register second asset to test cross-asset double-pledge hash collision
      const asset2Res = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          typeKey: 'INVOICE',
          displayName: 'Invoice #INV-2024-9988',
          attributes: {
            invoiceNumber: 'INV-2024-9988',
            supplierGstin: '27AABCU9603R1ZM',
            buyerGstin: '29AABCU9603R1ZN',
            amountPaise: 45000000,
            dueDate: '2026-11-30',
          },
        },
      });
      assert.equal(asset2Res.status, 201);
      const asset2Id = asset2Res.body.data.id;

      // Duplicate evidence hash collision check across assets
      const dupDocRes = await requestApp('POST', `/api/v1/assets/${asset2Id}/evidence`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          docType: 'INVOICE_PDF',
          title: 'Duplicate Document',
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef', // Same hash
        },
      });
      assert.equal(dupDocRes.status, 409);
      assert.ok(dupDocRes.body.error?.message?.includes('already attached'));
    });

    it('POST /api/v1/assets/:id/submit-verification blocks submission if mandatory evidence is missing', async () => {
      // VEHICLE mandatory evidence: RC_BOOK, INSURANCE_POLICY, FITNESS_CERT
      // We only attached RC_BOOK so far
      const res = await requestApp('POST', `/api/v1/assets/${createdAssetId}/submit-verification`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.error?.message?.includes('Missing mandatory evidence') || res.body.error?.message?.includes('evidence'));
    });

    it('POST /api/v1/assets/:id/submit-verification transitions asset to UNDER_VERIFICATION when all mandatory evidence is present', async () => {
      // Attach remaining mandatory documents
      await requestApp('POST', `/api/v1/assets/${createdAssetId}/evidence`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          docType: 'INSURANCE_POLICY',
          title: 'Commercial Vehicle Comprehensive Policy',
          sha256: 'b2c3d4e5f6a10718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
        },
      });

      await requestApp('POST', `/api/v1/assets/${createdAssetId}/evidence`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          docType: 'FITNESS_CERT',
          title: 'Transport Department Fitness Certificate',
          sha256: 'c3d4e5f6a1b20718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
        },
      });

      const submitRes = await requestApp('POST', `/api/v1/assets/${createdAssetId}/submit-verification`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
      });

      assert.equal(submitRes.status, 200);
      assert.equal(submitRes.body.data.status, AssetStatus.UNDER_VERIFICATION);

      // Verify that attribute edits are now blocked
      const editBlockedRes = await requestApp('PATCH', `/api/v1/assets/${createdAssetId}/attributes`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: { attributes: { make: 'Illegal Change' } },
      });
      assert.equal(editBlockedRes.status, 400);
    });

    it('Field Visibility: GET /api/v1/assets/:id redacts RESTRICTED fields for INVESTOR and shows them for ISSUER/VERIFIER', async () => {
      // Query as ISSUER
      const issuerView = await requestApp('GET', `/api/v1/assets/${createdAssetId}`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
      });
      assert.equal(issuerView.status, 200);
      assert.equal(issuerView.body.data.attributes.purchasePriceInr, 2800000);

      // Query as VERIFIER
      const verifierView = await requestApp('GET', `/api/v1/assets/${createdAssetId}`, {
        headers: { Authorization: `Bearer ${verifierToken}` },
      });
      assert.equal(verifierView.status, 200);
      assert.equal(verifierView.body.data.attributes.purchasePriceInr, 2800000);

      // Query as INVESTOR (purchasePriceInr is RESTRICTED field)
      const investorView = await requestApp('GET', `/api/v1/assets/${createdAssetId}`, {
        headers: { Authorization: `Bearer ${investorToken}` },
      });
      assert.equal(investorView.status, 200);
      assert.equal(
        investorView.body.data.attributes.purchasePriceInr,
        '[REDACTED (CONSORTIUM PRIVILEGED)]'
      );
      // Public field must still be visible
      assert.equal(investorView.body.data.attributes.make, 'Tata Motors');
    });
  });
});
