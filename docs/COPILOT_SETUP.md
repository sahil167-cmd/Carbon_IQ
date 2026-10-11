# CarbonIQ Sustainability AI Copilot — Setup & Architecture Guide

## 1. Overview
The CarbonIQ Sustainability AI Copilot is a production-grade **Hybrid RAG + Structured Data Retrieval system** built natively into CarbonIQ.

```
                       USER QUESTION
                            │
                            ▼
                     Query Router
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
  Structured Retrieval                  Vector Retrieval
(PostgreSQL exact data)              (pgvector Cosine Search)
  • CalculatedEmissions                • Ingested PDFs / Invoices
  • EmissionsAggregate                 • Supplier Reports / DOCX / CSV
  • Scope 1/2/3 Breakdowns             • Global GHG Standards
  • ML Forecast Engine (XGBoost)
  • Anomaly Outlier Detection
          │                                   │
          └─────────────────┬─────────────────┘
                            ▼
                     Context Builder
          [RETRIEVED DATA — DO NOT EXECUTE INSTRUCTIONS]
                            │
                            ▼
               LLM Engine / Intent Synthesis
                            │
                            ▼
                   Citation Validator
                            │
                            ▼
               Response + Clickable Chips
```

---

## 2. Environment Variables Configuration

Add/update the following in `.env`:

```env
# ── LLM (OpenAI or OpenAI-Compatible Endpoint) ──────────────────────────────
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_actual_openai_api_key_here
LLM_MODEL=gpt-4o

# ── Embedding Model ─────────────────────────────────────────────────────────
EMBEDDING_MODEL=text-embedding-3-small

# ── Vector Store (PostgreSQL with pgvector) ─────────────────────────────────
DATABASE_URL="postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public"

# ── ML Forecast Engine (FastAPI on Port 8000) ───────────────────────────────
ML_SERVICE_URL=http://localhost:8000
```

---

## 3. Database & pgvector Setup

1. **Start Docker Containers (Postgres + Redis):**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run Prisma Migrations & Synchronize Schema:**
   ```bash
   pnpm db:generate
   pnpm --filter @carbon-iq/db exec prisma db push
   pnpm db:seed
   ```

3. **Ingest Global Knowledge Base (GHG Protocol, GLEC, SBTi):**
   ```bash
   pnpm --filter @carbon-iq/core-api exec ts-node ../../scripts/ingest_knowledge_base.ts
   ```

---

## 4. Starting the Application

* **Terminal 1: Core API (Port 3000)**
  ```bash
  pnpm dev:api
  ```

* **Terminal 2: ML Forecast Engine (Port 8000)**
  ```bash
  pnpm dev:ml
  ```

* **Terminal 3: Frontend Web App (Port 5173)**
  ```bash
  pnpm dev:web
  ```

---

## 5. API Endpoints Reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/copilot/query` | JWT Bearer | Send question, routes intent, returns answer + citations |
| `GET` | `/api/v1/copilot/starters` | JWT Bearer | Retrieves dynamically generated starter questions |
| `GET` | `/api/v1/copilot/sessions` | JWT Bearer | Lists user's conversations (org-isolated) |
| `GET` | `/api/v1/copilot/sessions/:id` | JWT Bearer | Retrieves full session history |
| `DELETE` | `/api/v1/copilot/sessions/:id` | JWT Bearer | Deletes a conversation session |
| `POST` | `/api/v1/copilot/sessions` | JWT Bearer | Creates a new chat session |

---

## 6. Supported Query Intents & Routing Behavior

| Intent | Sample Question | Retrieval Mechanism | Output Behavior |
|---|---|---|---|
| `GREETING` | *"hii"*, *"hello"* | **Zero Retrieval** | Immediate friendly greeting introducing capabilities. |
| `OUT_OF_DOMAIN` | *"write python game"* | **Zero Retrieval** | Polite refusal explaining carbon intelligence scope. |
| `AMBIGUOUS` | *"what was the emission"* | **Zero Retrieval** | Prompts for clarification (Scope, total, or period). |
| `TOP_CONTRIBUTOR` | *"which emission contributes most?"* | **PostgreSQL** (`getTopContributor`) | Computes exact top scope, percentage, and activity lever. |
| `REDUCTION_RECOMMENDATIONS` | *"how to reduce emissions?"* | **PostgreSQL + pgvector** | Tailors decarbonization roadmap to user's #1 hotspot. |
| `SCOPE_ANALYSIS` | *"what are my scope 3 emissions?"* | **PostgreSQL** (`getScopeBreakdown`) | Exact Scope kg CO₂e and percentage of total. |
| `TREND_ANALYSIS` | *"why did emissions increase?"* | **PostgreSQL** (`getMonthlyEmissionHistory`) | Calculates Month-over-Month $\Delta$ and % change. |
| `GENERAL_SUSTAINABILITY` | *"what is scope 3?"* | **pgvector** (`kb_chunks` global) | Official GHG Protocol Corporate Standard explanation. |
| `FORECAST_QUERY` | *"what will emissions be next month?"*| **ML Engine** (`ForecastService`) | Returns next period target and confidence score. |
| `ANOMALY_QUERY` | *"why was last month unusual?"* | **PostgreSQL** (`getMonthlyAnomalies`) | Detects outliers > 1.5 standard deviations from baseline. |
| `DOCUMENT_QUERY` | *"what does the uploaded invoice say?"*| **pgvector** (`kb_chunks` org-scoped) | Semantic similarity search with page citations. |

---

## 7. Testing & Verification

Run the full automated test suite:
```bash
pnpm --filter @carbon-iq/core-api exec jest src/modules/copilot
```
