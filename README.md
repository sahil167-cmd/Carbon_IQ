<div align="center">

# 🌍 Carbon IQ (Carbon OS)
### Enterprise AI-Powered Carbon Accounting, Logistics Optimization & ESG Compliance Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow.svg?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Viewer-black.svg?logo=three.js)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

<p align="center">
  <b>A unified, auditable enterprise platform to measure, understand, predict, and reduce greenhouse gas emissions across Scope 1, Scope 2, and Scope 3 with deterministic calculation engines, 3D logistics simulation, and grounded multi-agent AI.</b>
</p>

---

</div>

## 📌 Table of Contents
1. [Core Design Principle](#-core-design-principle)
2. [Platform Modules & Key Features](#-platform-modules--key-features)
   - [Deterministic Carbon Accounting Engine](#1-deterministic-carbon-accounting-engine-ghg--glec)
   - [AI Document Collector & 3-Layer Validation](#2-ai-document-collector--3-layer-validation)
   - [Logistics Optimization & 3D Interactive Truck Packing](#3-logistics-optimization--3d-interactive-truck-packing)
   - [Cyclic LangGraph Copilot & RAG Engine](#4-cyclic-langgraph-copilot--rag-engine)
   - [BRSR ESG Compliance & Time-Series Forecasting](#5-brsr-esg-compliance--time-series-forecasting)
3. [Architecture Overview](#-architecture-overview)
4. [Monorepo Workspace Structure](#-monorepo-workspace-structure)
5. [Getting Started & Local Setup](#-getting-started--local-setup)
   - [Prerequisites](#prerequisites)
   - [Environment Configuration](#environment-configuration)
   - [Database Setup & Seeding](#database-setup--seeding)
   - [Running the Services](#running-the-services)
6. [Service Inventory & Endpoints](#-service-inventory--endpoints)
7. [Testing & Verification Suites](#-testing--verification-suites)
8. [Security & Multi-Tenant Isolation](#-security--multi-tenant-isolation)

---

## 🏛️ Core Design Principle

> **"AI extracts, predicts, drafts, and explains. It NEVER calculates or invents an emissions number."**

Carbon IQ maintains a strict architectural boundary:
* **The Deterministic Carbon Accounting Engine** (implemented via strict mathematical strategy patterns using DEFRA, CEA, EPA, and GLEC v3 emission factors) is the sole authority producing emissions numbers of record.
* **Artificial Intelligence (Mistral Vision & LLMs)** is utilized for computer vision document extraction, semantic classification, predictive forecasting, and conversational contextualization through verified database retrieval (RAG).

Every emissions figure emitted by Carbon IQ comes with a verifiable, immutable mathematical provenance audit trail.

---

## 🚀 Platform Modules & Key Features

### 1. Deterministic Carbon Accounting Engine (GHG & GLEC)
* **Comprehensive Scope Coverage**:
  * **Scope 1**: Direct stationary combustion (natural gas, diesel generators) and mobile company fleets.
  * **Scope 2**: Indirect electricity accounting (location-based grid factors, e.g., CEA India, eGRID US, and market-based contractual REC certificates).
  * **Scope 3**: Upstream purchased goods (cradle-to-gate spend/mass factors), business travel, freight transport across road, rail, air, and ocean.
* **12 Domain Strategy Pattern Implementations**:
  * `weight-distance`, `distance-factor`, `quantity-factor`, `well-to-wheel`, `location-electricity`, `market-electricity`, `spend-based`, `employee-commute`, `hotel-nights`, `fugitive-gwp`, `intensity-metric`.
* **Activity Normalizer**: Automatic normalization of activity data across energy, mass, volume, and distance units into canonical SI metrics.

### 2. AI Document Collector & 3-Layer Validation
* **Multimodal Extraction Graph**: Ingests raw utility bills, bills of lading, fuel invoices, and air waybills (PDF/PNG/JPEG) using Mistral Vision and structured OCR graphs.
* **3-Layer Validation Engine**:
  * **Layer 1 (Schema & Format)**: Strict regex, boundary checks, and typed extraction schemas.
  * **Layer 2 (Cross-Field & Physical Plausibility)**: Dimensional validation (verifying billing period, consumption ratios, units against physically viable constraints).
  * **Layer 3 (Historical Anomaly Detection)**: Statistical z-score outlier analysis against the tenant's historic consumption patterns.
* **Deduplication Engine**: Identifies duplicate bills across suppliers, invoice numbers, hash digests, and overlapping date intervals.

### 3. Logistics Optimization & 3D Interactive Truck Packing
* **3D Bin Packing Simulation Engine**:
  * 3-dimensional physical packing algorithm with item rotation limits, volume constraints, and maximum payload safeguards.
  * Indian vehicle fleet library: **Tata Ace (Chhota Hathi)**, **Ashok Leyland Dost**, **Tata 407**, **Eicher Pro 14ft / 17ft / 19ft**, and **32ft Multi-Axle / Single-Axle (MXL/SXL)** trucks.
  * Real-time packing density, volumetric utilization, and weight balance diagnostics.
* **Interactive Three.js 3D Truck Viewer**:
  * Custom 3D truck models with interactive camera controls (rotate, zoom, pan).
  * Real-time animated cargo placement playback showing box-by-box loading sequence.
  * Pacdora-style packaging box catalog: FEFCO corrugated standards, auto-lock cartons, mailers, and custom shipping containers.
* **Routing & Traffic Engine**:
  * Multi-stop routing via OpenRouteService with automated OSRM fallback.
  * Live route visualization with interactive Leaflet/MapLibre map and waypoint sequencing.
  * Real-time ETA estimation and traffic delay analysis.
* **What-If Scenario Comparison**:
  * Mathematical carbon impact comparison comparing baseline operations against optimized fleet packing and route sequencing.
  * Explicit breakdown of saved fuel, reduced distance, higher load factor, and avoided kg CO₂e.

### 4. Cyclic LangGraph Copilot & RAG Engine
* **Multi-Agent Architecture** in `apps/ml-service`:
  * **Intent Node**: Dynamic intent routing parsing user natural language requests with conversational memory resolution.
  * **Vector Retrieval Node**: Semantic search over document chunks and OCR data powered by PostgreSQL `pgvector`.
  * **SQL Ledger Node**: Deterministic execution of audited SQL queries against the emissions database—ensuring numerical queries are answered from true records.
  * **Forecast Node**: Dynamically fetches time-series emission predictions when users ask about future trends.
  * **Anti-Hallucination Guardrails**: Cross-references model output against returned ledger evidence before synthesizing responses.

### 5. BRSR ESG Compliance & Time-Series Forecasting
* **SEBI BRSR Principle 6 Compliance**:
  * Automated aggregation of energy consumption, scope 1 & 2 emissions, and resource intensity metrics.
  * Interactive completeness scoring identifying missing regulatory disclosures.
  * Pixel-perfect PDF report generation compliant with Indian statutory standards.
* **Machine Learning Forecasting**:
  * Predictive models (Prophet, ARIMA, LightGBM) trained on tenant historical emissions to project future quarterly and annual carbon trajectories.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (shipmind-ai)"]
        UI[React 18 + Vite UI]
        ThreeJS[Three.js 3D Truck & Bin Viewer]
        Map[Leaflet / OSRM Route Map]
        CopilotUI[Sustainability Copilot Chat]
        BRSRUI[BRSR Report Generator]
    end

    subgraph CoreAPI ["Core API (Node.js / Express / TypeScript)"]
        Gateway[API Gateway / Auth Middleware]
        CalcEngine[Deterministic Carbon Engine]
        Strategies[12 Calculation Strategies]
        ValidationEngine[3-Layer Validation & Anomaly Detection]
        LogisticsEngine[Logistics & 3D Packing Service]
        RoutingService[ORS & OSRM Routing Provider]
        DocService[Document Processing & PDF Ingestion]
        BullMQ[Queue Workers - Calc & AI]
    end

    subgraph MLService ["ML Service (Python / FastAPI)"]
        LangGraph[Cyclic LangGraph Orchestrator]
        IntentRouter[Dynamic Intent Router]
        SQLLedger[SQL Ledger Node]
        VectorNode[pgvector Search Node]
        ForecastEngine[ARIMA / LightGBM Predictor]
        MistralAI[Mistral Vision & LLM APIs]
    end

    subgraph Storage ["Data Tier"]
        PG[(PostgreSQL 16 + pgvector)]
        Redis[(Redis Queue & Cache)]
    end

    UI --> Gateway
    CopilotUI --> Gateway
    Gateway --> CalcEngine
    Gateway --> ValidationEngine
    Gateway --> LogisticsEngine
    Gateway --> DocService
    Gateway --> BullMQ
    CalcEngine --> Strategies
    LogisticsEngine --> RoutingService
    Gateway --> LangGraph
    LangGraph --> IntentRouter
    IntentRouter --> SQLLedger
    IntentRouter --> VectorNode
    IntentRouter --> ForecastEngine
    IntentRouter --> MistralAI
    CoreAPI --> PG
    MLService --> PG
    CoreAPI --> Redis
```

---

## 📂 Monorepo Workspace Structure

```
Carbon_IQ/
├── apps/
│   ├── core-api/                  # Backend Node.js / Express / Prisma API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── ai-collector/  # Document OCR, classifier, extraction graphs
│   │   │   │   ├── carbon-engine/ # 12 calculation strategies & GLEC normalizer
│   │   │   │   ├── logistics/     # 3D packing engine, routing & fleet allocation
│   │   │   │   ├── brsr/          # SEBI BRSR aggregation & PDF generator
│   │   │   │   ├── copilot/       # RAG orchestrator, chunker, embedder
│   │   │   │   ├── forecast/      # Forecast repository & service bridges
│   │   │   │   └── validation/    # 3-Layer validation & anomaly detector
│   │   │   ├── core/              # Tenancy repository & global errors
│   │   │   └── workers/           # BullMQ background workers (AI, Calc)
│   │   └── package.json
│   │
│   ├── ml-service/                # Python FastAPI Machine Learning & Copilot
│   │   ├── rag_graph/             # LangGraph cyclic state graph & nodes
│   │   │   ├── nodes/             # Intent, SQL Ledger, Vector, Forecast, Synthesis
│   │   │   └── graph.py           # Pipeline compiler & execution flow
│   │   ├── feature_engineering.py # Time-series feature pipeline
│   │   ├── model_trainer.py       # Forecasting model trainers
│   │   ├── model_predictor.py     # Inference engine
│   │   ├── main.py                # FastAPI entrypoints
│   │   └── requirements.txt
│   │
│   └── shipmind-ai/               # Frontend React 18 + Vite Web Application
│       ├── src/
│       │   ├── components/
│       │   │   ├── logistics/     # 3D Truck Viewer, Box Picker, Route Map
│       │   │   ├── brsr/          # Interactive BRSR Report Previewer & Editor
│       │   │   ├── copilot/       # Sustainability AI Copilot Chat Drawer
│       │   │   ├── ImpactVisualization/ # 3D Earth & CO2 particle system
│       │   │   └── layout/        # App navigation & responsive shell
│       │   ├── pages/             # Dashboard, Upload Wizard, Workspaces
│       │   └── services/          # API client bindings
│       └── package.json
│
├── packages/
│   ├── db/                        # Central Prisma Schema, Migrations & Seeds
│   │   ├── prisma/schema.prisma
│   │   └── seedSyntheticHistory.ts
│   └── shared-types/              # Shared TypeScript definitions
│
├── docs/                          # Comprehensive technical documentation & PRD
├── scripts/                       # System diagnostic scripts & dev tooling
├── start-dev.bat                  # One-click Windows CMD startup script
├── start-dev.ps1                  # One-click PowerShell startup script
├── package.json                   # Root monorepo workspace configuration
└── pnpm-workspace.yaml            # PNPM workspace definition
```

---

## 🛠️ Getting Started & Local Setup

### Prerequisites
* **Node.js**: `v20.0.0` or later
* **PNPM**: `v9.0.0` or later (`npm install -g pnpm`)
* **Python**: `3.10` or `3.11`
* **PostgreSQL**: `v15+` with the `pgvector` extension installed
* **Redis**: For BullMQ background job queues

### Environment Configuration
Copy `.env.example` to `.env` in the root workspace and in `apps/core-api`:

```bash
cp .env.example .env
cp .env.example apps/core-api/.env
```

Ensure your `.env` contains the required database connections and API keys:
```env
# Database & Queues
DATABASE_URL="postgresql://user:password@localhost:5432/carbon_os_dev?schema=public"
REDIS_URL="redis://localhost:6379"

# Core API
PORT=3000
JWT_SECRET="your-development-jwt-secret"

# ML Service & Copilot
MISTRAL_API_KEY="your_mistral_api_key_here"
OPENROUTESERVICE_API_KEY="your_ors_key_here"  # Optional, fallback OSRM active
```

### Database Setup & Seeding
Install monorepo dependencies and initialize the database:

```bash
# 1. Install all dependencies across workspaces
pnpm install

# 2. Generate Prisma Client
pnpm db:generate

# 3. Apply schema migrations
pnpm db:migrate

# 4. Seed emission factors and demo Indian logistics fleet
pnpm db:seed
node apps/core-api/seed_indian_trucks.js
```

### Running the Services

#### Option 1: One-Click Startup (Recommended for Windows)
Run the automated dev runner script which verifies port availability and spins up all 4 microservices concurrently:

```powershell
# PowerShell
.\start-dev.ps1

# Or Command Prompt / Batch
start-dev.bat
```

#### Option 2: PNPM Workspace Command
```bash
pnpm dev
```
*(Runs Core API, Vite Web, Python ML Service, and Calculation Worker concurrently)*

---

## 🌐 Service Inventory & Endpoints

| Service | Port | Local URL | Role |
|---|---|---|---|
| **Vite Frontend (shipmind-ai)** | `5173` | [http://localhost:5173](http://localhost:5173) | Interactive Web Dashboard & 3D Logistics UI |
| **Core API** | `3000` | [http://localhost:3000](http://localhost:3000) | REST API, Auth, Carbon Engine, Document Ingestion |
| **ML Service (FastAPI)** | `8000` | [http://localhost:8000](http://localhost:8000) | LangGraph RAG Copilot & Forecast Inference |
| **FastAPI Swagger Docs** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI specifications for ML endpoints |
| **Prisma Studio** | `5555` | `pnpm db:studio` | Database visual GUI inspector |

---

## 🧪 Testing & Verification Suites

Carbon IQ comes with end-to-end integration and workflow validation suites:

```bash
# Run unit & workflow tests across all packages
pnpm test

# Run frontend typecheck & compilation verification
pnpm typecheck

# Execute end-to-end synthetic bill calculation test suite
node calculate_all_test_bills.js

# Test document extraction and OCR verification pipeline
node run_full_document_pipeline.js
```

---

## 🔐 Security & Multi-Tenant Isolation

* **Tenant-Scoped Architecture**: All database interactions are scoped to `organization_id` using Prisma tenant-scoped repository patterns. Cross-tenant data leakage is prevented at both the application and database tiers.
* **Grounded RAG Guardrails**: The sustainability copilot utilizes tenant-isolated hybrid vector search and parameterized SQL queries to prevent unauthorized document or ledger access.
* **Audit Trail**: Every emissions calculation records its exact input parameters, normalizer ratio, applied emission factor ID, factor provenance URL/source, and execution timestamp in the immutable `EmissionLedger`.

---

<div align="center">
  <sub>Built for precision carbon accounting, logistics optimization, and statutory ESG compliance.</sub>
</div>
