# CarbonIQ — Hybrid AI Copilot & Production RAG Architecture

## 1. Executive Summary

This document provides a comprehensive technical log and architectural overview of the **CarbonIQ Hybrid Sustainability Copilot & RAG Pipeline**. It details the transition from the legacy prototype (which suffered from hardcoded vendor rules, fake text-matching vector searches, and brittle regexes) to a **production-grade, multi-source grounded intelligence engine**.

---

## 2. Root Cause Analysis of Legacy Issues

| # | Component | Legacy Problem | Root Cause | Impact |
|---|---|---|---|---|
| 1 | **Document Indexer** | Fabricated vendor data | `if 'tata' in filename:` branches injected hardcoded numbers instead of parsing PDFs. | RAG returned fake numbers not present in uploaded documents. |
| 2 | **Vector Search** | Fake semantic search | Used SQL `ILIKE '%term%'` with hardcoded `similarity: 0.95` without querying `pgvector`. | Semantic search failed; only exact keyword matches worked. |
| 3 | **PDF Parser** | Missing PDF extractor | `pypdf` was not installed; extraction silently fell back to binary regex matching that lost meter IDs/tables. | Complex documents (e.g. ConEdison, Tata Power) were unreadable. |
| 4 | **Intent Router** | Over-fitted regex | 400+ lines of brittle regex patterns; natural-language variations triggered generic `OUT_OF_DOMAIN` errors. | Natural questions (e.g., *"give me its meter grid info"*) were rejected. |
| 5 | **Ingestion Flow** | Manual CLI requirement | Documentation instructed users to run manual Python scripts for indexing. | Uploaded documents were not immediately queryable. |
| 6 | **Prompt Security** | Prompt Injection vulnerability | Raw JSON and text were dumped into the LLM prompt without boundary isolation. | Vulnerable to document-based prompt overrides. |

---

## 3. Production Hybrid Architecture (The Tri-Pillar Engine)

```
                              ┌─────────────────────────────────┐
                              │          User Question          │
                              └────────────────┬────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  LangGraph Workflow Controller  │
                              │       (apps/ml-service)         │
                              └────────────────┬────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  LLM-First Intent Classifier    │
                              │  & Conversational Context Node  │
                              └────────────────┬────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
  │   PILLAR 1: SQL LEDGER  │     │   PILLAR 2: ML ENGINE   │     │  PILLAR 3: PGVECTOR RAG │
  │   PostgreSQL Verified   │     │  Live XGBoost Forecast  │     │  pgvector Hybrid Search │
  │   Historical Actuals    │     │  Confidence & Anomalies │     │  Semantic + Lexical     │
  └────────────┬────────────┘     └────────────┬────────────┘     └────────────┬────────────┘
               │                               │                               │
               └───────────────────────────────┼───────────────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │   Guardrail & Unit Normalizer   │
                              │  (1 tonne = 1,000 kg CO2e)      │
                              └────────────────┬────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  Mistral Synthesis & Grounding  │
                              │  <retrieved_document_evidence>  │
                              │  Zero-Hallucination Citations   │
                              └────────────────┬────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  Grounded Copilot UI Response   │
                              │  Answer + Traceable Citations   │
                              └─────────────────────────────────┘
```

### Pillar 1: Verified PostgreSQL Accounting Ledger
- **Role**: Single source of truth for verified emissions data.
- **Data Extracted**: Grand totals, Scope 1/2/3 breakdown, monthly timeline, category distributions, supplier footprints, and period comparisons.
- **Guarantees**: Exact arithmetic calculated in PostgreSQL; the LLM is prohibited from calculating or modifying ledger actuals.

### Pillar 2: Live ML Forecasting & Anomaly Engine
- **Role**: Source of truth for future projections and anomaly detection.
- **Data Extracted**: 6-month operational projections, 80%/95% confidence intervals, model methodology (XGBoost/Tournament), and scope drivers.
- **Guarantees**: Identical predictions between RAG and the platform's analytics dashboard.

### Pillar 3: pgvector Semantic + Lexical Hybrid Document Retrieval
- **Role**: Source of truth for uploaded invoices, contracts, utility bills, and standards.
- **Data Extracted**: Meter IDs, grid sub-regions, tariff periods, fuel delivery amounts, bills of lading, and guarantee-of-origin certificates.
- **Guarantees**: Real 1536-dimensional normalized embeddings with cosine distance search (`kc.embedding <=> %s::vector`) + strict multi-tenant isolation (`organizationId = %s`).

---

## 4. Codebase Modifications (File-by-File Breakdown)

### 1. `apps/ml-service/rag_graph/document_indexer.py`
- **Removed**: All static `if 'tata' in filename:` or vendor-specific hardcoding.
- **Added**: `pypdf` integration to extract full text streams, tables, meter registers, and billing breakdowns from physical PDFs.
- **Added**: Dynamic structured summary generation from `extracted_data.fieldsJson` and `calculated_emissions`.
- **Added**: Normalized 1536-dimensional vector embedding generation with PostgreSQL `ON CONFLICT DO UPDATE` idempotency.

