# Phase 4: Valuation
- **Contract**: `ValuationContract.ts`
- **API Module**: `apps/api/src/modules/valuation`
- **Key Functions**: `proposeValuation`, `approveValuation`
- Status: COMPLETED & TESTED
## API

- `GET /api/v1/valuation` — list valuations (authenticated).
- `GET /api/v1/valuation/:id` — read a valuation (authenticated).
- `POST /api/v1/valuation/propose` — `VALUER` only; records a proposal for an asset in `VERIFIED`.
- `POST /api/v1/valuation/:id/approve` — `COMPLIANCE` or a second `VALUER`; no request body.

Proposal body:

```json
{
  "assetId": "AST-123",
  "amountPaise": 125000000,
  "currency": "INR",
  "method": "MARKET_COMPARABLE",
  "methodDetails": { "comparableCount": 3 },
  "source": {
    "valuerName": "Independent Valuer",
    "valuerOrg": "Valuation Partners",
    "reportReference": "REPORT-123",
    "reportHash": "<optional 64-character SHA-256 hex digest>"
  },
  "valuationDate": "2026-10-06T12:00:00.000Z",
  "validUntil": "2027-04-04T12:00:00.000Z"
}
```

The proposal must use a method configured on the asset's pinned type version, INR, a positive whole-paise amount, a valuation date that is not in the future, and an unexpired validity window no longer than the type's configured `validityDays`. The proposal is rejected if the valuer is from the issuer organization, is the asset verifier, or another proposal is already pending.

Approval requires the asset to remain `VERIFIED`, the valuation to remain unexpired and `PROPOSED`, and the checker to be different from both proposer and verifier and not from the issuer organization. Approval changes the valuation to `APPROVED` and the asset to `VALUED` atomically, appends audit records for both, and emits `ValuationApproved`. Read APIs return the persisted records.

Reject, supersede/revaluation, and scheduled stale-expiry commands are not part of this implementation scope.

Testing
- Chaincode: 25 tests passed
- API: 21 tests passed
- Manual E2E: PASSED
- Final asset status: VALUED
---

# Phase 5: Tokenization & Traceability
- **Contract**: `TokenContract.ts`
- **API Module**: `apps/api/src/modules/tokens`
- **Key Functions**: `mintToken`, `getBalance`, `listHolders`, `getTokenTrace`

`POST /api/v1/tokens/mint` is restricted to `COMPLIANCE` and `ADMINISTRATOR`. The asset must be `VALUED` and not already tokenized. Minting creates one active token, assigns its full initial supply to the asset originator, changes the asset state to `TOKENIZED`, writes audit records for the token and asset, and emits `TokenMinted`.

Mint request:

```json
{
  "assetId": "AST-123",
  "standard": "FRACTIONAL",
  "totalUnits": 10000,
  "unitLabel": "UNITS",
  "rightsType": "UNDIVIDED_FRACTION",
  "representation": "Undivided economic interest in the asset"
}
```

`unitLabel` is optional and defaults to `UNITS`. `totalUnits` must be a positive safe integer; token standard and rights type must be supported enum values.

Authenticated read endpoints:
- `GET /api/v1/tokens` — list tokens.
- `GET /api/v1/tokens/:id` — token record.
- `GET /api/v1/tokens/:id/balance/:participantId` — participant units, including zero balance.
- `GET /api/v1/tokens/:id/holders` — non-zero token holders.
- `GET /api/v1/tokens/:id/trace` — token, related asset, holders, and token audit trail.
- `GET /api/v1/tokens/public-verify/:id` — public token passport without authentication.

Mint returns HTTP 201 with `{ "success": true, "data": <token> }`. Invalid requests return HTTP 400, unauthorized mint requests HTTP 403, missing token/asset reads HTTP 404, and repeat minting for a tokenized asset HTTP 409. Token transfers are Phase 6 and are not part of Phase 5.

API
- Token minting endpoint
- Balance endpoint
- Holder and traceability queries

Flow
VALUED → Mint Token → TOKENIZED → Originator receives tokens

Testing
- Chaincode: 25 tests passed
- API: 26 tests passed
- Build: PASSED
- Prettier: PASSED
- Worktree: CLEAN
- Commit: 017463c feat: implement tokenization and traceability
Total Test Result: PASSED
---

# Phase 6: Ownership, Transfer & Rule Engine
- **Contract**: `TransferContract.ts`
- **API Module**: `apps/api/src/modules/transfers`
- **Key Functions**: `proposeTransfer`, `evaluateTransfer`, `executeTransfer` (recording rejections)

---

# Phase 7: Lifecycle Controls: Freeze, Redeem, Retire
- **Contract**: `LifecycleContract.ts`
- **API Module**: `apps/api/src/modules/lifecycle`
- **Key Functions**: `freezeAsset`, `unfreezeAsset`, `redeemAsset`, `retireAsset`

---

# Phase 8: Audit, Explorer & Integrity
- **Contract**: `AuditContract.ts`
- **API Module**: `apps/api/src/modules/audit`
- **Key Functions**: `getAuditTrail`, `getStateHash`

---

# Phase 9: Role Dashboards, Notifications & Integrations
- **API Module**: `apps/api/src/modules/events`
- **Web Feature**: `apps/web/src/modules/dashboard`

---

# Phase 10: Integration, Hardening, Deployment & Extensibility Proof
- **Scope**: Golden paths, Playwright E2E, Invoice asset type config extensibility proof
