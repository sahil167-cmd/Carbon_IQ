# CarbonIQ — External Viva Spoken Presentation Scripts
**Oral Presentation Scripts Tailored for Confident Delivery (Natural Spoken Voice)**

---

## ⏱️ Version 1: The 30-Second Introduction
*(Use this when the examiner says: "Briefly tell us what your project is about.")*

> "Good morning, respected examiners. Our project is **CarbonIQ**—an enterprise sustainability and logistics decarbonization platform. 
> 
> Most companies struggle to calculate their carbon footprint accurately because data is trapped in paper bills and freight documents, and manual spreadsheets lead to human error. CarbonIQ automates document extraction using computer vision, calculates greenhouse gas emissions using 100% deterministic mathematical formulas with verified factor provenance, and optimizes freight transport using 3D container packing simulation for Indian fleets. 
> 
> Our golden rule is simple: **'AI extracts and explains, but AI never calculates an emissions number.'** Thank you."

---

## ⏱️ Version 2: The 1-Minute Elevator Pitch
*(Use this for project opening when given 60 to 90 seconds to present the core concept.)*

> "Respected examiners, with regulations like SEBI's BRSR mandate in India, enterprises are legally required to report their carbon emissions with verifiable reasonable assurance. However, modern sustainability teams face three severe bottlenecks:
> 
> First, **unstructured data:** invoices, fuel receipts, and utility bills take weeks of manual data entry.
> Second, **lack of auditability:** spreadsheets break easily, and general-purpose AI models hallucinate calculations, which auditors immediately reject.
> Third, **freight inefficiency:** up to 35% of road freight runs empty or under-loaded, inflating Scope 3 emissions.
> 
> **CarbonIQ solves all three in a single unified system:**
> 1. We ingest documents via **Mistral Vision OCR** with a 3-layer validation check.
> 2. We compute carbon using **12 deterministic calculation strategies** based on DEFRA and Indian Central Electricity Authority factors with complete audit trails.
> 3. We simulate and pack freight inside Indian commercial trucks using a **deterministic 3D corner-heuristic algorithm** with collision detection and payload limits, cutting logistics emissions by up to 25%.
> 4. And we provide an **anti-hallucination LangGraph RAG Copilot** to answer complex sustainability questions from verified ledger records. Thank you."

---

## ⏱️ Version 3: The 3-Minute Technical Explanation
*(Use this when the panel asks: "Explain the technical architecture and how the system works internally.")*

> "Thank you, sir. Let me walk you through the end-to-end technical architecture of CarbonIQ.
> 
> Our platform is built as a **multi-tenant monorepo** managed with pnpm. The frontend is a **React 19 Single Page Application** built on Vite, using TailwindCSS, Radix UI primitives, and Three.js with React Three Fiber for interactive 3D WebGL visualization.
> 
> The backend comprises two core services:
> First, an **Express Node.js Core API** written in TypeScript, which handles authentication, tenant isolation, document workflows, and carbon calculations. All database interactions go through **Prisma ORM** connecting to **PostgreSQL 16** with the **pgvector** extension. Asynchronous background jobs—like document parsing—are processed using **BullMQ on Redis**.
> 
> Second, a **FastAPI Python ML Service**, which houses our 6-tier data-adaptive forecasting engine and our LangGraph multi-agent RAG pipeline.
> 
> When an invoice is uploaded, the document is fingerprinted using an SHA-256 hash to prevent duplicates, and parsed via Mistral Vision. The raw values pass through our **Canonical Activity Normalizer**, which standardizes units into standard SI formats and maps them to verified emission factors from DEFRA, GLEC, or India's Central Electricity Authority. The calculation engine then multiplies activity by factor using **Decimal.js fixed-point arithmetic**, completely avoiding JavaScript floating-point errors. Every calculation writes an immutable `CalculationLog` containing the formula, factor ID, and timestamp.
> 
> In logistics, we tackle Scope 3 Category 4 emissions. We built a pure domain **3D Cargo Packing Engine** in integer millimeters. It uses a constructive corner-heuristic to place boxes inside vehicles like a Tata Ace or a 19FT truck, validating bounding limits, AABB collision non-overlap, 70% physical bottom support, stackability weights, and maximum vehicle payload. Our **Fleet Optimization Engine** then searches combinations lexicographically—strictly minimizing truck count first, then maximizing payload utilization.
> 
> Finally, our **LangGraph RAG Copilot** ensures zero hallucinations: queries are routed to an intent node, verified metrics are pulled directly from our SQL ledger, and an anti-hallucination guardrail validates the draft response before it reaches the user. This guarantees audit-proof ESG intelligence."

---

## ⏱️ Version 4: The 5-Minute Complete Project Presentation
*(Use this if you are invited to deliver a formal, uninterrupted project presentation before Q&A.)*

