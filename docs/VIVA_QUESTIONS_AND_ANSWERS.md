# CarbonIQ — Comprehensive External Viva Question Bank (85 Questions & Answers)
**Final-Year Project Defense | Exhaustive Repository-Grounded Q&A**

---

## Group A: Project Overview & Problem Statement

### Q1: What is CarbonIQ in simple words?
**Answer:** CarbonIQ is an enterprise carbon intelligence and logistics optimization platform. It automates carbon accounting across Scope 1, Scope 2, and Scope 3 by extracting data from bills and freight manifests, calculating greenhouse gas emissions using verified emission factors, optimizing freight loading in 3D space for Indian trucks, and forecasting emission trajectories.

### Q2: Why is carbon accounting important today for Indian companies?
**Answer:** SEBI (Securities and Exchange Board of India) has mandated Business Responsibility and Sustainability Reporting (BRSR) for the top 1,000 listed entities. Indian firms must provide reasonable assurance on Scope 1 and Scope 2 emissions, and are increasingly required by global supply chain partners to report Scope 3 freight emissions.

### Q3: What is the single most critical architectural principle of your project?
**Answer:** **"AI extracts, predicts, drafts, and explains. AI NEVER calculates or invents an emissions number."** Calculations are 100% deterministic, executed via dedicated mathematical code using `Decimal.js` to ensure financial-grade auditability.

### Q4: What are the three GHG Protocol Scopes?
**Answer:**
- **Scope 1 (Direct Emissions):** From sources owned or controlled by the enterprise (e.g., diesel generators, company trucks, refrigerant leaks).
- **Scope 2 (Indirect Energy Emissions):** From purchased electricity, steam, heating, or cooling.
- **Scope 3 (Value Chain Emissions):** Upstream and downstream emissions across the value chain, such as freight transportation (Category 4), business travel (Category 6), and employee commute (Category 7).

### Q5: What is the main problem with existing tools like Excel or pure LLM wrappers?
**Answer:** Spreadsheets lack data validation, access control, and automated factor provenance. LLM wrappers suffer from hallucinations, non-reproducible calculations, and lack of mathematical rigor required by statutory auditors.

### Q6: How does CarbonIQ bridge the gap between carbon accounting and logistics?
**Answer:** Up to 80% of an enterprise's footprint often lies in Scope 3 logistics. CarbonIQ does not just measure freight emissions after the fact; it simulates and optimizes 3D truck packing and fleet assignment beforehand, eliminating empty truck space and cutting carbon before the shipment leaves the warehouse.

---

## Group B: Architecture & System Design

### Q7: Explain the high-level architecture of CarbonIQ.
**Answer:** CarbonIQ follows a modular microservice architecture:
1. **Frontend:** React 19 SPA built with Vite and TailwindCSS.
2. **Core API:** Node.js Express service managing authentication, documents, logistics, and carbon calculations.
3. **ML Service:** FastAPI Python service for time-series forecasting and multi-agent LangGraph RAG.
4. **Data Layer:** PostgreSQL with `pgvector` for structured tables and vector embeddings, plus Redis with BullMQ for asynchronous queue workers.

### Q8: Why did you separate the backend into Node.js (Core API) and Python (ML Service)?
**Answer:** Node.js provides high throughput, non-blocking I/O ideal for REST APIs, file uploads, and deterministic business logic. Python is the industry standard for scientific computing, featuring mature libraries like `xgboost`, `scikit-learn`, `pandas`, and `langgraph`.

### Q9: How do your microservices communicate?
**Answer:** The Core API communicates with the Python ML service via secure HTTP REST endpoints (`POST /forecast/predict`, `POST /rag/chat`). For asynchronous background tasks like document extraction and batch calculation, BullMQ on Redis handles job distribution.

### Q10: How does your system achieve fault tolerance if the ML service is down?
**Answer:** In `apps/core-api/src/modules/copilot/query-planner.ts`, if external LLM calls or ML microservice endpoints fail or time out, the system catches the exception and falls back to a deterministic semantic query engine and local baseline calculations. The core platform never crashes.

