# fix.md: Make AsseTrust real (60-minute agent plan)

> **Audience:** a coding agent (or several, one per track) working inside this repo.
> **Goal:** the golden path (register → verify → value → mint → transfer accepted / transfer rejected) runs through a **real Hyperledger Fabric network**, false or misleading behaviour is removed, and the repo is cleaned up, **without breaking anything that works today**.
> **Time budget:** ~60 minutes wall-clock, split into 3 parallel tracks.
> **Do NOT touch `README.md`.** The team will close any gaps by delivering them, not by editing claims.

---

## 0. Ground rules (read first)

1. **Never break the baseline.** Before starting and after every phase run:
   ```bash
   pnpm install --frozen-lockfile
   (cd chaincode/rwa && npx tsc -p . && node --test)   # baseline: 36 pass
   (cd apps/api && node --test)                          # baseline: 32 pass
   (cd apps/web && npx vite build)                       # must build clean
   ```
   If a number drops, revert the last change before continuing.
2. **Mock mode stays.** `CHAIN_GATEWAY_MODE=mock` remains the default and keeps CI/tests fast. Fabric mode is opt-in via `CHAIN_GATEWAY_MODE=fabric`. Do not delete `MockGateway`.
3. **Keep the source as ES modules.** The repo is ESM (`"type": "module"`); that stays. Only the *deployable chaincode artifact* is a bundled CommonJS file, because `fabric-shim` (2.5.8, checked in `node_modules/fabric-shim/lib/contract-spi/bootstrap.js`) loads the chaincode entry with a synchronous `require(main)`. A build step handles this; no source file changes for it.
4. **No silent fallbacks.** In Fabric mode, if an identity or the network is missing, fail with a clear error. Never fall back to an admin identity or to the mock.
5. **Small commits per phase** (`fix(phase-N): …`). If blocked for more than 5 minutes on a step, stop, write what failed into `docs/fabric.md` under "Known issues", and continue with the next independent phase.
6. **Verify, don't assume.** Items marked **[confirm]** depend on tool flags/behaviour that were not run in this environment. Run the tool's `-h` and mirror the matching fabric-samples example.

### Tracks, order and file ownership (avoids merge conflicts)

| Track | Phases | Time | Owns (only edit these) |
|---|---|---|---|
| **A: Fabric** | 1 → 2 → 3 → 4 → 5 | ~55 min | `scripts/fabric/**`, `network/**`, `chaincode/rwa/{package.json,scripts,ccaas}`, `tools/identity/**`, `tools/bootstrap/**`, `tools/smoke/**`, `packages/chain-client/src/{fabric-gateway.js,fn-map.js,index.js}` |
| **B: Hardening** | 6 | ~30 min | `apps/api/src/core/**`, `apps/api/src/modules/{auth,events,evidence,tokens}/**`, `.github/**`, `db/seeds/**` |
| **C: Rules** | 7 | ~30 min | `chaincode/rwa/src/contracts/{TransferContract,VerificationContract}.ts`, `packages/contracts/**`, transfer/verification sections of `packages/chain-client/src/mock-gateway.js` |
| **All** | 8 → (9 stretch) | last ~8 min | cleanup, Makefile, docs |

`mock-gateway.js` is touched by B (tx IDs, mint role) and C (rules) in **different regions**; rebase before pushing.

**Merge gates:** G1 = Phase 5 passes. G2 = Phase 6 + 7 tests green. Then Phase 8.

---

## Phase 1: Real Fabric infrastructure (Track A, ~12 min)

**Why:** `network/scripts/bootstrap.sh` only prints messages and `network/docker-compose-fabric.yml` is a skeleton with no CAs, volumes or CouchDB. Replace it with the official, working fabric-samples network, wrapped in our own scripts.

### 1.1 Install (once)
Create `scripts/fabric/install.sh`:
- Work in `.fabric/` (add `.fabric/` to `.gitignore`).
- Download the official installer: `https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh`.
- Install **Fabric 2.5.x** docker images + binaries + samples **[confirm flags with `./install-fabric.sh -h`; the intent is `docker samples binary` at 2.5.x]**.
- Result must be: `.fabric/fabric-samples/` with `bin/`, `config/`, `test-network/`.
- Export `FABRIC_HOME=$PWD/.fabric/fabric-samples` and put `$FABRIC_HOME/bin` on PATH in every script (`scripts/fabric/env.sh`, sourced by the others).

