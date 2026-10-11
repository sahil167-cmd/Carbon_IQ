# CarbonIQ Carbon Accounting Engine Audit Report

**Date:** August 27, 2026  
**Auditor:** Senior Carbon Accounting Engineer & AI Systems Architect  
**Target Repository:** CarbonIQ (`apps/core-api`, `packages/db`, `shipmind-ai`)

---

## 1. Executive Summary

A comprehensive architectural audit of CarbonIQ's carbon emission calculation pipeline was conducted to evaluate its readiness for enterprise Scope 1, Scope 2, and Scope 3 carbon accounting.

The audit revealed that while the project possesses a solid Prisma database schema structure and multi-layer validation concepts, the **core document-to-carbon pipeline functions like a prototype**:
- **OCR/Document Extraction:** The OCR provider uses crude binary regex matching over PDF stream strings rather than true Document AI or Vision OCR (e.g., Mistral Vision/OCR API).
- **Fallback / Mock Injections:** Hardcoded default values (`6,200 LITERS DIESEL`) are injected when extraction fails.
- **Factor Resolution & Fallbacks:** Fallback chains automatically force unmatched activities into generic global factors (e.g., `GENERAL`, `GLOBAL`) rather than flagging `INSUFFICIENT_EVIDENCE` or `REQUIRES_REVIEW`.
- **Multi-Line Invoices:** The pipeline evaluates only a single primary quantity per document instead of creating distinct activity records per line item (e.g., Steel + Aluminium + Packaging on one invoice).
- **Plausibility & Sanity Checks:** The system checks for `rawQty === 0` but lacks carbon intensity domain validation (e.g., $kgCO_2e/kg$, $kgCO_2e/kWh$, magnitude decimal shift errors, duplicate invoice fingerprinting).
- **Deterministic Traceability:** Extraction and factor matching lack a canonical audit trail from document page $\to$ bounding box $\to$ normalized activity $\to$ factor version $\to$ formula $\to$ ledger entry.

---

## 2. Comprehensive Pipeline Component Audit

### 2.1 Document Upload & Ingestion Flow
- **Current State:** File upload goes to S3/MinIO via `/api/v1/documents/upload`. Local disk fallbacks exist in `AiCollectorService`.
- **Weaknesses:**
  - File validation checks basic MIME type but lacks file hashing (SHA-256 fingerprinting) to prevent duplicate invoice uploads.
  - Upload triggers a background queue job, but error handling silently degrades to sample local files (`sample_scope2_electricity_bill.pdf`) if S3 retrieval fails.

### 2.2 OCR & Document Vision Pipeline
- **Current Implementation:** `TesseractOcrProvider` in `apps/core-api/src/modules/ai-collector/ocr.provider.ts`.
- **Weaknesses:**
  - Does NOT call real Tesseract or Vision models. Instead, it converts PDF buffer to string and matches regex patterns like `/\(([^()\\]|\\[\s\S])*\)/g` or hex strings `<...>`.
  - Completely fails on scanned images, low-quality invoices, rotated text, or tabular structures.
  - Confidence score is hardcoded to `0.96` whenever raw text is non-empty.

### 2.3 Document Classification & Scope Detection
- **Current Implementation:** `ExtractionGraph.classifyNode` in `apps/core-api/src/modules/ai-collector/extraction-graph.ts`.
- **Weaknesses:**
  - Uses basic uppercase string keyword checks (`KWH` $\to$ `ELECTRICITY`, `STEEL` $\to$ `PURCHASED_GOODS`, `ATMOS` $\to$ `STATIONARY_COMBUSTION`).
  - Does not handle mixed documents containing multiple scopes (e.g., an invoice with fuel combustion + freight transport + electricity charges).

