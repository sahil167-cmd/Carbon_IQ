# CarbonIQ Logistics — Phase 6: Carbon Impact Integration

## Overview
Phase 6 connects the Logistics module with CarbonIQ's existing Carbon Engine (`ShipmentCalcEngine`, `StrategyRegistry`, and `PostgresEmissionFactorProvider`). It calculates audit-grade, deterministic greenhouse gas emissions for logistics scenarios resulting from 3D cargo packing and fleet allocation/routing.

## Architectural Principles
1. **Single Source of Truth**:
   - The logistics module does NOT calculate emissions with hardcoded formulas or hardcoded factors.
   - All CO2e calculations pass through the existing Carbon Engine and `PostgresEmissionFactorProvider`.
2. **GLEC Framework Alignment**:
   - Standard freight logistics calculations use the GLEC Framework v2/v3 formula:
     $$\text{tonneKm} = \text{weightTonnes} \times \text{distanceKm}$$
     $$\text{CO2e (kg)} = \text{tonneKm} \times \text{emissionFactor}$$
   - Per-vehicle-km and fuel consumption modes are also supported via Scope 1 Mobile Combustion factors where required.
3. **Multi-Vehicle Scenario Aggregation**:
   - Each vehicle in an optimization scenario (e.g., from `LoadPlan[]` and `RoutePlan`) calculates its emissions individually using its specific vehicle type, fuel, distance, and loaded cargo weight.
   - Scenario totals are the deterministic sum of individual vehicle footprints.
4. **Fail-Fast Factor Resolution**:
   - If an emission factor is not found in the database/provider for a requested vehicle or transport profile, the service will fail clearly (`EMISSION_FACTOR_NOT_FOUND`) rather than silently substituting zero or a generic constant.
5. **Strict Tenant Isolation**:
   - Persisted shipment and scenario calculations enforce `organizationId` scoping. Cross-tenant access triggers a 404 `NotFoundError`.
