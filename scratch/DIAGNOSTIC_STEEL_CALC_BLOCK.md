# Purchased Steel Calculation Block Diagnostic

## Document
- **Filename:** `scope3_purchased_goods_steel.pdf`
- **Document ID:** `cmtcrdlsc000i1xn0ggy36w3a` (and `cmtcqngdz00dg1k1g2xur8gxg`)
- **Document Status:** `CALCULATION_BLOCKED`
- **Organization ID:** `cmtby0prr001hsjmrvdar849v`
- **Category:** Purchased Goods & Services (`PURCHASED_GOODS`, Scope 3)

---

## Extracted Data
Exact `fieldsJson` payload stored in PostgreSQL `extracted_data` table:

```json
{
  "unit": {
    "value": "KG",
    "confidence": 0.95,
    "needsReview": false
  },
  "quantity": {
    "value": 28500,
    "confidence": 0.96,
    "needsReview": false
  },
  "weightKg": {
    "value": 28500,
    "confidence": 0.98,
    "needsReview": false
  },
  "invoiceNumber": {
    "value": "PO-STEEL-2026-882",
    "confidence": 0.98,
    "needsReview": false
  }
}
```

*Note:* `materialType`, `material`, or `itemType` was **not** extracted into `fieldsJson`.

---

## Classification
- **Scope:** `SCOPE_3`
- **Category:** `PURCHASED_GOODS`
- **Subcategory Resolved by Engine:** `PAPER` (via `activity_type_mappings.fallbackSubCategory`)
- **Activity Type:** `PURCHASED_GOODS`
- **Classification Evidence:** The document was classified at the category level as `PURCHASED_GOODS`, but without an explicit `materialType` token in `fieldsJson`, it defaulted to `PAPER`.

---

## Factor Resolution
- **Category Passed:** `PURCHASED_GOODS`
- **SubCategory Passed:** `PAPER` (fallback because `fields.materialType` was missing)
- **Region Passed:** `US` (Site country) and `GLOBAL` (fallback)
- **Candidate Factors in DB:**
  - Steel: `STEEL` (1.83 kgCO2e/kg), `STEEL_PRIMARY` (1.83), `STEEL_RECYCLED` (0.42)
  - Paper: `PAPER_VIRGIN` (0.919 kgCO2e/kg), `PAPER_RECYCLED` (0.612 kgCO2e/kg), `EEIO_PAPER_PRODUCTS` (0.45 USD)
- **Selected Factor:** `null`
- **Failure Reason:** In `emission_factors`, paper factors are keyed as `PAPER_VIRGIN` and `PAPER_RECYCLED`. No active emission factor exists with the exact subcategory key `PAPER`. `PostgresEmissionFactorProvider` returned `null`.

---

## Calculation
- **Strategy:** `QTY_X_FACTOR` (configured in `activity_type_mappings`)
- **Calculation Attempted:** **NO** (`StrategyRegistry.get(...).calculate(...)` was never invoked)
- **Result:** Aborted at factor resolution gate; document status updated to `CALCULATION_BLOCKED`.

---

## Validation
- **Validator Reached:** **NO** (`DimensionalValidator.validate(...)` is invoked only after a valid factor is resolved and a preliminary calculation is computed).
- **Failed Gate:** Pre-calculation Emission Factor Resolution Gate (`carbon-engine.service.ts` line 152).
- **Exact Reason:** `No active emission factor found for PURCHASED_GOODS:PAPER in region US/GLOBAL`.

---

## Frontend
- **API Status:** `CALCULATION_BLOCKED` (returned by `GET /api/v1/documents/:id`)
- **Emissions Endpoint:** `GET /api/v1/emissions/:id` returned `null` (no `calculated_emissions` row exists)
- **UI Status:** `StatusBadge` displays `"Calc Blocked"` and header displays `"Emissions Pending Calculation"`
- **Frontend Interpretation:** The UI is 100% consistent with the backend API and database state. It truthfully reports that calculation was blocked due to an unmatchable factor.

---

## Root Cause
The extraction node did not populate the `materialType` field (extracting only `weightKg`, `quantity`, `unit`, and `invoiceNumber`), causing `CarbonEngineService` to fall back to `activity_type_mappings.fallbackSubCategory = 'PAPER'`, for which no exact subcategory factor named `'PAPER'` exists in `emission_factors` (available factors are `PAPER_VIRGIN`, `PAPER_RECYCLED`, and `STEEL`), cleanly blocking the calculation to prevent arbitrary carbon guessing.

---

## Recommended Action
In the Review Workspace (`/app/documents/:id/review`), allow the human reviewer to assign the Material Type to `STEEL` (or configure the AI extraction prompt to extract `materialType: 'STEEL'`), enabling deterministic resolution of `cmrx89enp001elkmmzei02eua` (DEFRA Primary Steel $1.83\text{ kgCO}_2\text{e/kg}$).
