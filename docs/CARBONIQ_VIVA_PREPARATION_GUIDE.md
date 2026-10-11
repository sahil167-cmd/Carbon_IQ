# CarbonIQ — Comprehensive Viva & Technical Review Master Guide

> **Prepared for:** Final Project Review & Viva Voce  
> **Platform:** CarbonIQ (Enterprise AI-Powered Scope 1, 2, & 3 Carbon Emission Intelligence Platform)  
> **Key Tech Stack:** Node.js/TypeScript (NestJS/Express), Python (FastAPI, Scikit-Learn, XGBoost, LangGraph), PostgreSQL + pgvector, Mistral AI, Docker, React/Tailwind.

---

## 1. Executive System Pitch (Your 60-Second Elevator Intro)

> *"CarbonIQ is an enterprise carbon-accounting and intelligence platform designed to solve the three hardest problems in sustainability tech: **unstructured document extraction**, **deterministic GHG Protocol emission calculations**, and **auditable predictive intelligence**.  
> 
> Unlike basic demo dashboards or wrapper LLMs, CarbonIQ uses a **Tri-Pillar Hybrid Architecture**:
> 1. **Deterministic Calculation Engine**: Strict mathematical accounting complying with GHG Protocol, GLEC Framework, and DEFRA/EPA factors.
> 2. **Machine Learning Pipeline**: Multi-model tournament forecasting (XGBoost, Regressed Lag Models, Isolation Forest anomaly detection) with 80% & 95% confidence intervals.
> 3. **Production LangGraph RAG Copilot**: Grounded multi-source intelligence combining pgvector semantic search over uploaded PDFs with real-time SQL ledger verification and zero-hallucination guardrails."*

---

## 2. Machine Learning Pipeline (Detailed Breakdown)

### Q: "Did you train your own models, or are you just calling an API?"
**Your Answer:**
> *"We do **both**:  
> - For **Numerical Forecasting & Anomaly Detection**, we built and trained our own **in-house Scikit-Learn & XGBoost ML pipeline** running inside our Python ML service (`apps/ml-service`).
> - For **Natural Language Reasoning & Synthesis**, we use **Mistral AI (`mistral-small-latest`)** connected via a LangGraph state machine with strict database grounding."*

---

### Q: "Explain your ML Forecasting Architecture & Tournament Pipeline."
**Your Answer:**
> *"Our forecasting engine (`model_predictor.py`) implements a **Dynamic ML Tournament**. When an organization requests a forecast:
> 1. **Feature Engineering**: We extract time-series lag features ($t-1, t-2, t-3$), rolling moving averages (3-month & 6-month), exponential decay weights, and Scope 1/2/3 driver correlations.
> 2. **Model Tournament**: The pipeline trains and evaluates candidate models on historical emission data:
>    - **XGBoost Regressor** (Gradient-boosted decision trees for non-linear driver interactions)
>    - **Ridge & Lasso Penalized Regressors** (L1/L2 regularized linear models for short history)
>    - **Damped Moving Average & Exponential Smoothing** (Robust baselines when records $< 6$ months)
> 3. **Selection Metric**: The pipeline computes **RMSE (Root Mean Square Error)** and **MAE (Mean Absolute Error)** using time-series cross-validation (rolling-origin walk-forward validation). The best-performing model is dynamically chosen as the canonical forecaster.
> 4. **Confidence Intervals**: We calculate **80% and 95% prediction intervals** using residual variance scaling ($\mu \pm 1.28\sigma$ for 80%, $\mu \pm 1.96\sigma$ for 95%)."*

---

### Q: "How does your Anomaly Detection model work?"
**Your Answer:**
> *"We use **Isolation Forest (`sklearn.ensemble.IsolationForest`)** combined with **Z-score Rolling Thresholding**:
> - **Isolation Forest** isolates anomalous calculation records by randomly partitioning feature space (activity quantity, emission intensity per unit, month-over-month delta). Points isolated in fewer splits are flagged as anomalies.
> - **Operational Refrigerant / Spike Isolator**: It separates massive one-off anomalies (such as fugitive refrigerant leaks or emergency generator run-time) from the recurring operational baseline so that forecasts are not artificially skewed."*

---

## 3. RAG Architecture (Retrieval-Augmented Generation)

