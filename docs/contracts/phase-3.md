
# Phase 3: Verification & Approval (Contract Specification & Completion)

## 1. Overview & Ownership
- **Contract**: `VerificationContract.ts`
- **API Module**:
  - `apps/api/src/modules/verification`
- **Status**: ✅ **COMPLETED & TESTED**

---

## 2. Chaincode Interface (`VerificationContract`)

| Function | Invocable By | Parameters | State Effects / Audit |
|---|---|---|---|
| `recordCheck` | **`VERIFIER` ONLY** | `caseId, checkKey, result, notes, sourceRef` | Records verification result, verifier identity/time, updates case status, emits event and audit log. |
| `decideVerification` | **`VERIFIER` ONLY** | `caseId, decision, reasonCode, reasonText` | Records final decision, updates asset status, emits event and audit log. |
| `getVerificationCase` | Authorized callers | `caseId` | Returns verification case from ledger. |
| `listVerificationCases` | Authorized callers | `None` | Lists verification cases. |

**Supported decisions:** `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`

---

## 3. REST API Endpoints

**### Verification Module (`/api/v1/verification`)**
- `GET /cases` — List verification cases.
- `GET /cases/:caseId` — Get verification case.
- `POST /cases/:caseId/checks` — Record verification check (**VERIFIER ONLY**).
- `POST /cases/:caseId/decide` — Final verification decision (**VERIFIER ONLY**).

---

## 4. Verification Flow

1. Asset submitted for verification.
2. Verification case created.
3. Verifier records required checks.
4. Verifier approves/rejects/requests changes.
5. Asset status updated accordingly.
6. Audit/event records generated.

---

## 5. Verification & Test Suite

- **E2E Test**: Asset creation → evidence attachment → verification submission → 3 verification checks → approval → status verification.
- **Checks Passed**: `TITLE_CHAIN`, `ENCUMBRANCE_CLEAR`, `SURVEY_MATCH`
- **Final Decision**: `APPROVED`
- **Final Asset Status**: `VERIFIED`
- **Transaction Status**: `COMMITTED`
- **Block Number**: `9`

**Total E2E Test Result: ✅ PASSED**