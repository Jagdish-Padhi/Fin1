# Phase 4: Valuation
- **Contract**: `ValuationContract.ts`
- **API Module**: `apps/api/src/modules/valuation`
- **Key Functions**: `proposeValuation`, `approveValuation`

---

# Phase 5: Tokenization & Traceability
- **Contract**: `TokenContract.ts`
- **API Module**: `apps/api/src/modules/tokens`
- **Key Functions**: `mintToken`, `getBalance`, `listHolders`, `getTokenTrace`

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
