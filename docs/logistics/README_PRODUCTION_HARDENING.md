# CarbonIQ Logistics Module — Production Hardening & Operational Reference (Phase 9)

## 1. Production Architecture Overview

The CarbonIQ Logistics module provides enterprise-grade logistics planning, combinatorial fleet optimization, 3D container packing, road routing, and Scope 3 freight greenhouse gas (GHG) footprint accounting within a strictly tenant-isolated SaaS architecture.

```text
                                  ┌────────────────────────────────┐
                                  │   CarbonIQ Web App (React/TS)  │
                                  │   (shipmind-ai / Leaflet / 3D) │
                                  └───────────────┬────────────────┘
                                                  │ HTTPS + JWT Bearer
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │       Core API (Express/TS)    │
                                  │ ┌────────────────────────────┐ │
                                  │ │ authenticate & authorize   │ │
                                  │ └─────────────┬──────────────┘ │
                                  │               ▼                │
                                  │ ┌────────────────────────────┐ │
                                  │ │ Zod Input Validation Bounds│ │
                                  │ └─────────────┬──────────────┘ │
                                  └───────────────┼────────────────┘
                                                  │
         ┌────────────────────────────────────────┼────────────────────────────────────────┐
         ▼                                        ▼                                        ▼
┌──────────────────┐                    ┌──────────────────┐                    ┌──────────────────┐
│ 3D Packing Engine│                    │ Fleet Optimization│                   │  Routing Service │
│ (Pure Domain mm) │                    │ (Lexicographic)  │                    │ (OpenRouteService│
└────────┬─────────┘                    └─────────┬────────┘                    │  Directions v2)  │
         │                                        │                             └────────┬─────────┘
         └───────────────────┬────────────────────┘                                      │
                             ▼                                                           ▼
                ┌─────────────────────────┐                                 ┌─────────────────────────┐
                │ Scenario Comparison     │                                 │ Traffic / ETA Service   │
                │ Engine (Pure Domain)    │                                 │ (Baseline / Provider)   │
                └────────────┬────────────┘                                 └────────────┬────────────┘
                             │                                                           │
                             └─────────────────────────────┬─────────────────────────────┘
                                                           ▼
                                            ┌─────────────────────────────┐
                                            │ LogisticsCarbonImpactService│
                                            │ (GLEC v3 / Scope 3 Tonne-Km)│
                                            └──────────────┬──────────────┘
                                                           │
                                                           ▼
                                            ┌─────────────────────────────┐
                                            │ PostgreSQL via Prisma ORM   │
                                            │ (Tenant Scoped Isolation)   │
                                            └─────────────────────────────┘
```

---

## 2. Authentication & Tenant Isolation

1. **Authentication Enforcement**: Every Logistics route (`/api/v1/logistics/*`) requires an authenticated user token parsed via `authenticate` middleware. Unauthenticated requests are rejected with `401 Unauthorized` (`TOKEN_INVALID`).
2. **Role-Based Access Control (RBAC)**: Standard operations are restricted to `ORG_ADMIN` and `ORG_MEMBER`. Master vehicle catalog modifications are restricted to `SUPER_ADMIN`. Unauthorized roles are rejected with `403 Forbidden` (`FORBIDDEN`).
3. **Tenant Context Authority**: Tenant identity (`organizationId`) is resolved strictly from the authenticated JWT session (`req.user.organizationId`). Any client-supplied organization identifiers in payloads or queries are strictly ignored.
4. **Information Leakage Prevention**: Cross-tenant resource queries (e.g., requesting a shipment, vehicle, or scenario run belonging to another organization) consistently return `404 Not Found` (`NotFoundError`), preventing attackers from enumerating or discovering the existence of other tenants' entities.

---

## 3. Database & Migration Requirements

1. **Prisma Schema Authority**: All logistics entities (`VehicleType`, `Vehicle`, `Shipment`, `ShipmentStop`, `CargoItem`, `OptimizationRun`, `LoadPlan`, `RoutePlan`) are governed by `packages/db/prisma/schema.prisma`.
2. **Schema Validation**: Passed `prisma validate` cleanly.
3. **Tenant Unique Constraints & Indexes**:
   - `shipments(organization_id, shipment_number)`: composite unique index ensuring per-tenant unique shipment numbers.
   - `vehicles(organization_id, registration_number)`: composite unique index ensuring per-tenant unique registration numbers.
   - `optimization_runs`: composite index on `[shipment_id, created_at]`.
   - `load_plans`: foreign key cascade tied to `optimization_runs`.
4. **Safe Deployment Invariant**:
   - Logistics migrations up to `20260906231500_vehicle_ingestion_foundation` are recorded in `migration_lock.toml`.
   - `prisma migrate deploy` must be executed against production PostgreSQL during CI/CD rollout. No destructive migrations (`prisma migrate reset` or table drops) are permitted in production.

---

## 4. Environment Variables & Secret Handling

