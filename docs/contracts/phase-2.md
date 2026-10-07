# Phase 2: Asset Type Engine, Registration & Evidence (Contract Specification & Completion)

## 1. Overview & Ownership
- **Contracts**:
  - [`AssetTypeContract.ts`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/chaincode/rwa/src/contracts/AssetTypeContract.ts)
  - [`AssetContract.ts`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/chaincode/rwa/src/contracts/AssetContract.ts)
- **API Modules**:
  - [`apps/api/src/modules/asset-types`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/api/src/modules/asset-types)
  - [`apps/api/src/modules/assets`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/api/src/modules/assets)
- **Web Features**:
  - [`apps/web/src/modules/assets`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/web/src/modules/assets)
  - [`apps/web/src/modules/asset-types`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/web/src/modules/asset-types)
- **Status**: ✅ **COMPLETED & TESTED**

---

## 2. Chaincode Interface

### Asset Type Engine (`AssetTypeContract`)

| Function | Invocable By | Parameters | State Effects / Audit |
|---|---|---|---|
| `defineAssetType` | `ADMINISTRATOR` | `definitionJson: string` | Stores `TYPE:<key>:<version>`. Rejects non-admin. Emits `AssetTypeDefined`. Appends audit log. |
| `deprecateAssetType` | `ADMINISTRATOR`, `COMPLIANCE` | `typeKey, version, reason` | Sets status to `DEPRECATED`. Prevents subsequent asset registrations. Emits `AssetTypeDeprecated`. |
| `getAssetType` | Any caller | `typeKey, version?` | Retrieves type schema definition. |
| `listAssetTypes` | Any caller | `None` | Lists all defined asset types. |

### Asset Engine & Evidence Vault (`AssetContract`)

| Function | Invocable By | Parameters | State Effects / Audit |
|---|---|---|---|
| `registerAsset` | `ISSUER` ONLY | `assetJson: string` | Validates attributes against schema, rejects if type deprecated. Computes `attributesHash`. Status `REGISTERED`. Emits `AssetRegistered`. |
| `updateAssetAttributes` | `ISSUER` (Originator) | `assetId, attributesJson, reason` | Updates dynamic attributes while status is `REGISTERED` or `CHANGES_REQUESTED`. Recomputes `attributesHash`. Blocked once submitted to verification. |
| `attachEvidence` | `ISSUER` | `evidenceJson: string` | Attaches document leaf with SHA-256. Recomputes Merkle aggregate root (`evidenceRoot`). Emits `EvidenceAttached`. |
| `submitForVerification` | `ISSUER` | `assetId: string` | Verifies all mandatory evidence requirements from schema are satisfied. Transitions status to `UNDER_VERIFICATION`. Emits `VerificationStarted`. |
| `getAsset` | Any caller | `assetId: string` | Returns asset passport. |
| `listAssets` | Any caller | `None` | Returns all registered assets. |
| `getEvidenceRoot` | Any caller | `assetId: string` | Returns SHA-256 Merkle root of active evidence documents. |

---

## 3. REST API Endpoints

### Asset Type Module (`/api/v1/asset-types`)
- `GET /` — Public list of all asset type schemas (`REAL_ESTATE`, `INVOICE`, `COMMODITY`, `VEHICLE`, etc.).
- `GET /:key` — Schema details, mandatory evidence, and dynamic attribute fields for a specific asset type.
- `POST /` — **ADMINISTRATOR ONLY** — Define a new parameterized asset type schema.
- `POST /:key/deprecate` — **ADMINISTRATOR / COMPLIANCE** — Deprecate an asset type.

### Assets Module (`/api/v1/assets`)
- `GET /` — List assets with field-level visibility filtering (redacts `RESTRICTED` fields for investors/public).
- `GET /:id` — Get single asset passport with field-level redaction.
- `POST /` — **ISSUER ONLY** — Register new real-world asset passport. Rejects duplicates on unique identity fields.
- `PATCH /:id/attributes` — **ISSUER ONLY** — Modify dynamic attributes while in `REGISTERED` status.
- `POST /:id/evidence` — **ISSUER ONLY** — Anchor evidence document (detects duplicate SHA-256 cross-asset collisions).
- `POST /:id/submit-verification` — **ISSUER ONLY** — Submit asset to verifier pool (checks mandatory evidence).

---

## 4. UI Features (`apps/web`)
1. **Real World Asset Directory (`AssetsView`)**:
   - Filter by asset type, lifecycle status, search by identifier, name, or jurisdiction.
   - Aggregate counters: Total Assets, Draft / Registered, In Verification, Verified & Tokenized.
   - Quick action to launch Physical Passport Sticker modal.
2. **Multi-Step Asset Registration Wizard (`RegisterAssetWizard`)**:
   - Step 1: Asset Type Selection with category chips.
   - Step 2: Dynamic Schema-driven form with validation on required fields.
   - Step 3: Evidence document attachment checklist.
   - Step 4: Cryptographic preview with Merkle root computation and submission.
3. **Asset Detail Drawer (`AssetDetailDrawer`)**:
   - Overview & Passport with cryptographic anchors (`attributesHash`, Merkle `evidenceRoot`).
   - Dynamic attributes inspector with `PUBLIC` vs `RESTRICTED` privacy badges.
   - Attached evidence vault with copyable SHA-256 chips.
   - "Submit to Verifier Pool" action with confirmation.
4. **Asset Type Catalog (`AssetTypesView`)**:
   - Schema definitions, duplicate prevention fields, required evidence checklist.
   - Admin "Define Asset Type" modal with custom attributes, types, and privacy settings.
   - Deprecation toggle.
5. **Physical Passport Sticker (`AssetPassportStickerModal`)**:
   - QR code for on-site inspection, digital seal, and print-ready layout.

---

## 5. Verification & Test Suite
- **Chaincode Tests**: [`chaincode/rwa/test/asset-contracts.test.js`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/chaincode/rwa/test/asset-contracts.test.js) (7 unit tests, 100% passed).
- **API Tests**: [`apps/api/test/assets-api.test.js`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/api/test/assets-api.test.js) (14 integration tests, 100% passed).
- **Zero Regression**: Phase 1 chaincode and API test suites pass in parallel.
- **Frontend Build**: Vite production build bundles without warnings or errors.
