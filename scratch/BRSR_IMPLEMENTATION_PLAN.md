# CarbonIQ — BRSR Compliance Report Generator
## Architectural Design & Implementation Plan
**Document Reference**: `scratch/BRSR_IMPLEMENTATION_PLAN.md`  
**Status**: APPROVED FOR EXECUTION  
**Target Compliance Standard**: Securities and Exchange Board of India (SEBI) BRSR Format (Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562)  

---

## 1. Executive Summary & Core Principles

The **BRSR Compliance Report Generator** enables organizations using CarbonIQ to create an executive, statutory-aligned Business Responsibility and Sustainability Report (BRSR) for FY 2025-26.

### Core Architectural Guarantees:
1. **Absolute Accounting Engine Isolation**:
   - The carbon accounting engine (`CarbonEngineService`, `StrategyRegistry`, `DimensionalValidator`, `CanonicalActivityNormalizer`) will **NOT be modified, refactored, or called for recalculation**.
   - The BRSR engine acts **strictly as a downstream reader/consumer** of pre-calculated, verified emissions from `calculated_emissions`, `activity_records`, `emission_factors`, and `calculation_logs`.
2. **Zero Fabrication & True Provenance**:
   - No fake numbers, placeholder GHG quantities, or simulated assurance claims.
   - Missing fields are explicitly flagged as `DATA_NOT_PROVIDED`, `NOT_APPLICABLE`, or `PENDING_REVIEW`.
   - Third-party assurance status defaults to `"Assurance Information: Not Provided"` unless user provides verifiable external auditor details.
   - Output is labeled `"BRSR-Format Compliance Report"` (no fraudulent "SEBI Approved" / "Government Certified" claims).
3. **Immutable Snapshot & Versioning**:
   - Every generated report captures an immutable JSON data snapshot and PDF artifact version, ensuring complete audit reproducibility even if operational data changes later.

---

## 2. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│               CARBONIQ AUDIT LEDGER (Read-Only Layer)                  │
│  - calculated_emissions (Scope 1, Scope 2 Loc/Mkt, Scope 3)           │
│  - activity_records (kWh, Liters, tonnes, tonne-km)                   │
│  - emission_factors & calculation_logs (GLEC, GHG Protocol, DEFRA)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Read-Only Aggregate)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BRSR DATA AGGREGATION SERVICE                        │
│  - Maps Scope 1 stationary/mobile combustion to Section C P6 Q4        │
│  - Maps Scope 2 Location & Market-Based power to Section C P6 Q4       │
│  - Maps Scope 3 upstream/downstream freight & goods to Section C P6 Q5 │
│  - Computes total Energy Consumption (Joules/kWh/GJ) for Section C P6 Q1│
│  - Embeds calculation factor provenance & document IDs                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BRSR COMPLETENESS ENGINE                           │
│  - Section A (General Disclosures): 24 disclosure checks               │
│  - Section B (Management & Process): 12 governance checks             │
│  - Section C (Principle-Wise): 9 Principle & Essential Indicator checks│
│  - Returns exact completed vs. missing itemized checklist              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│     BRSR INPUT WORKSPACE (UI)     │ │     BRSR PDF GENERATOR ENGINE     │
│ - Step-by-step guided stepper     │ │ - Executive corporate cover page  │
│ - AUTO-POPULATED vs USER markers  │ │ - Section dividers & SEBI tables  │
│ - Real-time completeness score    │ │ - Energy, GHG Scope 1/2/3 tables  │
│ - Live interactive report preview │ │ - Audit provenance & safety notes │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 3. Database Schema Design (Prisma)

We will add dedicated, isolated BRSR models in `packages/db/prisma/schema.prisma` without modifying existing accounting tables:

```prisma
enum BrsrReportStatus {
  DRAFT
  IN_REVIEW
  READY_FOR_GENERATION
  FINALIZED
  ARCHIVED
}

/// BRSR Report Instance per Organization and Financial Year
model BrsrReport {
  id                  String           @id @default(cuid())
  organizationId      String
  reportingPeriodId   String
  financialYear       String           // e.g. "FY 2025-26"
  boundary            String           @default("STANDALONE") // "STANDALONE" | "CONSOLIDATED"
  version             Int              @default(1)
  status              BrsrReportStatus @default(DRAFT)
  completenessScore   Float            @default(0.0) // 0 - 100%
  
  // Section JSON Blobs for User-Entered & Overridden Non-Carbon Data
  sectionAData        Json?            // General entity details, employees, products, markets
  sectionBData        Json?            // Management policies (P1-P9), governance, assurance
  sectionCData        Json?            // Principles P1-P5, P7-P9 non-carbon indicators
  environmentalData   Json?            // Supplemental water, waste, non-GHG air emissions
  
  // Aggregated CarbonIQ Metrics (Cached Snapshot)
  carbonMetricsJson   Json?            // Scope 1, 2, 3, Energy, Intensity, Provenance
  
  // Assurance Details
  isAssured           Boolean          @default(false)
  assuranceProvider   String?
  assuranceType       String?          // "LIMITED" | "REASONABLE" | null
  assuranceReportUrl  String?
  
  createdById         String?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  organization        Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  reportingPeriod     ReportingPeriod  @relation(fields: [reportingPeriodId], references: [id], onDelete: Cascade)
  snapshots           BrsrSnapshot[]

  @@unique([organizationId, financialYear, version])
  @@index([organizationId, status])
  @@map("brsr_reports")
}

/// Immutable Generated Report Snapshots (Audit & Version History)
model BrsrSnapshot {
  id                  String       @id @default(cuid())
  brsrReportId        String
  organizationId      String
  version             Int
  financialYear       String
  snapshotData        Json         // Complete immutable report payload
  pdfUrl              String?      // Stored or downloadable artifact
  generatedById       String?
  generatedAt         DateTime     @default(now())

  brsrReport          BrsrReport   @relation(fields: [brsrReportId], references: [id], onDelete: Cascade)

  @@index([brsrReportId])
  @@index([organizationId])
  @@map("brsr_snapshots")
}
```

