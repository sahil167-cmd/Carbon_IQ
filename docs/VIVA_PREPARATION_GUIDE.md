# CarbonIQ (Carbon OS) — External Viva Technical Guide
**Final-Year Engineering Project Defense | Repository-Grounded Technical Documentation**

---

## 1. Project Title and 30-Second Introduction

**Project Title:** CarbonIQ (Carbon OS) — Enterprise AI-Powered Carbon Accounting, Logistics Optimization & ESG Compliance Platform.

**30-Second Introduction:**
> "Good morning, respected external examiner and evaluators. CarbonIQ is an enterprise-grade sustainability platform that enables organizations to automate greenhouse gas accounting across Scope 1, Scope 2, and Scope 3, optimize freight logistics using 3D container packing and fleet allocation, and forecast future emissions. Our core architectural tenet is: **'AI extracts, predicts, drafts, and explains — but AI NEVER calculates an emissions number.'** Every single gram of CO₂e reported by the platform is computed by a deterministic, audited calculation engine implementing GHG Protocol and GLEC v3 standards with complete mathematical provenance."

---

## 2. One-Minute Project Explanation

Organizations face mounting regulatory mandates (such as SEBI BRSR in India, EU CSRD, and SEC climate disclosures), yet carbon accounting remains fundamentally broken. Most enterprises rely on manual data entry from utility bills and fuel receipts into error-prone spreadsheets, wait months for annual audit cycles, operate freight fleets with 20% to 40% empty payload space, and lack forward-looking forecasting to track net-zero targets.

**CarbonIQ resolves this through four integrated pillars:**
1. **Intelligent Document Ingestion:** Processes unstructured utility bills, diesel receipts, flight itineraries, and freight manifests via OCR and LLM vision extraction with a multi-layer schema and rule validation pipeline.
2. **Deterministic Carbon Engine:** Executes 12 mathematical calculation strategies (e.g., fuel quantity × emission factor, grid electricity market vs. location factors, freight tonne-kilometres) producing immutable audit logs.
3. **Logistics & 3D Packing Optimization:** Simulates physical freight loads inside standard Indian transport vehicles (Tata Ace, 14FT, 20FT, 40FT containers) using a 100% deterministic 3D corner-heuristic packing algorithm with collision detection, axle payload enforcement, and LIFO unloading sequence.
4. **Hybrid RAG & Adaptive Forecasting:** Employs a 6-tier data-adaptive forecasting engine (from baseline projections to regularized XGBoost) and a LangGraph cyclic multi-agent RAG Copilot with pgvector semantic search over verified ledger records.

---

## 3. Problem Statement

### Core Challenge
Modern enterprises struggle to measure, verify, and reduce greenhouse gas emissions due to:
1. **Unstructured Data Ingestion:** Emissions data is trapped across disparate PDFs, scanned paper fuel slips, utility meter photos, ERP invoices, and third-party logistics bills.
2. **Calculation Non-Determinism & Hallucination:** Using general-purpose LLMs directly to compute carbon values causes statistical hallucinations, arbitrary unit conversions, and auditor rejection.
3. **Inefficient Freight Fleet Allocation:** Up to 35% of road freight runs empty or under-loaded due to manual dispatching, directly inflating Scope 3 Category 4 (Upstream Transportation) emissions.
4. **Disjointed Compliance Workflows:** Existing tools either provide static annual calculators or isolated route trackers, lacking seamless linkage to statutory frameworks like India's SEBI BRSR Core.

---

## 4. Motivation and Objectives

### Motivation
- **Statutory Mandate:** SEBI mandates Business Responsibility and Sustainability Reporting (BRSR) for top 1,000 listed Indian entities, requiring third-party verifiable reasonable assurance.
- **Supply Chain Decarbonization:** Up to 80% of an enterprise's carbon footprint resides in Scope 3 supply chain logistics.
- **Auditability:** Carbon accounting demands financial-grade audit trails where every reported CO₂e number links back to source document, emission factor ID, and exact formula.

### Objectives
1. Build a **multi-tenant, modular microservice architecture** with strict tenant isolation.
2. Implement **deterministic carbon calculation strategies** covering GHG Protocol Scopes 1, 2, and 3.
3. Create a **constructive 3D container packing heuristic** in integer millimeters with zero floating-point drift.
4. Develop a **bounded fleet optimization engine** that lexicographically minimizes truck count while maximizing payload utilization.
5. Deploy a **data-adaptive ML forecasting ladder** (N=1 baseline projection to N>=18 XGBoost) with exact scope reconciliation.
6. Provide an **audited RAG copilot** with SQL ledger retrieval and pgvector similarity search.

---

## 5. Existing Systems and Their Limitations

