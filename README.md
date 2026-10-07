# AsseTrust: Enterprise Real-World Asset (RWA) Tokenization Platform

> **Problem Statement Reference**: PS-01 — Real-World Asset Tokenization Platform  
> **Host Organization**: EkamVistar  
> **Consortium Protocol**: Hyperledger Fabric 2.5 (Channel: `rwa-channel`)  
> **Core Motto**: *Verify the Asset. Trust the Token.*

---

## Executive Overview

A plot of land, a commercial tractor, a logistics fleet, or a ₹40 lakh trade receivable: each carries physical value and rightful ownership. Proving title legitimacy, non-encumbrance, and transfer eligibility has traditionally depended on scattered paperwork, manual clearances, and untrusted silos. Anyone can deploy a smart contract claiming to represent physical real estate; the real challenge is making that claim **independently verifiable, strictly governed, and forensically traceable** from physical asset custody to digital settlement.

**AsseTrust** is an institutional-grade, multi-organization Real-World Asset tokenization platform built to govern assets throughout their complete lifecycle—from initial parametric registration, multi-party verification, and certified valuation, to legally bound tokenization, rule-compliant settlement, and permanent retirement.

---

## Problem Statement Alignment

AsseTrust directly implements all eight core objectives defined in `PS-01`:

| Objective | Requirement | AsseTrust Implementation |
| :--- | :--- | :--- |
| **1. Multiple Asset Types** | Extensible engine supporting diverse asset classes without code redesign. | JSON Schema validator supporting distinct asset archetypes (`REAL_ESTATE`, `AGRICULTURAL_EQUIPMENT`, `COMMERCIAL_VEHICLE`, `INVOICE_RECEIVABLE`) with schema versioning and lifecycle controls. |
| **2. Registration & Verification** | Detailed registration with evidence anchoring and independent audit gating. | Parametric asset registration with off-chain document digests (SHA-256 / IPFS CID), cryptographic Merkle roots, and independent verifier checklists (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`). |
| **3. Certified Valuation** | Asset-specific valuations carrying methodology, validity, and appraiser identity. | Dedicated valuation desk supporting DCF, NAV, and market comps. Valuations are submitted by independent appraisers and certified by compliance officers. |
| **4. Legally-Bound Tokenization** | Digital representation created only for verified assets with full reverse traceability. | Tokens minted only after verification sign-off and certified valuation. Token IDs link backwards to the underlying physical asset record and Merkle document root. Whole and fractional issuance supported. |
| **5. Ownership & Smart Transfer Rules** | Transfer validation against jurisdictional rules, KYC expiry, and concentration limits. | On-chain compliance rule engine evaluates every transfer. Enforces investor accreditation, lockup periods, and concentration limits. Rejected transfers record formal reason codes. |
| **6. Deterministic Lifecycle** | Strict state machine from registration to retirement with tamper-proof attribution. | Governed state transitions (`DRAFT` → `REGISTERED` → `UNDER_VERIFICATION` → `VERIFIED` → `TOKENIZED` → `FROZEN` → `RETIRED`). Every event records actor identity, timestamp, and justification. |
| **7. Roles & Segregation of Duties** | Multi-organization access control where distinct parties see and do different things. | 6 distinct consortium roles mapped to Hyperledger Fabric MSPs. Verifier ≠ Valuer ≠ Approver ≠ Issuer enforced at both smart contract and gateway levels. |
| **8. Consortium Audit & Public Verification** | Comprehensive history inspection and unauthenticated public verification. | Read-only ledger explorer for auditors with private data inspection. Public verification portal allows anyone with a Token ID to inspect passport legitimacy with zero login required. |

---

## Consortium Governance & Segregation of Duties (SoD)

AsseTrust enforces strict Segregation of Duties across 6 participating organizations on `rwa-channel`:

```
+---------------------------------------------------------------------------------------+
|                                     rwa-channel                                       |
+---------------------------------------------------------------------------------------+
        |                    |                     |                     |
  [IssuerMSP]         [VerifierMSP]         [ComplianceMSP]        [InvestorMSP]
  Asset Originator    Independent Auditor    Regulator / Legal     Accredited Buyer
  - Registers Asset   - Title Search Checks  - KYC Approvals       - Token Holdings
  - Attaches Evidence - Physical Audits      - Co-Signs Mints      - Secondary Trading
  - Proposes Transfer - Decision Verdict     - Emergency Freeze    - Portfolio View
        |                    |                     |                     |
        +--------------------+---------------------+---------------------+
                             |                     |
                       [AuditorMSP]          [EkamVistarMSP]
                       External Oversight    Platform Operator
                       - Read-Only History   - Node Config & CA
                       - Unredacted Audit    - Asset Type Engine
                       - Block Explorer      - (No asset/token actions)
```

### Role Permission Matrix

| Role | Organization MSP | Permitted Operations | Prohibited Operations (SoD) |
| :--- | :--- | :--- | :--- |
| **`ADMINISTRATOR`** | `EkamVistarMSP` | User provisioning, org onboarding, asset type schema registry, system health. | Cannot verify assets, appraise valuations, approve KYC, or move tokens. |
| **`ISSUER`** | `IssuerMSP` | Register assets, upload evidence documents, propose transfers of owned tokens. | Cannot verify own assets, perform valuations, or approve token mints. |
| **`VERIFIER`** | `VerifierMSP` | Conduct legal title checks, record on-site inspection findings, approve/reject cases. | Cannot register assets, value assets, or initiate transfers. |
| **`VALUER`** | `VerifierMSP` | Submit certified financial appraisals (DCF, NAV), define validity periods. | Cannot approve valuations, mint tokens, or alter title records. |
| **`COMPLIANCE`** | `ComplianceMSP` | Approve participant KYC, certify valuations, co-sign token minting, execute freeze/unfreeze/retire. | Cannot originate assets or alter independent verification records. |
| **`INVESTOR`** | `InvestorMSP` | View eligible token offerings, manage portfolio holdings, execute secondary transfers. | Restricted commercial details and PII are cryptographically redacted. |
| **`AUDITOR`** | `AuditorMSP` | Read-only access across the consortium, inspect private data collections, export audit reports. | Read-only across all modules. Audit inspection events are logged. |

---

## Technical Architecture

AsseTrust utilizes a modular monorepo structure designed for enterprise security and auditability:

```
Fin1/
├── apps/
│   ├── api/                     # Express REST API Gateway & Chain Orchestrator
│   │   ├── src/
│   │   │   ├── core/            # Middleware (JWT, RBAC, Rate Limiting, Audit Logger)
│   │   │   └── modules/         # Domain Modules (assets, verification, valuation, tokens, etc.)
│   └── web/                     # React 18 Enterprise Single-Page Application (Vite + TailwindCSS)
│       └── src/
│           ├── modules/         # Role-Guarded Modules (verification desk, tokens, transfers, etc.)
│           └── shared/          # Central Design System, Auth Context, Brand Assets
├── packages/
│   ├── contracts/               # Hyperledger Fabric Chaincode Contracts & State Models
│   ├── chain-client/            # Fabric Gateway SDK & Resilient Mock Gateway for Local Dev
│   └── config/                  # Shared linting, formatting, and constants
└── network/                     # Fabric 2.5 Crypto Config, MSP Artifacts, and Scripts
```

### Technology Stack

- **Ledger Layer**: Hyperledger Fabric v2.5 (`fabric-contract-api`, Node.js Smart Contracts, Private Data Collections).
- **Backend API**: Node.js v20+ / Express with Zod validation, JWT authentication, and structured audit logging.
- **Frontend Console**: React 18, Vite, Vanilla CSS + Tailwind utility tokens, Lucide enterprise iconography.
- **Design Palette (Enterprise Trust)**:
  - Background: `#F8FAFC` (Institutional Slate)
  - Primary: `#0F2A43` (Deep Navy)
  - Secondary: `#1F5A7A` (Muted Steel Blue)
  - Accent: `#0F766E` (Deep Teal)
  - Border: `#D8E0E8` (Subtle Cool Gray)
  - Text: `#17202A` (Near-Black)

---

## Core Capabilities & Workflows

### 1. Extensible Asset Type Engine
Asset types are defined dynamically as versioned JSON schemas stored directly on ledger state. Administrators can define new asset types with required attributes, unique constraints, and mandatory evidence checklists without redeploying chaincode or altering database tables.
- **Anti-Fraud Duplicate Prevention**: Prevents double-financing by hashing unique schema identifiers (e.g., VIN for vehicles, Survey Number for land parcels).

### 2. Evidence Verification & Gating
Asset originators upload evidence documents whose cryptographic SHA-256 hashes are anchored in a Merkle tree on-chain. Independent verifiers perform structured due diligence:
- Legal Title & Encumbrance Search
- Physical On-Site Inspection
- Regulatory Jurisdiction Filing
- Commercial Insurance Verification  
*Assets cannot proceed to valuation or tokenization without explicit verifier approval.*

### 3. Certified Valuation & Pricing Desk
Appraisers record formal valuations with specified methodology, financial model URIs (IPFS), currency denomination, and validity expiration. Under strict segregation of duties, the Compliance Officer reviews and certifies the valuation before minting is unlocked.

### 4. Smart Settlement & Transfer Rules Engine
Every secondary transfer proposal is evaluated against smart contract compliance rules before atomic execution:
- Sender and recipient identity and suspension check
- Active KYC validity and expiry dates
- Investor classification qualification (e.g., Retail vs. Institutional caps)
- Per-participant holding caps (basis points of total token supply)
- Transfer volume thresholds (paise/currency limits)

### 5. Deterministic Lifecycle Management
Compliance officers maintain emergency governance capabilities:
- **Emergency Freeze**: Halts token trading and transfers upon court order or fraud suspicion.
- **Reinstatement**: Lifts freeze restrictions after regulatory resolution.
- **Terminal Retirement**: Permanently burns tokens upon underlying asset liquidation or principal repayment.

### 6. Public Asset Passport (Zero Login Required)
Anyone can verify an asset by scanning a QR sticker or entering a Token ID at `/public-verify`. The passport displays:
- Verification badge with timestamp and verifier identity
- Cryptographic Merkle document proof root
- Underlying physical asset specifications
- Total token supply and fractional breakdown  
*No personal data, PII, or commercial secrets are exposed on the public verification view.*

---

## Local Development & Setup

### Prerequisites
- Node.js v20.x or higher
- `pnpm` v10.x or higher (`npm install -g pnpm`)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Jagdish-Padhi/Fin1.git
   cd Fin1
   ```

2. Install all dependencies across the monorepo:
   ```bash
   pnpm install
   ```

### Running the Services

Start both the backend API and frontend console concurrently:
```bash
# Start backend API (Port 5000) and Web Console (Port 5173) together:
pnpm run dev:all
```

Or start services individually in separate terminals:

```bash
# Terminal 1: Backend API
pnpm run dev:api

# Terminal 2: Web Console
pnpm run dev
```

- **Enterprise Console**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`
- **API Health Check**: `http://localhost:5000/healthz`

---

## Testing & Quality Assurance

AsseTrust includes end-to-end integration tests validating role segregation, asset lifecycle transitions, evidence validation, and transfer rules:

```bash
# Run all unit and integration test suites:
pnpm -r test

# Validate production build:
pnpm -r build
```

---

## Seeded Demo Identities

For evaluation and demonstration, 6 pre-configured institutional accounts are available with one-click selection in the Sign-In modal:

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **`ADMINISTRATOR`** | `admin@assetrust.io` | `Password@123` | EkamVistar Operator |
| **`ISSUER`** | `issuer@originator.com` | `Password@123` | Asset Origination Desk |
| **`VERIFIER`** | `verifier@auditfirm.com` | `Password@123` | TÜV / SGS Quality Audits |
| **`VALUER`** | `valuer@valuationpartners.com` | `Password@123` | Certified Appraisal Partners |
| **`COMPLIANCE`** | `compliance@regulatory.gov.in` | `Password@123` | Regulatory Authority |
| **`INVESTOR`** | `investor@capitalfund.com` | `Password@123` | Accredited Capital Fund |
| **`AUDITOR`** | `auditor@kpmg-audit.com` | `Password@123` | Consortium Oversight |

---

## License

This project is licensed under the Apache License 2.0. Developed for the EkamVistar Problem Statement PS-01.