---

## 4. Backend Architecture (`apps/core-api/src/modules/brsr`)

### 4.1. Service Modules:
1. **`brsr-aggregation.service.ts`**:
   - Queries `CalculatedEmissions` where `organizationId = orgId` and `reportingPeriodId = periodId` (or within financial year date range).
   - Aggregates:
     - **Scope 1**: Stationary combustion (Natural gas, Generator diesel), Mobile combustion (Fleet diesel), Fugitive emissions.
     - **Scope 2**: Location-based total, Market-based total (REC deductions), total kWh consumed.
     - **Scope 3**: Upstream & downstream freight (tonne-km), Purchased goods & raw materials (kg/tonnes).
     - **Energy Consumption**: Total Fuel (GJ/Liters), Total Electricity (kWh/MWh), Renewable vs Grid Draw.
     - **Provenance Records**: Document name, ID, factor citation, calculation method.
2. **`brsr-completeness.service.ts`**:
   - Validates completeness across:
     - Section A: 24 required fields.
     - Section B: 12 policy & governance questions.
     - Section C: 9 Principle disclosures with emphasis on Principle 6 Environmental Indicators.
   - Produces itemized breakdown: `{ totalDisclosures: 45, completed: 38, missing: ['water_consumption', 'waste_diverted'], score: 84.4 }`.
3. **`brsr-pdf-generator.service.ts`**:
   - Generates a PDF using `PDFKit` matching SEBI BRSR layout:
     - Cover Page with Organization Name, FY, Corporate Logo, and Confidentiality Stamp.
     - Table of Contents & Section Dividers.
     - Formatted tabular layouts for Section A, Section B, and Section C.
     - Principle 6 Energy & GHG Emissions matrix with full decimal precision (Metric Tonnes CO₂e).
     - CarbonIQ Calculation Provenance & Methodology Annexure.
     - Mandatory Assurance Safety Notice: `"Assurance Information: Not Provided"` (unless verified).
4. **`brsr.service.ts` & `brsr.controller.ts`**:
   - Handles CRUD, Draft auto-save, Carbon metric auto-sync, Completeness scoring, and PDF generation streams.

### 4.2. Proposed API Endpoints:
* `GET /api/v1/brsr/reports`: List all BRSR reports for the organization.
* `POST /api/v1/brsr/reports`: Create a new BRSR report draft for a Financial Year.
* `GET /api/v1/brsr/reports/:id`: Get full BRSR report details with synced carbon metrics.
* `PUT /api/v1/brsr/reports/:id`: Update user-provided BRSR section data.
* `POST /api/v1/brsr/reports/:id/sync-carbon`: Re-aggregate verified CarbonIQ emissions into the report.
* `GET /api/v1/brsr/reports/:id/completeness`: Get real-time itemized completeness checklist.
* `POST /api/v1/brsr/reports/:id/generate`: Generate finalized PDF report & save immutable snapshot.
* `GET /api/v1/brsr/reports/:id/download`: Download generated BRSR PDF report.
* `GET /api/v1/brsr/reports/:id/snapshots`: View version history and immutable snapshots.

---

## 5. Frontend Architecture (`shipmind-ai`)

### 5.1. Routes:
* `/app/reports/brsr`: Main BRSR Management & Workflow Workspace.
* `/app/reports/brsr/:id`: Interactive 8-Step BRSR Report Builder.
* `/app/reports/brsr/:id/preview`: Real-time Executive Report Preview & PDF Download.

