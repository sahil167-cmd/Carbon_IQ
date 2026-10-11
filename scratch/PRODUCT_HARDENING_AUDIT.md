# CarbonIQ Product Hardening Forensic Audit

## 1. Current Extraction Contract
- **Component:** `apps/core-api/src/modules/ai-collector/extraction-graph.ts` & `mistral-vision.provider.ts`
- **Schemas:** Defined in `extraction-schemas.ts`. `PURCHASED_GOODS` was missing in `getCategorySchema` switch statement, defaulting to `fuelExtractionSchema`.
- **Extraction Logic:** RegEx-based extractors captured `quantity`, `weightKg`, `distanceKm`, `invoiceNumber`, `vendorName`, but did not extract `materialType` for purchased goods or `fuelType` for general fuel invoices.
- **Freight Contract:** Multi-line cargo weights and distances are parsed. `tonneKm = weightTonnes * distanceKm` is computed.

---

## 2. Current Classification Contract
- **Component:** `ExtractionGraph.classifyNode`
- **Mechanism:** Text keyword scanning maps keywords (`BILL OF LADING`, `BOL-`, `MAERSK`, `FREIGHT`) to `UPSTREAM_TRANSPORT` (Scope 3).
- **Vulnerability:** When a user registers a document via UI with a manual category (e.g. `BUSINESS_TRAVEL`), `CarbonEngineService` previously used `doc.category.code` without checking whether the extracted activity physically matched the category.

---

## 3. Current Unit Normalization Path
- **Component:** `apps/core-api/src/modules/carbon-engine/unit-converter.ts`
- **Dictionary:** `FALLBACK_CONVERSIONS` defines energy, mass, volume, and distance ratios.
- **Integrity:** `UnitConverter` does **not** map `TONNE_KM` to `LITERS`. It throws `Unmapped unit conversion error` if cross-dimensional conversion is requested.

---

## 4. Current Factor-Resolution Inputs
- **Component:** `PostgresEmissionFactorProvider.resolveFactor({ category, subCategory, region })`
- **Vulnerability:**
  1. `activity_type_mappings` defines `fallbackSubCategory: 'PAPER'` for `PURCHASED_GOODS` and `'DIESEL'` for `BUSINESS_TRAVEL`.
  2. When `materialType` or `travelMode` was absent, the engine fell back to these arbitrary subcategories.
  3. For `PURCHASED_GOODS`, `'PAPER'` resolved to `null` (since DB has `PAPER_VIRGIN`/`PAPER_RECYCLED`), causing `CALCULATION_BLOCKED`.
  4. For `BUSINESS_TRAVEL`, `'DIESEL'` resolved to liquid fuel $2.6878\text{ kgCO}_2\text{e/L}$, which was then applied against Tonne-Km activity.

---

## 5. Current Fallback Behavior
- Unsafe semantic fallbacks in `activity_type_mappings` (`fallbackSubCategory = 'PAPER'`, `fallbackSubCategory = 'DIESEL'`) operated without verifying evidence in the document.

---

## 6. Current Manual-Review Behavior
- Split-screen review workspace allows reviewers to confirm missing classification fields (`materialType: 'STEEL'`) and saves them to `Document.manualData`.
- `CarbonEngineService` merges `doc.manualData` on top of raw extraction, preserving the original AI extraction record.

---

## 7. Where TONNE_KM Became LITERS
- **Exact File:** `apps/core-api/src/modules/carbon-engine/carbon-engine.service.ts`
- **Mechanism:** When a freight document was registered under category `BUSINESS_TRAVEL`, `mapping.fallbackSubCategory = 'DIESEL'` resolved a liquid fuel factor ($2.6878\text{ kgCO}_2\text{e/L}$). `CarbonEngineService` executed `isWeightDistanceMode` using the liquid factor's value, and formatted the formula string as `"164,650 TONNE_KM (converted to 164,650 LITERS) × 2.6878 kgCO₂e/LITERS"`.

---

## 8. Where Missing materialType Became PAPER
- **Exact File:** `apps/core-api/src/modules/carbon-engine/carbon-engine.service.ts` line 109
- **Mechanism:** `subCategory = mapping.fallbackSubCategory` assigned `'PAPER'` when `fields.materialType` was undefined.

---

## 9. Frontend Unit Semantics
- The frontend (`DocumentDetails.tsx`) faithfully displays the formula string and activity unit stored in `calculated_emissions` and `calculation_logs`. It does not perform independent unit mutation.

---

## 10. Required Hardening Plan
1. **Generic Extraction Contract Enhancement:**
   - Add `materialType` extraction supporting `STEEL`, `ALUMINUM`, `CEMENT`, `CONCRETE`, `COPPER`, `PAPER`, `PLASTIC`, `RUBBER`, `TIMBER` when explicit evidence is present in document text.
   - Add `fuelType` extraction supporting `DIESEL`, `NATURAL_GAS`, `LPG`, `PETROL`.
2. **Integration-Layer Dimensional Compatibility Guard:**
   - In `CarbonEngineService`, before executing calculation, verify that `activityUnit` and `factor.unit` are dimensionally compatible (e.g. `TONNE_KM` $\leftrightarrow$ `TONNE_KM`, `LITERS` $\leftrightarrow$ `LITERS`, `KWH` $\leftrightarrow$ `KWH`, `KG` $\leftrightarrow$ `KG`).
   - If dimensionally incompatible (e.g. `TONNE_KM` with `LITERS` factor), halt calculation and route to `NEEDS_REVIEW`.
3. **Evidence-Aware Subcategory Selection:**
   - Remove unsafe arbitrary fallbacks: if subcategory field is missing and cannot be derived from document evidence, do not invent an arbitrary subcategory; route to Human Review.
