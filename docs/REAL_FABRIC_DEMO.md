# Real Hyperledger Fabric Demo - Terminal Live (Round 2 Judges)

No mocks. Every transaction below endorses on peers, orders, commits, and is queryable via `peer` CLI.

## 0. Prerequisites (judge laptop)

- Docker Desktop running, 6GB RAM free
- Ports free: 7050,7051,7054,9051,8054,11051,11054,5984,7984,9984
- WSL2 / Linux / macOS terminal for `bash` scripts (Windows CMD not supported for Fabric scripts)
- Node 20+, pnpm 10

## 1. Bring up real network

```bash
make install   # downloads fabric-samples 2.5 + binaries (~2GB, once)
make up        # network.sh up createChannel -c rwa-channel -ca -s couchdb + addOrg3 + gen-connection
cat .fabric/connection.json  # must show Org1MSP/Org2MSP/Org3MSP with tlsCaCertPath
docker ps | grep -E "peer0|orderer|ca_"
```

Expected: `peer0.org1.example.com:7051`, `peer0.org2.example.com:9051`, `peer0.org3.example.com:11051`, `orderer.example.com:7050`.

## 2. Deploy real chaincode (no stubs)

```bash
make deploy
# bundles chaincode/rwa -> build/cc/index.cjs, deployCCAAS -ccn rwa -c rwa-channel
docker logs peer0.org1.example.com --tail 20  # chaincode container rwa-* running
peer chaincode query -C rwa-channel -n rwa -c '{"Args":["AssetTypeContract:listAssetTypes"]}'
```

Chaincode is fully real:
- `AssetContract:registerAsset` enforces `uniqueFields` dedup + `attributesHash` (`AssetContract.ts:121-143`)
- `attachEvidence` enforces global `sha256` dedup (`AssetContract.ts:232-310`)
- `submitForVerification` creates `VER-*` case atomically (`AssetContract.ts:327-400`)
- `LifecycleContract:freeze/unfreeze/redeem/retire` enforces `StateMachine.validateTransition` + token freeze (`LifecycleContract.ts`)
- `AuditContract:getAuditTrail/getStateHash` reads `AUD:*` + sha256 (`AuditContract.ts`)
- `VerificationContract:openVerificationCase/assignVerifier/reopen` with SoD (`VerificationContract.ts`)
- `TransferContract:propose` blocks ID overwrite + from-spoof (`TransferContract.ts:585-610`)

## 3. Enroll identities + bootstrap ledger

```bash
make enroll     # tools/identity/enroll.mjs -> .fabric/wallets/* + identity-map.json (role, userId, participantId attrs)
make bootstrap  # tools/bootstrap/ledger-init.mjs -> 5 asset types + 3 participants (KYC) + 5-asset demo portfolio (see below)
make ping       # tools/smoke/ping.mjs -> listAssetTypes via FabricGateway (proves TLS + MSP + endorsement)
```

`make bootstrap` writes 5 real on-chain assets (no DB/mock seeding): `AST-DEMO-RE-01`
REAL_ESTATE → TOKENIZED + 800-unit transfer to `PRT-INVESTOR-01`, `AST-DEMO-VH-01`
VEHICLE → TOKENIZED (whole), `AST-DEMO-LD-01` LAND → VALUED, `AST-DEMO-IN-01`
INVOICE → UNDER_VERIFICATION (verifier queue), `AST-DEMO-CM-01` COMMODITY →
REGISTERED (issuer action queue). Re-runnable: resumes each asset from its current
on-chain status.

## 4. Terminal live demo (record this)

```bash
node tools/smoke/live-fabric-demo.mjs
```

It prints real `txId`, `blockNumber` for each step and proves:
1. `registerAsset` commits
2. duplicate `surveyNumber` REJECTS with `Duplicate asset detected ... already registered`
3. duplicate evidence `sha256` REJECTS with `Duplicate evidence detected`
4. `submitForVerification` creates `VER-*`
5. `decideVerification APPROVED` -> VERIFIED
6. `propose/approveValuation` -> VALUED, `mintToken` -> TOKENIZED
7. `freezeAsset/unfreezeAsset` + `getAuditTrail` count + `getStateHash`

Peer proof in second terminal:
```bash
docker logs -f peer0.org1.example.com | grep -i "committed|ENDORSE"
peer channel getinfo -c rwa-channel
peer chaincode query -C rwa-channel -n rwa -c '{"Args":["AssetContract:getAsset","AST-..."]}'
peer chaincode query -C rwa-channel -n rwa -c '{"Args":["AuditContract:getAuditTrail","ASSET","AST-..."]}'
```

## 5. Full API on Fabric (optional)

```bash
CHAIN_GATEWAY_MODE=fabric PORT=5000 node apps/api/src/server.js
API_BASE_URL=http://localhost:5000/api/v1 node tools/smoke/golden-path.mjs
```

`golden-path.mjs` uses only real schemas: `REAL_ESTATE + surveyNumber/propertyId`, `TITLE_DEED/ENCUMBRANCE_CERT/TAX_RECEIPT`, `PASS`, `DISCOUNTED_CASH_FLOW`, `Password@123`.

## 6. What was removed (no fakes)

- `LifecycleContract` OK-stubs -> real state + audit + events
- `AuditContract` empty `[]` -> real range scan + hash
- Missing `VER` creation -> atomic `VER-*` on submit + `openVerificationCase`
- `Date.now()` IDs -> `TxID.slice(-12)` (collision-safe)
- `already exists` only -> full `Duplicate/already registered/attached/pending/tokenized` -> 409 (`fabric-gateway.js:165-183`)
- `mock uniqueFields` hardcoded 4 -> `typeDef.uniqueFields` parity (`mock-gateway.js:781-789`)
- `golden-path` invalid `COMMERCIAL_REAL_ESTATE/methodology/password123/PASSED` -> real payloads
- `ledger-init` `pii` -> `piiHash` (`ledger-init.mjs:43-52`)

No UI changes. Mock gateway retained only for unit tests (`chaincode/rwa/test`, `apps/api/test`, `packages/chain-client/test` all green: 43 + 46 + 2).