### 1.2 Network up/down
`scripts/fabric/network-up.sh` (idempotent: tears down first):
```bash
source scripts/fabric/env.sh
cd "$FABRIC_HOME/test-network"
./network.sh down
./network.sh up createChannel -c rwa-channel -ca -s couchdb      # Fabric CAs + CouchDB state DB
cd addOrg3 && ./addOrg3.sh up -c rwa-channel -ca -s couchdb      # [confirm flags with -h]
```
`scripts/fabric/network-down.sh` runs `./network.sh down` and removes `.fabric/wallets`.

### 1.3 Org ↔ role map (single source of truth)
Create `network/org-map.json`. The chaincode reads the **role from the certificate attribute**, not the org name (verified: no hard-coded MSP names in `chaincode/rwa/src`), so 3 live orgs can host all 6 roles:
```json
{
  "Org1MSP": { "roles": ["ADMINISTRATOR", "ISSUER"] },
  "Org2MSP": { "roles": ["VERIFIER", "VALUER", "COMPLIANCE", "AUDITOR"] },
  "Org3MSP": { "roles": ["INVESTOR"] }
}
```
Use the exact role strings exported by `packages/contracts/src/enums.js` (`Role`). Reason for this split: Investor is alone in Org3, so a private data collection limited to Org1+Org2 (Phase 9) genuinely excludes investors. Scaling to 6 orgs later means adding orgs to this file and the scripts, with no code change.

### 1.4 Connection profile generator
`scripts/fabric/gen-connection.mjs` writes `.fabric/connection.json` with, per MSP: peer endpoint (`localhost:7051`, `9051`, `11051`), TLS CA cert path (from `test-network/organizations/peerOrganizations/orgN.example.com/...`), peer host alias (`peer0.orgN.example.com`), and CA URL/port/TLS cert (`7054`, `8054`, `11054`). Read paths from the generated `organizations/` folder; do not hard-code beyond the test-network defaults.

### Acceptance (Phase 1)
- `docker ps` shows an orderer, 3 peers, 3 CouchDB, 4 CAs (3 orgs + orderer).
- `peer channel list` (with Org1 env from `test-network/scripts/setOrgEnv.sh` or `envVar.sh`) lists `rwa-channel`.
- `.fabric/connection.json` exists and every referenced file path exists.

---

## Phase 2: Chaincode build and deploy (Track A, ~10 min)

**Why:** the compiled chaincode cannot be deployed as-is: (a) `fabric-shim` `require()`s the `main` file and expects an exported `contracts` array, and our output is ESM; (b) it imports `@rwa/contracts`, a pnpm workspace package that a peer cannot install.

### 2.1 Bundle step (verified in sandbox)
Bundling the existing `tsc` output with esbuild into one CommonJS file works: it exports all 9 contracts (`Participant, AssetType, Asset, Verification, Valuation, Token, Transfer, Lifecycle, Audit`), and `DevFixtureContract` is excluded unless `CC_ENV=dev`.

- Add devDependency `esbuild` to `chaincode/rwa/package.json`.
- Create `chaincode/rwa/scripts/bundle-cc.mjs` that:
  1. runs after `tsc -p .` (keep `dist/` untouched so existing tests keep working);
  2. bundles `dist/index.js` → `build/cc/index.cjs` with: `--bundle --platform=node --target=node18 --format=cjs --external:fabric-contract-api --external:fabric-shim`;
  3. writes `build/cc/package.json`:
     ```json
     { "name": "rwa-cc", "version": "1.0.0", "main": "index.cjs",
       "scripts": { "start:server": "fabric-chaincode-node server --chaincode-address=$CHAINCODE_SERVER_ADDRESS --chaincode-id=$CHAINCODE_ID" },
       "dependencies": { "fabric-contract-api": "2.5.8", "fabric-shim": "2.5.8" } }
     ```
     (2.5.8 is what `pnpm-lock.yaml` resolves today; keep them identical.)
  4. copies `chaincode/rwa/ccaas/Dockerfile` into `build/cc/`.