| Variable | Scope | Purpose | Production Requirement |
| :--- | :--- | :--- | :--- |
| `OPENROUTESERVICE_API_KEY` | Backend Only | Upstream API key for ORS Directions v2 | Injected via Secret Manager; NEVER exposed to client |
| `OPENROUTESERVICE_BASE_URL` | Backend Only | Base URL for ORS Directions API | Defaults to `https://api.heigit.org` or internal mirror |
| `DATABASE_URL` | Backend Only | PostgreSQL connection string | Production DB connection with connection pooling |
| `JWT_ACCESS_SECRET` | Backend Only | 64-byte hex key for JWT signing | Rotated secret from Secret Manager |
| `VITE_API_URL` | Frontend Only | Core API backend URL | Safe public client URL (e.g. `https://api.carboniq.io`) |

**Security Remediation Note**: The local development workaround `git update-index --assume-unchanged` has been removed (`git update-index --no-assume-unchanged`). The frontend bundle has been verified to contain zero secrets.

---

## 5. OpenRouteService (ORS) Configuration & Fault Tolerance

1. **No Frontend Secret Exposure**: The frontend never communicates directly with OpenRouteService. All route calculations are proxied through `/api/v1/logistics/routes/calculate` and `/shipments/:id/route`.
2. **Bounded HTTP Timeout**: All upstream ORS requests are bounded by a 10,000ms timeout with `AbortController`. If exceeded, the server returns `504 Gateway Timeout` (`PROVIDER_TIMEOUT`).
3. **HTTP Status Normalization**:
   - Upstream `401`/`403`: Translated to `502 Bad Gateway` (`PROVIDER_AUTHENTICATION_ERROR`) without leaking API tokens.
   - Upstream `429`: Translated to `429 Too Many Requests` (`PROVIDER_RATE_LIMIT`).
   - Upstream `404` or code `2010` (no road connection): Translated to `404 Not Found` (`NO_ROUTE_FOUND`).
   - Upstream `500+`: Translated to `502 Bad Gateway` (`PROVIDER_UNAVAILABLE`).
4. **No Haversine / Fake Route Fallback**: The system strictly avoids fabricating synthetic routes or straight-line distances if the provider fails.
5. **Truth in Routing & Traffic**: ORS routing duration represents static road-network duration. It is explicitly labeled as `BASELINE` traffic, with `isLive: false` and `isPredicted: false`.

---

## 6. Carbon Accounting & Authoritative GLEC Engine

1. **GLEC Framework Compliance**: Employs the Global Logistics Emissions Council (GLEC) standard for Scope 3 Category 4 & Category 9 freight emissions.
2. **Activity Tonne-Km Accounting**:
   $$\text{Activity (tonne-km)} = \left(\frac{\text{Cargo Weight (kg)}}{1000}\right) \times \text{Distance (km)}$$
   Emissions are calculated as:
   $$\text{CO}_2\text{e (kg)} = \text{Activity (tonne-km)} \times \text{Emission Factor}\left(\frac{\text{kgCO}_2\text{e}}{\text{tonne-km}}\right)$$
3. **No Silent Fallback**: If an emission factor is not found in the verified database table for the requested vehicle category, region, or fuel, the calculation halts with `404 Not Found` (`EMISSION_FACTOR_NOT_FOUND`).
4. **Calculation Provenance**: Every vehicle carbon result and aggregated scenario carbon footprint records:
   - `factorId`, `category`, `subCategory`, `sourceSet` (e.g., `GLEC_V3`), `version`.
   - Formula used and calculation strategy (`GLEC_TONNE_KM`, `VEHICLE_KM`, or `FUEL_CONSUMPTION`).
   - Scope identification (`SCOPE_3` for upstream/downstream freight, `SCOPE_1` for tenant-owned fleet combustion).

---

## 7. Optimization Execution Bounds & Concurrency

1. **Defensive Input Limits (Zod)**:
   - `maxVehiclesToConsider`: Min 1, Max 20.
   - `maxCandidateSolutions`: Min 1, Max 500.
   - `maxExecutionTimeMs`: Min 500ms, Max 30,000ms.
2. **Authoritative Optimality Semantics**:
   - `PROVABLY_OPTIMAL_WITHIN_BOUNDS`: Returned only when the search completes exhaustively across all candidate combinations within the user-specified bounds.
   - `BOUNDED_SEARCH_ONLY`: Returned when the search terminates early due to the execution timeout or maximum candidate solution limit.
   - The engine never claims global unconstrained mathematical optimality.
3. **Lexicographic Hierarchy**:
   1. Minimum vehicle count (fewer trucks strictly beats any utilization metric).
   2. Maximum payload utilization (integer-derived percentage).
   3. Maximum volumetric utilization.
   4. Minimum unused payload capacity.
   5. Minimum unused volume capacity.
4. **Concurrency Safety**: Combinatorial optimization is executed synchronously per request under the 30s timeout, avoiding unmonitored background runaway processes.

---

## 8. Transaction & Persistence Consistency

