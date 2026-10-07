import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssetTypeContract } from '../dist/contracts/AssetTypeContract.js';
import { AssetContract } from '../dist/contracts/AssetContract.js';
import { Role, AssetStatus, AssetTypeStatus } from '@rwa/contracts';

function createMockCtx({ mspId = 'IssuerMSP', role = Role.ISSUER, userId = 'USR-ISSUER', participantId = 'PRT-ISSUER' } = {}, stateMap = new Map()) {
  const events = [];
  return {
    clientIdentity: {
      getMSPID: () => mspId,
      getAttributeValue: (attr) => {
        if (attr === 'role') return role;
        if (attr === 'userId') return userId;
        if (attr === 'participantId') return participantId;
        return null;
      },
    },
    stub: {
      getTxID: () => '0x' + Math.random().toString(16).slice(2).padStart(64, '0'),
      getTxTimestamp: () => ({ seconds: { low: Math.floor(Date.now() / 1000) } }),
      getState: async (key) => stateMap.get(key) || Buffer.alloc(0),
      putState: async (key, val) => stateMap.set(key, val),
      getStateByRange: async (start, end) => {
        const entries = [];
        for (const [k, v] of stateMap.entries()) {
          if (k >= start && k <= end) {
            entries.push({ key: k, value: v });
          }
        }
        let idx = 0;
        return {
          next: async () => {
            if (idx < entries.length) {
              return { value: entries[idx++], done: false };
            }
            return { done: true };
          },
          close: async () => {},
        };
      },
      setEvent: (name, payload) => events.push({ name, payload }),
    },
    events,
    stateMap,
  };
}