- Add npm script: `"build:cc": "tsc -p . && node scripts/bundle-cc.mjs"`.
- `build/` is already in `.gitignore`.

### 2.2 CCaaS Dockerfile
`chaincode/rwa/ccaas/Dockerfile`: **mirror the Node CCaaS example in `fabric-samples/asset-transfer-basic`** (look for `chaincode-javascript` / `chaincode-typescript` with a `Dockerfile` and `start:server`): `node:20` base, `npm install --omit=dev`, copy bundle, `EXPOSE 9999`, `CMD ["npm","run","start:server"]`.

### 2.3 Collections config with real MSP IDs
`network/collections_config.json` currently names `IssuerMSP/VerifierMSP/ComplianceMSP/AuditorMSP`, which do not exist on this network. Replace with Org IDs from `org-map.json`:
`pdcOrigination` members = `Org1MSP` + `Org2MSP` (Investor/Org3 excluded on purpose). Keep `memberOnlyRead/Write: true`. Mark it in the file's neighbouring `docs` (not README) as "reserved; used from Phase 9".

### 2.4 Deploy script
`scripts/fabric/cc-deploy.sh`:
```bash
source scripts/fabric/env.sh
(cd chaincode/rwa && pnpm build:cc)
cd "$FABRIC_HOME/test-network"
./network.sh deployCCAAS -ccn rwa -ccp "$REPO/chaincode/rwa/build/cc" \
   -cccg "$REPO/network/collections_config.json"      # [confirm flags with `./network.sh deployCCAAS -h`]
```
**Fallback if `deployCCAAS` misbehaves:** the bundle has no workspace deps, so the classic path also works: `./network.sh deployCC -ccn rwa -ccp <build/cc> -ccl javascript -cccg <collections>`. Keep the endorsement policy at the default (majority of channel orgs).

### Acceptance (Phase 2)
- `docker ps` shows the chaincode container(s).
- A read-only query succeeds from the CLI, for example:
  `peer chaincode query -C rwa-channel -n rwa -c '{"function":"AssetTypeContract:listAssetTypes","Args":[]}'`
  If it returns `Unauthorized: Role 'UNKNOWN'`, the chaincode is alive and enforcing roles; finish Phase 3 and re-test.

---

## Phase 3: Identities with role attributes (Track A, ~8 min)

**Why:** the chaincode trusts the certificate attributes `role`, `userId`, `participantId` (`chaincode/rwa/src/lib/ctx.ts`). The test-network admin has none, so every real call would fail authorization. This is our per-user identity model; each platform user gets their own Fabric identity.

Create `tools/identity/enroll.mjs` (add `fabric-ca-client` as a dependency of that tool or of `chain-client`):
1. For each org in `network/org-map.json`: enroll the CA bootstrap admin (`admin` / `adminpw`) using the CA URL + TLS cert from `.fabric/connection.json`.
2. Read users from `SEED_DATA` (`db/seeds/seed.js`). For each seed user choose the org whose `roles` contains `user.role`, then **register** with attributes (all `ecert: true`):
   `role=<ROLE>`, `userId=<user.id>`, `participantId=<participant.id or "">`; then **enroll** to get cert + key.
3. Also register a `ledger-bootstrap-admin` (role `ADMINISTRATOR`, Org1) and a `ledger-bootstrap-compliance` (role `COMPLIANCE`, Org2) for Phase 5.
4. Write wallets to `.fabric/wallets/<MSP>/<userId>.json` as `{ mspId, certificate, privateKey }`. Add `.fabric/` to `.gitignore` (already added in 1.1).
5. Write `.fabric/identity-map.json`: `{ "<userId>": { "mspId": "...", "wallet": "..." } }`.

Re-running must be idempotent: handle "already registered" by re-enrolling.
Note: if the CA was reset, old wallets are invalid. `network-down.sh` deletes `.fabric/wallets`.

### Acceptance (Phase 3)
- Every seed user has a wallet file.
- `openssl x509 -in <cert> -noout -text` shows the custom attribute extension containing `role`, `userId`, `participantId`.

---

## Phase 4: Real `FabricGateway` (Track A, ~15 min)