### 2.4 Field Extraction & Intermediate Schema
- **Current Implementation:** `ExtractionGraph.extractNode` and `getExtractedData`.
- **Weaknesses:**
  - Forces all document types into flat key-value pairs (`kwhConsumed`, `quantity`, `weightKg`, `distanceKm`).
  - Lacks a canonical `ActivityRecord` array schema to capture multi-line items.
  - In `AiCollectorService.getExtractedData` (lines 236-250), if `findLatestExtractedData` returns null, a mock payload is returned:
    ```typescript
    fields: {
      quantity: { value: 6200, unit: 'LITERS', confidence: 0.96 },
      fuelType: { value: 'DIESEL', confidence: 0.96 }
    }
    ```

### 2.5 Emission Factor Database & Matching Engine
- **Current Implementation:** `PostgresEmissionFactorProvider` and `emission-factor-seeder.ts`.
- **Weaknesses:**
  - Seeded database contains DEFRA 2024, EPA 2023, GLEC v3, and IPCC AR6 factors.
  - Matching logic in `CarbonEngineService.calculateApprovedRecord` (lines 135-159) loops through fallback lists: `['UPSTREAM_TRANSPORT', 'STATIONARY_COMBUSTION', 'PURCHASED_GOODS']` and `['ROAD_HEAVY_TRUCK', 'STEEL', 'DIESEL', 'GENERAL']`.
  - This unsafe fallback chain can match a steel purchase against a generic diesel factor if the steel factor is missing, violating GHG Protocol domain integrity.

### 2.6 Unit Conversion Engine
- **Current Implementation:** `UnitConverter` in `apps/core-api/src/modules/carbon-engine/unit-converter.ts`.
- **Weaknesses:**
  - Includes conversion factors for Energy, Volume, Mass, Distance, Area, and Transport composite units using `decimal.js`.
  - Fallback logic (line 199) returns an identity factor ($1.0$) with a warning log if a conversion is missing, which can cause unmapped units (e.g., $Gallons \to Liters$) to compute without error.

### 2.7 Deterministic Calculation Engine
- **Current Implementation:** `StrategyRegistry` with individual strategy files (`ELEC_LOCATION`, `WEIGHT_DISTANCE_FACTOR`, `QUANTITY_FACTOR`, etc.).
- **Weaknesses:**
  - Strategy calculations use exact `Decimal` math, which is mathematically sound.
  - However, inputs fed into the strategies are often unverified single numbers extracted from flat JSON fields.
  - Spend-based vs activity-based calculations are not strictly guarded; spend values could be passed as physical quantities.

### 2.8 Validation, Sanity & Plausibility Checks
- **Current Implementation:** `Layer1Validator`, `Layer2Validator`, `Layer3AiValidator`.
- **Weaknesses:**
  - Layer 1 checks required field presence (e.g., `quantity` exists).
  - Layer 2 checks numeric bounds (e.g., `quantity > 0`).
  - Lacks carbon intensity checks ($kgCO_2e / \text{unit}$), magnitude anomaly detection ($100\times$ or $1000\times$ OCR decimal shift errors), and duplicate document fingerprinting.

### 2.9 RAG & Copilot Integration
- **Current Implementation:** `CopilotService`, `IngestionService`, `PGVector`.
- **Weaknesses:**
  - Text from uploaded documents is chunked and embedded into `kb_documents` and `kb_chunks`.
  - Needs strict verification of tenant isolation (`organizationId` filtering on all PGVector queries) and explicit metadata linkage (`sourceDocumentId`, `scope`, `reportingPeriod`).

---

## 3. Audit Findings Summary Table