### Q: "How is your RAG different from a naive LangChain demo?"
**Your Answer:**
> *"Naive RAG blindly chunks text, calls top-K vector search, and hopes the LLM does arithmetic. That fails in carbon accounting because LLMs hallucinate numbers.  
> 
> CarbonIQ implements a **4-Node Cyclic State Machine via LangGraph** (`rag_graph`):
> 
> ```
> [Intent Node] ──► [Multi-Source Parallel Retrieval] ──► [Guardrail & Unit Normalizer] ──► [Grounded Synthesis]
>                       ├─ SQL Ledger (PostgreSQL)
>                       ├─ ML Forecast (XGBoost)
>                       └─ pgvector Hybrid Search
> ```
> 
> 1. **Intent Node**: Neural LLM intent parsing with conversational memory resolution (resolving pronouns like *'Why is it so high?'* into the preceding entity).
> 2. **Multi-Source Retrieval**: Queries PostgreSQL for exact ledger arithmetic, calls our ML forecasting model for predictions, and executes hybrid pgvector search over uploaded PDFs.
> 3. **Guardrail Node**: Validates unit conversions (1 metric tonne = 1,000 kg CO₂e) and ensures mathematical consistency.
> 4. **Synthesis Node**: Places document context inside `<retrieved_document_evidence>` XML tags with prompt injection defense, forcing Mistral to answer strictly from evidence with verified citations."*

---

### Q: "What vector database and embedding model do you use?"
**Your Answer:**
> *- **Vector Database**: **PostgreSQL with the `pgvector` extension** (`kb_chunks` table with `vector(1536)`). This eliminates the operational overhead of external vector DBs and allows transactional SQL joins between documents, organizations, and vector embeddings.
> - **Embedding Model**: **Mistral Embed (`mistral-embed`)** generating 1536-dimensional normalized vectors.
> - **Search Algorithm**: **Cosine Distance Operator (`<=>`)** combined with **Lexical Full-Text Search (RRF - Reciprocal Rank Fusion)** and strict multi-tenant isolation (`organizationId = %s`)."*

---

### Q: "What chunking strategy did you use?"
**Your Answer:**
> *- **Token-Aware Semantic Chunking**: 500–800 tokens per chunk with **15% overlap** (75–120 tokens).
> - **Boundary Preservation**: We split along double newlines, headings (`#`, `##`), and table boundaries so that headers are never separated from table values.
> - **Metadata Enrichment**: Every chunk is prefixed with the document's category, scope, extracted OCR fields, and calculated emissions.*

---

## 4. Calculation Engine & GHG Standards

### Q: "Which carbon accounting standards and methodologies did you implement?"
**Your Answer:**
> *"CarbonIQ strictly adheres to:
> 1. **GHG Protocol Corporate Standard (Scope 1, Scope 2, Scope 3)**.
> 2. **GLEC Framework (Global Logistics Emissions Council v3.0)** for freight and logistics.
> 3. **ISO 14064-1** for organizational GHG quantification and reporting."*

---

### Q: "Explain the calculation logic across Scope 1, 2, and 3."

| Scope | Definition & Coverage | Calculation Methodology | Emission Factor Source |
|---|---|---|---|
| **Scope 1** (Direct) | Stationary combustion (boilers, generators) & Mobile combustion (fleet diesel/petrol), fugitive leaks. | $\text{Emissions (kg CO}_2\text{e)} = \text{Fuel Volume (Liters)} \times \text{Factor (kg CO}_2\text{e/L)}$ | **DEFRA 2024 / EPA GHGRP** |
| **Scope 2** (Indirect Electricity) | Purchased electricity and grid consumption across facilities. | **Dual-Reporting**: <br>1. *Location-Based*: $\text{kWh} \times \text{Grid Factor (kg CO}_2\text{e/kWh})$<br>2. *Market-Based*: Accounts for Green Tariffs, RECs, & Guarantees of Origin (GOs = 0 kg CO₂e). | **IEA, US eGRID (NYUP), CEA India (CO2 Baseline Database)** |
| **Scope 3** (Value Chain) | 15 Categories (Upstream Freight, Purchased Goods/Steel, Business Travel, Commuting). | **GLEC Tonne-Km Method**: <br>$\text{Emissions} = \text{Weight (Tonnes)} \times \text{Distance (km)} \times \text{Mode Factor (Air/Ocean/Road)}$. <br>Also supports **Spend-Based** ($\text{Spend \$} \times \text{EEIO factor}$). | **GLEC v3.0, DEFRA, US EEIO** |

