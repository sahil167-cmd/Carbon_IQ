# CarbonIQ — Practical External Viva Live Demonstration Script (5–7 Minutes)
**Step-by-Step Live Demo Execution Guide with Spoken Commentary & Error Fallbacks**

---

## Overview & Demo Timing Strategy

- **Target Duration:** 5 to 7 Minutes Total
- **Demo Philosophy:** Start with high-impact visual analytics, show the automated document ingestion pipeline, demonstrate the novel 3D truck packing simulation, and conclude with the conversational RAG assistant and SEBI BRSR compliance report.
- **Preparation Checklist Before Examiner Arrives:**
  1. Open Chrome/Edge and log into the live deployment: `https://carbon-iq-nine.vercel.app` (or `http://localhost:5173` if running locally).
  2. Have sample test files ready in a folder: e.g., a utility electricity bill PDF and a freight cargo manifest.
  3. Keep DevTools console open (or minimized) to prove network requests are genuine REST calls.

---

## 🎯 Step-by-Step Demonstration Flow

### Step 1: Enterprise Dashboard & High-Level Footprint (0:00 – 1:00)

- **Route / Page:** `/app/dashboard` (or `/app/dashboard/enterprise`)
- **What to Click / Show:**
  - Point to the Scope 1, Scope 2, and Scope 3 breakdown cards.
  - Hover over the monthly emissions trend chart and the carbon intensity gauge (kg CO₂e per revenue / employee).
- **What to Say to Examiner:**
  > *"Respected examiner, we begin on the CarbonIQ Enterprise Dashboard. Here you see our real-time carbon ledger aggregated across Scope 1 direct emissions, Scope 2 purchased electricity, and Scope 3 value-chain logistics. Every metric displayed here is calculated deterministically from verified transactional activity data. Notice the carbon intensity indicator, which normalizes emissions by enterprise revenue and headcount as required by statutory ESG frameworks."*
- **Technical Concept Proved:**
  - Multi-scope aggregation, tenant-isolated data fetching (`@tanstack/react-query`), and client-side reactive rendering.
- **Fallback If Page Loads Slowly:**
  - If network lag occurs on Render, explain: *"The frontend is fetching cached ledger aggregates from our PostgreSQL database via React Query with automatic background hydration."* Refresh once.

---

### Step 2: Intelligent Document Ingestion & Validation (1:00 – 2:15)

- **Route / Page:** `/app/upload` or `/app/documents`
- **What to Click / Show:**
  - Navigate to `/app/upload` (Upload Center).
  - Show the drag-and-drop zone. Select or show an already uploaded invoice (e.g., a monthly commercial electricity bill or diesel receipt).
  - Open `/app/review-queue` or click on an existing document to view `/app/documents/:id/review`.
- **What to Say to Examiner:**
  > *"Next is our automated ingestion pipeline. Organizations handle thousands of unstructured paper invoices and PDFs. When a document is uploaded, our background worker triggers Mistral Vision OCR to extract consumption values, units, and dates. Crucially, the system runs a 3-layer validation check. If confidence falls below 70% or an impossible value is detected, it is routed to this Human-in-the-Loop Review Queue rather than silently corrupting the ledger."*
- **Technical Concept Proved:**
  - AI Vision OCR extraction, cryptographic SHA-256 duplicate detection, 3-layer validation, and human-in-the-loop review state machine (`NEEDS_REVIEW` $\to$ `READY`).
- **Fallback If OCR Service Is Slow:**
  - Navigate directly to an already processed document in `/app/documents` and show the parsed structured fields (`quantity: 14,200 kWh`, `factor: 0.716 kg CO₂e/kWh`).

---

### Step 3: Deterministic Carbon Engine & Audit Provenance (2:15 – 3:15)

- **Route / Page:** Document Details / Calculation Audit view
- **What to Click / Show:**
  - Click on the verified emission result.
  - Expand the **Audit Trail / Provenance Modal**.
  - Show the mathematical formula, the emission factor ID, and the source authority (DEFRA 2026 or CEA India v20).
- **What to Say to Examiner:**
  > *"Here is the most critical technical safeguard of CarbonIQ: Audit Provenance. An external auditor cannot accept an AI's word for an emissions number. Here, the system proves that 14,200 kWh was multiplied by India's Central Electricity Authority grid factor of 0.716 kg CO₂e/kWh using Decimal.js fixed-point arithmetic. Every calculation links immutably to a CalculationLog record storing the factor version, formula, and execution timestamp."*
- **Technical Concept Proved:**
  - Deterministic Strategy Pattern (`QuantityFactorStrategy.ts`), `Decimal.js` precision, and auditability compliance.

---

### Step 4: Freight Logistics & 3D Container Packing Simulation (3:15 – 5:00)

