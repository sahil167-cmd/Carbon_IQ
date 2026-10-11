# Carbon Engine — Phase 3, 4 & 5 Architectural Design

This document details the pipeline architecture, interface specifications, folder structure, factor mapping layer, and strategy designs for the new Carbon Accounting Engine.

---

## 1. Pipeline Architecture

The engine functions as a pure, deterministic, decoupled pipeline:

```
Activity Record ──> Mapping Layer ──> Unit Conversion ──> Factor Provider
      │
      └── Strategy Selection ──> Execution (Decimal Math) ──> Audit Logging & Events
```

1. **Activity Record**: Input containing normalized fields from manual input or AI extraction.
2. **Mapping Layer**: Resolves activity type to strategy keys, emission factor categories, and extraction rules.
3. **Unit Conversion**: Translates activity values from document unit to emission factor unit using the `unit_conversions` database table.
4. **Factor Provider**: Looks up the versioned emission factor in the database.
5. **Strategy Selection & Execution**: Matches strategy key to class implementation and calculates using `decimal.js`.
6. **Audit & Event Emission**: Persists results, logs the execution details, and triggers event-based actions (decoupling from UI/downstream dependencies).

---

## 2. Folder Structure (`src/modules/carbon-engine`)

```
carbon-engine/
├── domain/                      # Pure Business Rules (No Prisma/Express dependencies)
│   ├── strategies/             # Concrete strategy implementations
│   │   ├── quantity-factor.strategy.ts
│   │   ├── distance-factor.strategy.ts
│   │   ├── weight-distance.strategy.ts
│   │   ├── fugitive-gwp.strategy.ts
│   │   ├── location-electricity.strategy.ts
│   │   ├── market-electricity.strategy.ts
│   │   └── mock-test.strategy.ts (worked extensibility example)
│   ├── ICalculationStrategy.ts  # Strategy contract
│   ├── StrategyRegistry.ts     # Strategy lookup & registration
│   └── value-objects.ts        # Normalized input/output structures
├── application/                 # Orchestration & Use Case Coordinators
│   ├── carbon-calculation.service.ts
│   └── audit-trail.service.ts
├── infrastructure/              # Framework-specific adapters (Prisma, Express, Events)
│   ├── repository/
│   │   ├── carbon-engine.repository.ts
│   │   └── unit-conversion.repository.ts
│   └── events/
│       └── calculation-event.emitter.ts
├── carbon-engine.controller.ts
├── carbon-engine.routes.ts
├── carbon-engine.validator.ts
└── index.ts
```

---

## 3. Core Interface Specifications

### 3.1 `IActivityRecord`
```typescript
export interface IActivityRecord {
  documentId: string;
  organizationId: string;
  siteId: string;
  reportingPeriodId: string;
  categoryCode: string; // Maps to DocumentCategory.code (e.g. "ELECTRICITY")
  country: string;      // ISO 3166-1 alpha-2 (e.g. "US")
  fields: Record<string, any>; // raw JSON fields containing values
  manualData?: Record<string, any> | null;
}
```

### 3.2 Mapping Layer (`ActivityFactorMapper`)
Determines mapping rules dynamically from the DB configuration:
```typescript
export interface IActivityMapping {
  categoryCode: string;
  emissionCategory: string;
  subCategoryFieldName: string | null;
  fallbackSubCategory: string;
  strategyKey: string;
}
```

### 3.3 `IEmissionFactorProvider`
```typescript
import { EmissionFactor } from '@prisma/client';

export interface FactorResolveCriteria {
  category: string;
  subCategory: string;
  region?: string;
  sourceSet?: string;
  asOfDate?: Date;
}

export interface IEmissionFactorProvider {
  resolveFactor(criteria: FactorResolveCriteria): Promise<EmissionFactor | null>;
}
```

### 3.4 `ICalculationStrategy`
```typescript
import { Decimal } from 'decimal.js';

export interface NormalizedActivityInput {
  value: Decimal;
  unit: string;
  fields: Record<string, any>;
}

export interface ICalculationStrategy {
  strategyKey: string;
  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal;
}
```

### 3.5 `IUnitConverter`
```typescript
import { Decimal } from 'decimal.js';

export interface IUnitConverter {
  convert(value: Decimal, fromUnit: string, toUnit: string): Promise<Decimal>;
}
```

### 3.6 Event / Notification Seam
Allows decoupled systems (e.g., Dashboard aggregate refresh, notifications) to react to calculations:
```typescript
export interface CalculationCompletedEvent {
  documentId: string;
  organizationId: string;
  co2e: number;
  scope: string;
}

export interface CalculationBlockedEvent {
  documentId: string;
  organizationId: string;
  reason: string;
  errorCode: 'NO_FACTOR' | 'AMBIGUOUS_FACTOR' | 'CONVERSION_ERROR';
}
```

---

## 4. Factor Mapping Design & Database Schema

To support fully data-driven lookups, we introduce a new database model: `ActivityTypeMapping`.

```prisma
model ActivityTypeMapping {
  id                   String   @id @default(cuid())
  categoryCode         String   @unique // Matches DocumentCategory.code
  emissionCategory     String   // Target EmissionFactor.category
  subCategoryFieldName String?  // Field name in fieldsJson (e.g. "fuelType")
  fallbackSubCategory  String   // Fallback subCategory (e.g. "DIESEL")
  strategyKey          String   // Key matching StrategyRegistry
  sourceCitation       String   // Documentation reference
  createdAt            DateTime @default(now())
}
```

---

## 5. Calculation Strategies (Strategy Pattern)

The strategy execution registry maps a `strategyKey` to a pure, isolated strategy class.

### 5.1 Registry Mechanism
```typescript
export class StrategyRegistry {
  private static strategies = new Map<string, ICalculationStrategy>();

  static register(strategy: ICalculationStrategy) {
    this.strategies.set(strategy.strategyKey, strategy);
  }

  static get(key: string): ICalculationStrategy {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      throw new Error(`Calculation strategy not registered: ${key}`);
    }
    return strategy;
  }
}
```

### 5.2 Concrete Strategies List

1. **Quantity × Factor (`QTY_X_FACTOR`)**:
   - Scope 1 fuel consumption (Stationary / Mobile Combustion).
   - Formula: `co2e = quantity * factor`.
2. **Distance × Factor (`DISTANCE_FACTOR`)**:
   - Scope 3 Business Travel / Simple Transport legs.
   - Formula: `co2e = distance * factor`.
3. **Weight × Distance × Factor (`WEIGHT_DISTANCE_FACTOR`)**:
   - Scope 3 Logistics and Freight (GLEC-aligned).
   - Formula: `co2e = (weight_tonnes * distance_km) * factor`.
4. **Leakage/Charge × GWP (`REFRIGERANT_GWP`)**:
   - Scope 1 Fugitive Emissions.
   - Formula: `co2e = charge_amount_kg * global_warming_potential_factor`.
5. **Location-based Electricity (`ELEC_LOCATION`)**:
   - Scope 2 dual-reporting location method.
   - Formula: `co2e_location = kwh * grid_average_factor`.
6. **Market-based Electricity (`ELEC_MARKET`)**:
   - Scope 2 dual-reporting market method (REC or contract-based).
   - Formula: `co2e_market = kwh * contract_factor`.
7. **Mock Trivial worked example (`MOCK_TRIVIAL`)**:
   - Purely demonstrates the extensibility of the registration pipeline.
   - Formula: `co2e = value * 2`.
