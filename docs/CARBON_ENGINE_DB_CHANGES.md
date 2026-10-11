# Carbon Engine — Phase 2 Database Changes Spec

This document details the database changes required to support the new data-driven Carbon Accounting Engine structure.

---

## 1. Proposed Schema Updates (Prisma)

To make the activity mappings fully configurable and data-driven without modifying engine code, we introduce the `activity_type_mappings` table.

```prisma
// Add to packages/db/prisma/schema.prisma

/// Maps document category codes directly to emission factor categories and strategy execution keys
model ActivityTypeMapping {
  id                   String   @id @default(cuid())
  categoryCode         String   @unique // Matches DocumentCategory.code
  emissionCategory     String   // Target EmissionFactor.category (e.g. "STATIONARY_COMBUSTION")
  subCategoryFieldName String?  // Field in fieldsJson containing subCategory value (e.g. "fuelType")
  fallbackSubCategory  String   // Fallback subCategory (e.g. "DIESEL")
  strategyKey          String   // References StrategyRegistry key (e.g. "QTY_X_FACTOR")
  sourceCitation       String   // References standard sheets/source (e.g. "GLEC_2023")
  createdAt            DateTime @default(now())

  @@map("activity_type_mappings")
}
```

---

## 2. Backward Compatibility Verification

- **No Destructive Actions**: No existing tables or columns are modified, renamed, or dropped.
- **Nullability**: No columns with strict, non-null constraints are added to existing tables.
- **Application Compatibility**: Legacy code does not query the new `ActivityTypeMapping` table, allowing the application to function perfectly before, during, and after migration.

---

## 3. Recommended Indices for Performance

```prisma
// We add an index to optimize lookup by categoryCode during mapping resolution:
@@index([categoryCode])
```

---

## 4. Generated Migrations

### `20260723192703_add_activity_type_mappings`
- **File**: [migration.sql](file:///c:/Users/Sahil%20Borhade/Desktop/Carbon_IQ/packages/db/prisma/migrations/20260723192703_add_activity_type_mappings/migration.sql)
- **Rollback Note**: `DROP TABLE IF EXISTS "activity_type_mappings";`

