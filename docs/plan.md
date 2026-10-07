# PS-01 — Real-World Asset Tokenization Platform (EkamVistar)
### Modular, phase-wise build plan for a fully deployed, end-to-end working product

> **Product in one line:** a trusted digital passport + ownership system for real-world assets on Hyperledger Fabric.
> **Mental model:** `Real asset → Verification → Valuation → Token → Ownership → Governed Transfer → Lifecycle → Audit`
> **Honest trust model (say this in the pitch):** a blockchain cannot prove a tractor exists. What we prove is that *named, authorized verifiers from independent organizations attested to it, with signed evidence, and that no token exists without those attestations.* Everything after that point is enforced by chaincode and permanently auditable.

---

## 0. How to use this document

1. **Phase 0 (Foundation) is done first, by everyone, in parallel tracks.** It produces every shared thing: repo, DB schema, Fabric network, chaincode scaffold, shared contracts package, auth, CI, deploy pipeline.
2. After Phase 0's **exit gate** passes, **Phases 1–9 are independent vertical slices** (chaincode contract + API module + UI feature + tests). Different people can own different phases at the same time.
3. Independence is achieved by four mechanisms built in Phase 0:
   - **Contract-first**: each phase starts by merging a `docs/contracts/phase-N.md` (chaincode function signatures, REST endpoints, events, DB tables). After that, chaincode / API / UI work in parallel.
   - **`ChainGateway` interface with a Mock implementation**, so API and UI can be built without a running Fabric network.
   - **Fixtures**: a seeding tool that can put an asset/token into *any* lifecycle state (so Phase 6 doesn't wait for Phase 3).
   - **One folder + one DB schema file + one chaincode contract file per phase**, so merges don't collide.
4. **Phase 10** is integration, hardening, final deployment, and the extensibility proof (third asset type with *zero code changes*).
5. Each phase lists **Must-have** (required to satisfy the PS completely), **Edge cases** (must be handled), and **Bonus** (only if time permits; each one is picked because a judge will value it).

---

## 1. PS traceability matrix

| PS objective | Where it is built | Proof the judge can see |
|---|---|---|
| 1. Multiple asset types, no redesign | P2 (type engine), P10 (3rd type via config only) | Admin creates "Invoice" type in UI, no deploy |
| 2. Registration & verification before tokenization | P2, P3 | Mint button impossible/rejected until VERIFIED |
| 3. Valuation (method, date, source) per asset | P4 | Two same-type assets, different values |
| 4. Tokenization, traceable, whole/fractional | P5 | Public page: token ID → asset → evidence root → valuation |
| 5. Ownership, transfer rules, rejected recorded w/ reason | P6 | Failed transfer visible in history with reason codes |
| 6. Lifecycle states, who/when/from/to/why | P0 (state engine), P7 | Timeline component on every asset |
| 7. Roles & visibility | P1 (+ every phase) | Same asset, six roles, six different views |
| 8. Full audit | P8 | Asset/token/transfer history, tx explorer, integrity check |

---

## 2. Tech stack (final decisions)

| Layer | Choice | Why |
|---|---|---|
| Ledger | **Hyperledger Fabric 2.5 LTS** (Raft ordering, Fabric CA, CouchDB state DB). Fabric 3.x (SmartBFT) is an optional upgrade; check current docs before choosing | Required by PS; 2.5 is the best-documented stable line |
| Chaincode | **TypeScript on Node 20** (`fabric-contract-api`, `fabric-shim`), deployed as **Chaincode-as-a-Service (CCaaS)** | Same language as the whole team; CCaaS avoids Docker-in-Docker pain |
| Chaincode libs | `ajv` (schema validation, deterministic), `zod` shared types | Asset type schemas validated on-chain |
| Backend | **Node.js + TypeScript + NestJS** (modular monolith) + a separate **worker** process | One Nest module per phase = clean ownership |
| Fabric client | `@hyperledger/fabric-gateway` + `@grpc/grpc-js` | Official Gateway SDK (Fabric 2.4+) |
| Database | **PostgreSQL 16** + **Prisma** (multi-file schema, `prismaSchemaFolder`) | Relational read-model, workflow data, reporting |
| Cache / queue | **Redis + BullMQ** | Async tx submission, retries, notifications, SSE fan-out |
| Document storage | **MinIO (S3-compatible)**, per-file AES-256-GCM envelope encryption; only SHA-256 on-chain | Private documents; IPFS rejected (public by default) |
| Frontend | **React 18 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router + react-hook-form + zod** | Fast, team already knows React |
| API contract | **OpenAPI** generated from Nest; TS client generated with `openapi-typescript` | FE/BE never drift |
| Monorepo | **pnpm workspaces + Turborepo** | Shared packages, cached builds |
| Auth | JWT access (15 min) + httpOnly refresh cookie, `argon2`, optional TOTP 2FA | Standard, secure |
| AI (bonus) | Claude API (or any LLM) for document field extraction + audit Q&A; **always advisory, human signs** | AI never becomes a source of trust |
| Testing | Jest (chaincode with mock stub), Supertest (API), Playwright (E2E), k6 (light load) | Full pyramid |
| Infra | Docker Compose on one cloud VM (8 vCPU / 16 GB recommended), **Caddy** (auto-HTTPS), GitHub Actions CI/CD | Real deployment without Kubernetes overhead |
| Observability | `pino` JSON logs, `/healthz` + `/readyz`, optional Prometheus + Grafana | Debuggable demo |

**MongoDB is intentionally not used.** The audit/read-model data is relational; one fewer database means less to run.

---

## 3. Architecture

### 3.1 Logical view

```
                        ┌──────────────────────────────────────────┐
                        │  React Web App (role-aware)  +  Public   │
                        │  Verify Page (token ID / QR, no login)   │
                        └───────────────┬──────────────────────────┘
                                        │ REST (OpenAPI) + SSE
                        ┌───────────────▼──────────────────────────┐
                        │ NestJS API  (modules = phases)           │
                        │  auth · rbac · participants · assets ·   │
                        │  evidence · verification · valuation ·   │
                        │  tokens · transfers · lifecycle · audit  │
                        │  ── ChainGateway (Fabric | Mock) ──      │
                        └───────┬───────────────┬──────────────────┘
                                │               │
            ┌───────────────────▼───┐   ┌───────▼────────────────────────┐
            │ PostgreSQL            │   │ Worker (BullMQ)                │
            │ read-model + workflow │◄──│ • Block/Event Indexer          │
            │ + off-chain data      │   │ • chain command submitter      │
            └───────────────────────┘   │ • reconciler • notifications   │
            ┌───────────────────────┐   └───────┬────────────────────────┘
            │ MinIO (encrypted docs)│           │ gRPC (Fabric Gateway)
            └───────────────────────┘   ┌───────▼────────────────────────┐
                                        │ HYPERLEDGER FABRIC             │
                                        │ 1 channel: rwa-channel         │
                                        │ 6 orgs, 3 Raft orderers        │
                                        │ 1 chaincode `rwa` (CCaaS)      │
                                        │ + private data collections     │
                                        └────────────────────────────────┘
```

### 3.2 Fabric network (organizations map 1:1 to PS roles)

| Org (MSP) | Hosts roles | Notes |
|---|---|---|
| `EkamVistarMSP` | **administrator**; also runs the 3 orderers | Platform operator. Admin can configure types/orgs but **cannot** approve verifications or move assets (segregation of duties) |
| `IssuerMSP` | **issuer** (asset originators/owners) | Registers assets, uploads evidence, requests tokenization |
| `VerifierMSP` | **verifier**, **valuer** (sub-role attribute) | Independent verification + valuation |
| `ComplianceMSP` | **compliance** | KYC approval, rule exceptions, freezes, blacklists |
| `InvestorMSP` | **investor** | Buy/hold/transfer tokens |
| `AuditorMSP` | **auditor** | Read-only over everything, incl. private data |

- **Identities** are issued by Fabric CA with attributes: `role`, `participantId`, `orgId`. Chaincode enforces roles from the *certificate attributes + MSP ID*, never from request parameters.
- **Dev profile:** the full 6-org network runs on a shared dev VM; developers with weak laptops use Mock mode.
- **Endorsement policy:** chaincode-level `MAJORITY` of the 6 orgs for config changes; state-based endorsement (SBE) on token mint requires **Verifier + Compliance** endorsement; transfers require **Compliance + one of Issuer/Investor** peers.

### 3.3 Data placement: what goes where

| Data | Location | Reason |
|---|---|---|
| Participant status, KYC *status*, investor class, limits | On-chain (public state) | Rules need them deterministically |
| Raw PII (name, Aadhaar/PAN, address) | **Off-chain only** (Postgres, encrypted columns); on-chain only a **salted hash** | DPDP-Act-friendly; no un-erasable PII on a ledger |
| Asset header (id, type, status, owner, attributes hash) | Public state | Traceability |
| Full asset attributes before tokenization, evidence metadata, valuation working papers | **Private data collection** `pdcOrigination` (Issuer, Verifier, Compliance, Auditor) | Investors must not see unverified or sensitive data |
| Token, balances, transfers, rejected transfers, lifecycle & audit records | Public state | The shared source of truth |
| **Token disclosure** (public-tagged attributes + valuation summary), written at mint | Public state | Lets anyone identify the real asset behind a token |
| Documents (PDF/images) | MinIO encrypted; SHA-256 per file; **Merkle root of all evidence hashes** on-chain | "Don't store PDFs on a blockchain" done properly |
| Drafts, comments, notifications, SLA timers, sessions | Postgres only | Not consensus-worthy |
| Denied access attempts (failed endorsements never reach the ledger) | Postgres `security_events` | Be honest about this in the audit story |

Asset type schemas tag each field `visibility: PUBLIC | CONSORTIUM | RESTRICTED`:
`PUBLIC` → public verify page · `CONSORTIUM` → all channel orgs after mint · `RESTRICTED` → only `pdcOrigination` members.

### 3.4 Critical Fabric design rules (everyone must read this)

1. **Rejected transfers must be recorded.** A chaincode that throws an error produces a *failed* transaction, which writes nothing. So business-rule rejections must **return successfully** after writing a `Transfer{status: REJECTED, reasons[]}` record and emitting an event. Only *malformed/unauthorized* calls throw. The API reports outcome `REJECTED` (not HTTP 500).
2. **Determinism:** no `Date.now()`, `new Date()`, `Math.random()`, or floating-point money. Use `ctx.stub.getTxTimestamp()`, deterministic IDs, and **integer paise** (₹ × 100) and **basis points** for percentages.
3. **One chaincode event per transaction** (a second `setEvent` overwrites the first). Use an event aggregator in the shared lib: one envelope `{events:[…]}` per tx.
4. **Avoid hot keys / MVCC conflicts:** no global counters. IDs are client-generated ULIDs, validated for uniqueness. Don't update a shared token record on every transfer; transfers touch only the two balance keys + the transfer record.
5. **Composite keys + pagination** for every list query; CouchDB indexes shipped in `META-INF/statedb/couchdb/indexes`. Rich queries are for reads only, never for state-changing logic.
6. **Private data writes** use the transient map; endorsing peers must belong to the collection.
7. **Every state change** appends an audit record via the shared `AuditLog.append()` (actor, MSP, role, tx timestamp, from, to, reason, txId). No contract writes state without it.
8. **Idempotency:** each API mutation carries an `Idempotency-Key`; the chain command table de-duplicates, so retries never double-mint or double-transfer.

### 3.5 Off-chain ↔ on-chain consistency

```
UI → API → chain_commands(row, idempotency key)  → worker submits via Gateway
                                                  → commit → status=COMMITTED
Fabric block events → Indexer → idempotent projections → Postgres read-model → SSE → UI
```
- **Chain is the source of truth; Postgres is a rebuildable projection.** An admin command `reindex --from-block 0` must always work.
- A **reconciler** (P8) compares projection hashes with world-state hashes and raises drift alerts.

### 3.6 Generic lifecycle (shared state machine)

```
REGISTERED → UNDER_VERIFICATION → VERIFIED → VALUED → TOKENIZED(ACTIVE) ─┬→ REDEEMED
     ▲              │                                        │ ▲         └→ RETIRED
     │              ├→ CHANGES_REQUESTED ──(resubmit)────────┘ │
     │              └→ REJECTED (terminal)       FROZEN ◄───────┘ (compliance, reversible)
```
- Transition table lives in chaincode lib; **per-type config can add required checks/steps** (e.g. land requires `ENCUMBRANCE_CLEAR` before `VERIFIED`) but cannot add arbitrary states, which keeps the platform generic.
- Every transition needs `{reasonCode, reasonText?}`; mandatory text for reject / freeze / retire.

### 3.7 Roles & visibility matrix (implemented at 3 layers: chaincode, API, UI)

| Capability | Issuer | Verifier | Compliance | Investor | Auditor | Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Register asset / upload evidence | ✅ own | ❌ | ❌ | ❌ | ❌ | ❌ |
| Verify / reject / request changes | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Propose valuation | ❌ | ✅ (valuer) | ❌ | ❌ | ❌ | ❌ |
| Approve valuation / approve mint | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Request mint | ✅ own | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve KYC / eligibility | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (register orgs/users only) |
| Initiate transfer | ✅ holder | ❌ | ❌ | ✅ holder | ❌ | ❌ |
| Resolve escalated transfer | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Freeze / unfreeze | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Configure asset types & rules | ❌ | ❌ | propose | ❌ | ❌ | ✅ (compliance co-sign on rules) |
| See restricted evidence & private data | own | ✅ | ✅ | ❌ | ✅ read | ❌ |
| See token disclosure, own holdings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Full audit trail / export | own | own cases | ✅ | own | ✅ all | ❌ |

**Segregation of duties (enforced in chaincode):** the person who verifies ≠ person who values ≠ person who approves the mint ≠ the issuer.

---

## 4. Asset type definitions (data, not code)

Asset types are **versioned JSON configs** stored on-chain (and mirrored in Postgres). An asset is pinned to the type *version* it was registered under.

```jsonc
{
  "key": "VEHICLE", "version": 1,
  "attributeSchema": { /* JSON Schema + per-field visibility */ },
  "evidenceRequirements": [{ "docType": "RC", "required": true }, ...],
  "verificationChecklist": [{ "key": "RC_VALID", "required": true }, ...],
  "valuation": { "methods": ["DEPRECIATED_COST","MARKET_COMPARABLE"], "validityDays": 180 },
  "token": { "standard": "WHOLE" },                      // or FRACTIONAL with unit range
  "transferRules": [{ "id": "KYC", "type": "PARTY_KYC_VERIFIED" }, ...],
  "terminalReasons": { "REDEEMED": [...], "RETIRED": ["SCRAPPED", ...] }
}
```

| | **LAND** (fractional) | **VEHICLE / TRACTOR** (whole) | **INVOICE** (P10 proof, config only) |
|---|---|---|---|
| Key attributes | survey no., village/district, area (sq m), land use, title holder, boundary geo (restricted) | registration no., chassis/engine no. (restricted), make/model/year, hypothecation status | invoice no., buyer, seller, face value, due date, GST IRN |
| Evidence | title deed/record of rights, encumbrance certificate, survey map, tax receipt, owner ID | RC, insurance, purchase invoice, fitness/PUC, hypothecation NOC, owner ID | invoice PDF, buyer acknowledgment, e-invoice IRN |
| Verification checks | title chain, encumbrance clear, survey match, ownership match | RC valid, insurance valid, no hypothecation, chassis match | buyer acknowledged, IRN valid, not previously financed |
| Valuation methods | ready-reckoner/circle rate, comparable sales, valuer report | depreciated cost, market comparable | face value discounted by risk |
| Token | FRACTIONAL, e.g. 10,000 units = undivided interest | WHOLE (1 unit, non-splittable) | WHOLE or FRACTIONAL |
| Transfer rules | KYC both, investor class ≥ QUALIFIED, max holding 25 %, min 10 units, lock-in N days, compliance review above ₹X | KYC both, buyer jurisdiction allowed, no hypothecation, valuation not stale | KYC both, before due date, buyer class institutional |
| Terminal | REDEEMED (one holder consolidates 100 % units) / RETIRED (legal invalidation) | REDEEMED (taken off platform) / RETIRED (SCRAPPED, THEFT_TOTAL_LOSS) | REDEEMED (SETTLED) / RETIRED (DEFAULTED, DISPUTED_VOID) |

---

## 5. Repository layout & conventions

```
rwa-platform/
├─ apps/
│  ├─ api/              # NestJS; src/modules/<phase-module>/
│  ├─ worker/           # indexer, command submitter, reconciler, notifications
│  └─ web/              # React; src/features/<phase-feature>/
├─ chaincode/rwa/       # TS; src/contracts/<Phase>Contract.ts ; src/lib/ (shared)
├─ packages/
│  ├─ contracts/        # zod schemas, enums, error codes, event types, roles (shared FE/BE/CC)
│  ├─ chain-client/     # ChainGateway interface + FabricGateway + MockGateway
│  └─ config/           # eslint, tsconfig, prettier
├─ network/             # configtx, CA, orderer/peer compose, scripts, PDC collections json
├─ infra/               # compose.dev/prod, Caddyfile, GH Actions, backup scripts
├─ db/                  # prisma/schema/*.prisma (one file per phase), seeds
├─ tools/fixtures/      # state-forcing fixtures (dev only)
└─ docs/                # architecture.md, contracts/phase-N.md, runbook.md, demo-script.md
```

**Conventions:** conventional commits · PR per phase sub-task · every PR needs lint + unit tests green · API prefix `/api/v1` · error format `{code, message, details}` with codes from `packages/contracts` · cursor pagination · money = integer paise · ids = ULID with prefixes (`AST-`, `TKN-`, `TRF-`, `VAL-`, `PRT-`).

**Dependency graph after Phase 0:**

```
P0 ─┬─ P1 Participants & Access ──┐
    ├─ P2 Types & Registration    │   (data dependencies are satisfied by fixtures,
    ├─ P3 Verification            │    so all of these can start the same day)
    ├─ P4 Valuation               │
    ├─ P5 Tokenization            │
    ├─ P6 Transfer & Rules        │
    ├─ P7 Lifecycle Controls      │
    ├─ P8 Audit & Integrity       │
    └─ P9 Dashboards & Integrations
                    └──────────► P10 Integration, Hardening, Deploy, Extensibility
```
Recommended merge order: P1 → P2 → P3 → P4 → P5 → P6 → P7, with P8/P9 merging anytime.

---

# PHASE 0 — Foundation (everything shared)

**Goal:** after this phase, any developer can pick any later phase and start immediately. **A walking skeleton is deployed to the real server by the end of this phase.**
**Parallel tracks:** 0-A DevOps/Fabric · 0-B Backend/DB · 0-C Chaincode lib · 0-D Frontend shell · 0-E Contracts/Docs. (5 tracks can run in parallel on day 1.)

### 0-A Infra, Fabric network & deployment skeleton
- [ ] Repo, pnpm + Turborepo, lint/format/commit hooks, `.env.example`, `Makefile` (`make dev`, `make network-up`, `make network-down`, `make reset`, `make test`).
- [ ] Docker Compose: Postgres, Redis, MinIO, api, worker, web.
- [ ] **Fabric network scripts**: 6 orgs, Fabric CA per org (TLS on), 3 Raft orderers, 1 peer + CouchDB per org, channel `rwa-channel`, anchor peers, gossip configured for PDC.
- [ ] **Private data collections** JSON (`pdcOrigination`, others as needed) with member-only read, endorsement policy.
- [ ] **CCaaS** packaging + deploy scripts + upgrade script (`make cc-upgrade`).
- [ ] Identity bootstrap script: registers & enrolls admin/test users per org with attributes (`role`, `participantId`).
- [ ] Shared **dev VM** with the full network running; documented VPN/SSH access for team.
- [ ] **CI** (GitHub Actions): lint, typecheck, unit tests, build images. **CD**: deploy `main` to the VM through SSH + `docker compose pull/up`, Caddy with HTTPS on a real domain.
- [ ] Backup script (Postgres dump + Fabric volumes) on a cron.

### 0-B Database & backend core
- [ ] Prisma multi-file schema: **all tables below created now** (later phases add columns/indexes only in their own file).

| Group | Tables (key columns) |
|---|---|
| Identity & access | `organizations`(id, msp_id, name, status) · `users`(id, org_id, email, password_hash, role, status, totp_secret?) · `sessions` · `fabric_identities`(user_id, enrollment_id, encrypted_key, cert, status) · `participants`(id, user_id?, org_id, kind INDIVIDUAL/ENTITY, kyc_status, investor_class, jurisdiction, pii_encrypted, pii_hash, limits jsonb, status, chain_synced) |
| Type engine | `asset_types`(key, version, status, definition jsonb, checksum, chain_tx_id) |
| Assets | `assets`(id, type_key, type_version, originator_participant_id, display_name, status, attributes jsonb, attributes_hash, chain_tx_id, version) · `evidence`(id, asset_id, doc_type, storage_key, sha256, size, mime, encrypted_dek, uploaded_by, status, chain_tx_id) |
| Verification | `verification_cases`(id, asset_id, status, assigned_to, sla_due_at, decision, reason_code, reason_text, decided_by) · `verification_checks`(case_id, check_key, result, notes, source_ref, checked_by) |
| Valuation | `valuations`(id, asset_id, version, amount_paise, currency, method, method_details jsonb, source jsonb, valuation_date, valid_until, status, proposed_by, approved_by, supersedes_id, chain_tx_id) |
| Tokens | `tokens`(id, asset_id, standard, total_units, unit_label, rights_type, representation jsonb, evidence_root, valuation_id, status, minted_tx_id) · `token_balances`(token_id, participant_id, units, locked_units, acquired_at) · `mint_requests`(…) |
| Transfers | `transfers`(id, token_id, from_participant, to_participant, units, price_paise, payment_ref, status, rule_results jsonb, rejection_reasons jsonb, requested_by, decided_at, chain_tx_id) |
| Lifecycle & audit | `lifecycle_events`(id, entity_type, entity_id, from_state, to_state, actor_user_id, actor_org, actor_role, reason_code, reason_text, tx_id, block_number, occurred_at) · `chain_events`(block_number, tx_index, event_index, tx_id, name, payload, validation_code, committed_at; unique on the first three) · `indexer_checkpoint` · `chain_commands`(id, idempotency_key, actor_user_id, fn, args_hash, status QUEUED/SUBMITTED/COMMITTED/FAILED, tx_id, error, attempts) · `security_events` · `api_audit_log` |
| Compliance | `holds`(entity, type, reason, placed_by, released_at) · `blacklist` · `compliance_cases` |
| Misc | `notifications` · `comments` · `reconcile_runs` · `drift_items` · `webhooks` · `api_keys` |

- [ ] Seed script: 6 orgs, one user per role per org, 10 demo participants.
- [ ] Nest skeleton: config (zod-validated env), logging, global error filter, `Idempotency-Key` interceptor, OpenAPI generation, health endpoints.
- [ ] **Auth + RBAC:** register/login/refresh/logout, argon2, role guard decorators `@Roles()`, org scoping, optional TOTP.
- [ ] **Identity service:** creates/enrolls a Fabric identity for each platform user (keys encrypted with a master key; custodial for the hackathon, documented trade-off).
- [ ] **Document service** (MinIO): upload → AES-256-GCM encrypt → SHA-256 → store; signed short-lived download URLs; MIME/size validation.
- [ ] **`chain_commands` pipeline:** enqueue → worker submit → await commit → status; idempotent retries.
- [ ] **Indexer skeleton:** block listener from checkpoint, one-event-per-tx envelope parser, **handler registry** (`registerProjection(eventName, handler)`) so each phase adds its own projection file; idempotent upserts keyed by `(block, tx, eventIdx)`; replay command.
- [ ] **SSE endpoint** `/events/stream` (role-filtered) that the UI uses for live status.

### 0-C Chaincode scaffold & shared lib
- [ ] `RwaChaincode` registers multiple contract classes (one per phase), each an empty stub with its namespace: `ParticipantContract`, `AssetTypeContract`, `AssetContract`, `VerificationContract`, `ValuationContract`, `TokenContract`, `TransferContract`, `LifecycleContract`, `AuditContract`, `DevFixtureContract` (**compiled in only when `CC_ENV=dev`**).
- [ ] `lib/`: `ctx` wrapper (`caller()` → msp, role, participantId from cert attributes) · `requireRole()` · `Repo<T>` (typed get/put/list with composite keys + pagination) · `Keys` registry (one namespace per contract) · `EventAggregator` (single event/tx) · `StateMachine` (transition table + per-type extension hook) · `AuditLog.append()` · `Errors` (stable codes from `packages/contracts`) · `Ids` · `Clock` (tx timestamp) · `Money` (integer paise, bps) · `SchemaValidator` (ajv) · `Pdc` helper (transient map I/O) · `SoD` helper (segregation-of-duties checks).
- [ ] Jest harness with a mock `ChaincodeStub` (`makeCtx({msp, role, participantId, now})`) so every phase can unit-test without a network.
- [ ] CouchDB index folder + pagination bookmark helpers.

### 0-D Frontend shell
- [ ] Vite + Tailwind + shadcn/ui; **app shell** with role-aware navigation (feature registry: each phase registers routes + menu items + required roles).
- [ ] Auth screens, session handling, generated API client, TanStack Query setup, SSE hook.
- [ ] Shared components: `DataTable` (server pagination/filter), `StatusBadge`, `Timeline` (lifecycle/audit), `EntityLink`, `HashChip` (copy + explorer link), `MoneyInput/Display` (paise ↔ ₹), `FileDropzone`, `RoleGate`, `ConfirmReasonDialog` (mandatory reason capture), empty/error/loading states.
- [ ] Role switcher in dev mode for fast testing.

### 0-E Contracts package, docs & fixtures
- [ ] `packages/contracts`: `Role`, `AssetStatus`, `TransferStatus`, `ErrorCode`, `EventName`, zod DTOs, event payload types, `reasonCodes`.
- [ ] `packages/chain-client`: `ChainGateway` interface (`submit(fn,args,opts)`, `evaluate(fn,args)`, `subscribe()`), **FabricGateway**, **MockGateway** (in-memory implementation of the same state machine rules, used by FE/API dev and unit tests).
- [ ] `tools/fixtures`: `fixtures create asset --type LAND --state VERIFIED`, `… token --state ACTIVE --holders 3`, `… transfer --status REJECTED`, works against Mock and (dev) chain through `DevFixtureContract`.
- [ ] `docs/architecture.md`, `docs/contracts/_template.md`, `docs/runbook.md` skeleton, ADR log.

### Phase 0 exit gate (all must pass before others start)
- [ ] `make dev` brings up the full stack on a fresh laptop in Mock mode; `make network-up` brings up Fabric.
- [ ] Walking skeleton: log in as each of the 6 roles → see role-specific empty dashboard → submit a trivial `Ping` command through API → worker → chain → indexer → Postgres → SSE → UI, **on the deployed server with HTTPS**.
- [ ] A fixture can create an asset in any state; the indexer projects it.
- [ ] CI green; deploy pipeline works from `main`.
- [ ] Every later phase has its `docs/contracts/phase-N.md` stub assigned to an owner.

**Bonus (Phase 0):** Hyperledger Explorer or Grafana dashboards for peers/orderers · pre-commit secret scanning · devcontainer for one-click setup.

---

# PHASE 1 — Participants, Identity & Access (roles & visibility foundation)

**Depends on:** P0 · **Owns:** `ParticipantContract`, `modules/participants`, `modules/identity-admin`, `features/participants`, `features/admin-users`
**Goal:** every actor (individual or entity) has a verified identity on the ledger, with an eligibility profile that the rule engine can use later.

**Chaincode:** `registerParticipant`, `updateKycStatus` (compliance only), `setInvestorClass`, `setLimits`, `suspendParticipant` / `reinstateParticipant`, `addToBlacklist` / `removeFromBlacklist`, `getParticipant`, `listParticipants` (paginated), `participantExistsAndActive` (used by other contracts).

**Must-have**
- [ ] Onboard participant with PII stored off-chain (encrypted), **salted hash on-chain**; KYC document upload.
- [ ] KYC workflow: SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED(reason) by compliance; re-submission path.
- [ ] Investor classification (`RETAIL`, `QUALIFIED`, `INSTITUTIONAL`), jurisdiction, per-participant limits (max holdings value, per-transfer cap).
- [ ] Org admin screens (administrator): create orgs/users, assign roles, deactivate users; each user gets a Fabric identity automatically.
- [ ] Chaincode role enforcement from cert attributes; **negative tests for every role against every function** (auto-generated permission matrix test).
- [ ] API field-level redaction: investors never see another participant's KYC data; auditors see everything read-only.
- [ ] Suspension propagates: suspended or blacklisted participants fail later transfer rules (consumed in P6).
- [ ] Admin cannot approve KYC or verification (SoD).

**Edge cases:** duplicate registration (same PII hash) · KYC expiry date · participant belongs to wrong org for requested role · user deactivated while holding tokens (holdings remain; actions blocked) · lost credentials re-enrollment.

**Bonus:** TOTP-enforced for compliance/admin roles · KYC expiry reminders · participant risk score with explainable factors · bulk CSV participant import.

**Done when:** all six role logins work end-to-end, permission matrix test passes, a participant can be KYC-approved and shows `ACTIVE` on the ledger.

---

# PHASE 2 — Asset Type Engine, Registration & Evidence

**Depends on:** P0 (participants via fixtures) · **Owns:** `AssetTypeContract`, `AssetContract`, `modules/asset-types`, `modules/assets`, `modules/evidence`, `features/asset-types`, `features/assets`
**Goal:** the generic engine that makes "add a type without redesign" true, plus registration of real assets with evidence.

**Chaincode:** `defineAssetType`, `publishAssetTypeVersion`, `deprecateAssetType`, `getAssetType`, `listAssetTypes`; `registerAsset` (validates attributes against type schema, stores full data in `pdcOrigination`, public header + attributes hash), `updateAssetAttributes` (only in REGISTERED/CHANGES_REQUESTED, bumps version), `attachEvidence` (hash + doc type + Merkle leaf), `submitForVerification` (checks all required evidence present), `getAsset`, `listAssets` (role-filtered), `getEvidenceRoot`.

**Must-have**
- [ ] **Asset type admin UI**: schema editor (fields, types, validation, visibility tag), evidence requirements, checklist, valuation methods, token standard, rules, terminal reasons; **version + publish** (admin proposes, compliance co-signs rule changes).
- [ ] **Dynamic form renderer** driven by type schema (used for registration and later for every type, including types created at runtime).
- [ ] Ship **LAND** and **VEHICLE** definitions as seed config (see §4), differing in data, evidence, checks and token standard.
- [ ] Registration wizard: details → evidence upload → review → submit; draft saving (off-chain) until submit.
- [ ] Evidence: encrypted upload, hash computed server-side *and* client-side match check, duplicate-hash detection across assets (same document used for two assets is flagged).
- [ ] **Duplicate asset detection** on unique identity fields (registration no., survey no., chassis no.) via salted hash index so the same real asset cannot be registered twice.
- [ ] Assets pinned to type version; changes to the type never retroactively alter registered assets.
- [ ] Asset detail page: attributes, evidence list, status badge, timeline (from `lifecycle_events`).

**Edge cases:** deprecated type blocks new registrations but not existing assets · schema-invalid data rejected with field-level errors · missing mandatory evidence blocks submission · re-upload replaces evidence (old hash retained in history) · attribute change after submission is blocked · file type/size/virus checks · issuer cannot register for another issuer.

**Bonus:** **AI-assisted extraction**: upload RC/title/invoice → LLM extracts fields → pre-fills form and shows "declared vs extracted" mismatches (advisory only; stored as `assistant` source, never authoritative) · OCR for scanned docs · bulk registration CSV · QR "asset passport" sticker for the physical asset.

**Done when:** an issuer registers a land parcel *and* a tractor with different forms/evidence, both reach `UNDER_VERIFICATION`, and an admin can publish a type change without redeploying any code.

---

# PHASE 3 — Verification & Approval

**Depends on:** P0 (assets in `UNDER_VERIFICATION` via fixtures) · **Owns:** `VerificationContract`, `modules/verification`, `features/verification`
**Goal:** nothing proceeds without independent, signed, auditable verification.

**Chaincode:** `assignVerifier`, `recordCheck` (per checklist item, result + source ref + notes), `requestChanges`, `approveVerification` (all required checks PASS), `rejectVerification` (reason mandatory), `reopenVerification` (after changes), `getVerificationCase`.

**Must-have**
- [ ] Verifier queue with filters (type, age, SLA, assignee), claim/assign flow, SLA due dates and overdue highlighting.
- [ ] Checklist UI generated from the type's `verificationChecklist`; each check = PASS / FAIL / NOT_APPLICABLE with notes and evidence reference.
- [ ] Decisions: **Approve → VERIFIED**, **Request changes → CHANGES_REQUESTED** (issuer notified, edits allowed, resubmit → new case round), **Reject → REJECTED (terminal)** with reason code + text.
- [ ] **Segregation of duties** in chaincode: verifier org ≠ issuer org; verifier cannot be the asset's originator.
- [ ] Verification rounds history (round 1 changes requested, round 2 approved) preserved.
- [ ] **Registry adapters (mock external registries)**: interface `RegistryAdapter` with mock `VahanMock` (vehicle), `LandRecordsMock`, `EInvoiceMock`. Verifier clicks "Fetch registry record" → result is stored as *evidence of source `REGISTRY_ADAPTER`*, the verifier still signs the decision. Makes the physical→digital link explicit and extensible.
- [ ] Optional second-level approval for high-value assets (configurable threshold → compliance must co-approve).
- [ ] The verification result hash is bound into the asset header; any later attribute change invalidates it.

**Edge cases:** two verifiers act concurrently (MVCC conflict handled → friendly retry) · verifier tries to approve with a required check failing · evidence changed after verification (blocked) · case reassignment · issuer withdraws asset during verification (→ RETIRED w/ reason).

**Bonus:** **AI verifier copilot**: flags inconsistencies across documents (name/number mismatches, expired dates) with citations to the document, human must accept/dismiss each flag · field inspection attestation via mobile PWA (photo + GPS + timestamp hash-bound to the case) · verifier performance analytics.

**Done when:** a verifier works a land case with a request-changes loop and a vehicle case with straight approval; a rejected asset can never reach tokenization (tested at chaincode level).

---

# PHASE 4 — Valuation

**Depends on:** P0 (assets in `VERIFIED` via fixtures) · **Owns:** `ValuationContract`, `modules/valuation`, `features/valuation`
**Goal:** every asset carries its own, defensible, versioned valuation.

**Chaincode:** `proposeValuation`, `approveValuation` (maker-checker), `rejectValuation`, `supersedeValuation` (revaluation), `expireStaleValuations` (callable job-trigger, checks validity dates against tx time), `getValuation`, `listValuationHistory`.

**Must-have**
- [ ] Valuation record: amount (integer paise), currency (INR), **method** (from the type's allowed list), method details (inputs, comparables, rate used), **source** (valuer name/org, report reference, report document hash), **valuation date**, **valid-until**.
- [ ] **Maker-checker**: valuer proposes → compliance (or a second valuer) approves; proposer ≠ approver ≠ verifier of the asset (SoD).
- [ ] Asset transitions `VERIFIED → VALUED` only on approved valuation.
- [ ] Per-unit value for fractional tokens = value ÷ total units with a defined remainder rule (integer math, documented).
- [ ] **Revaluation**: new version supersedes the old one; history retained; token NAV updates (consumed by P5/P6).
- [ ] Staleness: after `validityDays`, valuation is flagged `EXPIRED`; the type can decide to **block mint** and/or **block transfers** on stale valuation (rule consumed in P6).
- [ ] Valuation UI: guided form per method, comparison panel showing a variance warning when it deviates strongly from the previous or from same-type median.
- [ ] Two assets of the same type visibly carry different values and methods (demo-critical).

**Edge cases:** valuation lower/higher than a configured tolerance triggers mandatory second approval · valuer from the same org as issuer blocked · currency mismatch · backdated valuation date rejected beyond limit · valuation of an asset already tokenized goes through revaluation path (does not change history).

**Bonus:** valuation variance analytics vs. type median · valuation report PDF generated and hash-anchored · scheduled revaluation reminders · sensitivity view (±10 % effect on unit value).

**Done when:** valuation lifecycle `PROPOSED → APPROVED → SUPERSEDED/EXPIRED` works with SoD checks and is visible to the right roles only.

---

# PHASE 5 — Tokenization & Traceability

**Depends on:** P0 (assets in `VALUED` via fixtures) · **Owns:** `TokenContract` (mint/burn/read), `modules/tokens`, `features/tokens`, `features/public-verify`
**Goal:** tokens exist **only** for approved assets and can always be traced back to the real asset.

**Chaincode:** `requestMint` (issuer), `approveMint` (compliance; SBE needs Verifier + Compliance endorsement), `rejectMint`, `mintToken` (internal, atomic with approval), `getToken`, `getTokenDisclosure`, `listTokens`, `getTokenTrace` (token → asset → evidence root → verification → valuation), `getBalance`, `listHolders`.

**Must-have**
- [ ] **Hard preconditions in chaincode** (all must hold): asset `VALUED`; verification `APPROVED`; valuation `APPROVED` and not stale; requester is the originator and an `ACTIVE` KYC-approved participant; no existing live token for this asset (strict 1:1); type is active.
- [ ] **Token definition** stored with: `tokenId`, `assetId`, type + version snapshot, **`standard`: `WHOLE` (1 unit, non-splittable) or `FRACTIONAL` (`totalUnits` within the type's min/max, `unitLabel`)**, **`rightsType`** (`FULL_OWNERSHIP`, `UNDIVIDED_FRACTION`, `RECEIVABLE_CLAIM`), a human-readable **representation statement** ("1 unit = 1/10,000 undivided interest in Survey No. …"), `evidenceRoot` (Merkle root), valuation reference, initial owner, mint tx.
- [ ] **Unified balance model:** whole tokens are fractional tokens with `totalUnits = 1` and transfers disallowed to split; one code path.
- [ ] **Token disclosure** published on mint: public-tagged attributes + valuation summary (amount, method, date, source name) — written to public state so every org (and the public verify page) can see it.
- [ ] **Traceability view:** from token ID → real asset identity → evidence list (hashes) → verification decision(s) with verifier org → valuation → owner(s). One screen + API (`/tokens/:id/trace`).
- [ ] **Public Verify page** (no login): enter token ID or scan QR → shows disclosure, status (ACTIVE/FROZEN/REDEEMED), valuation summary, current holder count, link to ledger proof (txId, block). No PII, no restricted data.
- [ ] Mint request queue for compliance with a checklist summary (verification ✔, valuation ✔, KYC ✔, evidence root ✔).
- [ ] Mint is atomic: token, balance of initial owner, disclosure, lifecycle transition `VALUED → TOKENIZED`, audit record in **one transaction**.

**Edge cases:** double mint attempt (idempotency + 1:1 rule) · valuation expires between request and approval (re-check at approval) · fractional unit count outside range · asset attributes changed after verification (hash mismatch blocks mint) · mint approval by the same user who requested (blocked) · burn only through P7 redemption/retirement.

**Bonus:** QR code / printable "asset passport" with token ID · **document integrity checker** (drop a file → compute SHA-256 in browser → "this document is anchored under asset X, evidence slot Y" or "no match") · token metadata JSON export (ERC-1155-style schema) for interoperability narrative · embeddable verify widget.

**Done when:** a land parcel becomes a 10,000-unit token and a tractor becomes a whole token; anyone can verify each from the public page; attempts to mint unverified/unvalued assets fail in chaincode tests.

---

# PHASE 6 — Ownership, Transfer & Rule Engine

**Depends on:** P0 (active tokens with holders via fixtures) · **Owns:** `TransferContract`, `lib/rules/*` (rule engine), `modules/transfers`, `features/transfers`, `features/rules-admin`
**Goal:** every transfer is checked against configured rules; **rejections are first-class records**.

**Chaincode:** `proposeTransfer`, `acceptTransfer` (buyer consent), `cancelTransfer`, `evaluateTransfer` (dry-run, read-only, used by UI "check before you submit"), `executeTransfer` (runs the rule engine), `resolveEscalation` (compliance approve/deny), `getTransfer`, `listTransfers`, `getTransferHistory(token)`.

**Rule engine (deterministic, data-driven, in chaincode lib).** Rules come from the asset type config; **all failing rules are collected** (not just the first) and stored with codes.

| Rule type | Meaning |
|---|---|
| `PARTICIPANT_ACTIVE` | both parties exist, not suspended, not blacklisted |
| `PARTY_KYC_VERIFIED` | both KYC `APPROVED` and not expired |
| `BUYER_CLASS_AT_LEAST` | investor class ≥ X |
| `JURISDICTION_ALLOWED` | buyer jurisdiction in allow-list |
| `SELLER_BALANCE` | seller holds ≥ units, minus locked units |
| `MIN_TRANSFER_UNITS` / `WHOLE_ONLY` | unit granularity rules |
| `MAX_HOLDING_BPS` | buyer holding after transfer ≤ X % of supply |
| `MAX_TRANSFER_VALUE` / `MAX_DAILY_VALUE` | per-transfer / rolling-window limits (valuation-based) |
| `LOCK_IN_DAYS` | units acquired < N days ago can't be moved |
| `ASSET_TRANSFERABLE` | token ACTIVE (not FROZEN/terminal), no hold |
| `VALUATION_NOT_STALE` | block if valuation expired (configurable) |
| `NO_ENCUMBRANCE` | e.g. vehicle hypothecation flag clear |
| `NOT_SELF_TRANSFER` | from ≠ to |
| `ESCALATE_ABOVE_VALUE` | not a rejection: routes to compliance approval |

**Must-have**
- [ ] Flow: `PROPOSED → (buyer ACCEPTED) → RULES_EVALUATED → EXECUTED | REJECTED | PENDING_COMPLIANCE → EXECUTED/REJECTED | CANCELLED | EXPIRED`.
- [ ] **REJECTED transfers are persisted on-chain** with `rejectionReasons[] = [{ruleId, code, message, observedValue, limit}]`, actor, tx time; visible in the token's transfer history and audit. (See rule 3.4-1: transaction *succeeds*, outcome = REJECTED.)
- [ ] Atomic execution: debit seller, credit buyer, update lock-in acquisition record, lifecycle/audit record, event — one tx.
- [ ] Whole-token transfer = full-balance move; **ownership changes recorded with price/consideration & payment reference fields** (settlement itself is off-platform in v1).
- [ ] **Pre-flight check** in UI: shows exactly which rules would pass/fail before submitting (calls `evaluateTransfer`).
- [ ] Rules admin UI: view/edit per-type rule set, parameters, enable/disable; changes versioned and compliance-cosigned.
- [ ] Holdings view for any participant (investors see only theirs), cap table for a token (issuer/compliance/auditor).
- [ ] Concurrency safety: two simultaneous transfers of the same units → one wins, one is rejected `INSUFFICIENT_BALANCE` (MVCC handled with auto-retry that re-evaluates).
- [ ] Proposal expiry (configurable) with worker job.

**Edge cases:** transfer of locked units · buyer becomes blacklisted between proposal and execution (re-evaluated at execution) · rounding of per-unit price · transfer on FROZEN token → rejected with reason · rejected attempt must not change balances · dust units prevented by `MIN_TRANSFER_UNITS` · identical retry with same idempotency key returns the same result.

**Bonus:** **simulated DvP escrow** (buyer funds mock INR wallet → atomic swap with token) · compliance **anomaly flags** (rapid back-and-forth transfers, near-limit structuring; explainable rules, not black-box AI) · what-if simulator ("if I raise max holding to 30 %, which past rejections would pass?") · scheduled/conditional transfers.

**Done when:** one land token has 3 successful transfers and 4 rejected ones with 4 different reasons, all visible in history; tractor whole-transfer passes/fails correctly on rules.

---

# PHASE 7 — Lifecycle Controls: Freeze, Redeem, Retire

**Depends on:** P0 (active tokens via fixtures) · **Owns:** `LifecycleContract`, `modules/lifecycle`, `features/lifecycle`
**Goal:** assets can move through *every* defined state up to redemption or retirement, with full who/when/from/to/why.

**Chaincode:** `freezeAsset` / `unfreezeAsset` (compliance, with legal reference), `requestRedemption`, `approveRedemption`, `executeRedemption` (burns token), `retireAsset` (with reason code + evidence), `getLifecycle(entity)`, `listAllowedTransitions(entity)` (what *can* the current user do now).

**Must-have**
- [ ] **State engine** (from P0 lib) surfaced everywhere: UI shows the current state, the diagram, and only the actions allowed for the user's role.
- [ ] **FROZEN** (court order, fraud suspicion): all transfers rejected with `ASSET_FROZEN`; reversible by compliance with reason.
- [ ] **Redemption:** conditions per type — fractional token requires a **single holder owning 100 % of units** (consolidation) or a configured redemption path; whole token requires holder request. Compliance approves → token **burned** (balances zeroed, token `BURNED`), asset `REDEEMED` (terminal).
- [ ] **Retirement:** asset withdrawn for type-defined reasons (`SCRAPPED`, `LEGAL_INVALIDATION`, `DESTROYED`, `DEFAULTED`…); requires evidence + compliance approval; blocked if pending transfers exist; token burned if it exists.
- [ ] Every transition record: `{actor(user, org, role), txTimestamp, fromState, toState, reasonCode, reasonText, evidenceRef?, txId}`; reason text mandatory for freeze/reject/retire.
- [ ] Terminal states are truly terminal (chaincode test: no function can resurrect them).
- [ ] **Lifecycle timeline** component with filters, linked tx IDs, and the same view for assets, tokens and transfers.
- [ ] Lifecycle diagram page per asset type showing the type's configured checks.

**Edge cases:** freeze while a transfer is mid-flight (transfer rejected at execution) · redemption with locked units · retire a never-tokenized asset (allowed paths) · unfreeze requires different compliance user than freezer (SoD) · double redemption attempt.

**Bonus:** **fractional redemption by buyout/vote** (holders approve with unit-weighted votes) · scheduled auto-expiry for time-bound assets like invoices (maturity → `SETTLE`) · legal-hold document attachments with hash anchoring · redemption certificate PDF (hash-anchored).

**Done when:** you can walk one tractor from REGISTERED to RETIRED(SCRAPPED) and one land token to REDEEMED, with full timelines and no illegal transition possible (property tests on the transition table).

---

# PHASE 8 — Audit, Explorer & Integrity

**Depends on:** P0 (indexer + `audit` records) · **Owns:** `AuditContract`, `modules/audit`, `modules/reconcile`, `features/audit`
**Goal:** the complete history of any asset, token and transfer can be inspected, searched, exported and *proven*.

**Chaincode:** `getAuditTrail(entityType, entityId, page)`, `getAuditByActor`, `getStateHash(entity)` (canonical hash of current state, for reconciliation), `getHistoryForKey` wrappers.

**Must-have**
- [ ] **Entity audit page** for asset, token, transfer, participant: full ordered history — registration, evidence added, checks, decisions, valuations, mint, transfers (including **rejected** with reasons), freezes, redemption — each with actor, org, role, time, from→to, why, **txId + block number**.
- [ ] **Ledger explorer** (our own, from `chain_events` + peer queries): blocks, transactions, endorsing orgs, validation code (VALID / MVCC_READ_CONFLICT etc.), chaincode events.
- [ ] **Global audit search:** by actor, org, role, asset type, action, date range, outcome; keyset pagination.
- [ ] **Auditor workspace:** read-only access to everything including private data collections (auditor org is a member), with a visible "read-only" banner; every auditor view itself is logged in `api_audit_log`.
- [ ] **Export:** CSV and signed PDF audit report for an asset (report hash anchored/recorded; includes txIds so a third party can verify against the ledger).
- [ ] **Integrity reconciler (worker job + UI):** compares Postgres projection against `getStateHash` from the chain on a schedule; any mismatch → drift item + alert; one-click `reindex entity`.
- [ ] **Point-in-time view:** "show this token's holders as of date D" via audit replay.
- [ ] Security-event page (denied access attempts, failed logins) clearly labeled **off-chain**, with a note on why denied attempts are not on the ledger.
- [ ] **Document tamper check** API (upload → hash → lookup anchored evidence).

**Edge cases:** very long histories (pagination/virtualization) · block events missed after restart (checkpoint resume) · duplicate events on reconnect (idempotent) · endorsement failure vs invalid transaction display · auditor with expired session.

**Bonus:** **natural-language audit assistant** ("why was transfer TRF-… rejected?", "who touched asset AST-… after verification?") answering strictly from audit records with citations to txIds · anomaly timeline highlights · shareable read-only audit link with expiry for external regulators.

**Done when:** any asset's full story can be reconstructed from the UI and independently verified against the ledger; reconciler reports clean and detects an intentionally corrupted row.

---

# PHASE 9 — Role Dashboards, Notifications & Integrations

**Depends on:** P0 · **Owns:** `modules/dashboards`, `modules/notifications`, `modules/integrations`, `features/dashboard`, `features/notifications`, `features/integrations`
**Goal:** each role lands on a screen made for their job; the platform talks to the outside world.

**Must-have**
- [ ] **Dashboards (data from Postgres read-model, role-filtered):**
  - Issuer: my assets by state, pending actions, changes requested, mint status.
  - Verifier: queue, SLA, my cases.
  - Compliance: KYC queue, mint approvals, escalated transfers, active freezes, rejected-transfer feed.
  - Investor: holdings, value (using latest valuation), pending proposals, transfer history.
  - Auditor: recent activity, drift alerts, rejected-transfer stats.
  - Admin: org/user health, types, network status (peers, block height, indexer lag, queue depth).
- [ ] **Notifications:** in-app (live via SSE) + email (SMTP/Resend) for: changes requested, verification decision, valuation approval, mint decision, transfer proposed/accepted/rejected/executed, freeze, KYC decision. Per-user preferences.
- [ ] **Global search** (assets, tokens, participants by id/name) respecting visibility.
- [ ] **Comments & @mentions** on verification cases and mint requests (off-chain, auditable).
- [ ] **Webhooks** (HMAC-signed, retries with backoff) and **API keys** for external systems (e.g. a bank reading holdings), scoped and rate limited.
- [ ] Network status panel (reads indexer + peer health).

**Edge cases:** notification storms (batching/digest) · webhook endpoint down (retry + dead-letter view) · users with multiple roles · timezone display (IST default, store UTC).

**Bonus:** weekly digest emails · PWA install + push · CSV/Excel report exports for compliance · public API docs portal (Swagger UI) with sandbox keys.

**Done when:** every role's first screen shows live, correct, role-limited data and a webhook receiver (demo) receives signed events for a full asset journey.

---

# PHASE 10 — Integration, Hardening, Deployment & Extensibility Proof

**Depends on:** P1–P9 merged · **Owns:** everything (release engineering)
**Goal:** a robust, deployed, demo-ready product.

**Must-have**
- [ ] **Extensibility proof — INVOICE asset type created purely from the admin UI/config** (no code or chaincode redeploy): register → verify → value → tokenize → transfer → settle. Record a short video of this.
- [ ] **E2E tests (Playwright) for the golden paths:** Land: register → verify (with changes loop) → value → mint (10,000 units) → 3 transfers incl. 2 rejections → freeze/unfreeze → redeem. Vehicle: register → verify → value → mint (whole) → transfer → retire.
- [ ] **Permission matrix test** across chaincode + API + UI for all six roles.
- [ ] **Chaos/robustness:** kill a peer mid-transfer; restart indexer; restart worker with queued commands; reindex from block 0 → UI state identical.
- [ ] **Concurrency tests** (k6): parallel transfers on one token, parallel mints, idempotent retries.
- [ ] **Security pass:** OWASP checklist, helmet, CORS allow-list, rate limiting, upload validation, secrets only via env/Docker secrets, dependency scan (`npm audit`, Trivy), key-management review, SQL injection/XSS tests, JWT rotation, no PII in logs.
- [ ] **Production deployment:** domain + HTTPS, resource limits, restart policies, log rotation, nightly backups with a *tested restore*, `runbook.md` (restart, upgrade chaincode, add org, reindex, rotate keys).
- [ ] **Chaincode upgrade drill** (sequence bump with a data-compatible change) with zero data loss.
- [ ] **Seed "demo world"**: realistic participants, 6+ assets across states, tokens with holders, history of rejected transfers; `make demo-reset` restores it in under a minute.
- [ ] **Docs:** architecture, trust model, data placement, role matrix, API docs, how to add an asset type, DPDP/privacy notes, known limitations.
- [ ] **Demo script (7 minutes)** and a backup recorded demo.

**Bonus:** one-command cloud deploy (Terraform/Ansible) · Prometheus + Grafana dashboards · multi-VM split (orgs on different hosts) to show a truly distributed network · client-side signing option (user-held keys) as the non-custodial roadmap.

**Done when:** a stranger can open the deployed URL, follow the demo script, and every claim in the PS traceability matrix is demonstrable live.

---

# 6. Bonus backlog, ranked by value to a judge

| Rank | Bonus | Why it earns points | Phase |
|---|---|---|---|
| 1 | **Third asset type via config only (Invoice)** | Directly proves PS objective 1 | P10 |
| 2 | **Public verify page + QR / asset passport** | The "token → real asset, anyone can check" promise | P5 |
| 3 | **Registry adapters + AI document extraction & mismatch flags (advisory)** | Attacks the real hard problem: physical-to-digital trust | P2/P3 |
| 4 | **Maker-checker + segregation of duties** | Real governance, not a CRUD app | P3/P4/P5 |
| 5 | **Integrity reconciler + document tamper checker** | Shows why a ledger was needed | P8 |
| 6 | **What-if rule simulator + pre-flight transfer check** | Makes the rule engine understandable | P6 |
| 7 | **Webhooks / API keys** | Shows integration with banks/ERPs | P9 |
| 8 | **Simulated DvP escrow** | Fintech credibility | P6 |
| 9 | **Fractional redemption by vote** | Governance depth for fractional assets | P7 |
| 10 | **NL audit assistant with txId citations** | Useful, explainable AI use | P8 |

**Explicitly out of scope** (don't waste time): public crypto coin, NFT marketplace/order book, storing PDFs on-chain, multi-chain bridges.

---

# 7. Global quality bars

**Definition of Done for every phase**
- [ ] Contract doc `docs/contracts/phase-N.md` is up to date (functions, endpoints, events, tables).
- [ ] Chaincode unit tests incl. **negative tests for every role** and every precondition; ≥ 80 % coverage on contract logic.
- [ ] API tests (success, validation, authz, idempotency).
- [ ] UI states: loading / empty / error / forbidden handled; works in Mock mode *and* against real Fabric.
- [ ] Indexer projection registered, replayable from block 0.
- [ ] Audit records written for every state change; reason captured where required.
- [ ] Added to the Playwright suite (at least the happy path).
- [ ] Deployed to the shared server via CI.

**Pitfalls checklist (re-read weekly)**
- Failed tx writes nothing → rejected transfers must be a *successful* tx with a REJECTED record.
- Only one chaincode event per tx.
- No wall-clock time, randomness or floats inside chaincode.
- Don't put raw PII on-chain.
- Never trust roles from request bodies; take them from certificate attributes.
- Don't share a write key across hot paths.
- Keep Postgres a *projection*; if in doubt, the chain wins.

**Fabric learning path (first 2 days, in parallel with Phase 0)**
1. Run `fabric-samples/test-network`, deploy the asset-transfer-basic chaincode (TypeScript), invoke via CLI.
2. Read: channels, MSP, endorsement policies, MVCC, private data, CCaaS, Gateway SDK.
3. Write a toy contract using composite keys, pagination, events, and a PDC with the transient map.
4. Only then finalize the 0-A/0-C tasks.

---

# 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Fabric learning curve / network instability | Start from `test-network`, script everything, shared dev VM, Mock mode so others never block |
| Laptop can't run 6 orgs | Shared dev network on the VM + `MockGateway` |
| PDC misconfiguration (gossip/anchor peers) | Early Phase-0 PDC "hello world" with all orgs; test in the exit gate |
| MVCC conflicts under concurrent demo clicks | ULID ids, no hot keys, auto-retry with re-evaluation |
| Scope explosion | Must-haves first; bonuses only after the phase's **Done when** is met |
| Merge conflicts across phases | One folder / schema file / contract file per phase; contract doc first |
| Demo fails live | Seeded demo world, `demo-reset`, recorded backup video |
| Key-custody criticism | Document custodial wallet trade-off; show roadmap to client-side signing |

---

# 9. Seven-minute demo narrative

1. **Problem (30 s):** "Anyone can mint a token that says it's a tractor."
2. **Registration & evidence (60 s):** Issuer registers a tractor and a land parcel — two different forms, one engine.
3. **Verification (60 s):** Verifier runs checklist, registry lookup, requests a change on the land, then approves. Show mint impossible before this.
4. **Valuation (45 s):** Two assets, two methods, two values; maker-checker approval.
5. **Tokenization (60 s):** Tractor = whole token, land = 10,000 units. Open the **public verify page** from a QR: token → asset → evidence root → valuation.
6. **Transfers (90 s):** One successful, one **rejected** (buyer exceeds 25 % cap) with reason; show it in history.
7. **Lifecycle & roles (45 s):** Compliance freezes → transfer rejected; switch roles to show different visibility.
8. **Audit & extensibility (60 s):** Auditor timeline + tx explorer + integrity check; admin creates **Invoice** type live in the UI and registers one.

> **Closing line:** *"We didn't build a token. We built the trust chain that makes a token mean something: Real asset → Trust → Token → Ownership → Transfer → Audit."*