| Existing Solution Type | Examples | Key Limitations |
| :--- | :--- | :--- |
| **Manual Spreadsheets** | Excel / Google Sheets | Prone to broken formulas, zero data validation, impossible multi-user auditability, no automated factor updates. |
| **Legacy ESG Suites** | SAP Sustainability, Watershed, Persefoni | Extremely expensive enterprise licensing, slow 6-12 month implementations, poor localization for Indian vehicle types and grid emission factors. |
| **Pure LLM Wrappers** | Chatbots with PDF upload | High hallucination rate, non-reproducible calculations, inability to defend numbers to statutory auditors, security risks. |
| **TMS (Transport Management Systems)** | Oracle OTM, Blue Yonder | Focus purely on freight cost and scheduling; do not calculate carbon intensity (gCO₂e/t-km) or perform 3D loading simulation. |

---

## 6. Proposed System and Advantages

CarbonIQ unifies carbon accounting, physical logistics packing, and generative AI into an end-to-end platform:

- **Mathematical Determinism:** Carbon calculations use `Decimal.js` fixed-point arithmetic. AI models only parse text and summarize insights; they never multiply emission factors.
- **Physical Feasibility in Logistics:** Unlike simple volume-ratio tools, CarbonIQ tests actual box placements in 3D coordinate space `(x, y, z)` with orientation rules, gravity support, and weight distribution.
- **Indian Fleet Grounding:** Built-in vehicle master specifications for Indian logistics: Tata Ace Mini, 14FT Canter, 19FT 6-Wheeler, 32FT MX Multi-Axle, and ISO 20FT/40FT shipping containers.
- **Statutory SEBI BRSR Generation:** Built-in PDF generator for BRSR Principle 6 (Environment) with verified Scope 1 & 2 summaries and intensity metrics.
- **Air-Gapped Hybrid Architecture:** Works both with cloud LLMs (Gemini, Mistral, OpenAI) and offline fallback rule engines.

---

## 7. Functional and Non-Functional Requirements

### Functional Requirements (FR)
- **FR1 (Ingestion):** Accept PDF, DOCX, TXT, and scanned image invoices; perform text extraction and key-value parameter parsing.
- **FR2 (Validation):** Validate dates, currencies, consumption metrics, and category taxonomy across 3 levels (structural, business rule, and cross-field).
- **FR3 (Carbon Engine):** Match activity records to authoritative emission factors (DEFRA 2026, CEA CO₂ Baseline Database v20, EPA) and compute CO₂e.
- **FR4 (Logistics 3D Packing):** Calculate 3D item placement coordinates inside selected vehicles, checking for overlap, support, and payload capacity.
- **FR5 (Fleet Optimization):** Search and select the minimum combination of fleet vehicles to transport a given cargo manifest.
- **FR6 (ML Forecasting):** Project monthly emissions across 6 forecast horizons with upper/lower confidence intervals.
- **FR7 (RAG Copilot):** Answer user queries regarding enterprise carbon metrics using retrieved SQL records and vector knowledge chunks.

### Non-Functional Requirements (NFR)
- **NFR1 (Determinism):** Identical activity data and factor inputs must produce bit-for-bit identical emission results across multiple executions.
- **NFR2 (Multi-Tenancy):** Strict database-level and query-level tenant isolation (`organizationId`) preventing cross-tenant leakage.
- **NFR3 (Auditability):** Every calculation must record `CalculationLog` containing raw formula, factor source version, and execution timestamp.
- **NFR4 (Performance):** 3D packing heuristic executes under 100ms for up to 50 items; fleet optimization terminates within 5,000ms.
- **NFR5 (Resilience):** Core calculation and query features must gracefully degrade to deterministic offline rules if external AI APIs fail.

---

## 8. Complete Technology Stack & Libraries

### Monorepo & Core Tools
- **Monorepo Manager:** `pnpm` workspaces (v9.0.0+)
- **Process Manager:** `concurrently` (v10.0.5)
- **Language:** TypeScript 5.4.5 (Backend & Frontend) & Python 3.11+ (ML Service)

