# Role-Based Access Control (RBAC) & Segregation of Duties (SoD)

## Overview

The AsseTrust / EkamVistar platform implements strict Role-Based Access Control (RBAC) and Segregation of Duties (SoD) across all 7 ecosystem roles:
- **`ADMINISTRATOR`**: Consortium platform infrastructure, users, organizations, and asset type schemas.
- **`ISSUER`**: Real-world asset originator; manages own asset pipeline, evidence, and issued token transfers.
- **`VERIFIER`**: Independent inspection agency (TUV/SGS); records physical and legal checks on assigned verification cases.
- **`VALUER`**: Certified valuation professional; submits independent circle rate / DCF valuation proposals.
- **`COMPLIANCE`**: Regulatory gatekeeper; approves KYC, evaluates maker-checker valuations, mints tokens, and manages freeze/redemption lifecycles.
- **`INVESTOR`**: Qualified institutional or retail market participant; purchases tokenized fractions, manages private holdings, and initiates secondary transfers.
- **`AUDITOR`**: Statutory read-only oversight across consortium activity, cap tables, and ledger integrity.

Enforcement is unified across **three layers**:
1. **Frontend (Web UI)**: Single source of truth via `@rwa/contracts/permissions`, filtering navigation tabs (`tabAccess`), protecting routes (`<RoleGuard tab="...">`), and guarding in-view actions (`can(role, capability)`).
2. **Backend (Express API)**: Fine-grained middleware (`requireCapability(capability)`) and server-side data scoping (`apps/api/src/core/visibility`).
3. **Ledger & Mock Gateway**: Identical role authorization checks in Hyperledger Fabric chaincode (`chaincode/rwa/src/contracts/*.ts`) and `packages/chain-client/src/mock-gateway.js`.

---

## 1. Role × Tab Access Matrix

Access levels:
- **`W`**: Read and Write / Action permitted.
- **`R`**: Read-Only permitted (all modification or initiation actions blocked & hidden).
- *(blank)*: No access (tab hidden from sidebar, route blocked with 403, API endpoints rejected).

