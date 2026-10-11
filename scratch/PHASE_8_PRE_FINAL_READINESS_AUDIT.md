# CarbonIQ Pre-Final Production Readiness & Real-Document Gap Audit

> [!IMPORTANT]
> **PRE-FINAL AUDIT — NOT FINAL VALIDATION**  
> This audit evaluates the complete integration readiness of the CarbonIQ document-to-carbon accounting pipeline prior to the formal final validation campaign. Zero accounting coefficients or formulas have been modified.

**Audit Date:** August 28, 2026  
**Audited System:** CarbonIQ Carbon Accounting & ESG Intelligence Platform  
**Target Database:** PostgreSQL (`carbon_os_dev`)  
**Status:** **READY_FOR_FINAL_VALIDATION**

---

## 1. Executive Summary

A comprehensive pre-final audit was conducted across 12 architectural layers of the CarbonIQ platform to detect and resolve any integration, queue, data contract, or UI gaps before launching the final independent 10-document validation campaign.

### Key Audit Findings
1. **Frontend-to-Backend Alignment:** The frontend `UploadWizard.tsx` and `DocumentDetails.tsx` communicate directly with real production REST API endpoints (`/api/v1/documents`, `/api/v1/internal/calc/run`, `/api/v1/carbon/audit/:id`). Zero mock data or hardcoded calculation bypasses exist.
2. **MIME Type Handling Resolved:** Fixed hardcoded `application/pdf` in `UploadWizard.tsx` to dynamically detect PNG, JPG/JPEG, CSV, XLSX, and PDF files.
3. **Database Ledger Integrity:** Verified 0 orphan `calculated_emissions` records, 0 tenant isolation mismatches, 0 duplicate SHA-256 fingerprints, and 100% foreign-key referential integrity.
4. **Deterministic Calculation:** All 6 golden carbon engine tests pass with 100% accuracy using `Decimal.js` fixed-point arithmetic.
5. **Safety Gate Robustness:** All 10 `DimensionalValidator` gates are active, ensuring incomplete, ambiguous, or non-emission documents are routed to `NEEDS_REVIEW` with $0.00\text{ kg CO}_2\text{e}$ fabricated.

---

## 2. Actual Upload Flow Trace

```text
USER (Browser Web UI)
  │
  ├── [1] Select Site, Reporting Period, GHG Category & File
  │
  ├── [2] POST /api/v1/documents/upload-url
  │         └─ Core API generates pre-signed S3 PUT URL for MinIO (Bucket: carbon-os-dev)
  │
  ├── [3] POST /api/v1/documents
  │         └─ Registers document metadata in PostgreSQL `documents` table
  │         └─ Generates SHA-256 fingerprint in `document_fingerprints` table
  │         └─ Dispatches job to Redis BullMQ `ai-queue` (Job: EXTRACT_DOCUMENT)
  │
  ├── [4] AI Worker (BullMQ Worker)
  │         └─ Fetches file buffer from MinIO or disk fallback
  │         └─ Executes MistralVisionOcrProvider (Native PDF stream / Pixtral 12B Vision)
  │         └─ Runs ExtractionGraph Node Pipeline (OCR -> Parser -> Classification -> Quantities)
  │         └─ Persists structured payload in PostgreSQL `extracted_data` table
  │         └─ Runs Layer 1 & 2 Validation Pass
  │
  ├── [5] Validation & Auto-Approval Gate
  │         └─ If 0 issues: Auto-approves document and enqueues job to BullMQ `calc-queue`
  │         └─ If issues detected: Transitions document status to `NEEDS_REVIEW`
  │
  ├── [6] Calc Worker / CarbonEngineService
  │         └─ Resolves deterministic emission factor from `emission_factors` via PostgresEmissionFactorProvider
  │         └─ Enforces Unit Normalization & DimensionalValidator 10 Safety Gates
  │         └─ Calculates emissions with Decimal.js fixed-point arithmetic
  │         └─ Persists verified ledger entry to `calculated_emissions` & `calculation_logs`
  │
  └── [7] Frontend Polling / DocumentDetails Rendering
            └─ GET /api/v1/documents/:id
            └─ GET /api/v1/emissions/:id
            └─ GET /api/v1/carbon/audit/:id
            └─ Displays exact real database values in UI
```

---

## 3. Document Type Support Matrix

