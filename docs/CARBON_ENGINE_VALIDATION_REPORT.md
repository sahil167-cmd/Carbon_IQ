# CarbonIQ Core Carbon Engine Validation Report

**Date:** August 27, 2026  
**Status:** VALIDATED — ALL TEST CASES PASSED  
**Test Suite:** `apps/core-api/src/tests/run_engine_evaluation.ts`

---

## 1. Golden Dataset Evaluation Summary

The rebuilt CarbonIQ document-to-carbon accounting pipeline was evaluated against a real-document evaluation corpus covering Scope 1, Scope 2, and Scope 3 document classes.

```
===============================================================
 FINAL ACCURACY METRICS REPORT
===============================================================
 Document Classification Accuracy : 100%
 Field Extraction Accuracy        : 100%
 Deterministic Calculation Accuracy: 100%
 Overall Pipeline Compliance      : 100% (Zero LLM emission hallucination)
===============================================================
```

---

## 2. Test Cases & Document Results

| Document Filename | Scope | Class | Extracted Qty | Normalized Qty | Emission Factor | Expected CO₂e | Computed CO₂e | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `scope2_utility_electric_bill_2026.pdf` | Scope 2 | Electricity | 12,500 kWh | 12,500 kWh | 0.8200 kg/kWh | 10,250.00 kg | 10,250.00 kg | **PASS** |
| `scope1_stationery_diesel_generator.pdf` | Scope 1 | Fuel Stationary | 850 Liters | 850 Liters | 2.6800 kg/L | 2,278.00 kg | 2,278.00 kg | **PASS** |
| `scope3_purchased_steel_beams.pdf` | Scope 3 | Purchased Goods | 28,500 kg | 28.50 Tonnes | 1.8300 kg/kg | 52,155.00 kg | 52,155.00 kg | **PASS** |
| `scope3_intermodal_ocean_freight.pdf` | Scope 3 | Freight Transport | 5,400 Tonne-Km | 5,400 Tonne-Km | 0.0917 kg/t-km | 495.18 kg | 495.18 kg | **PASS** |

---

## 3. Core Requirements Compliance Audit

1. **Deterministic Calculations Only:**
   - **Status:** **PASSED**. All emission numbers are calculated via `Decimal.js` strategy execution. The LLM extracts evidence only and never generates calculated emission figures.
2. **No Invented Missing Data:**
   - **Status:** **PASSED**. Unmapped or missing required fields return `INSUFFICIENT_DATA` or `NEEDS_REVIEW`.
3. **No Unsafe Factor Fallbacks:**
   - **Status:** **PASSED**. Generic `GENERAL`/`GLOBAL` category fallbacks have been removed. Unmatched activities yield `INSUFFICIENT_EVIDENCE`.
4. **Duplicate Document Fingerprinting:**
   - **Status:** **PASSED**. Implemented SHA-256 file hashing + metadata fuzzy matching (`DocumentFingerprint`).
5. **Multi-Namespace RAG Orchestrator:**
   - **Status:** **PASSED**. Queries routed to Ledger DB tools (numerical), Org Docs (evidence), Global Standards (methodology), or ML Forecast API (predictions) with strict `organizationId` tenant isolation.

---

## 4. Verification Command

To run the engine evaluation report locally:

```bash
pnpm --filter core-api exec ts-node src/tests/run_engine_evaluation.ts
```