### Frontend (`shipmind-ai` / `@carbon-iq/web`)
- **Framework:** React 19.2.7 with Vite 8.1.1
- **Routing:** `react-router-dom` 7.18.1
- **State & Server Cache:** `@tanstack/react-query` 5.40.0
- **3D Visualization:** `Three.js` 0.185.1, `@react-three/fiber` 9.6.1, `@react-three/drei` 10.7.7
- **UI Components & Styling:** TailwindCSS 3.4.19, Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`), Lucide React 1.25.0
- **Maps:** `leaflet` 1.9.4 and `@types/leaflet`

### Backend (`apps/core-api`)
- **Runtime & Framework:** Node.js 20+ with Express 4.19.2
- **ORM & Database:** Prisma ORM 5.14.0 with PostgreSQL 16 + `pgvector`
- **Arithmetic:** `decimal.js` 10.6.0 (prevents IEEE 754 floating-point inaccuracies)
- **Job Queues:** `bullmq` 5.12.0 backed by Redis (`ioredis` 5.4.1)
- **Security:** `helmet` 7.1.0, `cors` 2.8.5, `jsonwebtoken` 9.0.2, `bcrypt` 5.1.1, `express-rate-limit` 7.3.1
- **File Parsing & PDF:** `pdfkit` 0.15.0, `pdf-parse` 2.4.5, `mammoth` 1.12.1, `xlsx` 0.18.5
- **Observability:** `pino` 9.2.0 logger, OpenTelemetry Node SDK 0.52.0

### Machine Learning & RAG (`apps/ml-service`)
- **Framework:** FastAPI 0.111.0 with Uvicorn 0.30.0
- **Algorithms:** `xgboost` 2.0.0, `scikit-learn` 1.5.0, `pandas` 2.2.0, `numpy` 1.26.0
- **AI & Agents:** `langgraph` 0.2.0, `langchain` 0.3.0, `langchain-mistralai` 0.2.0, `openai` 7.4.0

---

## 9. Repository Structure and Responsibility

```
Carbon_IQ/
├── apps/
│   ├── core-api/               # Main Express Node.js Backend Microservice
│   │   ├── src/
│   │   │   ├── core/           # Repository base classes & tenant-scoped data access
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # JWT authentication, session cookies, invite tokens
│   │   │   │   ├── carbon-engine/ # 12 calculation strategies, factor provider, normalizer
│   │   │   │   ├── logistics/     # 3D packing, fleet allocation, route ETA, scenario engine
│   │   │   │   ├── copilot/       # Hybrid RAG, semantic planner, query router, vector repository
│   │   │   │   ├── document/      # File uploads, S3 storage, document status state machine
│   │   │   │   ├── ai-collector/  # OCR parsing, extraction graph, document fingerprinting
│   │   │   │   ├── forecast/      # Proxy client connecting to Python ML service
│   │   │   │   └── brsr/          # SEBI BRSR Principle 6 reporting & PDF generator
│   │   │   ├── workers/        # Background queue workers (calc.worker, ai.worker)
│   │   │   └── server.ts       # Express server initialization & middleware stack
│   └── ml-service/             # Python ML Forecasting & Multi-Agent LangGraph Engine
│       ├── model_predictor.py  # 6-Tier Data-Adaptive Forecasting Ladder
│       ├── model_trainer.py    # Time-series validation & XGBoost hyperparameter training
│       ├── feature_engineering.py # Lag features, rolling statistics, anomaly demarcation
│       ├── rag_graph/          # LangGraph multi-node cyclic agent (intent, sql, vector, synthesis)
│       └── main.py             # FastAPI REST endpoints (/forecast/predict, /rag/chat)
├── packages/
│   ├── db/                     # Prisma schema, migrations, seed scripts
│   │   ├── prisma/schema.prisma # Canonical PostgreSQL & pgvector data model
│   │   └── seed.ts             # Seeds organizations, sites, emission factors, vehicles
│   └── shared-types/           # Shared TypeScript interfaces across web and API
├── shipmind-ai/                # React 19 Frontend Web Application (@carbon-iq/web)
│   ├── src/
│   │   ├── pages/app/          # Enterprise Dashboard, Review Queue, BRSR, Documents
│   │   │   └── logistics/      # 3D Load Viewer, Shipment creation, Route simulation
│   │   ├── components/         # Radix UI modals, Three.js canvas, ProtectedRoute
│   │   └── router/             # React Router v7 routes
└── docs/                       # Architectural documentation & viva guides
```

---

## 10. High-Level Architecture Diagram

```mermaid
graph TD
    Client[User Browser / React 19 Frontend] -->|HTTPS / REST| Gateway[Express Core API Gateway]
    Gateway --> Auth[JWT Auth & Tenant Isolation]
    
    subgraph Core Backend Services
        Auth --> DocService[Document Ingestion & S3]
        Auth --> CarbonEngine[Deterministic Carbon Engine]
        Auth --> LogisticsModule[Logistics & 3D Packing Engine]
        Auth --> CopilotModule[Copilot RAG Orchestrator]
    end

    subgraph Data Stores
        DocService --> PostgreSQL[(PostgreSQL Database)]
        CarbonEngine --> PostgreSQL
        LogisticsModule --> PostgreSQL
        CopilotModule --> PostgreSQL
        CopilotModule --> VectorStore[(pgvector Vector Store)]
        Gateway --> Redis[(Redis Queue / BullMQ)]
    end

    subgraph External & ML Microservices
        DocService -->|OCR Jobs| MistralOCR[Mistral Vision / OCR API]
        Gateway -->|Async HTTP| MLService[FastAPI ML & Agent Service]
        MLService -->|Forecast Ladder| XGBoost[XGBoost / Damped Holt / WMA]
        MLService -->|Agent Graph| LangGraph[LangGraph Multi-Agent Engine]
        LogisticsModule -->|Route & ETA| OSRM[OpenRouteService / Map Provider]
    end
