# Carbon Engine — Phase 2 Gap Analysis

This document evaluates the existing "As-Is" implementation of the Carbon Accounting Engine against the PRD, TRD, FWS, and five non-negotiable architectural principles.

---

## 1. Compliance Checklist & Gap Verification

| Requirement / Principle | Status | Direct Reason | Severity |
|---|---|---|---|
| **1. Zero AI/LLM Boundaries** | **Compliant** | ESLint `no-restricted-imports` actively blocks any AI client libraries from being imported in `src/modules/carbon-engine/**`. | None |
| **2. Deterministic Calculations** | **Non-Compliant** | All calculations use native JavaScript floating-point numbers (`number`) and `.toFixed()` formatting, violating the requirement for arbitrary/fixed-precision decimal arithmetic. | **P0** |
| **3. Extensibility & No Hardcoding** | **Non-Compliant** | Calculation strategies are selected via a hardcoded `if/else` ladder in `ShipmentCalcEngine.calculate()`. Subcategory mapping is hardcoded via string parsing in `CarbonEngineService`. Mappings cannot be extended without code modifications. | **P0** |
| **4. Unit Conversion Data-Driven** | **Non-Compliant** | All unit conversions are performed via a hardcoded in-memory `conversionMap` in `unit-converter.ts`. The `UnitConversion` table in the database is completely ignored/unused. | **P1** |
| **5. Ambiguous / Missing Factors** | **Partially Compliant** | The engine checks for ambiguity and throws `AmbiguousFactorError`, but it guesses by falling back to `subCategory: 'DIESEL'` when mapping fails, rather than loudly blocking. | **P1** |
| **6. Auditability & Immutable Logs** | **Partially Compliant** | `calculation_logs` are correctly written, but the engine uses a hardcoded `formulaVersion: 'v1.0-GLEC-GHG'` and updates (`UPDATE`) the active `calculated_emissions` row instead of tracking recalculation version history in the main output table. | **P1** |
| **7. Multi-Tenancy Enforcement** | **Partially Compliant** | `CarbonEngineRepository` extends `TenantScopedRepository`, but critical queries such as `findCalculatedEmissionsByDocumentId` and transaction lookups bypass the `scopedWhere` abstraction, allowing potential cross-tenant leakage. | **P1** |
| **8. Locked Period Freezing** | **Partially Compliant** | The service blocks calculations for finalized periods, but it checks for `ReportingPeriodStatus.FINALIZED` instead of checking both `LOCKED` and `FINALIZED` (FWS specifies `LOCKED` periods are frozen). | **P1** |
| **9. Re-runnable Recalculation** | **Partially Compliant** | Recalculation runs safely, but no HTTP route is exposed for `/recalculate` in `carbon-engine.routes.ts`. | **P2** |
| **10. Aggregation Invariants** | **Partially Compliant** | `EmissionsAggregate` rollup updates totals via native float math addition (`+=`), which results in accumulated rounding drift in the database totals. | **P1** |

---

## 2. Gap Analysis Table

| Requirement Gap | Current State | Affected Files / Code Symbols | Impact on Downstream Consumers | Severity |
|---|---|---|---|---|
| **Native Float Arithmetic** | Calculations use native JS binary float numbers. | `shipment-calc.engine.ts` (L35, L55, L59, L85, L86, L104) | Inaccurate dashboard rollups and reporting due to IEEE 754 precision drift. | **P0** |
| **Hardcoded strategies** | Hardcoded category-to-strategy selection. | `shipment-calc.engine.ts` | Adding a new category/calculation method requires code rewrite. | **P0** |
| **Hardcoded subcategory mapping** | Complex nested if/else statements map category/country to subcategories. | `carbon-engine.service.ts` (L48-L63) | Restricts mapping flexibility; new activity types cannot be added dynamically. | **P0** |
| **Hardcoded Unit Conversions** | DB `UnitConversion` table exists but is unused; hardcoded mapping is used instead. | `unit-converter.ts` | Cannot add or tune unit conversions dynamically; database state does not match behavior. | **P1** |
| **Silently Guessing Fallbacks** | Default fallback values (e.g. quantity 4500, subcategory 'DIESEL') are used when data is missing. | `shipment-calc.engine.ts` (L31), `carbon-engine.service.ts` (L74-L80) | Compromises legal and auditable compliance validity. | **P1** |
| **Missing Scoped Validation** | Key select and transaction operations bypass tenant scope. | `carbon-engine.repository.ts` (L17-L26, L63-L65) | Potential multi-tenant data exposure. | **P1** |
| **LOCKED Period Bypass** | Check only checks for `FINALIZED` status. | `carbon-engine.service.ts` (L38) | Locked reporting periods can be recalculation-corrupted. | **P1** |
| **Rounding Drift in Aggregates** | Total calculations sum float fields dynamically. | `carbon-engine.repository.ts` (L132-L148) | Mismatch between raw document total sum and pre-aggregated dashboard stats. | **P1** |

---

## 3. Downstream Impact Summary

1. **Dashboard & Analytics**: Stale or drifted aggregate figures due to native float accumulations in `EmissionsAggregate`.
2. **Review & Approval Gate**: Enqueues calculation jobs, but if mapping or factor lookup fails, it blocks calculations without sending notifications (Decoupled events/notifications are missing).
3. **Forecasting / Compliance / RAG**: (Pending future implementation) Would be impacted by potential data leaks (multi-tenancy gap) and numerical inconsistencies.
