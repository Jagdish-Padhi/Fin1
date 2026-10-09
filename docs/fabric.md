# Hyperledger Fabric 2.5 Consortium Network

## Overview
EkamVistar RWA Platform integrates with a live **Hyperledger Fabric v2.5** enterprise consortium network. The ledger provides immutable provenance, strict Segregation of Duties (SoD), private asset verification pipelines, and atomic token lifecycle operations.

---

## Network Architecture & Topology

### 1. Consortium Organizations & MSPs
The live network runs 3 distinct peer organizations and 1 Raft ordering organization:

| Organization | MSP ID | Assigned Roles | Peer Endpoint | CA Endpoint |
|---|---|---|---|---|
| **Org 1** | `Org1MSP` | `ADMINISTRATOR`, `ISSUER` | `localhost:7051` | `https://localhost:7054` |
| **Org 2** | `Org2MSP` | `VERIFIER`, `VALUER`, `COMPLIANCE`, `AUDITOR` | `localhost:9051` | `https://localhost:8054` |
| **Org 3** | `Org3MSP` | `INVESTOR` | `localhost:11051` | `https://localhost:11054` |
| **Orderer** | `OrdererMSP` | Consortium Consensus (Raft) | `localhost:7050` | `https://localhost:9054` |

Channel: **`rwa-channel`**  
State Database: **CouchDB** per peer (enabling rich querying and state indexation).

### 2. Identity & Role Architecture
Fabric client identities are enrolled directly from their respective Organization CAs (`fabric-ca-client`). Every user certificate contains custom X.509 certificate attributes:
- `role`: Role string (`ADMINISTRATOR`, `ISSUER`, `VERIFIER`, `VALUER`, `COMPLIANCE`, `INVESTOR`, `AUDITOR`)
- `userId`: Platform user ID (e.g. `USR-ISSUER`)
- `participantId`: Platform participant ID (e.g. `PRT-ISSUER-01`)

The chaincode (`chaincode/rwa/src/lib/ctx.ts`) dynamically validates caller permissions using `ctx.clientIdentity.getAttributeValue('role')`. This ensures cryptographically enforceable Segregation of Duties without hardcoding individual MSP names.

---

## Chaincode-as-a-Service (CCaaS) Deployment

The chaincode comprises 9 smart contracts:
1. `ParticipantContract`: Participant lifecycle, KYC approvals, limits, blacklisting.
2. `AssetTypeContract`: Asset class definitions and regulatory rule schemas.
3. `AssetContract`: Asset registration, metadata updates, evidence hashing and verification submission.
4. `VerificationContract`: Independent multi-checkpoint verification workflow.
5. `ValuationContract`: Independent appraisal proposal and dual-party approval.
6. `TokenContract`: Token minting, balances, holder registries, and token trace.
7. `TransferContract`: Transfer rule engine, lock-in, caps, atomic transfers, first-class rejected record persistence.
8. `LifecycleContract`: Compliance freezing, redemption, and asset retirement.
9. `AuditContract`: Immutable audit logs and cryptographic state hashes.

### Bundling
To ensure zero workspace dependencies inside the peer container, the TypeScript chaincode is bundled via `esbuild` into CommonJS (`build/cc/index.cjs`), exporting all contracts for `fabric-shim`.

---

## Operating Instructions (WSL / Native Linux)

### Prerequisites
- Docker & Docker Compose
- Node.js ≥ 20
- pnpm ≥ 9

### Step-by-Step Runbook

1. **Install Fabric Binaries and Samples:**
   ```bash
   make install
   # or: bash scripts/fabric/install.sh
   ```

2. **Start Network and Create Channel:**
   ```bash
   make up
   # or: bash scripts/fabric/network-up.sh
   ```
   Starts 1 orderer, 3 peers, 3 CouchDBs, 4 CAs, creates `rwa-channel`, joins Org1, Org2, and Org3, and generates `.fabric/connection.json`.

3. **Deploy Chaincode:**
   ```bash
   make deploy
   # or: bash scripts/fabric/cc-deploy.sh
   ```
   Bundles the chaincode and deploys package `rwa` to `rwa-channel`.

4. **Enroll User Identities:**
   ```bash
   make enroll
   # or: node tools/identity/enroll.mjs
   ```
   Enrolls seed user identities and generates `.fabric/wallets/` and `.fabric/identity-map.json`.

5. **Initialize Ledger State:**
   ```bash
   make bootstrap
   # or: node tools/bootstrap/ledger-init.mjs
   ```
   Seeds default asset types and registers initial participants.

6. **Run Smoke & Parity Verification:**
   ```bash
   # Quick ping:
   make ping

   # End-to-end 6-persona Golden Path:
   make smoke
   ```

7. **Teardown:**
   ```bash
   make down
   # or: bash scripts/fabric/network-down.sh
   ```

---

## Dual-Mode Operation

The platform supports two runtime modes configured via `CHAIN_GATEWAY_MODE`:

- `CHAIN_GATEWAY_MODE=mock`: In-memory simulated Fabric ledger with deterministic rules, zero external dependencies, ideal for fast unit/integration tests and CI.
- `CHAIN_GATEWAY_MODE=fabric`: Production mode communicating with live Hyperledger Fabric peers using `@hyperledger/fabric-gateway` and gRPC TLS.