---

## 5. Confidence Scores (Crucial Viva Question)

### Q: "How are Confidence Scores calculated across your system?"
**Your Answer:**
> *"We compute confidence across **4 distinct layers**:
> 
> 1. **OCR / Data Extraction Confidence ($C_{\text{ocr}} \in [0.0, 1.0]$)**:
>    - Computed per extracted field (e.g. `kwhConsumed`, `weightKg`) based on token character bounding-box scores and regex validation. If confidence $< 0.85$, the field is flagged with `needsReview: true`.
> 
> 2. **Emission Factor Matching Confidence ($C_{\text{ef}} \in [0.0, 1.0]$)**:
>    - Hierarchical matching score: Supplier-specific factor (1.0) $\rightarrow$ Regional sub-grid factor (0.90) $\rightarrow$ National average factor (0.75) $\rightarrow$ Global default proxy (0.60).
> 
> 3. **ML Forecast Confidence (Prediction Intervals)**:
>    - Quantified via **80% and 95% confidence intervals** derived from walk-forward cross-validation residuals. High reliability is assigned when $R^2 > 0.85$ and history $\ge 6$ periods.
> 
> 4. **RAG Semantic Retrieval Similarity Score ($S \in [0.0, 1.0]$)**:
>    - Computed as Cosine Similarity: $S = 1.0 - (\vec{u} \cdot \vec{v})$. Chunks with similarity $> 0.70$ are included as high-confidence citations."*

---

## 6. Datasets, Database Schema, & Security

### Q: "What database architecture and tables are used?"
**Your Answer:**
> *"We use **PostgreSQL with Prisma ORM** in a multi-tenant relational schema:
> - `organizations`: Tenant root enforcing multi-tenant isolation.
> - `documents`: Storage of uploaded PDFs with S3/MinIO keys, processing status (`UPLOADED` $\rightarrow$ `PROCESSING` $\rightarrow$ `APPROVED`).
> - `extracted_data`: Versioned JSON storage of OCR-extracted fields (`fieldsJson`).
> - `calculated_emissions`: Immutable ledger of calculation records linking activity values, units, emission factors, and resulting kg CO₂e.
> - `emission_factors`: Master library of DEFRA, EPA, IEA, and GLEC factors with validity periods.
> - `kb_documents` & `kb_chunks`: Knowledge base documents and vector chunks (`embedding vector(1536)` indexed via pgvector).
> 
> **Security Guarantee**: Every SQL and pgvector query enforces `WHERE organizationId = :orgId` derived from the verified JWT token, ensuring Organization A can never access Organization B's data."*

---

## 7. Fast-Fire Viva Cheat Sheet (Memorize These Points)

1. **What is 1 metric tonne in kg?**  
   $\rightarrow 1\text{ metric tonne (t CO}_2\text{e)} = 1,000\text{ kg CO}_2\text{e}$.
2. **What is GWP?**  
   $\rightarrow$ Global Warming Potential (e.g. $\text{CO}_2 = 1, \text{CH}_4 \approx 28, \text{N}_2\text{O} \approx 265, \text{R-410A} = 2,088$).
3. **What is the difference between Scope 2 Location-Based vs Market-Based?**  
   $\rightarrow$ **Location-based** uses the average grid emission intensity of the physical region. **Market-based** accounts for contractual instruments (like PPAs or RECs/GOs) purchased by the organization.
4. **What is the GLEC metric for freight?**  
   $\rightarrow$ **Tonne-Kilometer ($\text{tonne}\cdot\text{km}$)** = Mass in metric tonnes $\times$ distance in kilometers.
5. **How does the system prevent LLM hallucinations?**  
   $\rightarrow$ The LLM does **zero math**. Calculations come from PostgreSQL ledger; forecasts come from XGBoost; documents come from pgvector. The LLM only synthesizes and formats evidence.
6. **How is document indexing automated?**  
   $\rightarrow$ On document upload, `ai-collector.service.ts` triggers `IngestionService.ingestDocument` in the background, which extracts text via `pypdf`, chunks it, computes embeddings, and stores them in `kb_chunks`. Zero manual CLI work is needed.