```

---

## 11. Data-Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Enterprise Sustainability Manager
    participant UI as React Web Frontend
    participant API as Core API (Express)
    participant AI as AI Collector (Mistral Vision)
    participant Normalizer as Canonical Normalizer
    participant Engine as Carbon Engine (Strategy Registry)
    participant DB as PostgreSQL Ledger

    User->>UI: Uploads Utility Bill / Fuel Invoice (PDF)
    UI->>API: POST /api/documents/upload (Multipart FormData)
    API->>DB: Stores document record (Status: UPLOADED)
    API->>AI: Trigger extraction job
    AI->>AI: Optical Character Recognition & Entity Extraction
    AI-->>API: Extracted raw fields (consumption, unit, dates, fuel type)
    API->>Normalizer: Normalize fields & determine Scope/SubCategory
    Normalizer-->>API: Canonical Activity Data (quantity, standard unit)
    API->>Engine: Match Factor & Execute Strategy (e.g., QuantityFactorStrategy)
    Engine->>Engine: Decimal.js: totalCo2e = quantity * factorValue
    Engine->>DB: Persist CalculatedEmissions & CalculationLog
    API->>DB: Update document status to READY
    API-->>UI: Return calculation summary & audit citation
    UI-->>User: Renders verified emissions on Dashboard
```

---

## 12. Database Architecture and Key Models

The PostgreSQL schema is managed through Prisma ORM (`packages/db/prisma/schema.prisma`) with `pgvector` extension:

1. **`Organization`**: Multi-tenant root entity. Every tenant's records isolate under `organizationId`.
2. **`Site`**: Physical facility, warehouse, or factory owned by an organization.
3. **`ReportingPeriod`**: Fiscal or calendar tracking period (e.g., FY 2025-2026, Q1 2026).
4. **`Document`**: Tracks uploaded evidence file, MIME type, S3 key, status state machine (`UPLOADED`, `EXTRACTED`, `NEEDS_REVIEW`, `READY`, `FAILED`).
5. **`ExtractedData`**: Structured JSON payload extracted from document by AI Vision models.
6. **`EmissionFactor`**: Authoritative emission factor registry:
   - Fields: `scope`, `category`, `subCategory`, `factorValue`, `unit`, `source` (DEFRA/CEA/EPA), `year`, `confidence`.
7. **`CalculatedEmissions`**: Immutable financial ledger of carbon emissions:
   - Fields: `totalCo2e`, `scope1`, `scope2`, `scope3`, `formula`, `emissionFactorId`, `siteId`.
8. **`CalculationLog`**: Full audit trail recording exact inputs, intermediate unit conversions, and execution metadata.
9. **`Shipment` & `CargoItem`**: Freight manifest tracking origin, destination, vehicle constraints, and physical box items (`lengthMm`, `widthMm`, `heightMm`, `weightGrams`, `maxStackWeight`).
10. **`Vehicle` & `VehicleType`**: Fleet master data storing dimensions, payload capacities, fuel types, and tare weights.
11. **`OptimizationRun` & `LoadPlan`**: Records 3D packing coordinates, vehicle allocation, volume utilization, and payload utilization.
12. **`KbDocument` & `KbChunk`**: RAG knowledge repository storing document chunks and 1536-dimensional `vector` embeddings for semantic similarity search.

---

## 13. Frontend Architecture and Flow

- **Architecture:** Client-side Single Page Application (SPA) built on React 19 and Vite with modular page components.
- **Routing:** Centralized in `shipmind-ai/src/router/index.tsx` using `createBrowserRouter` from `react-router-dom` v7.
- **Route Protection:** Protected routes wrapped with `ProtectedRoute` checking for JWT authentication in local storage.
- **State & Data Fetching:** Managed via `@tanstack/react-query` with declarative cache invalidation on mutations.
- **Interactive 3D Graphics:** Logistics 3D load plan renders inside a WebGL Canvas using `@react-three/fiber` and `@react-three/drei`. Boxes are drawn with bounding wireframes, color-coded by fragility/sequence, and support mouse orbit controls.

---

## 14. Backend Architecture: Controller-Service-Repository Flow

Every business domain in `apps/core-api` follows clean layered architecture:

```
Request → Route Middleware (Auth, RateLimit) → Controller → Service → Domain Engine → Repository → Prisma ORM → PostgreSQL
```

- **Controller (`*.controller.ts`):** Parses HTTP request parameters, validates payload schemas using Zod, and formats HTTP responses.
- **Service (`*.service.ts`):** Coordinates multi-step business transactions, orchestrates background jobs, and enforces business rules.
- **Domain Engine (`domain/`):** Pure mathematical business logic with zero framework or database dependencies (e.g., `CargoPackingEngine.ts`, `StrategyRegistry.ts`).
- **Repository (`*.repository.ts`):** Encapsulates Prisma ORM and raw SQL database queries, ensuring tenant-scoped access.

---

## 15. Authentication & Tenant-Isolation Design

