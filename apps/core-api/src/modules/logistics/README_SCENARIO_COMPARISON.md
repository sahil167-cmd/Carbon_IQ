# Phase 8 — Scenario Comparison & What-If Optimization

## Overview

The Scenario Comparison & What-If Optimization module enables logistics planners and enterprise shippers to evaluate alternative logistics allocation plans side-by-side for the same shipment.

Every metric in the comparison matrix is derived strictly from authoritative backend calculation engines:
1. **Fleet Optimization Engine** (`FleetOptimizationEngine`): Fleet candidate selection, lexicographic multi-objective optimization, and 3D heuristic packing verification.
2. **Cargo Packing Engine** (`CargoPackingEngine`): 3D bounding-box spatial arrangement, cargo rotation, stackability, and payload limit enforcement.
3. **Routing Service** (`RoutingService`): Point-to-point road distance and travel time.
4. **Carbon Engine** (`ShipmentCalcEngine` & `LogisticsCarbonImpactService`): GLEC Scope 3 freight emissions, transport activity (tonne-km), and carbon intensity (g CO₂e / t-km).

No synthetic placeholder numbers, hardcoded fallback constants, or estimated default values are ever presented.

---

## Architectural Principles

### 1. Pure Domain Comparison Engine
The comparison logic is isolated in `ScenarioComparisonEngine` (`domain/comparison/ScenarioComparisonEngine.ts`):
- Operates on strongly typed `EvaluatedScenarioSummary` records.
- Computes absolute deltas (`target - baseline`) and percentage deltas (`((target - baseline) / |baseline|) * 100`).
- **Division-by-Zero Protection**: When `baseline === 0`, percentage delta returns `null` (rendered as `N/A` in the UI).
- **Missing Metric Handling**: When a metric is uncomputed or unavailable (e.g. routing not yet requested), deltas return `null` and direction evaluates to `NEUTRAL` (no synthetic `0` injection).
- **Multi-Objective Win-Loss Summary**: Evaluates winners on key dimensions (`fewestVehicles`, `lowestEmissions`, `highestUtilization`, `shortestDistance`).
- **Trade-Off Analyzer**: Automatically extracts actionable operational trade-offs (e.g., vehicle reduction vs extra road distance, or payload density vs volumetric headroom).

### 2. Tenant Isolation & Security
- All scenario endpoints strictly verify tenant ownership (`organizationId` matching the caller's JWT token).
- Any attempt to access, list, or compare another organization's shipment scenarios returns **HTTP 404 (NotFoundError)** to prevent tenant probing.

### 3. Supported Bounded What-If Parameters
To ensure algorithmic integrity, the what-if optimizer exposes only authentic constraint inputs:
- `scenarioName`: Descriptive user label stored in the audit trail.
- `maxVehiclesToConsider`: Upper bound on candidate fleet combinations evaluated during branch-and-bound exploration.
- `maxCandidateSolutions`: Evaluation cutoff limit.
- `maxExecutionTimeMs`: Strict timeout preventing unbounded computation.
- `allowMultiVehicleFallback`: Allows distributing cargo across multiple trucks if single vehicle allocation is infeasible.

---

## Backend API Endpoints

### 1. `GET /api/v1/logistics/shipments/:shipmentId/scenarios`
Lists all saved optimization runs and what-if scenarios for a shipment, transformed into `EvaluatedScenarioSummary[]`.
- **Auth**: `Bearer <token>` (`ORG_ADMIN`, `ORG_MEMBER`).
- **Response**: `200 OK` with JSON array of scenarios.

### 2. `POST /api/v1/logistics/shipments/:shipmentId/scenarios`
Executes what-if optimization with user-provided parameters, persists the `OptimizationRun` and `LoadPlan` records in the database, and returns the evaluated summary.
- **Auth**: `Bearer <token>` (`ORG_ADMIN`, `ORG_MEMBER`).
- **Body**:
  ```json
  {
    "scenarioName": "Consolidated 3-Truck Limit",
    "options": {
      "maxVehiclesToConsider": 3,
      "maxCandidateSolutions": 50,
      "maxExecutionTimeMs": 5000,
      "allowMultiVehicleFallback": true
    }
  }
  ```
- **Response**: `201 Created` with `EvaluatedScenarioSummary`.

### 3. `POST /api/v1/logistics/shipments/:shipmentId/scenarios/compare`
Calculates comprehensive structured deltas, win/loss summaries, and trade-off rationales.
- **Auth**: `Bearer <token>` (`ORG_ADMIN`, `ORG_MEMBER`).
- **Body**:
  ```json
  {
    "baselineScenarioId": "run-baseline-id",
    "targetScenarioIds": ["run-whatif-id"]
  }
  ```
- **Response**: `200 OK` with `ScenarioComparisonResult`:
  - `baselineScenario`: Evaluated summary of baseline.
  - `comparedScenarios`: Array of evaluated summaries.
  - `categories`: Array of 5 category groups with `MetricComparisonItem`s.
  - `deltaAnalysis`: Map of scenario ID to category groups.
  - `tradeOffs` / `tradeOffAnalysis`: Detected operational compromises and advantages.
  - `winLossSummary`: Dimension-by-dimension winning scenarios.
  - `bestScenarioByMetric`: Quick reference of best scenario per key indicator.

---

## Frontend Integration

1. **Route Registration**:
   - `/app/shipments/:shipmentId/scenarios`: Main scenario comparison dashboard.
2. **Components**:
   - `ScenarioComparisonPage.tsx`: Interactive multi-scenario comparison matrix, win-loss summary cards, multi-category delta table, and algorithmic audit panel.
   - `WhatIfScenarioModal.tsx`: Clean modal for running what-if scenarios with real bounded parameters.
   - Direct entry points in `ShipmentDetailPage.tsx` and `OptimizationResultPage.tsx`.

---

## Verification Baseline

| Test Suite | Suites | Tests | Status |
|---|---|---|---|
| Backend Logistics Modules | 14 / 14 | 209 / 209 | PASS |
| Frontend Web Modules | 8 / 8 | 91 / 91 | PASS |
| Frontend Production Build (`tsc -b && vite build`) | — | — | PASS |
