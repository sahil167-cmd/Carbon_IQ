# Carbon Engine — Phase 2 Migration Plan

This plan details the ordered steps to safely migrate from the legacy "As-Is" engine to the new deterministic, extensible Carbon Accounting Engine.

---

## Migration Steps Sequence

### Step 1: Database Schema Expansion (Additive Only)
- **What changes**: Introduce any new required DB structures or fields:
  - Add `ActivityTypeMapping` table to handle data-driven subcategory and strategy mapping.
  - Ensure all database columns representing numerical values remain compatible or are handled via proper mapping layer conversions.
- **Why**: Eliminates hardcoded if/else mapping in service layer by moving mapping to database config.
- **Risk Level**: **Low** (fully additive, no fields are modified or dropped).
- **Consumer Protection**: All existing database queries continue to work normally as no existing tables/columns are modified or deleted.

### Step 2: Seed Data Migration
- **What changes**: Populate the database with:
  - Global standard unit conversion definitions from the PRD/FWS.
  - Complete list of activity type mappings.
  - Verify and backfill standard emission factors.
- **Why**: Provides the necessary lookup data for the data-driven mapping and provider layers.
- **Risk Level**: **Low**.
- **Consumer Protection**: Read-only additions. Legacy engine is unaware of the new records.

### Step 3: Implement Core Domain Logic (Strategies & Decimals)
- **What changes**: Implement new strategies using `decimal.js` for fixed-precision arithmetic, unit converter using `UnitConversion` table, and `IEmissionFactorProvider`.
- **Why**: Establishes mathematical determinism and extensible strategy pattern architecture.
- **Risk Level**: **Medium** (requires introduction of `decimal.js` dependency).
- **Consumer Protection**: Gated via a feature flag (`ENABLE_NEW_CARBON_ENGINE` or configuration property). All production API traffic and queue workers continue calling the legacy engines while the new service is validated in test suites.

### Step 4: Shadow Mode Execution & Testing
- **What changes**: Update the `calcWorker` to run both the legacy and the new engine in parallel (shadow mode) for a temporary window. The results are logged and compared for divergence.
- **Why**: Verifies mathematical correctness and guarantees zero unintended regression before the live cutover.
- **Risk Level**: **Low** (new outputs are only logged and not written to production aggregate tables).
- **Consumer Protection**: Only legacy results are written to `calculated_emissions` and `emissions_aggregates`. Dashboard and reporting remain 100% correct and unaffected.

### Step 5: Full Cutover & Active Deployment
- **What changes**: Remove the shadow mode check and direct all live calculation requests (from `calcWorker` and controllers) to write the new engine's outputs directly to the database.
- **Why**: Fully activates the new engine.
- **Risk Level**: **Medium**.
- **Consumer Protection**: If anomalies are found, a single config flag can roll back calculation triggers to the legacy path instantly.

### Step 6: Old Code Deprecation & Clean Up
- **What changes**: Once stability is verified over a billing/reporting cycle, remove the legacy `ShipmentCalcEngine`, legacy `UnitConverter` hardcoded map, and old database fallback fields if necessary.
- **Why**: Clean, maintainable, and high-performance codebase.
- **Risk Level**: **Low**.
- **Consumer Protection**: Performed only after verifying 100% test coverage and validation.