**Why:** `packages/chain-client/src/fabric-gateway.js` never connects (the real code is commented out) and calls `submitTransaction(fnName, JSON.stringify(args))`. The chaincode expects `Contract:function` namespacing and per-function positional arguments. All ~45 function names used by the API exist in the chaincode (checked), so this is a mapping job.

### 4.1 Gateway rewrite (keep the public API: `connect()`, `submit(caller, fn, args, opts)`, `evaluate(caller, fn, args)`, `subscribe(cb)`)
- Read `.fabric/connection.json` and `.fabric/identity-map.json` (paths overridable by env: `FABRIC_CONNECTION`, `FABRIC_IDENTITY_MAP`).
- Per **caller** (`caller.userId`): look up wallet → build `grpc.Client` with TLS (`grpc.credentials.createSsl(tlsCaCert)` + `grpc.ssl_target_name_override` = host alias) to **that user's org peer** → `connect({ client, identity: { mspId, credentials: Buffer(cert) }, signer: signers.newPrivateKeySigner(crypto.createPrivateKey(keyPem)) })`. Cache one gateway per userId; close all on SIGTERM.
- If the caller has no identity: throw an error (no admin fallback).
- Use `network.getContract('rwa', '<ContractName>')` and call the **unqualified** function name.
- `submit`: `proposal = contract.newProposal(fn, { arguments })` → `endorse()` → `submit()` → `getStatus()`; if not successful, throw (include status code). Return `{ result: <parsed JSON or raw string>, txId: proposal.getTransactionId(), blockNumber: status.blockNumber, committedAt }`. **Retry up to 3 times on MVCC read conflict**.
- `evaluate`: `contract.evaluateTransaction(fn, ...args)` → parse JSON.
- Services read `submission.result || submission`, so keep that shape.
- Do **not** add an `await connect()` at import time. Add lazy `ensureReady()` inside `submit/evaluate`.

### 4.2 Function map: `packages/chain-client/src/fn-map.js`
Export `{ [fnName]: { contract, args: (obj) => string[] } }`. Rules:
- If the chaincode parameter is a JSON string (`dataJson`, `assetJson`, `valuationJson`, `tokenJson`, `transferJson`, `evidenceJson`, `definitionJson`, `…Input`), use `[JSON.stringify(obj)]`. **Open the source signature and the matching handler in `mock-gateway.js` to confirm the object keys and the order**, since the mock is the de-facto spec for what the API sends.
- If positional, map object keys to the positional parameters in signature order.

Contract grouping (checked against source):

| Contract | Functions |
|---|---|
| `ParticipantContract` | registerParticipant, updateKycStatus, setInvestorClass, setLimits, suspendParticipant, reinstateParticipant, addToBlacklist, removeFromBlacklist, getParticipant, listParticipants, participantExistsAndActive |
| `AssetTypeContract` | defineAssetType, deprecateAssetType, getAssetType, listAssetTypes |
| `AssetContract` | registerAsset, updateAssetAttributes, attachEvidence, submitForVerification, getAsset, listAssets, getEvidenceRoot |
| `VerificationContract` | assignVerifier, recordCheck, recordVerificationCheck, decideVerification, approveVerification, rejectVerification, requestChanges, reopenVerification, getVerificationCase, listVerificationCases |
| `ValuationContract` | proposeValuation, approveValuation, getValuation, listValuations |
| `TokenContract` | mintToken, getToken, listTokens, getBalance, listHolders, getTokenTrace |
| `TransferContract` | proposeTransfer, evaluateTransfer, executeTransfer, getTransfer, listTransfers, getTransferHistory, cancelTransfer |
| `LifecycleContract` | freezeAsset, unfreezeAsset, redeemAsset, retireAsset |
| `AuditContract` | getAuditTrail, getStateHash |

Add a **unit test** (`packages/chain-client/test/fn-map.test.js`) asserting that **every function name the API calls** (grep `chainBridge.(submit|evaluate)(` in `apps/api/src`) exists in the map. This keeps the two from drifting.