describe('Phase 2: AssetTypeContract & AssetContract (Chaincode Engine)', () => {
  const typeContract = new AssetTypeContract();
  const assetContract = new AssetContract();

  const sampleTypeDef = {
    key: 'SOLAR_PANEL',
    version: 1,
    displayName: 'Solar Photovoltaic Asset',
    attributeSchema: {
      serialNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
      ratedCapacityKw: { type: 'number', required: true, visibility: 'PUBLIC' },
      contractPrice: { type: 'number', required: false, visibility: 'RESTRICTED' },
    },
    evidenceRequirements: [
      { docType: 'INSTALLATION_CERT', required: true, description: 'Installation Certificate' },
      { docType: 'WARRANTY_DEED', required: false, description: 'Manufacturer Warranty' },
    ],
    verificationChecklist: [
      { key: 'GRID_COMPLIANCE', label: 'Grid Interconnection Verified', required: true },
    ],
  };

  it('allows ADMINISTRATOR to define an asset type and rejects non-admin', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    const nonAdminCtx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP' }, state);

    // Non-admin rejection
    await assert.rejects(
      async () => {
        await typeContract.defineAssetType(nonAdminCtx, JSON.stringify(sampleTypeDef));
      },
      /Unauthorized/
    );

    // Admin success
    const resultJson = await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));
    const result = JSON.parse(resultJson);
    assert.equal(result.key, 'SOLAR_PANEL');
    assert.equal(result.version, 1);
    assert.equal(result.status, AssetTypeStatus.ACTIVE);

    // Reject duplicate definition of same key and version
    await assert.rejects(
      async () => {
        await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));
      },
      /already exists/
    );
  });

  it('allows deprecating an asset type and updates status to DEPRECATED', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));

    const deprecatedJson = await typeContract.deprecateAssetType(adminCtx, 'SOLAR_PANEL', '1', 'Replaced by v2');
    const deprecated = JSON.parse(deprecatedJson);
    assert.equal(deprecated.status, AssetTypeStatus.DEPRECATED);

    // Query getAssetType
    const queried = JSON.parse(await typeContract.getAssetType(adminCtx, 'SOLAR_PANEL', '1'));
    assert.equal(queried.status, AssetTypeStatus.DEPRECATED);
  });

  it('enforces schema validation on required attributes when registering an asset', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    const issuerCtx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP', participantId: 'PRT-ISSUER-01' }, state);

    await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));

    // Missing required field 'serialNumber'
    const invalidAsset = {
      id: 'AST-SOLAR-01',
      typeKey: 'SOLAR_PANEL',
      typeVersion: 1,
      displayName: 'Solar Farm Array #1',
      attributes: {
        ratedCapacityKw: 500,
      },
    };

    await assert.rejects(
      async () => {
        await assetContract.registerAsset(issuerCtx, JSON.stringify(invalidAsset));
      },
      /Missing required field 'serialNumber'/
    );

    // Non-issuer rejection
    const investorCtx = createMockCtx({ role: Role.INVESTOR, mspId: 'InvestorMSP' }, state);
    await assert.rejects(
      async () => {
        await assetContract.registerAsset(investorCtx, JSON.stringify({
          ...invalidAsset,
          attributes: { serialNumber: 'SN-99881', ratedCapacityKw: 500 },
        }));
      },
      /Unauthorized/
    );

    // Valid asset registration by Issuer
    const validAsset = {
      id: 'AST-SOLAR-01',
      typeKey: 'SOLAR_PANEL',
      typeVersion: 1,
      displayName: 'Solar Farm Array #1',
      attributes: {
        serialNumber: 'SN-99881',
        ratedCapacityKw: 500,
        contractPrice: 250000,
      },
    };

    const registeredJson = await assetContract.registerAsset(issuerCtx, JSON.stringify(validAsset));
    const registered = JSON.parse(registeredJson);
    assert.equal(registered.id, 'AST-SOLAR-01');
    assert.equal(registered.status, AssetStatus.REGISTERED);
    assert.equal(registered.originatorParticipantId, 'PRT-ISSUER-01');
    assert.ok(registered.attributesHash, 'Attributes hash must be computed');
  });

  it('blocks asset registration under a DEPRECATED asset type', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    const issuerCtx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP', participantId: 'PRT-ISSUER-01' }, state);

    await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));
    await typeContract.deprecateAssetType(adminCtx, 'SOLAR_PANEL', '1', 'Discontinued');

    const assetData = {
      id: 'AST-SOLAR-02',
      typeKey: 'SOLAR_PANEL',
      typeVersion: 1,
      displayName: 'Solar Farm Array #2',
      attributes: {
        serialNumber: 'SN-99882',
        ratedCapacityKw: 100,
      },
    };

    await assert.rejects(
      async () => {
        await assetContract.registerAsset(issuerCtx, JSON.stringify(assetData));
      },
      /Cannot register asset under deprecated asset type/
    );
  });

  it('allows updating attributes prior to verification and updates attributesHash', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    const issuerCtx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP', participantId: 'PRT-ISSUER-01' }, state);

    await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));
    await assetContract.registerAsset(issuerCtx, JSON.stringify({
      id: 'AST-SOLAR-03',
      typeKey: 'SOLAR_PANEL',
      typeVersion: 1,
      displayName: 'Solar Farm Array #3',
      attributes: {
        serialNumber: 'SN-100',
        ratedCapacityKw: 50,
      },
    }));

    const originalAsset = JSON.parse(await assetContract.getAsset(issuerCtx, 'AST-SOLAR-03'));
    const prevHash = originalAsset.attributesHash;

    const updatedJson = await assetContract.updateAssetAttributes(
      issuerCtx,
      'AST-SOLAR-03',
      JSON.stringify({ ratedCapacityKw: 65 }),
      'Capacity upgrade re-measurement'
    );
    const updatedAsset = JSON.parse(updatedJson);

    assert.equal(updatedAsset.attributes.ratedCapacityKw, 65);
    assert.equal(updatedAsset.version, 2);
    assert.notEqual(updatedAsset.attributesHash, prevHash);
  });

  it('attaches evidence and computes Merkle aggregate root', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    const issuerCtx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP', participantId: 'PRT-ISSUER-01' }, state);

    await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));
    await assetContract.registerAsset(issuerCtx, JSON.stringify({
      id: 'AST-SOLAR-04',
      typeKey: 'SOLAR_PANEL',
      typeVersion: 1,
      displayName: 'Solar Array #4',
      attributes: {
        serialNumber: 'SN-400',
        ratedCapacityKw: 120,
      },
    }));

    // Attach first evidence
    await assetContract.attachEvidence(issuerCtx, JSON.stringify({
      assetId: 'AST-SOLAR-04',
      docType: 'INSTALLATION_CERT',
      fileName: 'install_cert.pdf',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    }));

    const root1 = await assetContract.getEvidenceRoot(issuerCtx, 'AST-SOLAR-04');
    assert.ok(root1 && root1.length === 64, 'Evidence root must be 64-char sha256');

    // Attach second evidence -> root changes
    await assetContract.attachEvidence(issuerCtx, JSON.stringify({
      assetId: 'AST-SOLAR-04',
      docType: 'WARRANTY_DEED',
      fileName: 'warranty.pdf',
      sha256: 'ca978112ca1bbdcafac231b39a23dc4da78608149658b605bc191b9206b45f09',
    }));

    const root2 = await assetContract.getEvidenceRoot(issuerCtx, 'AST-SOLAR-04');
    assert.ok(root2 && root2.length === 64);
    assert.notEqual(root1, root2, 'Merkle root must update when new evidence is attached');
  });

  it('enforces mandatory evidence checklist upon submitForVerification and blocks further attribute edits', async () => {
    const state = new Map();
    const adminCtx = createMockCtx({ role: Role.ADMINISTRATOR, mspId: 'Org1MSP' }, state);
    const issuerCtx = createMockCtx({ role: Role.ISSUER, mspId: 'IssuerMSP', participantId: 'PRT-ISSUER-01' }, state);

    await typeContract.defineAssetType(adminCtx, JSON.stringify(sampleTypeDef));
    await assetContract.registerAsset(issuerCtx, JSON.stringify({
      id: 'AST-SOLAR-05',
      typeKey: 'SOLAR_PANEL',
      typeVersion: 1,
      displayName: 'Solar Array #5',
      attributes: {
        serialNumber: 'SN-500',
        ratedCapacityKw: 200,
      },
    }));

    // Missing mandatory evidence 'INSTALLATION_CERT'
    await assert.rejects(
      async () => {
        await assetContract.submitForVerification(issuerCtx, 'AST-SOLAR-05');
      },
      /Missing mandatory evidence document/
    );

    // Attach mandatory evidence
    await assetContract.attachEvidence(issuerCtx, JSON.stringify({
      assetId: 'AST-SOLAR-05',
      docType: 'INSTALLATION_CERT',
      fileName: 'installation.pdf',
      sha256: '88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589',
    }));

    // Submit now succeeds and status changes to UNDER_VERIFICATION
    const submittedJson = await assetContract.submitForVerification(issuerCtx, 'AST-SOLAR-05');
    const submitted = JSON.parse(submittedJson);
    assert.equal(submitted.status, AssetStatus.UNDER_VERIFICATION);

    // Attribute modification must now be blocked
    await assert.rejects(
      async () => {
        await assetContract.updateAssetAttributes(
          issuerCtx,
          'AST-SOLAR-05',
          JSON.stringify({ ratedCapacityKw: 250 }),
          'Illegal mid-verification edit'
        );
      },
      /Attribute change blocked: Asset is in status 'UNDER_VERIFICATION'/
    );
  });
});
