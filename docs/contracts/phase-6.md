# Phase 6: Ownership, Transfer & Rule Engine

- **Contract**: `chaincode/rwa/src/contracts/TransferContract.ts`
- **Rule Engine**: Deterministic on-chain rule evaluation (`PARTICIPANT_ACTIVE`, `PARTY_KYC_VERIFIED`, `BUYER_CLASS_AT_LEAST`, `JURISDICTION_ALLOWED`, `SELLER_BALANCE`, `WHOLE_ONLY`, `MIN_TRANSFER_THRESHOLD`, `MAX_HOLDING_CAP_EXCEEDED`, `MAX_VALUE_CAP_EXCEEDED`, `ASSET_TRANSFERABLE`, `SELF_TRANSFER_PROHIBITED`)
- **API Module**: `apps/api/src/modules/transfers`
- **Web Feature**: `apps/web/src/modules/transfers/TransfersView.jsx`
- **Status**: COMPLETED & TESTED

---

## 1. On-Chain Smart Contract (`TransferContract`)

### Critical Fabric Design Rule 3.4-1: Persisted Rejections
A business rule rejection (such as KYC unverified, inactive participant, concentration cap exceeded, or whole token split attempt) does **NOT** fail or revert the Fabric transaction. Instead, the transaction succeeds, updates the transfer status to `REJECTED`, captures the complete list of structured `rejectionReasons[]` with rule code, explanation, observed values and limits, appends an immutable `AuditLog` entry, emits a `TransferRejected` event, and commits to the ledger.

### Key Functions
- `proposeTransfer(ctx, transferJson)`: Proposes a token transfer. Permitted roles: `ISSUER`, `INVESTOR`, `COMPLIANCE`, `ADMINISTRATOR`. Writes record with status `PROPOSED`, appends audit log, emits `TransferProposed`.
- `evaluateTransfer(ctx, inputJson)`: Read-only pre-flight rule checker. Evaluates all configured transfer rules against a proposed or hypothetical transfer and returns `{ passed: boolean, results: Record<string, any>, rejectionReasons: Array<{ code, message, observedValue?, limit? }> }`.
- `executeTransfer(ctx, executeInput)`: Executes atomic transfer and balance settlement. If any rules fail, records `REJECTED` state and reasons without reverting. If all rules pass, atomically debits seller balance, credits buyer balance, transitions status to `EXECUTED`, appends audit log, and emits `TransferExecuted`.
- `getTransfer(ctx, transferInput)`: Retrieves transfer record by ID.
- `listTransfers(ctx, query)`: Returns all transfer records across the ledger.
- `getTransferHistory(ctx, historyInput)`: Returns all transfer history (both executed and rejected) for a specific `tokenId`.
- `cancelTransfer(ctx, cancelInput)`: Transitions proposed transfer to `CANCELLED` with reason and audit log.

---

## 2. REST API Endpoints

- `GET /api/v1/transfers` — list all transfers (authenticated).
- `GET /api/v1/transfers/:id` — read single transfer by ID.
- `GET /api/v1/transfers/token/:tokenId/history` — list full transfer history for a specific token.
- `POST /api/v1/transfers/propose` — propose a transfer (restricted to `ISSUER`, `INVESTOR`, `COMPLIANCE`, `ADMINISTRATOR`).
- `POST /api/v1/transfers/evaluate` — evaluate rules pre-flight without modifying state.
- `POST /api/v1/transfers/:id/execute` — execute transfer settlement on ledger.
- `POST /api/v1/transfers/:id/cancel` — cancel proposed transfer.

### Proposal Payload
```json
{
  "tokenId": "TKN-0x1657...",
  "toParticipantId": "PRT-INVESTOR-01",
  "units": 1000,
  "pricePaise": 50000000,
  "paymentRef": "NEFT-HDFC-9918237"
}
```

---

## 3. Test Coverage

- **Chaincode Unit Tests** (`chaincode/rwa/test/transfer-contract.test.js`):
  - Propose transfer validation & events
  - Pre-flight `evaluateTransfer` rule simulation
  - Atomic fractional transfer execution and balance verification
  - Whole-token full unit transfer execution
  - Persisted rejection on concentration cap (Max holding cap exceeded)
  - Persisted rejection on whole token split attempt
  - Combined multi-rule failure diagnostics (Suspended party + Unapproved KYC + Frozen asset + Self-transfer)
  - Query transfer, list transfers, and token history
  - Cancellation with audit trail
  - **Result**: 36 / 36 tests passed (100%)

- **API Integration Tests** (`apps/api/test/transfers-api.test.js`):
  - Role authorization enforcement
  - Propose transfer endpoint (201 Created)
  - Pre-flight rule evaluation endpoint
  - Atomic execution with balance updates
  - Rule 3.4-1 persisted rejection with reasons
  - Query by ID, list, and token transfer history
  - **Result**: 32 / 32 tests passed (100%)