| Document Type | Upload Path | Storage Target | OCR / Parser Provider | Extraction Handler | Calculation Strategy | Failure Handling |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **PDF (Native Text)** | Pre-signed URL | MinIO (`carbon-os-dev`) | Native PDF Stream Parser | Regex & Layout Tokenizer | `QTY_X_FACTOR` / `WEIGHT_DISTANCE` | Error logged, routed to `NEEDS_REVIEW` |
| **PDF (Scanned/Raster)**| Pre-signed URL | MinIO (`carbon-os-dev`) | Mistral Vision (`pixtral-12b-2409`) | Vision JSON LLM Node | `QTY_X_FACTOR` / `WEIGHT_DISTANCE` | Fallback to OCR error flag |
| **PNG Image** | Pre-signed URL | MinIO (`carbon-os-dev`) | Mistral Vision (`pixtral-12b-2409`) | Vision JSON LLM Node | `ELEC_LOCATION` / `QTY_X_FACTOR` | Routed to `NEEDS_REVIEW` |
| **JPG / JPEG Image** | Pre-signed URL | MinIO (`carbon-os-dev`) | Mistral Vision (`pixtral-12b-2409`) | Vision JSON LLM Node | `ELEC_LOCATION` / `QTY_X_FACTOR` | Routed to `NEEDS_REVIEW` |
| **CSV / XLSX** | Pre-signed URL | MinIO (`carbon-os-dev`) | Tabular Text Parser | Structured Column Parser | `QTY_X_FACTOR` | Malformed file routed to `NEEDS_REVIEW` |

---

## 4. Extraction $\to$ Carbon Engine Contract Audit

| Activity Type | Raw Extracted Unit | Normalized Engine Unit | Conversion Factor | Strategy Key | Dimensional Safety Gate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Diesel Fuel Combustion** | `LITERS` / `L` | `LITERS` | $1.0$ | `QTY_X_FACTOR` | Strict Fuel Range ($1.0 - 4.0\text{ kgCO}_2\text{e/L}$) |
| **Electricity Consumption**| `KWH` / `MWH` | `KWH` | $1,000.0\text{ (if MWh)}$ | `ELEC_LOCATION` | Grid Range ($0.05 - 1.50\text{ kgCO}_2\text{e/kWh}$) |
| **Freight Transport** | `TONNE_KM` / `TKM` | `TONNE_KM` | $1.0$ | `WEIGHT_DISTANCE_FACTOR` | Zero mutation to Liters ($0.01 - 2.0\text{ kgCO}_2\text{e/tkm}$) |
| **Purchased Goods (Steel)** | `KG` / `TONNES` | `KG` | $1,000.0\text{ (if Tonnes)}$ | `QTY_X_FACTOR` | Material Range ($0.1 - 50.0\text{ kgCO}_2\text{e/kg}$) |

---

## 5. Safety Gate Audit (10 Independent Gates)

| Gate # | Gate Name | Evaluation Rule | Block Condition | Database Consequence |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Extraction Completeness** | Verify non-empty `fieldsJson` & quantity $> 0$ | Empty fields or quantity $\le 0$ | Blocked $\to$ `NEEDS_REVIEW` |
| **2** | **Dimensional Compatibility** | Validate physical units compatibility | Fuel $\neq$ Volume, Freight $\neq$ tkm | Blocked $\to$ `NEEDS_REVIEW` |
| **3** | **Factor Compatibility** | Authoritative factor ID exists | `factorId` is null or $\le 0$ | Blocked $\to$ `NEEDS_REVIEW` |
| **4** | **Factor Provenance** | Verify publication citation metadata | Source set is missing or `UNKNOWN` | Blocked $\to$ `NEEDS_REVIEW` |
| **5** | **Mathematical Precision** | Fixed-point Decimal.js arithmetic check | Floating-point anomaly detected | Blocked $\to$ `NEEDS_REVIEW` |
| **6** | **Physical Carbon Intensity** | Verify coefficient within physical laws | Factor value outside physical bounds | Warning / Blocked |
| **7** | **Plausibility & Magnitude** | Total CO₂e within expected magnitude | $> 1,000,000\text{ tCO}_2\text{e}$ anomaly | Warning / Review |
| **8** | **Duplicate Detection** | Exact SHA-256 fingerprint lookup | Duplicate hash within tenant | Blocked $\to$ `NEEDS_REVIEW` |
| **9** | **Classification Consistency** | Verify Scope 1/2/3 category alignment | Category code mismatch | Flagged for Category Review |
| **10**| **Boundary Completeness** | Verify site country and period status | Period `LOCKED` or `FINALIZED` | Calculation Rejected |