### 4.3 Errors
Map chaincode errors to the API's existing `AppError` types (read `apps/api/src/core/errors/error-handler.js` and how the mock throws): messages starting `Unauthorized:` or containing `Segregation of Duties` → 403; "not found" → 404; other chaincode errors → 400/409 with the original message. A **rejected transfer is a successful transaction** (see below); it must come back as a normal result with `status: 'REJECTED'`, not an error.

### 4.4 Events
`subscribe(cb)`: using a service identity, `network.getChaincodeEvents('rwa')` (async iterator). The chaincode emits **one** event named `TxEvents` per tx whose payload is `{ events: [...] }` (`chaincode/rwa/src/lib/EventAggregator.ts`). Parse and call `cb` per inner event in the same shape the mock emits (read how `mock-gateway.js` calls its subscribers). Resume from the last block on reconnect; never crash the API on stream errors.

### Acceptance (Phase 4)
- `tools/smoke/ping.mjs`: with `CHAIN_GATEWAY_MODE=fabric`, evaluates `listAssetTypes` as the bootstrap admin and prints the result.
- fn-map test passes; baseline tests still pass (they run in mock mode).

---

## Phase 5: Ledger bootstrap and golden path (Track A, ~10 min) ★ Gate G1

### 5.1 Single source for default asset types
The default types (VEHICLE, REAL_ESTATE, INVOICE, COMMODITY, LAND, …) live inside `MockGateway.initDefaultSeed()`. Move those object literals to `packages/contracts/src/default-asset-types.js` and import them from the mock (a pure refactor; tests must stay green). The Fabric bootstrap reuses them, so mock and ledger can't diverge.

### 5.2 Ledger init: `tools/bootstrap/ledger-init.mjs`
As the real identities, in order: `defineAssetType` for each default type (admin) → `registerParticipant` for every `SEED_DATA` participant → `updateKycStatus`/`setInvestorClass`/`setLimits` (compliance) to mirror the seed. Make it idempotent (skip "already exists").

### 5.3 Golden path smoke: `tools/smoke/golden-path.mjs`
Over the **HTTP API** with `CHAIN_GATEWAY_MODE=fabric`, logging in as the seeded users (their endpoints and payloads are in `apps/api/test/*-api.test.js`; reuse them):
register asset → upload evidence → submit for verification → verifier checks + approve → valuer proposes → compliance approves → compliance mints → investor transfer **executes** → another transfer **violating a rule** comes back `REJECTED` with `rejectionReasons`, and appears in transfer history.
Assert: `txId` values are 64-hex strings, `blockNumber` is a number, rejected transfer persisted.

### Acceptance (Gate G1)
- Smoke script exits 0.
- `docker logs <chaincode container>` shows the invocations.
- Re-running `network-up.sh`, `cc-deploy.sh`, `enroll.mjs`, `ledger-init.mjs` from scratch works in one go (`make fabric-all`, added in Phase 8).

---

## Phase 6: Security and false-claim fixes (Track B, ~30 min, starts at minute 3)

Each item keeps the existing tests green. Add tests as listed.

**6.1 Remove the login backdoor and default secrets** (`apps/api/src/modules/auth/auth.service.js`, `core/config/env.js`)
- Delete the `isMatch = password === 'Password@123'` fallback and the plaintext `user.password` comparison. Seed users already have `passwordHash` (`db/seeds/seed.js` ~line 138), so tests that log in with `Password@123` still pass through the real hash check.
- `env.js`: when `NODE_ENV === 'production'`, **throw at startup** if `JWT_SECRET` or `ENCRYPTION_MASTER_KEY` are missing or equal to the old defaults. In development/test keep working defaults but `console.warn`.
- `.env.example`: replace the literal secrets with `CHANGE_ME` placeholders and a one-line `openssl rand -hex 32` hint.
- Tests: wrong password for a seeded user → 401; `Password@123` for an unknown email → 401.