1. **Atomic Multi-Record Writes**:
   - `ShipmentService.createShipment`: Uses `prisma.$transaction` to guarantee atomic creation of the shipment and all associated stops.
   - `LogisticsRepository.createOptimizationRunWithLoadPlans`: Uses Prisma nested create to guarantee that `OptimizationRun` and its child `LoadPlan` records are committed together. Partial optimization runs cannot exist in the database.
2. **Tenant Isolation Invariant**:
   - All update and delete operations in `LogisticsRepository` use scoped `where: { id, organizationId }` queries, ensuring one tenant cannot modify or delete another tenant's records.

---

## 9. API Error Handling & Normalization

All API responses follow the standard CarbonIQ envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "req-xxx" }
}
```
In error scenarios:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | FORBIDDEN | PROVIDER_UNAVAILABLE",
    "message": "Human-readable descriptive message without internal credentials",
    "details": [ ... ]
  },
  "meta": { "requestId": "req-xxx" }
}
```
- Stack traces, SQL errors, database credentials, and API tokens are never leaked to clients.

---

## 10. Logging & Observability

1. **Structured Logging**: Employs `createLogger` (Pino-based) emitting structured JSON with timestamp, level, context module, and execution metrics.
2. **Diagnostic Fields**:
   - `shipmentId`, `optimizationRunId`, `scenarioName`.
   - `executionDurationMs`, `configurationsEvaluated`, `terminationReason`.
   - `vehicleCount`, `totalCo2e`, `strategyUsed`.
3. **Redaction Invariant**: Authorization headers, Bearer tokens, and upstream API keys are strictly excluded from logs.

---

## 11. Security Considerations & DoS Mitigations

1. **Memory Exhaustion Defense (3D Packing)**:
   - Line-item `quantity` is capped at 1,000 units to prevent excessive allocation of box instances in memory during 3D packing.
2. **Combinatorial Explosion Defense**:
   - Subsets of candidate vehicles are capped at 20.
   - Evaluation iterations are capped at 500 candidates.
   - Execution timer aborts after 30 seconds maximum.
3. **Route Waypoint Caps**:
   - Direct route waypoints are capped at 25 points to prevent abusive upstream API requests.
4. **Scenario Comparison Bounds**:
   - Comparing scenarios simultaneously is capped at 20 candidate runs.

---

## 12. Known v1 Limitations

1. **Synchronous Optimization**: Fleets larger than 20 candidate vehicles or scenarios requiring multi-depot routing are not supported in v1 and require future asynchronous queue integration.
2. **Baseline Traffic Default**: Live congestion relies on an active third-party traffic provider; in default deployments, baseline free-flow travel time is reported with explicit disclosures.
3. **Static Fuel Consumption**: Vehicle fuel consumption methods use standard GLEC conversion factors rather than dynamic vehicle telematics or OBD-II sensors.
4. **No Backhaul / Multi-Shipment Consolidation**: Optimization operates on a single shipment manifest across candidate vehicles; collaborative multi-shipper backhaul is out of scope for v1.

---

## 13. Engineering Assumptions & Heuristics

1. **3D Packing Floor Support**: Assumes items require at least 60% base area support from the truck floor or underlying boxes unless explicitly designated fragile.
2. **Gross Vehicle Weight (GVW)**: Where tare weight is not documented by OEM specifications, manufacturer standard tare weight heuristics for Indian commercial vehicles are utilized.
3. **Unloading Sequence**: LIFO (Last-In, First-Out) assumes rear-door unloading where items destined for earlier drop-offs must not be obstructed by items for later drop-offs.

---

## 14. Deployment Checklist

- [ ] PostgreSQL database running and reachable via `DATABASE_URL`.
- [ ] Run `pnpm --filter @carbon-iq/db exec prisma migrate deploy`.
- [ ] Verify `OPENROUTESERVICE_API_KEY` is configured in production environment secrets.
- [ ] Verify `JWT_ACCESS_SECRET` is set to a secure random 64-byte secret.
- [ ] Verify frontend build artifacts compiled via `pnpm --filter @carbon-iq/web build`.
- [ ] Verify CORS headers permit only authorized frontend domains.
- [ ] Run health check endpoint `GET /api/v1/health`.

---

## 15. Rollback Considerations

1. **Zero Destructive Schema Changes**: All Logistics schema additions are additive (nullable fields, default values, or isolated tables).
2. **Code Rollback**: In the event of a deployment regression, reverting the Docker container to the previous release image is 100% database-compatible.
3. **Database Rollback**: Reversing migrations can be done by applying individual down-migration scripts if required, without affecting core platform operations.

---

## 16. Operational Monitoring Recommendations

1. **Key Performance Indicators (KPIs)**:
   - Optimization p95 latency (target: < 3,000ms).
   - Routing upstream failure rate (target: < 0.1%).
   - Emission factor lookup hit rate (target: 100% for standard freight categories).
2. **Alert Thresholds**:
   - Trigger alert if `PROVIDER_TIMEOUT` or `PROVIDER_UNAVAILABLE` on routing exceeds 5% in a 5-minute window.
   - Trigger alert if 30-second optimization timeout is triggered repeatedly (> 1% of runs).