| Tab ID | Feature Name | ADMIN | ISSUER | VERIFIER | VALUER | COMPLIANCE | INVESTOR | AUDITOR |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard` | Role-Specific Executive View | **W** | **W** | **W** | **W** | **W** | **W** | **W** |
| `participants` | Participant & KYC Management | | **R** *(own)* | | | **W** | **R** *(own)* | **R** |
| `identity-admin` | Consortium Governance (Users & Orgs) | **W** | | | | | | |
| `asset-types` | Asset Type Schema Engine | **W** | | | | **W** *(deprecate)* | | **R** |
| `assets` | Asset Registry & Passports | | **W** *(own)* | | | **R** | | **R** |
| `verification` | Verification Work Queue | | | **W** | | **R** | | **R** |
| `valuation` | Independent Valuation Pipeline | | | | **W** *(propose)* | **W** *(approve)* | | **R** |
| `tokens` | Tokenized Securities & Cap Table | | **R** *(own)* | | | **W** *(mint)* | **R** *(listed)* | **R** *(cap table)* |
| `transfers` | Atomic P2P Transfers & Compliance | | **W** *(own)* | | | **R** *(resolve)* | **W** *(own)* | **R** |
| `lifecycle` | Lifecycle (Freeze, Redeem, Retire) | | | | | **W** | | **R** |
| `audit` | Comprehensive Ledger Audit Trail | | | | | **W** | | **R** |

---

## 2. Segregation of Duties (SoD) Rules

1. **Administrator Isolation**:
   - Platform Administrators configure users, organizations, and asset types.
   - Administrators **must not** verify, value, mint, transfer, freeze, or view off-chain participant KYC PII.
   - Administrators cannot view private asset registries, valuations, or transfer orders.
2. **Maker-Checker Valuation**:
   - Valuers propose asset valuations; only Compliance can approve or reject them.
   - The proposer cannot approve their own valuation.
   - Verifiers who inspected an asset are blocked from proposing its valuation.
3. **Issuer Ownership & Privacy**:
   - Issuers can only view, edit, and attach evidence to their own assets (`originatorParticipantId === caller.participantId`).
   - Issuers only see transfer history and cap tables for tokens issued by themselves.
4. **Investor Privacy & Public Disclosure**:
   - Investors never see unverified assets or private draft valuations.
   - Investors can only inspect public disclosures of active tokenized assets.
   - Investors can only query their own account balance; cap tables of other token holders are strictly hidden.
   - Self-onboarding is enforced: an investor can only register their own participant record.
5. **Verifier & Valuer Task Scoping**:
   - Verifiers only view pending and assigned verification cases.
   - Valuers only view assets in `VERIFIED` status awaiting valuation proposals.
6. **Auditor Read-Only Oversight**:
   - Auditors have read-only visibility into the full ledger audit trail, cap tables, and participant histories.
   - All mutation actions (mint, propose, approve, register) are completely forbidden.

---

## 3. Server-Side Data Scoping Layer

Because Hyperledger Fabric returns channel-wide data to contract queries, data isolation is enforced consistently by `apps/api/src/core/visibility/index.js` for both Fabric and Mock Gateway modes:

- `scopeAssets(caller, items)`: Filters assets so issuers only see their own originated assets; filters out unverified assets from non-oversight roles.
- `scopeAssetAttributes(caller, asset)`: Redacts restricted attribute schema fields unless the caller is the owner, assigned verifier, compliance, or auditor.
- `scopeVerificationCases(caller, cases)`: Scopes verifier queue to unassigned or verifier-assigned cases.
- `scopeValuations(caller, valuations)`: Scopes valuer queue to their own proposals or assets requiring valuation.
- `scopeTokens(caller, tokens)`: Restricts investors and issuers to publicly disclosed active tokens.
- `scopeHolders(caller, holders, token, asset)`: Redacts full cap table from investors; permits issuers to view holders of their own issued token.
- `scopeBalance(caller, participantId, balance)`: Rejects cross-participant balance queries for investors.
- `scopeTransfers(caller, transfers)`: Scopes transfer history strictly to records where the caller is either `fromParticipantId` or `toParticipantId`.
- `scopeParticipants(caller, participants)`: Redacts off-chain PII (PAN, legalName) and KYC documents from everyone except Compliance, Auditor, or the participant themselves. Completely strips KYC status and PII from Platform Administrator queries.

### Counterparty Lookup Endpoint
To enable transfer creation without leaking the consortium participant directory, `GET /api/v1/participants/lookup?q=` is provided to `ISSUER`, `INVESTOR`, and `COMPLIANCE`. It returns only sanitized counterparty previews:
```json
{
  "id": "PRT-BUYER-01",
  "displayName": "Capital Partners Ltd",
  "kycStatus": "APPROVED"
}
```

---

## 4. How to Add a New Capability

1. **Define in `@rwa/contracts`** (`packages/contracts/src/permissions.js`):
   ```js
   export const CAPABILITIES = {
     // ...
     executeNewAction: [Role.COMPLIANCE, Role.ADMINISTRATOR],
   };
   ```
2. **Apply in API Routes** (`apps/api/src/modules/<module>/<module>.routes.js`):
   ```js
   router.post('/action', requireCapability('executeNewAction'), controller.handleAction);
   ```
3. **Apply in Frontend UI** (`apps/web/src/modules/<module>/<View>.jsx`):
   ```jsx
   import { can } from '@rwa/contracts';
   // ...
   const canAct = can(user?.role, 'executeNewAction');
   {canAct && <Button onClick={doAction}>Execute Action</Button>}
   ```
4. **Enforce in Chaincode and Mock Gateway**:
   - In `chaincode/rwa/src/contracts/<Contract>.ts`:
     ```ts
     requireRole(ctx, Role.COMPLIANCE, Role.ADMINISTRATOR);
     ```
   - In `packages/chain-client/src/mock-gateway.js`:
     ```js
     if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
       throw new Error('Unauthorized role');
     }
     ```
5. **Add Matrix Integration Tests**:
   - Add unit assertion in `packages/contracts/test/permissions.test.js`.
   - Add endpoint test in `apps/api/test/rbac-matrix.test.js`.

---

## 5. Verification & Testing

Every layer is covered by comprehensive automated tests:
- **Permissions Contract**: `packages/contracts/test/permissions.test.js` (Role × Tab access and capability checks).
- **Web Navigation**: `apps/web/test/sidebar-tabs.test.js` (Asserts sidebar items match `tabAccess` for all 7 roles).
- **Backend API Matrix**: `apps/api/test/rbac-matrix.test.js` (Logs in as all 7 seeded users, calls every endpoint, and verifies 200 vs 403 status and data scoping).
- **Chaincode & Mock Gateway Parity**: `chaincode/rwa/test/*.test.js` (47 passing tests verifying role restrictions and segregation of duties).
