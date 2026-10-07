# Phase 1: Participants, Identity & Access (Contract Specification & Completion)

## 1. Overview & Ownership
- **Contract**: [`ParticipantContract.ts`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/chaincode/rwa/src/contracts/ParticipantContract.ts)
- **API Modules**:
  - [`apps/api/src/modules/participants`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/api/src/modules/participants)
  - [`apps/api/src/modules/identity-admin`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/api/src/modules/identity-admin)
- **Web Features**:
  - [`apps/web/src/modules/participants`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/web/src/modules/participants)
  - [`apps/web/src/modules/identity-admin`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/web/src/modules/identity-admin)
- **Status**: ✅ **COMPLETED & TESTED**

---

## 2. Chaincode Interface (`ParticipantContract`)

| Function | Invocable By | Parameters | State Effects / Audit |
|---|---|---|---|
| `registerParticipant` | `ADMINISTRATOR`, `ISSUER` | `dataJson: string` | Puts `PRT:<id>` with salted SHA-256 PII hash. Appends audit record. Emits `ParticipantRegistered`. |
| `updateKycStatus` | **`COMPLIANCE` ONLY** (SoD) | `participantId, kycStatus, reason, expiryDate?` | Updates KYC status (`SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED`). Prohibits Administrator. Emits `KycUpdated`. |
| `setInvestorClass` | `COMPLIANCE`, `ADMINISTRATOR` | `participantId, investorClass, reason` | Sets tier (`RETAIL`, `QUALIFIED`, `INSTITUTIONAL`). Emits `InvestorClassUpdated`. |
| `setLimits` | `COMPLIANCE`, `ADMINISTRATOR` | `participantId, limitsJson, reason` | Updates `maxHoldingBps` and `maxTransferPaise`. Emits `LimitsUpdated`. |
| `suspendParticipant` | `COMPLIANCE`, `ADMINISTRATOR` | `participantId, reason` | Updates status to `SUSPENDED`. Prohibits token transfers in rule engine. Emits `ParticipantSuspended`. |
| `reinstateParticipant` | `COMPLIANCE`, `ADMINISTRATOR` | `participantId, reason` | Restores status to `ACTIVE`. Emits `ParticipantReinstated`. |
| `addToBlacklist` | **`COMPLIANCE` ONLY** | `participantId, reason` | Updates status to `BLACKLISTED`. Emits `BlacklistAdded`. |
| `removeFromBlacklist` | **`COMPLIANCE` ONLY** | `participantId, reason` | Restores status to `ACTIVE`. Emits `BlacklistRemoved`. |
| `getParticipant` | Any caller | `participantId: string` | Returns participant JSON from ledger. |
| `listParticipants` | Any caller | `None` | Returns paginated list of all participants. |
| `participantExistsAndActive` | Contracts / Gateway | `participantId: string` | Returns `{ exists, active, kycApproved }` for rule evaluation. |

---

## 3. REST API Endpoints

### Participants Module (`/api/v1/participants`)
- `GET /` — List participants with role-based field redaction (investors only see public eligibility; auditors/compliance see full records).
- `GET /:id` — Get single participant passport with redaction.
- `POST /` — Onboard participant with off-chain encrypted PII storage and on-chain salted hash.
- `PATCH /:id/kyc` — **COMPLIANCE ONLY** (Enforces Segregation of Duties; returns 403 for Admin/Issuer).
- `PATCH /:id/investor-class` — Set investor class (Compliance, Admin).
- `PATCH /:id/limits` — Set fractional holding cap (bps) and per-transfer cap (paise).
- `POST /:id/suspend` — Suspend participant (Compliance, Admin).
- `POST /:id/reinstate` — Reinstate participant (Compliance, Admin).
- `POST /:id/blacklist` — Blacklist participant (Compliance).
- `DELETE /:id/blacklist` — Remove from blacklist (Compliance).
- `POST /:id/kyc-docs` — Upload KYC verification document and record SHA-256 hash.

### Identity Admin Module (`/api/v1/identity-admin`)
- `GET /users` — List consortium users across all 6 MSPs.
- `POST /users` — Provision consortium user with automatic Fabric CA attributes and organization MSP validation.
- `PATCH /users/:id/status` — Deactivate / activate user. Deactivated users are blocked from logins and transactions.
- `GET /orgs` — List all connected consortium member organizations.
- `POST /orgs` — Provision new consortium organization.

---

## 4. UI Features (`apps/web`)
1. **Participant Directory & KYC Dashboard**:
   - Filter by KYC status, active state, and investor tier.
   - Status chips, fractional holding cap, and transfer limit displays.
   - Role-gated actions: "Review KYC" (Compliance), "Set Limits" (Admin), "Suspend" / "Blacklist" (Compliance/Admin).
2. **Onboard Participant Modal**:
   - PII capture with client/server SHA-256 calculation.
   - Investor classification, jurisdiction, and limit settings.
   - Document attachment simulation.
3. **Compliance KYC Review Modal**:
   - Mandatory auditable reason code & notes capture.
   - Decision choices: `APPROVED`, `UNDER_REVIEW`, `REJECTED`.
4. **Participant Ledger Passport Drawer**:
   - Complete ledger view with on-chain salted PII hash copy chip, Fabric MSP enrollment, and KYC attachments.
5. **Consortium Organizations & Users Admin**:
   - Manage consortium users, MSP organization bindings, and Fabric CA credential status.
   - Deactivate user toggle.

---

## 5. Verification & Test Suite
- **Chaincode tests**: [`chaincode/rwa/test/participant-contract.test.js`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/chaincode/rwa/test/participant-contract.test.js) (8 unit tests, permission matrix, SoD enforcement, duplicate checks, state transitions).
- **API tests**: [`apps/api/test/participants-api.test.js`](file:///c:/Users/jagdi/Downloads/syrus7/Fin1/apps/api/test/participants-api.test.js) (10 end-to-end integration tests, 6 role logins, field redaction, suspension propagation to transfers).
- **Total Test Results**: **18 passed, 0 failed**.