- **Route / Page:** `/app/shipments` $\to$ `/app/shipments/new` (or click an existing shipment)
- **What to Click / Show:**
  - Navigate to `/app/shipments`.
  - Open an existing optimized shipment to go to:
    `/app/shipments/:shipmentId/optimization/:optimizationId`
  - Show the interactive **3D Truck Cargo Viewer** (Three.js WebGL canvas).
  - Rotate, zoom, and pan around the truck using your mouse.
  - Highlight the color-coded boxes: stackable vs. fragile items, and point out the cargo space coordinates $(x, y, z)$.
  - Point to the packing metrics: **Volume Utilization %**, **Payload Weight Utilization %**, and **Center of Mass**.
- **What to Say to Examiner:**
  > *"Now, we move to CarbonIQ's core innovation: Logistics Decarbonization. Freight transportation is the largest contributor to Scope 3 emissions, primarily due to under-loaded trucks. Here we simulated packing a mixed cargo manifest into a standard Indian commercial vehicle—a 19FT 6-Wheeler.*
  >
  > *Our 3D packing engine uses a pure deterministic corner-heuristic operating in integer millimeters. It strictly prevents positive box collisions, checks that every elevated box has at least 70% physical bottom support, respects fragility and stackability limits, and enforces the truck's maximum payload capacity. As you can see in this Three.js WebGL viewer, the boxes are arranged compactly with zero spatial overlap."*
- **Technical Concept Proved:**
  - Constructive 3D Bin Packing heuristic (`CargoPackingEngine.ts`), integer coordinate space, AABB collision detection, and React Three Fiber rendering.
- **Fallback If WebGL Lags:**
  - Re-center the camera using the reset button or explain: *"The 3D canvas is rendering 40 distinct mesh instances with dynamic shadows via Three.js."*

---

### Step 5: Fleet Optimization & Scenario Comparison (5:00 – 6:00)

- **Route / Page:** `/app/shipments/:shipmentId/scenarios`
- **What to Click / Show:**
  - Open the **Scenario Comparison Page**.
  - Show the side-by-side comparison between **Baseline** (e.g., 2 half-empty 14FT Canters) and **Optimized** (1 consolidated 19FT 6-Wheeler).
  - Point to the metrics:
    - $\Delta \text{CO}_2\text{e}$ Savings (kg CO₂e)
    - Percentage Reduction (% Savings)
    - Transport Emission Intensity ($\text{g CO}_2\text{e / t-km}$)
- **What to Say to Examiner:**
  > *"Here you see the actionable business payoff. Our bounded Fleet Optimization Engine searched candidate vehicle configurations using a lexicographic objective: first, minimize total vehicle count; second, maximize payload utilization. By consolidating cargo from two sub-optimal trucks into a single properly loaded vehicle, CarbonIQ cut freight emissions by over 25% and reduced emissions intensity from 49.9 to 41.2 grams of CO₂e per tonne-kilometre."*
- **Technical Concept Proved:**
  - Lexicographic optimization (`FleetOptimizationEngine.ts`), GLEC freight tonne-kilometre formula, and what-if scenario comparison.

---

### Step 6: Guardrailed RAG Copilot & BRSR Report (6:00 – 7:00)

- **Route / Page:** `/app/insights` or `/app/reports/brsr`
- **What to Click / Show:**
  - Open the **Copilot Assistant** (`/app/insights`).
  - Type a query: *"What are our highest emission hotspots?"* or *"What was our Scope 1 total this period?"*
  - Show the response with exact numerical citations linking back to the verified database ledger.
  - Briefly navigate to `/app/reports/brsr` to display the generated **SEBI BRSR Principle 6 PDF preview**.
- **What to Say to Examiner:**
  > *"Finally, we have our Guardrailed Copilot. Instead of querying a black-box LLM, our LangGraph multi-agent RAG system first routes the query through an intent planner, fetches verified ground-truth figures directly from our SQL ledger, and enforces an anti-hallucination guardrail before answering. The enterprise can then export these verified figures directly into this statutory SEBI BRSR Principle 6 compliance report with a single click.*
  >
  > *This concludes our demonstration of CarbonIQ. We are ready for your questions."*
- **Technical Concept Proved:**
  - LangGraph multi-agent graph, pgvector similarity search, anti-hallucination guardrails, and automated PDF compliance reporting.

---

## 🛡️ Emergency Backup Path (If Internet / Render Disconnects)

If the live cloud deployment experiences network latency or cloud API timeouts during the viva:
1. **Switch to Localhost:** Run `pnpm dev:web` and `pnpm dev:api` locally on `http://localhost:5173`.
2. **Offline Data:** The local PostgreSQL database contains complete seeded records for organizations, sites, vehicles, and shipments (`packages/db/seed.ts`).
3. **Run Test Proof:** Open terminal and run:
   ```bash
   npx jest src/modules/logistics/__tests__/CargoPackingEngine.test.ts src/modules/copilot/__tests__/copilot.test.ts
   ```
   Show the examiner that 100% of the mathematical packing, collision, and RAG semantic planning unit tests pass live in front of them.