### 2. `apps/ml-service/rag_graph/nodes/vector_node.py`
- **Replaced**: SQL `ILIKE` pseudo-search replaced with true pgvector cosine similarity search (`1.0 - (kc.embedding <=> %s::vector)`).
- **Added**: Multi-stage hybrid retrieval (pgvector semantic search + lexical keyword search + structured OCR fallback).
- **Added**: Multi-tenant isolation filter (`WHERE (kc."organizationId" = %s OR kc."organizationId" IS NULL)`).

### 3. `apps/ml-service/rag_graph/nodes/intent_node.py`
- **Replaced**: 400+ lines of brittle regexes replaced with a dynamic Mistral LLM-first intent classification schema.
- **Added**: Pronoun & follow-up resolution (`resolve_conversational_references`) so queries like *"Why is it so high?"* resolve to preceding context.
- **Added**: Correct classification of operational metrics (meters, grid regions, tariffs, bills of lading) as valid `DOCUMENT_KNOWLEDGE` queries rather than out-of-domain.

### 4. `apps/ml-service/rag_graph/nodes/synthesis_node.py`
- **Added**: Prompt injection defense wrapping document context inside `<retrieved_document_evidence>` XML tags with strict passive data enforcement.
- **Added**: Support for actionable decarbonization roadmaps (fleet electrification, modal shift, renewable PPAs, energy efficiency).
- **Added**: Strict citation generation linking answers directly to verified database records, ML forecast models, or uploaded filenames with page numbers.

### 5. `apps/ml-service/rag_graph/graph.py`
- **Upgraded**: Parallel evidence retrieval orchestrator (`retrieve_all_tools`) that dynamically executes SQL, ML Forecast, and Vector tools without skipping document evidence.

### 6. `apps/core-api/src/modules/ai-collector/ai-collector.service.ts`
- **Automated**: Background RAG ingestion triggered automatically upon document upload via `IngestionService.ingestDocument` without requiring manual CLI intervention.

---

## 5. Automated Verification Test Suite Matrix

Evaluated via `scratch/test_rag_pipeline_comprehensive.py` across 15 distinct test categories:

| # | Test Category | Evaluated Query | System Response & Citations | Result |
|---|---|---|---|---|
| 1 | **Total Emissions** | *"What are my current emissions?"* | 206.52 t CO₂e (Scope 1: 0%, Scope 2: 65.71%, Scope 3: 34.29%) from verified ledger. | **PASSED** |
| 2 | **Category Breakdown** | *"Which emission category contributes the most?"* | Purchased Electricity (135.71 t CO₂e) identified with category breakdown table. | **PASSED** |
| 3 | **Scope 3 Drivers** | *"Why did my Scope 3 emissions increase?"* | Upstream Transport (769,625 tonne-km / 70.81 t CO₂e) isolated as driver. | **PASSED** |
| 4 | **Document Content** | *"What does my uploaded electricity document say?"* | Exact kWh and invoice numbers extracted from indexed PDF. | **PASSED** |
| 5 | **Vendor Entity Extraction** | *"give me its meter grid info of CONEDISON COMMERCIAL ENERGY company"* | US_GRID (eGRID NYUP), REG-PEAK-01 (45,000 kWh), REG-OFFPEAK-02 (32,500 kWh). | **PASSED** |
| 6 | **ML Forecast** | *"What will my emissions be next month?"* | Canonical projection (10,403.55 kg CO₂e) with Scope 1/2/3 breakdown. | **PASSED** |
| 7 | **Forecast Drivers** | *"Why is the forecast increasing?"* | Model driver attribution explaining freight & logistics variations. | **PASSED** |
| 8 | **Anomaly Detection** | *"Is the recent spike an anomaly?"* | Diagnosed with model reliability metric and baseline verification. | **PASSED** |
| 9 | **Period Comparison** | *"Compare my July and August emissions."* | Chronological side-by-side comparison table with percentage deltas. | **PASSED** |
| 10 | **Standards Definition** | *"What does Scope 3 Category 4 mean?"* | Definition of Upstream Transportation & Distribution per GHG Protocol. | **PASSED** |
| 11 | **Decarbonization** | *"How can I reduce my transportation emissions?"* | Structured mitigation roadmap (fleet electrification, modal shift, low-carbon 3PLs). | **PASSED** |
| 12 | **Alternative Wording** | *"Give me a breakdown of all our purchased power..."* | Grid electricity breakdown mapped accurately from natural phrasing. | **PASSED** |
| 13 | **Out-of-Domain Safety** | *"Who won yesterday's cricket match?"* | Graceful refusal defining CarbonIQ domain scope. | **PASSED** |
| 14 | **Missing Evidence** | *"Why did diesel emissions increase in March 2020?"* | Factual reporting that diesel emissions are 0.0 kg without hallucination. | **PASSED** |
| 15 | **Contextual Follow-up** | *"Why is it so high?"* | Pronoun resolved to preceding Scope 3 freight context. | **PASSED** |

**Evaluation Score: 15 / 15 Tests Passed (100.0%)**

---

## 6. Operational Workflow (Zero Manual Steps)

1. **User Uploads Document** (PDF, Invoice, Utility Bill, BOL, Report) in the Documents section.
2. **Vision/OCR Pipeline** extracts structured text, line items, and meter registers.
3. **`ai-collector.service.ts`** triggers `IngestionService.ingestDocument` in the background.
4. **`document_indexer`** chunks text and computes `pgvector` embeddings.
5. **Copilot Panel** answers questions across all indexed documents immediately.
