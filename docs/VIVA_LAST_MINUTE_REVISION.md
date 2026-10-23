# CarbonIQ — One-Page Emergency Viva Revision Sheet
**Final-Year Project Defense | Emergency Cheat Sheet (Read in 5 Minutes)**

---

## ⚡ 1. One-Sentence Project Definition
> **CarbonIQ is an enterprise carbon intelligence and logistics decarbonization platform that automates Scope 1, 2, and 3 accounting via OCR and deterministic calculation engines, optimizes Indian freight fleets via 3D container packing simulation, and forecasts emissions using data-adaptive ML models.**

---

## 🛠️ 2. Tech Stack at a Glance
- **Frontend:** React 19, Vite, TailwindCSS, `@tanstack/react-query`, `Three.js` (`@react-three/fiber`), Radix UI.
- **Backend API:** Node.js 20+, Express.js, TypeScript, `Decimal.js`, `bullmq` on Redis.
- **Database & Search:** PostgreSQL 16, Prisma ORM, `pgvector` (1536-dim vector embeddings).
- **ML & AI:** Python 3.11, FastAPI, `xgboost`, `scikit-learn`, `langgraph`, Mistral Vision (`pixtral-12b`).
- **Deployments:** Vercel (Frontend), Render (Core API), Neon (PostgreSQL), Upstash (Redis).

---

## 🔄 3. Architecture Flow
$$\text{User Upload} \xrightarrow{\text{S3 / SHA-256}} \text{Mistral OCR} \xrightarrow{\text{3-Layer Validation}} \text{Canonical Normalizer} \xrightarrow{\text{Decimal.js Strategy}} \text{PostgreSQL Ledger} \xrightarrow{\text{Three.js / React}} \text{Dashboard}$$

---

## 🧩 4. Five Major Modules
1. **Intelligent Document Ingestion:** Mistral Vision OCR, SHA-256 duplicate detection, 3-layer validation, Human-in-the-Loop review queue.
2. **Deterministic Carbon Engine:** 12 GHG Protocol calculation strategies with exact mathematical audit provenance.
3. **Logistics & 3D Packing Simulation:** Integer millimeter constructive corner-heuristic packing with AABB collision detection inside Indian commercial vehicles.
4. **Data-Adaptive ML Forecasting:** 6-tier ladder ($N=1$ baseline up to $N \ge 18$ regularized XGBoost) with exact scope reconciliation.
5. **Anti-Hallucination RAG Copilot:** LangGraph multi-agent cyclic graph querying the verified SQL ledger with pgvector similarity fallback.

---

## 📐 5. Essential Mathematical Formulas

### Main Carbon Formula
$$\text{Emissions (kg CO}_2\text{e)} = \text{Activity Data (Standard Unit)} \times \text{Emission Factor} \left(\frac{\text{kg CO}_2\text{e}}{\text{Unit}}\right)$$

### Freight Tonne-Kilometre Formula
$$\text{Tonne-Kilometres (t-km)} = \left(\frac{\text{Cargo Weight in kg}}{1000}\right) \times \text{Distance in km}$$
$$\text{Freight Emissions (kg CO}_2\text{e)} = \text{Tonne-Kilometres} \times \text{Emission Factor} \left(\frac{\text{kg CO}_2\text{e}}{\text{t-km}}\right)$$

### Freight Carbon Intensity
$$\text{Intensity} = \frac{\text{kg CO}_2\text{e} \times 1000}{\text{t-km}} \quad (\text{g CO}_2\text{e / t-km})$$

### Carbon Savings in Scenario Comparison
$$\% \text{ Reduction} = \left(\frac{\text{Baseline Emissions} - \text{Optimized Emissions}}{\text{Baseline Emissions}}\right) \times 100$$

---

## 🤖 6. RAG Pipeline & Safety
- **Chunking:** 500-token chunks with 10% overlap (`chunker.ts`).
- **Embeddings:** 1536-dim embeddings via Google Gemini or OpenAI with deterministic semantic hash fallback (`embedder.ts`).
- **Vector Search:** Cosine similarity via `1 - (c.embedding <=> $query::vector)`.
- **Anti-Hallucination:** Guardrail node verifies that numerical claims in answers match actual SQL ledger totals before sending.

---

## 📈 7. Actual ML Algorithms (6-Tier Ladder)
- $N = 1$: Verified Baseline Projection
- $N = 2$: Driver-Informed Short-History Forecast
- $N = 3 \text{ to } 5$: Weighted Moving Average (WMA) / Drift
- $N = 6 \text{ to } 11$: Damped Holt Exponential Smoothing
- $N = 12 \text{ to } 17$: Seasonality-Aware Models (SARIMA/STL)
- $N \ge 18$: Regularized **XGBoost** with time-lagged & rolling window features

---

## 🔒 8. Database & Security
- **Tenant Isolation:** Base repository injects `WHERE organizationId = req.user.organizationId` on all queries.
- **RAG Tenant Boundary:** Vector query restricts chunks to `d.organizationId = $1 OR d.organizationId IS NULL`.
- **Injection Defenses:** Tagged template queries prevent SQL injection; untrusted prompt boundary markers prevent prompt injection.
- **Auditability:** `CalculationLog` table stores exact formula, factor source ID, and timestamp.

