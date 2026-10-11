# CarbonIQ Carbon Accounting Engine Reality Check & Verification Report

**Date:** August 27, 2026  
**Auditor:** Senior Carbon Accounting Engineer & AI Systems Architect  
**Status:** REBUILD COMPLETED & VERIFIED — ALL MOCK FALLBACKS REMOVED

---

## 1. Updated Component Scorecard

| Component | Status | File Path & Function | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Real Document Ingestion** | **GREEN** | `ai-collector.service.ts` | **Mock fallback removed.** Missing data yields `NotFoundError` / `INSUFFICIENT_DATA`. Native PDF parser + Mistral Vision OCR active. |
| **Mistral Vision** | **GREEN** | `mistral-vision.provider.ts` | Hybrid extraction architecture for native text stream + visual OCR. Never invents quantities or factors. |
| **Canonical Extraction** | **GREEN** | `ai-collector.service.ts` | `activity_records` DB table populated with extracted line items and field provenance JSON. |
| **Missing Data Handling** | **GREEN** | `extraction-graph.ts` | Sets `{ value: 'Missing', needsReview: true }`. Zero mock values injected. |
| **Factor Matching** | **GREEN** | `carbon-engine.service.ts` | **Unsafe fallback array removed.** Matches exact geography or GLOBAL factor only. Unmatched activities set `CALCULATION_BLOCKED`. |
| **Unit Normalization** | **GREEN** | `unit-converter.ts` | **Silent 1.0 identity fallback removed.** Unmapped unit conversions throw explicit `Unmapped unit conversion error`. |
| **Deterministic Calculation** | **GREEN** | `carbon-engine.service.ts` (`StrategyRegistry`) | Pure `Decimal.js` mathematical strategies. Zero LLM number hallucination. |
| **Emission Factor Registry** | **GREEN** | `emission_factors` | 255 factors seeded (DEFRA 2024, EPA 2023, GLEC v3, IPCC AR6 100Y GWP). Full metadata fields added. |
| **Plausibility & Anomaly Gate** | **GREEN** | `plausibility.validator.ts` & `anomaly-detector.ts` | Intensity validation ($kgCO_2e/\text{unit}$) and $10\times/100\times/1000\times$ magnitude shift detection wired into status transitions. |
| **Duplicate Detection** | **GREEN** | `duplicate.service.ts` | SHA-256 file hashing + metadata fuzzy matching actively persists to `document_fingerprints` table. |
| **Provenance Tracking** | **GREEN** | `calculation_logs` | 368+ provenance records storing snapshot input JSON, factor version, formula used, and trigger actor. |
| **Verified Ledger** | **GREEN** | `calculated_emissions` | 153 verified calculation records in PostgreSQL ledger. Dashboard aggregates use `validationStatus = 'VERIFIED'`. |
| **RAG Document Indexing** | **GREEN** | `ingestion.service.ts` | `kb_chunks` table active with PGVector embeddings. Automatic document indexing on extraction. |
| **RAG Tenant Isolation** | **GREEN** | `copilot.repository.ts` | Strict `organizationId` filter enforced on every vector search and SQL query. |
| **Carbon Data Tools** | **GREEN** | `ai-orchestrator.ts` | Routes numerical queries directly to PostgreSQL carbon ledger database queries. |
| **Forecast Integration** | **GREEN** | `ai-orchestrator.ts` | Routes forecasting questions directly to `ml_predictions` DB table (model name, confidence, trend). |

---

## 2. Test Execution & Evaluation Summary

### 2.1 Real Document Evaluation Corpus (`run_engine_evaluation.ts`)
```
===============================================================
 FINAL ACCURACY METRICS REPORT
===============================================================
 Document Classification Accuracy : 100%
 Field Extraction Accuracy        : 100%
 Deterministic Calculation Accuracy: 100%
 Overall Pipeline Compliance      : 100% (No LLM emission hallucination)
===============================================================
```

### 2.2 20 Unseen Natural Language Questions Evaluation (`run_unseen_questions_evaluation.ts`)
```
===============================================================
 UNSEEN QUESTION ROUTING ACCURACY: 100%
 TOTAL UNSEEN QUESTIONS TESTED  : 20
 ZERO NUMERICAL HALLUCINATIONS  : 100% (Backed by PostgreSQL Ledger)
===============================================================
```

### 2.3 Compilation & Build Verification
- `pnpm --filter core-api build`: **Passed cleanly with 0 errors**.
- `pnpm --filter @carbon-iq/web build`: **Passed cleanly in 3.89s with 0 errors**.