### Q11: What design patterns did you implement in the backend?
**Answer:**
- **Strategy Pattern:** In `StrategyRegistry.ts` for 12 interchangeable carbon calculation strategies.
- **Repository Pattern:** In `TenantScopedRepository.ts` to isolate Prisma database queries.
- **Constructive Heuristic Pattern:** In `CargoPackingEngine.ts` for 3D bin packing.
- **State Machine Pattern:** In `DocumentStatusHistory` to manage document ingestion lifecycles.

### Q12: How are asynchronous background tasks managed?
**Answer:** Using **BullMQ** backed by **Redis**. When a user uploads a PDF, the API responds immediately with an `UPLOADED` status and enqueues a job to `ai.worker.ts` for background OCR processing.

---

## Group C: React, TypeScript & Frontend

### Q13: Why did you choose React 19 and Vite instead of Next.js?
**Answer:** CarbonIQ is an authenticated, data-intensive Single Page Application (SPA) with real-time 3D WebGL rendering. Vite offers instant HMR and lightweight bundle sizes without the unnecessary server-side rendering (SSR) overhead of Next.js.

### Q14: How is state managed in the frontend?
**Answer:** Server-side state is managed using `@tanstack/react-query` v5, which handles caching, background re-fetching, and declarative mutation invalidation. Local UI state is handled using React hooks (`useState`, `useReducer`).

### Q15: How do you render 3D truck cargo loading in the browser?
**Answer:** Using **Three.js** via `@react-three/fiber` and `@react-three/drei`. The backend sends 3D coordinates `(xMm, yMm, zMm)` and dimensions, which the component converts to Three.js mesh boxes rendered inside an interactive WebGL canvas with OrbitControls.

### Q16: How is route authentication implemented in the frontend?
**Answer:** Through `ProtectedRoute.tsx` wrapped around routes in `router/index.tsx`. It inspects `localStorage` for a valid JWT token. If missing or expired, it redirects the user to `/login`.