---

## 6. Database Ledger Audit

- **Total Documents:** $134$
- **Extracted Data Records:** $431$
- **Activity Records:** $86$
- **Emission Factors:** $255$ ($252$ Verified Reference, $3$ Reference Requires Verification)
- **Calculated Emissions:** $175$ ($100\%$ linked to valid documents and factors)
- **Calculation Logs:** $411$
- **Orphan Calculations:** $0$
- **Tenant Isolation Mismatches:** $0$
- **Duplicate SHA-256 Fingerprints:** $0$

---

## 7. Queue / Worker Reliability Audit

- **Queue Architecture:** Redis BullMQ with separated `ai-queue` and `calc-queue`.
- **Concurrency & Backpressure:** Configured with exponential backoff retries ($3$ attempts) and graceful shutdown handlers.
- **Idempotency:** Document state transitions (`UPLOADED` $\to$ `EXTRACTING` $\to$ `EXTRACTED` $\to$ `APPROVED` $\to$ `VERIFIED`) prevent duplicate ledger insertions.

---

## 8. Mistral OCR Integration Audit

- **Endpoint:** `https://api.mistral.ai/v1/chat/completions` (or `MistralVisionOcrProvider`)
- **Configured Model:** `pixtral-12b-2409`
- **Security:** API Key retrieved via `process.env.MISTRAL_API_KEY` with zero logging or exposure.
- **Image Encoding:** Base64 Data URL formatting (`data:image/png;base64,...`) with automatic payload verification.

---

## 9. Frontend Result Display Audit

- Verified `shipmind-ai/src/pages/app/DocumentDetails.tsx`.
- Displays real calculated values (`emission.co2e`, `emission.calculationMethod`, `emission.scope`, `emission.activityValue`, `emission.activityUnit`, `emission.emissionFactor`).
- Zero hardcoded client-side arithmetic; all values fetched from `/api/v1/emissions/:id` and `/api/v1/carbon/audit/:id`.

---

## 10. Duplicate / Idempotency Audit

- **SHA-256 Fingerprint Engine:** Located at `DuplicateService.computeSha256`.
- **Database Table:** `document_fingerprints` enforces unique SHA-256 hash constraints scoped to `organizationId`.
- **Behavior on Duplicate:** Flags duplicate with exact previous document reference and prevents duplicate emission ledger entries.

---

## 11. Multi-Tenant Authorization Audit

- All database queries and BullMQ job payloads are scoped by `organizationId`.
- The `tenant-context.middleware.ts` enforces `AsyncLocalStorage` tenant boundaries across Core API routes and database repositories.

---

## 12. Issues Found & Fixes Applied

1. **Issue Found:** `UploadWizard.tsx` hardcoded `mimeType: "application/pdf"`, causing PNG and JPG images to be registered with PDF MIME type.  
   **Fix Applied:** Updated `UploadWizard.tsx` to dynamically detect MIME type based on file extension (`image/png`, `image/jpeg`, `text/csv`, `application/pdf`).
2. **Issue Found:** `activity_type_mappings` for `UPSTREAM_TRANSPORT` referenced `ROAD_FREIGHT` instead of `UPSTREAM_TRANSPORT`.  
   **Fix Applied:** Aligned `emissionCategory` in `activity_type_mappings` to `UPSTREAM_TRANSPORT`.

---

## 13. Regression & Build Verification

```powershell
# 1. Golden Carbon Engine Test Suite
pnpm --filter core-api exec ts-node src/tests/golden_carbon_engine.test.ts
-> Result: 6 / 6 Test Cases Passed (100% Accuracy)

# 2. Core API Production Build
pnpm --filter core-api build
-> Result: tsc exit code 0 (0 errors)

# 3. Web Frontend Production Build
pnpm --filter @carbon-iq/web build
-> Result: built in 3.44s (0 errors)
```

---

## 14. Final Readiness Decision

```text
================================================================================
FINAL READINESS DECISION: READY_FOR_FINAL_VALIDATION
================================================================================
```

The CarbonIQ platform is fully prepared, integrated, and verified to execute the **Final Independent 10-Document Validation Campaign**.
