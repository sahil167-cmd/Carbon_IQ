# CarbonIQ Real Product User Journey & End-to-End Workflow

This document traces the complete real product user flow through the CarbonIQ web platform and its underlying microservices architecture.

---

## 1. User Journey Architecture Map

```text
[1] LOGIN & AUTHENTICATION
    URL: http://localhost:5173/login
    API: POST /api/v1/auth/login
    Storage: JWT Access Token in localStorage + HttpOnly Refresh Cookie
    Payload: { email, password } -> { user, accessToken }

[2] ORGANIZATION & TENANT ISOLATION
    Multi-tenant context: user.organizationId
    AsyncLocalStorage tenant isolation enforced via `tenant-context.middleware.ts`
    All database queries and worker jobs scoped by `organizationId`

[3] DOCUMENT LIBRARY & UPLOAD ENTRY POINT
    URL: http://localhost:5173/app/documents -> http://localhost:5173/app/upload-wizard
    API: GET /api/v1/sites, GET /api/v1/reporting-periods/active, GET /api/v1/document-categories
    Component: `UploadWizard.tsx` (Pre-loads facility sites, active periods, GHG Scope categories)

[4] UPLOAD URL GENERATION & S3/MINIO STORAGE
    API: POST /api/v1/documents/upload-url
    Storage: MinIO Object Storage (Bucket: `carbon-os-dev`)
    Returns: S3 key (`uploads/{orgId}/{timestamp}_{filename}`) and pre-signed PUT URL

[5] DOCUMENT REGISTRATION & SHA-256 FINGERPRINT
    API: POST /api/v1/documents
    Database: Inserts record into `documents` with status `UPLOADED`
    Deduplication: Computes SHA-256 hash and registers in `document_fingerprints` table
    Queue: Dispatches job `EXTRACT_DOCUMENT` to Redis BullMQ `ai-queue`

[6] OCR & EXTRACTION PROCESSING
    Worker: `ai.worker.ts`
    OCR: `MistralVisionOcrProvider` (Native PDF stream / Pixtral 12B Vision API)
    Extraction: `ExtractionGraph` LangGraph processing node
    Database: Inserts structured fields into `extracted_data` table

[7] VALIDATION & APPROVAL GATES
    Engine: `ValidationService` & `DimensionalValidator` (10 Safety Gates)
    Clean records -> Status `APPROVED` -> Enqueues to BullMQ `calc-queue`
    Incomplete / ambiguous / duplicate records -> Status `NEEDS_REVIEW`

[8] DETERMINISTIC CARBON CALCULATION
    Worker: `calc.worker.ts` -> `CarbonEngineService`
    Resolution: `PostgresEmissionFactorProvider` matches authoritative factor in `emission_factors`
    Unit Normalization: `UnitConverter` (Strict physical dimensions)
    Arithmetic: Fixed-point Decimal.js arithmetic (`QTY_X_FACTOR`, `WEIGHT_DISTANCE_FACTOR`, `ELEC_LOCATION`)
    Database: Persists verified emission in `calculated_emissions` and formula in `calculation_logs`

[9] REAL-TIME UI RESULT & IMPACT VISUALIZATION
    Component: `UploadWizard.tsx` (Displays Scope 1/2/3 card, calculated kg CO2e, formula, activity volume)
    Action: "View Document Audit Details" -> Navigates to `/app/documents/:id`

[10] DOCUMENT DETAILS & AUDIT PROVENANCE
    URL: http://localhost:5173/app/documents/:id
    Component: `DocumentDetails.tsx`
    API: GET /api/v1/documents/:id, GET /api/v1/emissions/:id, GET /api/v1/carbon/audit/:id
    Displays: Exact CO2e, emission factor value/unit/source/citation, formula used, extracted fields

[11] DOCUMENT HISTORY & AUDIT STREAM
    URL: http://localhost:5173/app/documents
    Component: `DocumentLibrary.tsx`
    API: GET /api/v1/documents
    Displays: Searchable, filterable table of historical documents with live status badges and confidence

[12] DASHBOARD & AGGREGATED EMISSIONS SUMMARY
    URL: http://localhost:5173/app/dashboard
    Component: `Dashboard.tsx`
    API: GET /api/v1/documents, GET /api/v1/review-queue
    Displays: Scope 1/2/3 summaries, document counts, review queue flags, and ML emission forecasts
```

---

## 2. Real User Scenarios Tested in Product Testing

| Scenario | Document | User Action | Expected Product Experience |
| :--- | :--- | :--- | :--- |
| **Test A: Scope 3 Freight** | `complex_scope3_freight_bol.pdf` | Upload via Wizard | Scope 3 card with 2,763 kg CO₂e, GLEC factor citation, status VERIFIED |
| **Test B: Scope 2 Electricity**| `scope2_india_manufacturing_grid.pdf` | Upload via Wizard | Scope 2 card with 48,200 kg CO₂e, Electricity factor citation, status VERIFIED |
| **Test C: Scope 1 Fuel Review**| `scope1_stationary_diesel_generator.pdf` | Upload via Wizard | Blocked by safety gate -> Routed to NEEDS_REVIEW with clear explanation |
| **Test D: Scanned Image OCR** | `media_1786698305731.png` | Upload PNG via Wizard | PNG MIME detected -> Mistral Vision OCR -> Review workspace |
| **Test E: Document History** | All uploaded documents | Open `/app/documents` | Live list showing all documents with persisted statuses and details |
| **Test F: Document Details** | `/app/documents/:id` | Click on document | Shows exact kg CO₂e, formula, factor citation, and PDF stream link |
| **Test G: Dashboard Stream** | `/app/dashboard` | Open Dashboard | Real-time document count and historical activity feed |
| **Test H: Review Workspace** | `/app/documents/:id/review` | Open Review | Human reviewer interface for approving or updating flagged items |