### Q17: What component libraries are used?
**Answer:** Unstyled, fully accessible Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`) styled with TailwindCSS 3.4 and Lucide React icons.

### Q18: Did the frontend compile cleanly for production?
**Answer:** Yes, `pnpm --filter @carbon-iq/web build` compiles cleanly with zero TypeScript errors via `tsc -b && vite build` in ~23 seconds.

---

## Group D: Backend & REST APIs

### Q19: Which framework powers the Core API?
**Answer:** Express.js 4.19 with TypeScript, organized into modular domain folders (`auth`, `carbon-engine`, `logistics`, `copilot`, `document`, `brsr`).

### Q20: How are incoming requests validated?
**Answer:** Using **Zod** schemas in controllers and validators. If required fields are missing or have invalid types, the request is rejected with a structured HTTP 400 response before touching database logic.

### Q21: What security middleware is applied to the Express server?
**Answer:**
- `helmet`: Sets secure HTTP response headers (CSP, HSTS).
- `cors`: Restricts origins to configured frontend domains.
- `express-rate-limit`: Prevents API abuse and brute-force attacks.
- `cookie-parser`: Securely extracts HTTP-only cookies.

### Q22: What HTTP status codes do you return for errors?
**Answer:**
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Cross-tenant access attempt.
- `404 Not Found`: Entity does not exist.
- `422 Unprocessable Entity`: Business rule or invariant violation.
- `500 Internal Server Error`: Unhandled server exception.

### Q23: How do you prevent floating-point calculation errors in JavaScript?
**Answer:** We use **`Decimal.js`** (`decimal.js` v10.6.0). Standard JavaScript floats can cause precision loss (`0.1 + 0.2 = 0.30000000000000004`). With `Decimal.js`, all emission multiplications and unit conversions are exact to financial precision.

### Q24: How does the application generate statutory SEBI BRSR PDFs?
**Answer:** Using `pdfkit`. The `brsr` module aggregates verified Scope 1 and Scope 2 emissions for the reporting period, formats them according to SEBI's Principle 6 statutory template, and generates a downloadable PDF report.

---

## Group E: PostgreSQL, Prisma & pgvector

### Q25: Why PostgreSQL instead of MongoDB?
**Answer:** Carbon accounting is an immutable financial ledger requiring strict ACID transactions, foreign-key relational integrity, and cross-table joins between documents, sites, and emission factors. Furthermore, PostgreSQL supports the `pgvector` extension for AI semantic search.

### Q26: How does Prisma ORM fit into your stack?
**Answer:** Prisma provides type-safe database queries, schema migrations, and client generation (`@prisma/client`). Schema changes are declared declaratively in `packages/db/prisma/schema.prisma`.

### Q27: How is `pgvector` used in CarbonIQ?
**Answer:** The `kb_chunks` table includes a `vector(1536)` column. Regulatory documents and evidence chunks are embedded into 1536-dimensional vectors. When a user asks a question, we compute cosine distance using the `<=>` operator in PostgreSQL:
```sql
SELECT 1 - (embedding <=> $queryVector::vector) AS similarity FROM kb_chunks
```

### Q28: How do you run vector similarity queries in Prisma?
**Answer:** Prisma does not have native query builders for vector distance operators, so we execute tagged raw SQL queries using `prisma.$queryRaw` with full parameter escaping to prevent SQL injection.

### Q29: What are the primary tables in your schema?
**Answer:** `organizations`, `sites`, `reporting_periods`, `documents`, `extracted_data`, `emission_factors`, `calculated_emissions`, `calculation_logs`, `shipments`, `cargo_items`, `vehicles`, `optimization_runs`, and `kb_chunks`.

### Q30: How do you handle schema migrations?
**Answer:** Through Prisma CLI: `pnpm --filter @carbon-os/db migrate:dev` in development and `migrate:deploy` in production environments.

---

## Group F: Authentication & Tenant Isolation

### Q31: How is authentication handled?
**Answer:** Using JSON Web Tokens (JWT) signed with a secure server secret (`JWT_SECRET`). Passwords are encrypted using `bcrypt` with 10 salt rounds.

### Q32: What is multi-tenancy and how do you prevent cross-tenant data leakage?
**Answer:** Multi-tenancy means multiple independent companies share the same application and database without seeing each other's data. CarbonIQ prevents data leakage by:
1. Subclassing repositories from `TenantScopedRepository`, which mandates `organizationId` on all queries.
2. Injecting `WHERE organizationId = req.user.organizationId` into every read/write operation.
3. Restricting vector chunk searches so tenants can only query their own chunks plus shared global knowledge (`d."organizationId" = $1 OR d."organizationId" IS NULL`).

### Q33: Can Tenant A ever see Tenant B's vehicle or shipment?
**Answer:** No. Unit tests in `FleetAllocationEngine.test.ts` (TEST 10) explicitly verify that if Tenant A tries to allocate Tenant B's vehicle, the engine throws an authorization error and excludes the vehicle.

### Q34: What user roles are supported?
**Answer:** Role-based access control (RBAC) supports `ADMIN`, `MANAGER`, and `AUDITOR`.

### Q35: How are session tokens stored in the frontend?
**Answer:** Tokens are stored in browser `localStorage` and attached to API calls via the `Authorization: Bearer <token>` header.

### Q36: What happens when an auth token expires?
**Answer:** The Axios interceptor receives an HTTP 401 response, clears the local storage session, and redirects the user to the `/login` route.

---

## Group G: Carbon Accounting & Emission Factors

### Q37: What is an Emission Factor (EF)?
**Answer:** An emission factor is a representative value that relates the quantity of an activity (e.g., litres of diesel combusted, kWh of electricity consumed, tonne-km of freight transported) with the quantity of greenhouse gas released into the atmosphere.

### Q38: What emission factor databases are integrated into CarbonIQ?
**Answer:**
1. **DEFRA / UK DESNZ (2026):** Fuel combustion, freight vehicles, flights, waste.
2. **CEA (Central Electricity Authority of India) v20:** Indian national electricity grid baseline emission factors (0.716 kg CO₂e / kWh).
3. **US EPA GHG Hub:** Commercial and industrial stationary fuels.
4. **GLEC Framework v3:** Global logistics freight factors.

### Q39: How do you verify that an emission factor is applicable?
**Answer:** Through a matching hierarchy in `emission-factor.provider.ts`:
1. Exact match on `scope`, `category`, and `subCategory`.
2. Geographic match (e.g., India CEA grid factor for Indian sites).
3. Temporal validity match (selecting the factor matching the document's reporting period year).
4. Unit compatibility check (e.g., kWh to kWh, or automated unit conversion via `unit-converter.ts`).

### Q40: What is the difference between Location-based and Market-based Scope 2 emissions?
**Answer:**
- **Location-based:** Uses the average grid emission factor for the physical region where electricity is consumed (e.g., CEA factor for India).
- **Market-based:** Reflects emissions from specific electricity contracts that the company has chosen (e.g., 0 kg CO₂e / kWh if purchasing solar power via Power Purchase Agreements or green tariffs).

### Q41: How do you handle fugitive emissions from air conditioners or refrigeration?
**Answer:** Through `FugitiveGwpStrategy.ts`. The quantity of leaked refrigerant (kg) is multiplied by its 100-year Global Warming Potential (GWP) from IPCC Sixth Assessment Report (AR6). For example, 1 kg of R-410A has a GWP of 2,088 kg CO₂e.

### Q42: Why not use an LLM for the actual emission calculation?
**Answer:** Large Language Models are probabilistic token predictors, not mathematical processors. They can suffer from arithmetic hallucinations, precision rounding errors, and non-deterministic variations between runs. Statutory compliance auditors (like ISO 14064 or SEBI BRSR assurance providers) require reproducible calculations backed by a traceable formula.

### Q43: How do you distinguish zero emissions from unavailable data?
**Answer:** We never treat missing data as zero emissions. If an invoice lacks consumption data, the document enters the `NEEDS_REVIEW` state and no `CalculatedEmissions` row is written until verified. An explicit null value indicates missing data, whereas 0.00 kg CO₂e is reserved for verified zero-carbon activities (like solar electricity under market-based reporting).

---

## Group H: OCR & AI Extraction

### Q44: How does the document extraction pipeline work?
**Answer:** When a file is uploaded, `ai.worker.ts` triggers Mistral Vision (`pixtral-12b`). The model parses the visual layout of the PDF or image and extracts JSON key-value pairs (billing period, quantity, unit, supplier, fuel/electricity type).

### Q45: What happens when extracted data is missing or ambiguous?
**Answer:** The extracted payload goes through a 3-layer validation pipeline in `ai-collector.service.ts`. If required fields are absent or confidence scores fall below 0.70, the document status is set to `NEEDS_REVIEW` and surfaced in the `AIReviewQueue` UI for manual correction by a human reviewer.

### Q46: How do you prevent duplicate document uploads?
**Answer:** By computing a cryptographic SHA-256 hash checksum of the file content in `DocumentFingerprint`. If a matching checksum exists for that organization, the system alerts the user and prevents duplicate carbon accounting.

### Q47: Can CarbonIQ parse documents other than PDFs?
**Answer:** Yes. The ingestion pipeline supports PDF, DOCX (via `mammoth`), XLSX/CSV (via `xlsx`), and raw text files.

### Q48: What is "Canonical Activity Normalization"?
**Answer:** Raw invoices use dozens of different unit notations (e.g., "litres", "L", "ltr", "gal", "kWh", "MWh", "t-km"). The `canonical-activity.normalizer.ts` normalizes these into standard SI units and maps them to standard GHG Protocol categories.

### Q49: Does the system work if the external OCR API is down?
**Answer:** Yes. Users can bypass AI extraction using the Manual Entry Workspace (`/app/manual-entry`), inputting numbers directly into the deterministic calculation engine.

---

## Group I: Machine Learning & Forecasting

### Q50: What ML algorithm does CarbonIQ use for carbon forecasting?
**Answer:** A **6-tier Data-Adaptive Forecasting Ladder** implemented in `apps/ml-service/model_predictor.py`. Depending on the number of historical monthly periods ($N$), the engine automatically selects:
- $N=1$: Verified Baseline Projection
- $N=2$: Driver-Informed Short-History Forecast
- $N=3 \text{ to } 5$: Weighted Moving Average (WMA) / Drift
- $N=6 \text{ to } 11$: Damped Holt Exponential Smoothing
- $N=12 \text{ to } 17$: Seasonality-Aware Models (SARIMA/STL)
- $N \ge 18$: Regularized **XGBoost** with hyperparameter tuning

### Q51: What features are fed into the XGBoost model?
**Answer:** Time-lagged features (emissions at $t-1, t-2, t-3, t-12$), rolling statistics (3-month moving average and standard deviation), production capacity metrics, and month-of-year cyclical encoding ($\sin/\cos$).

### Q52: What is the difference between forecasting and anomaly detection?
**Answer:**
- **Forecasting:** Projects expected recurring emissions into future months based on underlying operational trends and seasonal demand.
- **Anomaly Detection:** Identifies abnormal historical events (like a major pipe burst, refrigerant leak, or meter failure) that deviate from recurring operations.

### Q53: How does the system prevent anomalies from skewing future forecasts?
**Answer:** Through **Anomaly Demarcation**. In `model_predictor.py`, historical emissions are partitioned into:
$$\text{Total History} = \text{Recurring Baseline} + \text{Non-Recurring Anomaly}$$
The ML forecast trains exclusively on the recurring baseline so that a one-off catastrophe in the past does not artificially inflate future emission targets.

### Q54: What mathematical invariant is enforced across forecasted scopes?
**Answer:** **Exact Scope Reconciliation:**
$$\text{Total Forecast}(t) = \text{Scope 1 Forecast}(t) + \text{Scope 2 Forecast}(t) + \text{Scope 3 Forecast}(t)$$
The engine guarantees that the sum of individual scope models equals the aggregate company forecast.

### Q55: How do you evaluate the forecast model?
**Answer:** Using Mean Absolute Percentage Error (MAPE) and Root Mean Squared Error (RMSE) on historical rolling-origin time-series cross-validation.

### Q56: What happens if an organization has only 2 months of historical data?
**Answer:** The system selects **Mode 2 (Driver-Informed Short-History Forecast)** with a moderate confidence score of 0.55. It refuses to fit an over-parameterized deep learning or XGBoost model that would overfit.

---

## Group J: RAG, Embeddings & LLMs

### Q57: Why did you use RAG instead of fine-tuning an LLM?
**Answer:** Fine-tuning an LLM has three major flaws for carbon accounting:
1. It bakes data into model weights, making real-time updates impossible when a new bill is uploaded.
2. It cannot provide exact verifiable page-and-chunk citations for auditability.
3. It risks cross-tenant data leakage if one model serves multiple organizations.
**RAG (Retrieval-Augmented Generation)** retrieves current, tenant-isolated records at query time and provides auditable citations.

### Q58: What embedding models and vector dimensions do you use?
**Answer:** Google Gemini (`gemini-embedding-001`) or OpenAI (`text-embedding-3-small`) generating 1536-dimensional normalized vectors stored in `pgvector`.

### Q59: Explain the LangGraph cyclic multi-agent workflow in your ML service.
**Answer:** Implemented in `apps/ml-service/rag_graph/graph.py`:
1. `intent_node`: Analyzes the user question and detects intent.
2. `sql_ledger_node`: Directly queries verified emission totals from PostgreSQL.
3. `vector_node`: Fetches relevant knowledge chunks using cosine distance.
4. `synthesis_node`: Generates a clear natural language explanation grounded in retrieved facts.
5. `guardrail_node`: Inspects the response. If the model hallucinates an ungrounded number, the guardrail rejects it and injects verified ledger figures.

### Q60: What happens when the retrieval system finds irrelevant documents?
**Answer:** We enforce a similarity score threshold (minimum cosine similarity of 0.35 in `searchChunks`). If retrieved chunks fall below this threshold, they are discarded. The LLM is instructed to state that no relevant documentation exists rather than inventing an answer.

### Q61: How do you protect against Prompt Injection attacks?
**Answer:** User queries are never concatenated directly into system prompts. In `copilot.service.ts`, untrusted input is wrapped inside strict boundary tags (`<<<UNTRUSTED_USER_INPUT_START>>>`) and system prompts instruct the LLM to ignore any command attempting to alter safety constraints.

### Q62: What is the "Zero-Blindness Engine" in your Copilot?
**Answer:** In `query-planner.ts`, user queries are classified before LLM retrieval. Simple greetings ("hi", "hello") return immediately without costly database searches, while questions about emissions trigger dedicated SQL ledger lookups.

### Q63: Can the Copilot answer questions about general GHG Protocol definitions?
**Answer:** Yes. The global knowledge base contains indexed GHG Protocol corporate standards, enabling the Copilot to explain concepts like Scope 3 categories or radiative forcing.

---

## Group K: Logistics, 3D Packing & Fleet Optimization

### Q64: What is the 3D Bin Packing Problem (3D-BPP)?
**Answer:** It is an NP-hard combinatorial optimization problem that seeks to place a set of 3D rectangular items into a minimum number of rectangular containers without overlapping and respecting weight/stability constraints.

### Q65: Why can a packing heuristic fail to find the globally optimal arrangement?
**Answer:** Because 3D-BPP is NP-hard, checking every possible permutation of item order, rotation, and coordinate placement for dozens of items would require exponential time ($O(n! \cdot 6^n)$), taking days to calculate. A constructive corner-point heuristic finds a high-quality feasible packing solution in milliseconds, which is necessary for real-time web applications.

### Q66: Explain the corner-point candidate generation in your packing engine.
**Answer:** When an item of size $(\Delta x, \Delta y, \Delta z)$ is placed at $(x, y, z)$, the engine creates three candidate placement points:
1. Right adjacent: $(x + \Delta x, y, z)$
2. Front adjacent: $(x, y + \Delta y, z)$
3. Top adjacent: $(x, y, z + \Delta z)$
Subsequent items are placed at the lowest, deepest available candidate point.

### Q67: What physical constraints are enforced during 3D packing?
**Answer:**
- **Boundary fitting:** Item must fit within the truck's length, width, and height.
- **Collision non-overlap:** Box boundaries cannot intersect previously placed boxes.
- **Gravity & Support:** Boxes placed at $z > 0$ must have at least 70% support from underlying boxes.
- **Fragility & Max Stack Weight:** Non-stackable boxes cannot have items on top; stackable boxes have weight limits.
- **Payload Capacity:** Total placed cargo weight cannot exceed the vehicle's rated maximum payload.

### Q68: What is the Lexicographic Objective Hierarchy in your fleet optimizer?
**Answer:** In `FleetOptimizationEngine.ts`, objectives are evaluated in strict priority order:
1. **Minimize vehicle count:** 1 truck strictly beats any 2-truck combination.
2. **Maximize payload utilization percentage:** $\frac{\text{Placed Weight}}{\text{Vehicle Payload Capacity}}$.
3. **Maximize cargo volume utilization percentage:** $\frac{\text{Placed Volume}}{\text{Vehicle Cargo Volume}}$.
4. **Minimize unused payload capacity (grams).**
5. **Minimize unused cargo volume ($\text{mm}^3$).**

### Q69: What does "bounded optimization" mean in your implementation?
**Answer:** Bounded optimization sets strict practical resource limits on combinatorial search: `maxExecutionTimeMs: 5000` (5 seconds) and `maxCandidateSolutions: 50`. If the search space is too large, the engine safely terminates and returns the best valid solution found, flagging `searchComplete: false`.

### Q70: How does LIFO (Last-In, First-Out) unloading sequence work?
**Answer:** For shipments with multiple stops, cargo destined for the final delivery stop is packed deepest inside the truck ($x=0$), while cargo for the first stop is placed near the rear doors ($x \to L_{\text{truck}}$).

---

## Group L: Routing, Maps & Traffic

### Q71: How are road distances and routes calculated?
**Answer:** Through `RoutingService.ts` calling the OpenRouteService (ORS) API. It returns turn-by-turn geometry polylines, road distance in kilometres, and driving duration.

### Q72: What would happen if the routing provider failed or ran out of API quota?
**Answer:** The system has an automatic offline fallback: it computes the Great-Circle distance using the Haversine formula and multiplies by a calibrated **1.28x Indian highway tortuosity factor** to estimate real road distance without breaking the workflow.

### Q73: How is logistics carbon intensity measured?
**Answer:** In **grams of CO₂e per tonne-kilometre ($\text{g CO}_2\text{e / t-km}$)**:
$$\text{Intensity} = \frac{\text{Total CO}_2\text{e in kg} \times 1000}{\text{Tonne-Kilometres}}$$
A lower intensity indicates more efficient freight loading.

### Q74: What is the Haversine formula?
**Answer:** It calculates the shortest angular distance between two latitude/longitude points on the Earth's surface:
$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
where $R = 6371 \text{ km}$.

### Q75: How does traffic affect logistics emissions?
**Answer:** Traffic congestion increases engine idling time and lowers fuel efficiency. CarbonIQ adjusts expected fuel burn multipliers based on urban vs. highway road segments.

---

## Group M: Testing, Security & Deployment

### Q76: What test frameworks are used?
**Answer:** **Jest** with `ts-jest` for backend Node.js services, **Vitest** for React frontend components, and **pytest** for Python ML services.

### Q77: What are the actual pass/fail counts from your tests?
**Answer:**
- Logistics domain engine tests: **58 Passed**, 1 Failed (Test 22 in FleetOptimizationEngine failed on regex pattern check; all 58 core packing and optimization tests passed).
- Copilot RAG core tests: **12 Passed**, 0 Failed (100% pass).
- Web frontend build: **Passed cleanly in 23.37 seconds**.

### Q78: Where is the project currently deployed?
**Answer:**
- Frontend: Deployed on **Vercel** (`https://carbon-iq-nine.vercel.app`).
- Core API: Deployed on **Render** web service.
- Database: Managed **Neon PostgreSQL** with `pgvector`.
- Cache: **Upstash Redis**.