**6.2 Protect the live event stream** (`modules/events/events.routes.js`)
- Require a valid JWT: accept `Authorization: Bearer` **or** `?access_token=` (EventSource can't set headers). The web app does not use this endpoint yet, so there is no UI risk.
- Test: no token → 401; valid token → `text/event-stream`.

**6.3 Rate limiting**
- Add `express-rate-limit`: login = 10 attempts/min per IP; global = 300/min. Configurable by env; **disabled when `NODE_ENV=test`**.

**6.4 Remove administrator minting (separation of duties)**
- `modules/tokens/tokens.routes.js`: `requireRole(Role.COMPLIANCE)` only.
- `chaincode/rwa/src/contracts/TokenContract.ts` (~line 134): `requireRole(ctx, Role.COMPLIANCE)`.
- Same in the mock's mint handler. Update any test that asserted admin could mint, and note that in the commit message (this is an intentional behaviour change, not a regression).

**6.5 Remove fake proof values**
- `modules/tokens/tokens.service.js` public verify: replace hard-coded `stateValid: true` with a real check: recompute the evidence root from the asset's evidence hashes and compare to the token's stored `evidenceRoot`, and confirm the asset/token status is consistent. Also return real `mintedTxId` and `blockNumber`.
- Add to the public payload only public-safe fields that the verify page can use: `evidenceRoot`, valuation summary (amount, method, date, valuer org), `verifiedBy` org, `verifiedAt`. (`getTokenTrace` already assembles these.)
- `packages/chain-client/src/mock-gateway.js`: replace the seeded literal tx ids (`'0x99a8…'`, `'0x88b7…'`, `'0x77c6…'`, `'0x123abc456def789'`) with deterministic 64-hex ids derived via `sha256('<label>')` so they look and behave like real ids.

**6.6 Evidence download with hash verification** (`modules/evidence/*`)
- `GET /api/v1/evidence/:id/download`: authenticated; allowed roles = the owning ISSUER, VERIFIER, COMPLIANCE, AUDITOR (investors and admins denied). Decrypt via `storageService.retrieveDocument`, recompute SHA-256, compare with the stored hash; mismatch → 409 `EVIDENCE_TAMPERED`. Log the access to the API audit log.
- Tests: owner OK; investor 403; tampered file 409.

**6.7 Honest CI** (`.github/workflows/ci.yml`)
- Remove `|| true`. Run `pnpm install --frozen-lockfile`, chaincode `build:cc`, `pnpm -r test`, web build. Keep the existing file-existence checks.

---

## Phase 7: Rule completeness (Track C, ~30 min, starts at minute 3)

**Why:** the transfer engine implements 9 rules (`ASSET_TRANSFERABLE, KYC_VERIFIED, MAX_HOLDING_CAP, MAX_VALUE_CAP, MIN_TRANSFER_THRESHOLD, PARTICIPANT_ACTIVE, SELF_TRANSFER, SELLER_BALANCE, WHOLE_ONLY`), while the product promises lock-in, buyer class, jurisdiction and KYC expiry. Add them with the same pattern as the existing rules, in **both** `TransferContract.ts` and the mock, with reason codes in `packages/contracts/src/reason-codes.js`.

| New rule | Config (per asset type, optional) | Rejects when |
|---|---|---|
| `LOCK_IN_PERIOD` | `lockInDays` | seller's units were acquired less than N days before the tx timestamp (store `acquiredAt` on the balance record on credit; default `0` for old data) |
| `BUYER_CLASS_INSUFFICIENT` | `minBuyerClass` (`RETAIL < QUALIFIED < INSTITUTIONAL`) | buyer's investor class is below the minimum |
| `JURISDICTION_NOT_ALLOWED` | `allowedJurisdictions[]` | buyer jurisdiction not in the list |
| `KYC_EXPIRED` | uses `participant.kycExpiresAt` if present | tx timestamp is past expiry |
| `VALUATION_STALE` | `blockOnStaleValuation` | the token's current valuation `validUntil` has passed |

Rules:
- **All failing rules are collected** and stored (existing behaviour); a rejection is a **successful tx** with a persisted `REJECTED` record. Don't throw.
- Time comes only from `ctx.stub.getTxTimestamp()` (never `Date.now()`); money stays in integer paise.
- **Defaults must be permissive** (no config = rule inactive) so existing tests and seed data keep passing. Enable a visible showcase in the LAND type config (for example `lockInDays: 1`, `minBuyerClass: 'QUALIFIED'`) only if every existing test still passes; otherwise leave it for the demo seed.
- **Parity tests:** create `packages/contracts/test-vectors/transfer-rules.json` (input state + expected reasons) and run the same vectors against the chaincode and the mock, so the two implementations can't drift again.
- **Cheap SoD win (if time):** `SoD.assertNotSameOrg` exists but is unused. Store the originator's MSP at asset registration and make `VerificationContract` reject a verifier from the same org. Keep it behind the existing test expectations.

---

## Phase 8: Cleanup, docs and one-command flow (all, last ~8 min)

1. **Remove fakes, preserve content.**
   - Delete `network/docker-compose-fabric.yml` and the echo-only `network/scripts/{bootstrap,teardown}.sh` (replaced by `scripts/fabric/*`).
   - `git mv network/configtx.yaml network/reference/configtx-6org.yaml` (kept as the 6-org target design; it is not used at runtime).
   - In `fabric-gateway.js`, remove the commented-out dead code.
2. **Scripts:** `package.json` and `Makefile` targets: `fabric-install`, `fabric-up`, `fabric-down`, `cc-deploy`, `fabric-identities`, `ledger-init`, `fabric-smoke`, and **`fabric-all`** (up → deploy → identities → init → smoke). Make `pnpm network:up/down` call the new scripts.
3. **`.gitignore`:** `.fabric/`, `vault_storage/`. **`.env.fabric.example`:** `CHAIN_GATEWAY_MODE=fabric`, `FABRIC_CONNECTION`, `FABRIC_IDENTITY_MAP`, `FABRIC_CHANNEL_NAME`, `FABRIC_CHAINCODE_NAME`.
4. **`docs/fabric.md`:** exact commands, the org↔role map, how to reset (`fabric-down` → `fabric-all`), and troubleshooting: stale wallets after CA reset, Docker memory (give Docker at least 6 GB), WSL on Windows, port conflicts (7050/7051/9051/11051/7054/8054/11054), MVCC retries. Add a "Known issues" section for anything skipped.
5. Re-run the full baseline from section 0. Numbers must be ≥ baseline (new tests add to them).

---

## Phase 9 (stretch, only after Gate G2)

Ordered by demo value:
1. **Real private data in use.** On `registerAsset`, write the RESTRICTED attributes to `pdcOrigination` with `putPrivateData` using the **transient map**, keep only their hash in public state, and add a read function that returns them to Org1/Org2. Demo: the Investor (Org3) can read the public hash but gets an error for the private value. (This is why Org3 is investors-only.)
2. **Real indexer + reconciler** (`apps/worker`): the indexer consumes `TxEvents` and keeps a projection (in-memory + JSON snapshot on disk); the reconciler compares `AuditContract:getStateHash(entity)` with the hash of the projected entity and reports real drift. Replace the hard-coded `{ status: 'CLEAN' }`.
3. **Persistence for users/identity admin** (Postgres via the existing Prisma schema), so created users survive restarts; today auth reads `SEED_DATA` in memory.
4. **Add Org4 (Auditor/Compliance split)** by copying the `addOrg3` pattern, then update `org-map.json`.

---

## Final verification checklist

- [ ] Baseline numbers hold (chaincode ≥ 36, API ≥ 32, web builds).
- [ ] `make fabric-all` from a clean state succeeds; golden-path smoke exits 0.
- [ ] A rejected transfer shows reasons in the UI history, backed by a real tx id.
- [ ] Public verify page shows real tx id/block and a computed (not hard-coded) validity.
- [ ] `Password@123` no longer logs in an arbitrary email; `/events/stream` needs a token; admin cannot mint.
- [ ] CI fails on failing tests.
- [ ] `docs/fabric.md` exists with reset and troubleshooting steps.

## Fallback matrix (decide at minute ~45)

| State at minute 45 | Do this |
|---|---|
| Phase 1-3 done, Phase 4 not | Demo the mock UI **plus** live CLI `peer chaincode invoke/query` on the deployed chaincode; explain the gateway is the remaining step |
| Phase 1-2 done only | Show the running network, deployed chaincode container and a CLI query; the app runs on the mock gateway with identical contract logic |
| Phases 1-5 done | Run the app with `CHAIN_GATEWAY_MODE=fabric` and demo the golden path with real tx ids; show `docker logs` of the chaincode container |

Always keep a working mock-mode build available as the last resort.