| Pipeline Component | Existing Implementation | Identified Defect / Weakness | Impact |
| :--- | :--- | :--- | :--- |
| **OCR Pipeline** | Regex binary stream parsing in `ocr.provider.ts` | Fails on scanned PDFs, images, tables; fake confidence scores | High |
| **Extraction Schema** | Flat single-record key-value map | Cannot parse multi-line invoices or mixed scope documents | High |
| **Mock Injections** | Hardcoded `6200 LITERS DIESEL` fallback | Injects dummy numbers into database when extraction fails | Critical |
| **Factor Matching** | Aggressive fallback loop to `GENERAL` / `GLOBAL` | Matches incorrect emission factors when exact match is missing | Critical |
| **Unit Normalization** | Returns $1.0$ identity on missing conversion | Silently computes incorrect emissions without unit conversion | High |
| **Plausibility Checks** | Only checks `quantity > 0` | Allows magnitude errors ($28,500,000\text{ kg}$) and insane carbon intensities | Critical |
| **Multi-Line Invoices** | Single quantity extracted per document | Ignores line items (e.g. Steel + Aluminium on 1 invoice) | High |
| **Duplicate Detection** | Missing document fingerprinting | Re-uploading same invoice creates duplicate ledger records | High |
| **Provenance Trail** | Basic formula string stored | Lacks complete audit chain from page $\to$ field $\to$ factor $\to$ ledger | Medium |

---

## 4. Recommended Replacement Architecture

```
[ REAL DOCUMENT (PDF / Image / Scan) ]
                 │
                 ▼
[ 1. FILE VALIDATION & FINGERPRINTING ] (SHA-256 Hash + Duplicate Invoice Check)
                 │
                 ▼
[ 2. MISTRAL VISION / OCR PIPELINE ] (Text PDF Extraction or Vision OCR with Bounding Boxes)
                 │
                 ▼
[ 3. CANONICAL EXTRACTION ENGINE ] (Extract DocumentRecord & Array of ActivityRecords)
                 │
                 ▼
[ 4. FIELD VALIDATION & SANITY GATE ] (Missing required info -> REQUIRES_REVIEW)
                 │
                 ▼
[ 5. UNIT NORMALIZATION LAYER ] (Strict traceable unit conversions; no identity fallbacks)
                 │
                 ▼
[ 6. DETERMINISTIC FACTOR MATCHING ] (Hierarchical exact match; no generic category jumps)
                 │
                 ▼
[ 7. DETERMINISTIC CARBON CALCULATION ] (Decimal Math: Activity x Factor / GLEC Freight / Dual Grid)
                 │
                 ▼
[ 8. PLAUSIBILITY & CARBON INTENSITY CHECK ] (Detect OCR magnitude errors, insane intensities)
                 │
                 ▼
[ 9. CONFIDENCE & PROVENANCE ENGINE ] (Compute OCR, Extraction, Matching & Overall Confidence)
                 │
                 ▼
[ 10. VERIFIED CARBON LEDGER ] (Only APPROVED records write to official dashboard aggregates)
                 │
                 ▼
[ 11. TENANT-ISOLATED RAG INDEXING ] (PGVector with strict organizationId filter)
```

---

## 5. Execution Plan for Engine Rebuild

1. **Database Schema Enhancements:** Update Prisma schema for multi-line `ActivityRecord`, document fingerprints, provenance records, and factor matching metadata.
2. **Mistral Vision & Document AI OCR Provider:** Implement robust OCR using Mistral Vision API / native PDF text extraction.
3. **Canonical Extraction & Multi-Line Parser:** Build structured JSON extraction supporting multi-line invoices, Scope 1, Scope 2, Scope 3.
4. **Deterministic Factor Matching & Unit Normalization:** Remove generic fallbacks; require strict exact matching or flag `REQUIRES_REVIEW`.
5. **Plausibility, Carbon Intensity & Duplicate Engine:** Add intensity bounds and SHA-256 fingerprint duplicate detection.
6. **Real Document Test Corpus & Golden Dataset:** Build test suite (`tests/fixtures/real_documents/`) with ground-truth JSON files.
7. **Verification & Audit Reports:** Generate `docs/CARBON_ENGINE_IMPLEMENTATION.md` and `docs/CARBON_ENGINE_VALIDATION_REPORT.md`.