### Q79: How do you safeguard sensitive credentials?
**Answer:** API keys, database URLs, and JWT secrets are stored exclusively in environment variables (`.env`) and cloud deployment dashboards. They are never hardcoded in source files or committed to Git.

### Q80: How does the system handle database migrations in production?
**Answer:** Through `prisma migrate deploy`, which applies compiled SQL migrations without dropping tables or corrupting tenant data.

---

## Group N: Limitations, Novelty & Future Scope

### Q81: What is the primary novelty of CarbonIQ compared to existing academic or commercial projects?
**Answer:** The novel integration of **deterministic carbon accounting**, **3D physical bin-packing simulation for Indian commercial fleets**, and **guardrailed multi-agent RAG**. Most projects either do purely static accounting or isolated vehicle routing; CarbonIQ connects document OCR directly to physical 3D container utilization and verified Scope 3 emission reductions.

### Q82: What are the project's real limitations?
**Answer:**
1. Packing uses a constructive greedy heuristic rather than an exact integer linear programming (ILP) solver, meaning it may not find the global mathematical optimum for huge cargo manifests ($N > 100$).
2. Per-axle dynamic load distribution during vehicle motion is not simulated.
3. OCR extraction relies on cloud AI vision APIs and requires an active internet connection for scanned invoices.

### Q83: How are carbon savings calculated in scenario comparisons?
**Answer:**
$$\text{Carbon Saved (kg CO}_2\text{e)} = \text{Baseline Emissions} - \text{Optimized Emissions}$$
$$\% \text{ Reduction} = \left(\frac{\text{Carbon Saved}}{\text{Baseline Emissions}}\right) \times 100$$
For example, replacing two 50% loaded 14FT Canters with one properly packed 19FT 6-Wheeler saves ~28% in road freight emissions.

### Q84: What would you improve next if given another semester?
**Answer:**
1. Connect directly to IoT OBD-II telematics dongles installed on trucks for real-time fuel burn tracking.
2. Implement Multi-Stop Capacitated Vehicle Routing Problem (CVRP) with time windows.
3. Develop an automated supplier portal for tier-1 supply chain carbon disclosures.

### Q85: What was your personal contribution to this project?
**Answer:** I designed and implemented the full system architecture: built the deterministic carbon calculation engine with 12 GHG Protocol strategies, developed the constructive 3D container packing and bounded fleet optimization heuristics, created the multi-tenant PostgreSQL schema with `pgvector`, implemented the LangGraph RAG copilot with anti-hallucination guardrails, and built the React 19 frontend with 3D WebGL visualization.