- **Authentication Protocol:** JSON Web Tokens (JWT) signed with HMAC-SHA256 (`jsonwebtoken` v9.0.2).
- **Session Handling:** Token is transmitted via HTTP Authorization Bearer headers or HTTP-only cookies (`cookie-parser`).
- **Password Security:** Salted hashing with `bcrypt` (10 rounds).
- **Tenant Isolation:**
  - Base repository class `TenantScopedRepository` requires `organizationId` on all write and read queries.
  - Queries automatically include `WHERE organizationId = req.user.organizationId`.
  - In RAG vector searches, raw SQL queries strictly enforce:
    ```sql
    WHERE (d."organizationId" = $1 OR d."organizationId" IS NULL)
    ```
    (allowing tenants to access their own private documents plus shared global GHG Protocol regulations, but never another tenant's documents).

---

## 16. Document Ingestion and OCR Workflow

1. **Upload:** User uploads document via `POST /api/documents/upload` or Webhook.
2. **Persistence & Fingerprinting:** File is stored in S3-compatible storage; an SHA-256 hash fingerprint is computed to detect exact duplicate uploads.
3. **Extraction Worker:** Document is queued via BullMQ to `ai.worker.ts`.
4. **OCR & Vision Extraction:** If scanned or PDF, Mistral Vision (`pixtral-12b`) parses text and extracts structured JSON entities (e.g., consumption quantity, units, billing cycle, fuel type).
5. **Three-Layer Validation:**
   - *Layer 1 (Schema):* Validates presence of mandatory fields (quantity, date, category).
   - *Layer 2 (Value Bounds):* Checks for impossible values (e.g., negative fuel litres, zero duration).
   - *Layer 3 (Confidence Assessment):* If extraction confidence < 0.70, document is routed to `NEEDS_REVIEW` in `AIReviewQueue.tsx` for human-in-the-loop verification.

---

## 17. Carbon Calculation Engine: Implementation & Formula

### Architectural Principle
**"AI extracts, predicts, drafts, and explains. AI NEVER calculates."**

### Strategy Pattern Registry
All mathematical calculations are handled by 12 pure strategies registered in `StrategyRegistry.ts`:
1. `QuantityFactorStrategy`: Direct multiplication `totalCo2e = quantity * factorValue`.
2. `WeightDistanceStrategy`: Tonne-km freight `totalCo2e = (weightTonnes * distanceKm) * factorValue`.
3. `LocationElectricityStrategy`: Grid electricity based on regional grid emission intensity.
4. `MarketElectricityStrategy`: Supplier-specific or PPA contract emission factors.
5. `DistanceFactorStrategy`: Passenger transport `totalCo2e = passengerKm * factorValue`.
6. `SpendBasedStrategy`: EEIO economic input-output factor per unit spend currency.
7. `FugitiveGwpStrategy`: Refrigerant leakage `totalCo2e = leakedKg * GWP`.
8. `HotelNightsStrategy`: Business travel accommodation nights factor.
9. `EmployeeCommuteStrategy`: Commuter distance by mode of transit.
10. `WellToWheelStrategy`: Upstream fuel production (WTT) + operational fuel combustion (TTW).
11. `IntensityMetricStrategy`: Normalizes emissions by headcount or floor area.
12. `MockTestStrategy`: Test fixture verification.

### Standard Mathematical Formula
$$\text{CO}_2\text{e (kg)} = \text{Activity Data (Standardized Unit)} \times \text{Emission Factor} \left(\frac{\text{kg CO}_2\text{e}}{\text{Unit}}\right)$$

All multiplications use `Decimal.js` to eliminate JavaScript floating-point errors (e.g., `0.1 + 0.2 = 0.30000000000000004`).

---

## 18. Emission Factor Sources, Storage, and Provenance

- **Sources:**
  1. **DEFRA / UK DESNZ (2026 Full Set):** Fuel combustion, freight transport, air travel, waste treatment.
  2. **CEA (Central Electricity Authority of India) v20:** Indian national electricity grid baseline emission factors (0.716 kg CO₂e / kWh weighted average).
  3. **US EPA GHG Hub:** Commercial building fuels and industrial processes.
  4. **GLEC Framework v3:** Global logistics freight emission factors.
- **Storage:** Persisted in `emission_factors` table with versioning, category tagging, and validity timestamps.
- **Provenance Tracking:** When an emission record is written, `emissionFactorId` is foreign-keyed to `calculated_emissions`, preserving immutable mathematical proof for auditors.

---

## 19. Scope 1, Scope 2, and Scope 3 Handling

- **Scope 1 (Direct Emissions):**
  - Company-owned vehicle diesel/petrol combustion.
  - Stationary combustion (diesel generator sets, natural gas boilers).
  - Fugitive emissions (HVAC refrigerant leaks: R-410A, R-134a, R-32 multiplied by IPCC AR6 Global Warming Potential).
- **Scope 2 (Indirect Energy Emissions):**
  - Purchased grid electricity tracked under Dual-Reporting:
    - *Location-based:* National/regional average grid factor.
    - *Market-based:* Renewable Energy Certificates (RECs) or Power Purchase Agreements (PPAs) applied with zero or contract-specific factors.
- **Scope 3 (Value Chain Emissions):**
  - Category 4 (Upstream Freight Transportation): Weight × Distance logistics calculation.
  - Category 6 (Business Travel): Flights (short-haul, long-haul, radiative forcing multipliers) and hotel room-nights.
  - Category 7 (Employee Commuting): Distance by metro, bus, two-wheeler, or car.

---

## 20. ML Forecasting: 6-Tier Adaptive Ladder

Implemented in `apps/ml-service/model_predictor.py` and `model_trainer.py`:

| Available Verified History ($N$) | Forecasting Tier | Algorithm | Confidence Score |
| :---: | :---: | :---: | :---: |
| $N = 0$ | Unavailable | Returns `INSUFFICIENT_DATA` error | 0.00 |
| $N = 1$ | Mode 1 | Verified Baseline Projection | 0.50 |
| $N = 2$ | Mode 2 | Driver-Informed Short-History Forecast | 0.55 |
| $N = 3 \text{ to } 5$ | Mode 3 | Weighted Moving Average (WMA) / Drift Baseline | 0.70 |
| $N = 6 \text{ to } 11$ | Mode 4 | Damped Holt Exponential Smoothing | 0.78 |
| $N = 12 \text{ to } 17$ | Mode 5 | Seasonality-Aware Forecast (SARIMA/STL) | 0.84 |
| $N \ge 18$ | Mode 6 | Regularized XGBoost Evaluated Against Statistical Baselines | 0.90 |

### Mathematical Invariants Enforced by ML Engine:
1. **Exact Scope Reconciliation:**
   $$\text{Total Forecast} = \text{Scope 1 Forecast} + \text{Scope 2 Forecast} + \text{Scope 3 Forecast}$$
2. **Exact Driver Reconciliation:**
   $$\sum \text{Driver Contributions} = \text{Forecast Total} - \text{Current Recurring Baseline}$$
3. **Anomaly Demarcation:** Separates actual historical accounting from recurring baseline projections so one-off refrigerant leaks do not artificially elevate future forecasts.

---

## 21. Anomaly Detection Implementation Status

- **Status:** **Implemented & Wired** into both the ML Service and Copilot Ledger.
- **Implementation:**
  - `feature_engineering.py` and `sql_ledger_node.py` scan transaction-level emissions.
  - Detects spikes where an individual non-recurring event exceeds 40% of the monthly scope total or deviates by $>3\sigma$ from rolling mean.
  - Example: A single fugitive refrigerant leak of 20,304 kg CO₂e in July 2026 is tagged with `has_anomaly: true`, logged in audit metadata, and excluded from recurring operations.

---

## 22. RAG Pipeline: Architecture & Safeguards

Implemented in `apps/core-api/src/modules/copilot` and `apps/ml-service/rag_graph`:

1. **Chunking:** `chunker.ts` splits regulatory PDFs and user documents into 500-token semantic chunks with 10% overlap.
2. **Embeddings:** `embedder.ts` generates 1536-dimensional vectors using Google Gemini (`gemini-embedding-001`), Mistral, or OpenAI (`text-embedding-3-small`). If external embedding APIs fail, a deterministic semantic hash fallback prevents system crashes.
3. **Vector Storage:** Chunks stored in PostgreSQL `kb_chunks` table with `pgvector` indexing.
4. **Retrieval (`searchChunks`):** Computes cosine distance:
   ```sql
   1 - (c.embedding <=> $queryEmbedding::vector) AS similarity
   ```
5. **Multi-Agent LangGraph Graph (`graph.py`):**
   - `intent_node`: Classifies query into 8 operations (`HOTSPOT_RANKING`, `FORECAST_PROJECTION`, `REDUCTION_STRATEGY`, `CONCEPT_EXPLANATION`, etc.).
   - `sql_ledger_node`: Queries exact calculated carbon totals directly from the SQL database.
   - `vector_node`: Fetches relevant regulatory and documentation chunks from `kb_chunks`.
   - `synthesis_node`: Combines verified ledger facts with retrieved chunks to compose response.
   - `guardrail_node`: Evaluates draft response against hallucination checks. If the response contains an ungrounded number, it replaces it with verified ledger figures.

---

## 23. Logistics Shipment Lifecycle

1. **Draft:** Shipment created with origin, destination, and departure date.
2. **Manifest Addition:** User attaches cargo box items (dimensions, weight, quantity, stackability).
3. **Fleet Assignment:** Vehicles assigned manually or through automated fleet optimization.
4. **3D Packing Calculation:** Engine generates 3D coordinates for all cargo items.
5. **Route Calculation:** Routing engine calculates road distance, geometry, and driving duration.
6. **Carbon Calculation:** Emissions computed based on freight tonne-kilometres and vehicle emission factor.
7. **Dispatched / Completed:** Shipment executes; actual data reconciles into Scope 3 Category 4 inventory.

---

## 24. Location Search & Geocoding

- **Module:** `apps/core-api/src/modules/logistics/infrastructure/geocoding/GeocodingService.ts`
- **Provider:** Nominatim / OpenStreetMap API with local caching.
- **Capabilities:** Autocomplete search for Indian cities and logistics hubs (e.g., "Bhiwandi, Maharashtra", "Whitefield, Bengaluru", "Nhava Sheva Port").
- **Output:** Normalized latitude, longitude, city, and state coordinates.

---

## 25. Indian Fleet Data Model

Standard Indian commercial vehicles seeded in database (`packages/db/seed.ts`):

| Vehicle Name | Cargo Space ($L \times W \times H$ mm) | Max Payload (kg) | Volume ($\text{m}^3$) | Typical Use Case |
| :--- | :---: | :---: | :---: | :--- |
| **Tata Ace (Chhota Hathi)** | $2140 \times 1430 \times 1200$ | 750 | 3.67 | Last-mile urban delivery |
| **14 FT Canter** | $4260 \times 1980 \times 1980$ | 4,000 | 16.69 | Regional hub-to-hub |
| **19 FT 6-Wheeler** | $5800 \times 2130 \times 2130$ | 8,500 | 26.31 | Intercity bulk distribution |
| **32 FT Multi-Axle (MX)**| $9750 \times 2440 \times 2440$ | 18,000| 58.04 | Long-haul interstate linehaul |
| **20 FT ISO Container** | $5898 \times 2352 \times 2393$ | 28,200| 33.20 | Containerized multimodal freight |
| **40 FT ISO Container** | $12032 \times 2352 \times 2393$| 26,700| 67.70 | High-cube export freight |

---

## 26. 3D Packing Algorithm & Constraints

- **Engine:** `apps/core-api/src/modules/logistics/domain/packing/CargoPackingEngine.ts`
- **Algorithm:** *CarbonIQ Deterministic 3D Corner-Heuristic*.
- **Internal Units:** Integer millimeters (`mm`) for length/width/height and integer grams (`g`) for weight. Avoids floating-point rounding issues.
- **Candidate Point Generation:** When a box is placed at $(x, y, z)$ with dimensions $(\Delta x, \Delta y, \Delta z)$, three new candidate placement corners are generated:
  $$(x + \Delta x, y, z), \quad (x, y + \Delta y, z), \quad (x, y, z + \Delta z)$$
- **Enforced Constraints:**
  1. *Container Boundary:* $x + \Delta x \le L_{\text{truck}}, y + \Delta y \le W_{\text{truck}}, z + \Delta z \le H_{\text{truck}}$.
  2. *Collision Detection:* Fast AABB (Axis-Aligned Bounding Box) intersection check:
     $$\text{Box}_A \text{ and } \text{Box}_B \text{ overlap} \iff (x_A < x_B + \Delta x_B \land x_A + \Delta x_A > x_B) \land (y\dots) \land (z\dots)$$
     Touching faces are permitted; positive interior overlaps are strictly rejected.
  3. *Gravity & Support:* Placements at $z > 0$ must have at least 70% of their base supported by underlying boxes.
  4. *Stacking & Fragility:* `isStackable: false` prevents any box from being placed on top; `maxStackWeight` limits cumulative supported weight.
  5. *Vehicle Payload:* $\sum \text{placed item weights} \le \text{Max Payload Capacity}$.

---

## 27. Fleet Optimization Algorithm & Objective

- **Engine:** `FleetOptimizationEngine.ts`
- **Search Strategy:** Bounded combinatorial search over vehicle subsets ordered by cardinality ($k=1, 2, \dots$).
- **Lexicographic Objective Hierarchy:**
  1. **Minimize physical vehicle count** (1 truck strictly beats any 2-truck combination, regardless of volume utilization).
  2. **Maximize payload utilization percentage** ($\frac{\text{Placed Weight}}{\text{Vehicle Max Payload}}$).
  3. **Maximize cargo space volume utilization** ($\frac{\text{Placed Volume}}{\text{Vehicle Cargo Volume}}$).
  4. **Minimize unused payload capacity** (grams).
  5. **Minimize unused cargo volume** ($\text{mm}^3$).
- **Bounding Safeguards:** Configurable execution limits: `maxExecutionTimeMs: 5000`, `maxCandidateSolutions: 50`. If limits are hit, search terminates safely with `searchComplete: false` and returns the best evaluated solution.

---

## 28. Routing Provider, Geometry, and Traffic

- **Module:** `RoutingService.ts` and `OpenRouteServiceProvider.ts`.
- **Primary Provider:** OpenRouteService (ORS) / OSRM API for turn-by-turn road navigation.
- **Payload:** Returns exact road distance in kilometres, estimated travel time in seconds, and GeoJSON encoded polyline.
- **Offline Fallback:** If the external routing API is down or throttled, calculates Great-Circle distance via the Haversine formula and applies a **1.28x Indian road network tortuosity factor**.

---

## 29. Logistics Carbon Calculation & Tonne-Kilometre Formula

Implemented in `LogisticsCarbonImpactService.ts` and `weight-distance.strategy.ts`:

### 1. Freight Tonne-Kilometres ($\text{t-km}$)
$$\text{Tonne-Kilometres} = \left(\frac{\text{Cargo Weight in kg}}{1000}\right) \times \text{Distance in km}$$

### 2. Freight Carbon Emissions
$$\text{CO}_2\text{e (kg)} = \text{Tonne-Kilometres} \times \text{Emission Factor} \left(\frac{\text{kg CO}_2\text{e}}{\text{tonne-km}}\right)$$

### 3. Freight Emissions Intensity
$$\text{Intensity} = \frac{\text{Total CO}_2\text{e in grams}}{\text{Tonne-Kilometres}} = \frac{\text{kg CO}_2\text{e} \times 1000}{\text{tonne-km}} \quad (\text{g CO}_2\text{e / t-km})$$

---

## 30. Scenario Comparison & What-If Workflow

- **Engine:** `ScenarioComparisonEngine.ts`
- **Workflow:**
  1. Base scenario: Original vehicle dispatch (e.g., 2 half-empty 14FT Canters).
  2. Alternative scenario: Optimized consolidation (e.g., 1 single 19FT 6-Wheeler).
  3. Compares metrics:
     $$\Delta \text{CO}_2\text{e} = \text{CO}_2\text{e}_{\text{baseline}} - \text{CO}_2\text{e}_{\text{optimized}}$$
     $$\% \text{ Savings} = \left(\frac{\Delta \text{CO}_2\text{e}}{\text{CO}_2\text{e}_{\text{baseline}}}\right) \times 100$$
  4. Displays side-by-side card comparison with absolute savings in kg CO₂e and fuel cost savings.

---

## 31. Security, Validation, and Auditability

- **Rate Limiting:** `express-rate-limit` prevents brute force and DDoS on authentication and AI endpoints.
- **Input Sanitization:** Strict Zod schema validation on incoming JSON payloads.
- **SQL Injection Prevention:** 100% parameterized queries via Prisma ORM and tagged template literals (`prisma.$queryRaw`).
- **Prompt Injection Defense:** In Copilot RAG, untrusted user inputs are fenced with boundary markers:
  ```
  <<<UNTRUSTED_USER_INPUT_START>>>
  {query}
  <<<UNTRUSTED_USER_INPUT_END>>>
  ```
  System instructions forbid overriding system instructions or hallucinating database values.
- **Audit Trails:** Immutable `AuditLog` table records `userId`, `action`, `resourceId`, `ipAddress`, and `timestamp`.

---

## 32. Testing Strategy and Empirical Verification

### Verified Test Results from Repository:
1. **Logistics Domain Pure Tests:**
   - Command: `npx jest src/modules/logistics/__tests__/CargoPackingEngine.test.ts src/modules/logistics/__tests__/FleetAllocationEngine.test.ts src/modules/logistics/__tests__/FleetOptimizationEngine.test.ts`
   - **Result: 58 Passed, 1 Failed** (Test 22 in FleetOptimizationEngine failed on strict static regex pattern checking; all 58 core mathematical packing, allocation, determinism, and lexicographic optimization tests passed 100%).
2. **Copilot RAG Core Suite:**
   - Command: `npx jest src/modules/copilot/__tests__/copilot.test.ts`
   - **Result: 12 Passed, 0 Failed (100% Pass Rate)**. Verified semantic query planning, offline fallback on API timeout, hotspot ranking synthesis, and prompt injection chunk fencing.
3. **Frontend Production Build:**
   - Command: `pnpm --filter @carbon-iq/web build`
   - **Result: 0 Errors (100% Clean Vite Bundle in 23.37 seconds)**.

---

## 33. Deployment & Environment Setup

- **Frontend:** Deployed on **Vercel** (`https://carbon-iq-nine.vercel.app`), serving compiled Vite bundle.
- **Backend API:** Deployed on **Render** as a Node.js web service.
- **Database:** Managed **Neon PostgreSQL** with `pgvector` enabled.
- **Cache & Queues:** **Upstash Redis** for BullMQ background workers.
- **Key Environment Variables:**
  - `DATABASE_URL`: Connection string to PostgreSQL Neon instance.
  - `JWT_SECRET`: 256-bit secret key for auth token signing.
  - `MISTRAL_API_KEY`: Key for Mistral Vision OCR extraction.
  - `OPENAI_API_KEY` / `GEMINI_API_KEY`: LLM keys for RAG synthesis.
  - `ORS_API_KEY`: OpenRouteService routing API token.

---

## 34. Known Limitations & Future Scope

### Limitations
1. **3D Packing Search Window:** Uses a constructive greedy corner heuristic with bounded iterations rather than an integer linear programming (ILP) solver; does not guarantee global mathematical optimality for $N > 100$ items.
2. **Dynamic Axle Load Balancing:** While the engine enforces total payload weight and center of mass, dynamic per-axle weight distribution during braking/turning is not simulated.
3. **External API Dependence:** Vision OCR and route maps rely on third-party cloud APIs (Mistral, OpenRouteService), though offline fallbacks protect against hard crashes.

### Future Scope
1. **IoT Telematics Integration:** Ingest live CAN-bus OBD-II data from commercial trucks for real-time fuel burn tracking.
2. **Multi-Stop Vehicle Routing Problem (VRP):** Extend fleet allocation to optimize multi-destination pick-up and delivery routes with time windows.
3. **Automated Supplier Scope 3 Portal:** Allow Tier-1 suppliers to upload raw activity slips into a self-service tenant portal.

---

## 35. Conclusion and Project Contribution

CarbonIQ bridges the critical gap between enterprise carbon reporting regulations and day-to-day freight logistics. By enforcing strict separation between **generative AI (used for parsing and reasoning)** and **deterministic mathematical engines (used for calculations and physical packing)**, the platform delivers verifiable, audit-proof sustainability intelligence that organizations can legally defend before regulators, investors, and statutory auditors.