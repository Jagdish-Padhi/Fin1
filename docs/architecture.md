# Architecture Reference — EkamVistar RWA Platform

## Overview
EkamVistar is an enterprise-grade Real-World Asset (RWA) tokenization and digital passport governance platform built on Hyperledger Fabric 2.5 LTS.

## Architectural Principles
1. **Vertical Slice Modular Monolith**:
   The backend avoids flat, scattered MVC structures (`controllers/`, `routes/`, `models/`) and instead enforces self-contained domain modules (`modules/auth`, `modules/participants`, `modules/assets`, `modules/evidence`, `modules/verification`, `modules/valuation`, `modules/tokens`, `modules/transfers`, `modules/lifecycle`, `modules/audit`).
2. **Blockchain as Truth, Database as Projection**:
   PostgreSQL serves as a high-performance rebuildable read projection. The Fabric ledger and private data collections form the canonical source of truth.
3. **Cryptographic Evidence Envelope**:
   Physical documentation (Title deeds, RC books, inspection photos) is stored off-chain in encrypted MinIO object storage with AES-256-GCM envelope encryption. Only the computed SHA-256 and Merkle leaves are anchored on-chain.
4. **Segregation of Duties (SoD)**:
   Chaincode enforces strict organizational and certificate-attribute boundaries:
   - Originators / Issuers cannot verify or value their own assets.
   - Verifiers cannot mint tokens.
   - Compliance officers cannot register assets.
5. **Deterministic Rejected Transfers**:
   Business rule violations do not abort transactions with 500 errors; instead, transactions succeed on-chain with status `REJECTED` and immutable `rejectionReasons` to provide complete audibility.