> "Respected external examiner and members of the faculty committee. I am pleased to present **CarbonIQ (Carbon OS)**, an enterprise-grade carbon accounting, logistics optimization, and ESG compliance platform.
> 
> ### 1. Problem & Motivation
> Under SEBI's BRSR framework, top Indian companies must disclose verified greenhouse gas emissions. Yet, existing practices rely on manual spreadsheets or generic LLM wrappers. Spreadsheets are prone to human error and lack auditability. LLMs hallucinate numbers, making them useless for legal compliance. Furthermore, logistics operations regularly run trucks at sub-optimal capacity, causing massive avoidable Scope 3 emissions.
> 
> ### 2. Architectural Philosophy
> We founded CarbonIQ on an uncompromising principle: **'AI extracts, predicts, drafts, and explains. AI NEVER calculates an emissions number.'** All carbon accounting and physical spatial simulation are strictly deterministic and mathematically provable.
> 
> ### 3. Ingestion & Deterministic Carbon Engine
> When a user uploads a utility bill or fuel invoice:
> - Mistral Vision extracts text and tabular entities.
> - A 3-layer validation pipeline checks field presence, value bounds, and confidence. Low-confidence extractions enter a Human-in-the-Loop Review Queue.
> - The Canonical Normalizer standardizes units (kWh, litres, t-km).
> - Our Strategy Registry executes one of 12 calculation strategies using `Decimal.js`.
> - The result is persisted in an audited PostgreSQL ledger, recording the exact emission factor provenance (e.g., DEFRA 2026 or CEA v20).
> 
> ### 4. 3D Logistics & Fleet Optimization
> Scope 3 Category 4 (freight transportation) represents a huge portion of an organization's footprint. We built:
> - A **Deterministic 3D Cargo Packing Engine** that operates in integer millimeters and grams. It calculates candidate corner placement coordinates $(x, y, z)$, checks AABB collision detection, verifies that elevated boxes have at least 70% bottom support, enforces stackability limits, and respects vehicle payload capacity.
> - An interactive **Three.js WebGL Viewer** in React 19 that lets warehouse managers visually inspect packed boxes inside Indian trucks (Tata Ace, 14FT, 19FT, 32FT, and ISO containers).
> - A **Bounded Fleet Optimization Engine** that lexicographically minimizes truck count while maximizing payload utilization, generating side-by-side scenario comparisons showing CO₂e and cost savings.
> 
> ### 5. Adaptive Forecasting & Guardrailed RAG
> Historical data varies across enterprises. Rather than forcing a single model:
> - Our **ML service implements a 6-tier forecasting ladder**: from simple verified baselines at $N=1$, to Damped Holt Smoothing at $N=6$, up to regularized XGBoost at $N \ge 18$. Crucially, it enforces **Exact Scope Reconciliation** and **Anomaly Demarcation**, ensuring one-off leaks do not distort recurring forecasts.
> - Our **LangGraph RAG Copilot** answers natural language questions by querying the verified SQL ledger, retrieving regulatory chunks from pgvector, and enforcing anti-hallucination guardrails.
> - Finally, the system automatically exports statutory **SEBI BRSR Principle 6 PDF compliance reports**.
> 
> ### 6. Verification & Conclusion
> The platform is fully built and deployed on Vercel and Render with Neon PostgreSQL. We executed comprehensive test suites: 58 logistics tests passed, 12 Copilot RAG tests passed with 100% success, and our web build compiles cleanly in 23 seconds.
> 
> In conclusion, CarbonIQ transforms carbon accounting from a painful annual compliance chore into an automated, auditable, and actionable operational advantage. Thank you, and I look forward to your questions."

---

## 🎯 Rapid Spoken Answers to the "Big Four" Viva Questions

### Question 1: "What is novel in your project?"
> *"Sir, the novelty lies in uniting **deterministic carbon accounting**, **physical 3D container packing for Indian commercial fleets**, and **guardrailed multi-agent AI**. Most tools either calculate emissions on paper without solving the underlying operational inefficiency, or optimize routes without calculating emissions intensity. CarbonIQ connects document OCR directly to physical 3D loading and verified Scope 3 emission reductions with full mathematical provenance."*

### Question 2: "What was your personal contribution?"
> *"I designed and built the entire system end-to-end: implemented the 12 calculation strategies in TypeScript with Decimal.js, wrote the constructive 3D packing corner-heuristic and bounded fleet optimization engine, designed the multi-tenant PostgreSQL schema with pgvector, implemented the LangGraph multi-agent RAG pipeline with anti-hallucination guardrails, and developed the React 19 frontend with Three.js 3D WebGL visualization."*

### Question 3: "What are the limitations of your project?"
> *"Honest limitations include: 
> First, our 3D packing engine uses a constructive greedy corner heuristic with bounded iterations rather than an exhaustive Integer Linear Programming solver, meaning it may not guarantee the global mathematical optimum for over 100 items. 
> Second, dynamic per-axle load distribution during vehicle braking and cornering is not simulated. 
> Third, OCR extraction depends on an external AI vision API connection, though we provide manual entry fallbacks."*

### Question 4: "What would you improve next if given more time?"
> *"First, I would integrate live IoT OBD-II telematics data from vehicle CAN-buses for real-time fuel burn tracking. 
> Second, I would expand fleet allocation to solve the Multi-Stop Capacitated Vehicle Routing Problem with time windows. 
> Third, I would build an automated self-service portal for Tier-1 supply chain vendors to submit carbon activity data directly."*