### 5.2. Workspace UI Steps (8-Step Stepper):
1. **Step 1: Corporate & Reporting Profile** (Entity CIN, Name, FY 2025-26, Standalone/Consolidated).
2. **Step 2: Section A — General Disclosures** (Products, Operations, Employees, CSR, Material Issues).
3. **Step 3: Section B — Management & Governance** (P1-P9 Policies, Board Oversight, Assurance Provider).
4. **Step 4: Section C — Principle 6 (Energy & GHG Emissions)**:
   - ⭐ **AUTO-POPULATED FROM CARBONIQ LEDGER** (Scope 1, Scope 2 Loc/Mkt, Scope 3, Fuel, Electricity).
   - Provenance chips showing source documents, factor sets (GLEC/DEFRA), and calculation timestamps.
5. **Step 5: Section C — Social & Governance (Principles 1-5, 7-9)** (Ethics, Human Rights, CSR, Consumer Value).
6. **Step 6: Assurance & Compliance Validation** (Safety enforcement: No fake assurance allowed).
7. **Step 7: Completeness Review & Audit Check** (Itemized checklist, Missing fields detector).
8. **Step 8: Final Report Generation** (Generate versioned PDF, View audit snapshot).

### 5.3. Visual Badging System:
* 🟢 `[AUTO-POPULATED: CARBONIQ LEDGER]`
* 🔵 `[USER PROVIDED]`
* 🟡 `[REQUIRES REVIEW]`
* ⚪ `[DATA NOT PROVIDED]`

---

## 6. Files Created vs. Modified

### 6.1. Files to be CREATED:
1. `scratch/BRSR_REFERENCE_STRUCTURE.md` *(Done)*
2. `scratch/BRSR_IMPLEMENTATION_PLAN.md` *(This file)*
3. `apps/core-api/src/modules/brsr/brsr.types.ts`
4. `apps/core-api/src/modules/brsr/brsr-aggregation.service.ts`
5. `apps/core-api/src/modules/brsr/brsr-completeness.service.ts`
6. `apps/core-api/src/modules/brsr/brsr-pdf-generator.service.ts`
7. `apps/core-api/src/modules/brsr/brsr.service.ts`
8. `apps/core-api/src/modules/brsr/brsr.controller.ts`
9. `apps/core-api/src/modules/brsr/brsr.routes.ts`
10. `apps/core-api/src/modules/brsr/brsr.validator.ts`
11. `apps/core-api/src/tests/brsr_module_smoke.test.ts`
12. `shipmind-ai/src/pages/app/BrsrReportWorkspace.tsx`
13. `shipmind-ai/src/pages/app/BrsrReportBuilder.tsx`
14. `shipmind-ai/src/pages/app/BrsrReportPreview.tsx`
15. `shipmind-ai/src/components/brsr/BrsrCompletenessCard.tsx`
16. `shipmind-ai/src/components/brsr/BrsrCarbonMetricsCard.tsx`
17. `scratch/BRSR_IMPLEMENTATION_REPORT.md`

### 6.2. Files to be MODIFIED:
1. `packages/db/prisma/schema.prisma` (Add `BrsrReport`, `BrsrSnapshot` models & relations).
2. `apps/core-api/src/app.ts` (Register `/api/v1/brsr` router).
3. `shipmind-ai/src/router/index.tsx` (Add BRSR routes).
4. `shipmind-ai/src/components/AppLayout.tsx` or Sidebar (Add BRSR Compliance navigation item).

### 6.3. Files STRICTLY UNTOUCHED (Accounting Engine Protection):
* ⛔ `apps/core-api/src/modules/carbon-engine/carbon-engine.service.ts`
* ⛔ `apps/core-api/src/modules/carbon-engine/canonical-activity.normalizer.ts`
* ⛔ `apps/core-api/src/modules/carbon-engine/strategy.registry.ts`
* ⛔ `apps/core-api/src/modules/carbon-engine/dimensional-validator.service.ts`
* ⛔ `apps/core-api/src/modules/carbon-engine/strategies/*`
* ⛔ `apps/core-api/src/tests/golden_carbon_engine.test.ts`
* ⛔ `apps/core-api/src/tests/universal_pipeline_comprehensive.test.ts`
* ⛔ Historical ledger tables and emission factor constants.

---

## 7. Verification & Testing Plan

1. **Prisma Migration**:
   - Run `npx prisma db push` or `prisma generate` to update database client.
2. **BRSR Smoke Test (`brsr_module_smoke.test.ts`)**:
   - Test 1: Initialize draft BRSR for test organization.
   - Test 2: Auto-aggregate Scope 1, Scope 2, Scope 3, and Energy metrics from existing real database records.
   - Test 3: Validate completeness calculation (checking completed vs. missing fields).
   - Test 4: Verify explicit missing data handling (`DATA_NOT_PROVIDED`).
   - Test 5: Verify assurance safety (defaulting to not provided).
   - Test 6: Generate binary PDF stream and verify header, tables, and provenance.
   - Test 7: Confirm 0 mutations to `calculated_emissions` or accounting models.
3. **Build Health**:
   - `pnpm -r build` must pass with 0 TypeScript errors across the full monorepo.
