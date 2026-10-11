# CarbonIQ Core Carbon Engine Implementation Guide

**Date:** August 27, 2026  
**Architect:** Senior Carbon Accounting Engineer + AI Systems Architect  
**Status:** Completed & Validated

---

## 1. System Overview & Architecture

CarbonIQ's core engine has been completely rebuilt from the ground up into a **deterministic, auditable, enterprise Scope 1, Scope 2, and Scope 3 carbon accounting engine** with a 4-namespace AI orchestration layer.

The LLM is **strictly prohibited from inventing activity quantities, emission factors, or emission numbers**. All calculations are performed deterministically using `Decimal.js` math and verified emission factor datasets (DEFRA 2024, EPA eGRID 2023, GLEC Framework v3, IPCC AR6 100-year GWP).

---

## 2. The 13-Stage Deterministic Carbon Pipeline

```
REAL DOCUMENT (PDF / Image / Scan)
                 │
                 ▼
[ 1. FILE FINGERPRINTING & DUPLICATE CHECK ] (SHA-256 Hash + Fuzzy Metadata Fingerprinting)
                 │
                 ▼
[ 2. DOCUMENT CLASSIFICATION ] (Pre-extraction Classifier: Electricity, Fuel, Goods, Freight, Travel, Waste, Fugitive)
                 │
                 ▼
[ 3. MISTRAL VISION & OCR EXTRACTION ] (Native PDF Text & Mistral Vision Page/Table Extraction)
                 │
                 ▼
[ 4. STRUCTURED CANONICAL EXTRACTION ] (Multi-line ActivityRecord[] parsing)
                 │
                 ▼
[ 5. FIELD VALIDATION GATE ] (Missing required info -> REQUIRES_REVIEW / INSUFFICIENT_DATA)
                 │
                 ▼
[ 6. UNIT NORMALIZATION LAYER ] (Strict Decimal conversions; no identity 1.0 fallbacks)
                 │
                 ▼
[ 7. EMISSION FACTOR RESOLUTION ] (Activity/Fuel -> Category -> Geography -> Year -> Scope -> Version)
                 │
                 ▼
[ 8. DETERMINISTIC CARBON CALCULATION ] (Formula Engine: Qty x Factor / GLEC Freight / Location-Market Grid)
                 │
                 ▼
[ 9. PLAUSIBILITY & INTENSITY VALIDATION ] (Domain Intensity & Historical Anomaly Signals)
                 │
                 ▼
[ 10. FIELD & CALCULATION PROVENANCE ] (Page, bounding region, raw value, factor ID, formula, timestamp)
                 │
                 ▼
[ 11. HUMAN REVIEW & APPROVAL GATE ] (NEEDS_REVIEW queue for ambiguous or anomaly records)
                 │
                 ▼
[ 12. VERIFIED CARBON LEDGER ] (PostgreSQL calculated_emissions table)
                 │
                 ▼
[ 13. MULTI-NAMESPACE RAG ORCHESTRATION ] (Routed Tool Retrieval for Org Ledger, Docs, Knowledge & ML Forecasts)
```

---

## 3. Core Engine Components & Technical Implementation

### 3.1 Document Classification & Vision OCR (`apps/core-api/src/modules/ai-collector/`)
- `DocumentClassifier`: Pre-classifies documents into 10 distinct categories prior to field extraction.
- `MistralVisionOcrProvider` & `TesseractOcrProvider`: Native PDF text stream parser + Mistral Vision API for scanned image bills. Extracts evidence and layout ONLY.

### 3.2 Duplicate Detection & Versioning (`apps/core-api/src/modules/document/`)
- `DuplicateService`: SHA-256 file hashing (`document_fingerprints` table) + fuzzy metadata matching (invoice #, supplier, date, total amount, quantity). Prevents double counting without deleting historical data.
- `DocumentVersion`: Supports versioned re-uploads with a full audit trail.

### 3.3 Intermediate Schema & Multi-Line Invoice Support
- `ActivityRecord` model: Captures multi-line invoice line items (e.g. Steel 10,000 kg + Aluminium 2,000 kg + Packaging 500 kg on 1 invoice) as separate activity entries.
- Eliminates hardcoded mock fallback injections. Missing required fields return `INSUFFICIENT_DATA` or `NEEDS_REVIEW`.

### 3.4 Emission Factor Registry & Resolution Algorithm (`apps/core-api/src/modules/carbon-engine/`)
- `EmissionFactor`: Tracks full metadata (`sourceSet`, `sourceVersion`, `year`, `geography`, `scope`, `category`, `activity`, `factorValue`, `factorUnit`, `activityUnit`, `methodology`, `gwpBasis`, `wttTtwBasis`, `validFrom`, `validTo`, `citation`).
- `PostgresEmissionFactorProvider`: Hierarchical resolution algorithm. Never uses generic `GENERAL`/`GLOBAL` unsafe fallbacks.

### 3.5 Unit Normalization & Deterministic Formulas
- `UnitConverter`: Explicit `Decimal.js` conversions for Mass, Volume, Energy, Distance, Area, Transport composite (`TONNE_KM`).
- `CarbonEngineService`: Selects calculation formula based on activity/factor basis ($qty \times factor$, $kWh \times grid\_factor$, $litres \times fuel\_factor$, $tonne\text{-}km \times freight\_factor$, etc.).

### 3.6 Plausibility, Intensity & Historical Anomaly Gate (`apps/core-api/src/modules/validation/`)
- `PlausibilityValidator`: Evaluates carbon intensity ($kgCO_2e/\text{unit}$) as risk/review signals. Large industrial emissions are flagged for review rather than hard rejected.
- `HistoricalAnomalyDetector`: Compares activity and emissions against historical site baseline to detect $10\times/100\times/1000\times$ OCR magnitude shifts and decimal errors.

### 3.7 Multi-Namespace RAG Orchestrator & Tool Router (`apps/core-api/src/modules/copilot/`)
- `AiOrchestrator`: Intent router directing queries to 4 authoritative namespaces:
  1. **Org Numerical Questions:** Routed to Verified PostgreSQL Ledger database tools.
  2. **Uploaded Document Questions:** Routed to Organization-Scoped Document Vector Corpus.
  3. **General Accounting Questions:** Routed to Global Accounting Knowledge (GHG Protocol, GLEC, DEFRA, BRSR, ISO 14064).
  4. **Forecasting Questions:** Routed to ML Forecast API service.
- Enforces strict tenant isolation (`organizationId`) and mandatory citations across all claims.

---

## 4. Key Database Schema Changes (`packages/db/prisma/schema.prisma`)

- Added `DocumentFingerprint` model for SHA-256 and fuzzy duplicate detection.
- Added `DocumentVersion` model for upload audit trails.
- Added `ActivityRecord` model for multi-line intermediate activity items.
- Enhanced `EmissionFactor` model with `activity`, `year`, `geography`, `activityUnit`, `methodology`, `gwpBasis`, `wttTtwBasis`, `citation`.
- Enhanced `CalculatedEmissions` model with `rawActivityValue`, `rawActivityUnit`, `normalizedActivityVal`, `normalizedActivityUnit`, `ocrConfidence`, `extractionConfidence`, `matchingConfidence`, `calculationConfidence`, `overallConfidence`, `validationStatus`, `reviewReasons`, `provenanceJson`.