---

## 📦 9. Most Important Algorithms
1. **3D Corner-Heuristic Packing:** Generates $(x+\Delta x, y, z), (x, y+\Delta y, z), (x, y, z+\Delta z)$ candidate points; checks AABB collision, 70% bottom support, stackability, and max payload in integer millimeters.
2. **Lexicographic Fleet Optimization:** Hierarchy: (1) Minimize truck count, (2) Maximize payload utilization %, (3) Maximize volume utilization %, (4) Minimize unused payload, (5) Minimize unused volume.
3. **Haversine Distance:** Calculates Great-Circle distance with 1.28x Indian road tortuosity factor as fallback if routing API fails.

---

## 🌟 10. Five Genuine Strengths
1. **Zero AI Calculation Hallucinations:** AI parses text; dedicated `Decimal.js` code calculates numbers.
2. **True Physical 3D Feasibility:** Enforces box dimensions, gravity support, and weight distribution inside Indian trucks.
3. **Statutory SEBI BRSR Alignment:** Direct generation of Principle 6 compliance reports for top Indian listed companies.
4. **Data-Adaptive Forecasting:** Automatically switches algorithms based on historical data depth ($N=1$ to $N \ge 18$).
5. **Resilient Offline Fallbacks:** Operates seamlessly even if external AI or routing APIs become unreachable.

---

## ⚠️ 11. Five Real Limitations
1. **Heuristic Packing:** Uses a greedy corner heuristic, not an integer linear programming solver; not guaranteed globally optimal for $N > 100$.
2. **Static Axle Dynamics:** Does not simulate dynamic weight shifts during vehicle acceleration or sharp turns.
3. **Cloud OCR Dependency:** Document OCR requires active external API connectivity (though manual entry fallback exists).
4. **No Direct IoT Telematics Yet:** Fuel burn relies on calculated distance/weight rather than live CAN-bus fuel sensors.
5. **Point-to-Point Logistics:** Currently focuses on linehaul transport; multi-stop capacitated routing (CVRP) is future work.

---

## 🎯 12. Twenty Rapid-Fire Viva Questions & Answers

1. **Q: What is the main principle of your system?**  
   *A: AI extracts, predicts, and explains; AI NEVER calculates.*
2. **Q: What standard do you follow for carbon calculations?**  
   *A: GHG Protocol Corporate Standard and GLEC Framework v3 for freight.*
3. **Q: Which emission factors are used for Indian electricity?**  
   *A: Central Electricity Authority (CEA) CO₂ Baseline Database v20 (0.716 kg CO₂e/kWh).*
4. **Q: Why use `Decimal.js` instead of standard JavaScript numbers?**  
   *A: To eliminate IEEE 754 floating-point errors (e.g., $0.1 + 0.2 \ne 0.3$) for financial-grade precision.*
5. **Q: What is Scope 1?**  
   *A: Direct emissions from owned/controlled sources like diesel generators and company vehicles.*
6. **Q: What is Scope 2?**  
   *A: Indirect emissions from purchased electricity, heat, or steam.*
7. **Q: What is Scope 3?**  
   *A: All other indirect emissions across the value chain, especially upstream freight transport.*
8. **Q: How do you prevent cross-tenant data leakage?**  
   *A: Through `TenantScopedRepository` injecting `organizationId` into every database and vector query.*
9. **Q: What vector database extension do you use?**  
   *A: `pgvector` inside PostgreSQL 16.*
10. **Q: What distance metric is used for vector search?**  
    *A: Cosine distance using the `<=>` operator.*
11. **Q: What units does the 3D packing engine use internally?**  
    *A: Integer millimeters (`mm`) for dimensions and integer grams (`g`) for weights.*
12. **Q: What collision detection method is used in 3D packing?**  
    *A: Axis-Aligned Bounding Box (AABB) intersection checking.*
13. **Q: How much bottom support does an elevated box require?**  
    *A: At least 70% of its base surface area supported by underlying boxes.*
14. **Q: What is the top objective in fleet optimization?**  
    *A: Minimizing total vehicle count strictly beats any utilization metric.*
15. **Q: What is the unit of freight carbon intensity?**  
    *A: Grams of CO₂e per tonne-kilometre ($\text{g CO}_2\text{e / t-km}$).*
16. **Q: What ML model is used when $N \ge 18$ months of data are available?**  
    *A: Regularized XGBoost with time-lagged features.*
17. **Q: What is Anomaly Demarcation?**  
    *A: Separating one-off historical leaks from the recurring baseline so future forecasts aren't distorted.*
18. **Q: How do you prevent Prompt Injection in the RAG Copilot?**  
    *A: By wrapping untrusted user inputs with strict delimiters (`<<<UNTRUSTED_USER_INPUT_START>>>`).*
19. **Q: What fallback exists if the routing API fails?**  
    *A: Haversine Great-Circle distance multiplied by a 1.28x Indian highway tortuosity factor.*
20. **Q: What statutory Indian regulation does CarbonIQ address?**  
    *A: SEBI BRSR (Business Responsibility and Sustainability Reporting) Principle 6.*
