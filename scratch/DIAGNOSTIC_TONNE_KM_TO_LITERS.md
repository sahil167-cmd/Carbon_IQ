# TONNE_KM → LITERS Unit Corruption Diagnostic

## 1. Document
- **Filename:** `sample_scope3_freight_bol.pdf`
- **Document ID:** `cmt2mbxyy000olbu5rm9jt27y`
- **Organization ID:** `cmrxd9lfe0009zgaohg6tl3f7`
- **Registered Category:** Business Travel & Employee Commuting (`BUSINESS_TRAVEL`, ID: `cmrx89emr0014lkmm3lezcxk8`)
- **Status:** `APPROVED` / `VERIFIED`
- **Created At:** 2026-08-21 07:18:59 UTC
- **Updated At:** 2026-08-27 20:09:04 UTC

---

## 2. Source Document Evidence
- **Document Type:** Intermodal Bill of Lading (Maersk Line Ocean & Road Freight)
- **Reported Cargo Weight:** $18,500\text{ kg} = 18.5\text{ tonnes}$
- **Reported Distance:** $8,900\text{ km}$
- **Reported Tonne-Km:** $164,650\text{ Tonne-Km}$ ($18.5\text{ t} \times 8,900\text{ km}$)
- **Applicable Framework:** GLEC Framework v2.0 / v3.0

---

## 3. Raw Extraction
Exact `extracted_data.fieldsJson` (Extraction ID: `cmtbwgkz500fo7ddheykhtvtj`, Model: `mistral-vision+langgraph`):

```json
{
  "unit": {
    "value": "TONNE_KM",
    "confidence": 0.99,
    "needsReview": false
  },
  "tonneKm": {
    "value": 164650,
    "confidence": 0.99,
    "needsReview": false
  },
  "quantity": {
    "value": 164650,
    "confidence": 0.99,
    "needsReview": false
  },
  "weightKg": {
    "value": 18500,
    "confidence": 0.98,
    "needsReview": false
  },
  "distanceKm": {
    "value": 8900,
    "confidence": 0.98,
    "needsReview": false
  },
  "vendorName": {
    "value": "MAERSK LINE - OCEAN & ROAD FREIGHT International Bill of Lading & Intermodal Waybill",
    "confidence": 0.96,
    "needsReview": false
  },
  "invoiceNumber": {
    "value": "of",
    "confidence": 0.98,
    "needsReview": false
  }
}
```

*Finding:* The AI extractor **accurately extracted** `unit = "TONNE_KM"`, `quantity = 164650`, `weightKg = 18500`, and `distanceKm = 8900`. The extractor **never** produced `LITERS`.

---

## 4. Activity Record
Exact `activity_records` row (ID: `cmtbwgkzk00fu7ddhcriai7xp`):
- **activityType:** `UPSTREAM_TRANSPORT`
- **scope:** `SCOPE_3`
- **quantity:** `164650.0`
- **unit:** `TONNE_KM`
- **normalizedQuantity:** `164650.0`
- **normalizedUnit:** `TONNE_KM`
- **status:** `EXTRACTED`

*Finding:* The Activity Record **correctly preserved** `unit = "TONNE_KM"` and `normalizedUnit = "TONNE_KM"`.

---

## 5. Classification & Mapping
- **Scope:** `SCOPE_3`
- **Document Registered Category:** `BUSINESS_TRAVEL` (Document Category ID: `cmrx89emr0014lkmm3lezcxk8`)
- **Activity Mapping (`activity_type_mappings`):**
  - Category Code: `BUSINESS_TRAVEL`
  - Emission Category: `BUSINESS_TRAVEL`
  - SubCategory Field Name: `travelMode`
  - Fallback SubCategory: `DIESEL`
  - Strategy Key: `DISTANCE_FACTOR`

---

## 6. Unit Trace Across Pipeline

| Stage | Quantity | Unit | Factor | Factor Unit | Strategy / Notes |
|:---|:---:|:---:|:---:|:---:|:---|
| **OCR / Text Extraction** | 164,650 | `TONNE_KM` | - | - | Mistral Vision accurately parsed 164,650 tkm |
| **Extraction Graph** | 164,650 | `TONNE_KM` | - | - | Extracted fields preserved unit `TONNE_KM` |
| **Activity Record** | 164,650 | `TONNE_KM` | - | - | Normalized unit stored as `TONNE_KM` |
| **Category Lookup** | - | - | - | - | Looked up `BUSINESS_TRAVEL` (from `doc.categoryId`) |
| **Factor Resolution** | - | - | 2.6878 | `LITERS` | Resolved `BUSINESS_TRAVEL:DIESEL` (`LITERS`) |
| **Strategy Execution** | 164,650 | `LITERS` | 2.6878 | `LITERS` | Calculated: $18.5\text{ t} \times 8,900\text{ km} \times 2.6878 = 442,546.27\text{ kg}$ |
| **Ledger Persistence** | 164,650 | `LITERS` | 2.6878 | `LITERS` | `calculated_emissions.activityUnit = 'LITERS'` |
| **Backend API** | 164,650 | `LITERS` | 2.6878 | `LITERS` | Returns formula string and factor metadata |
| **Frontend UI** | 164,650 | `LITERS` | 2.6878 | `LITERS` | Faithfully displays backend calculation log string |

---

## 7. Factor Resolution
- **Inputs to `resolveFactor`:**
  - `category`: `BUSINESS_TRAVEL`
  - `subCategory`: `DIESEL` (via fallback because `fields.travelMode` was null)
  - `region`: `US` / `GLOBAL`
- **Resolved Factor:** `cmrxg0uvd000a102uhf8jf87a`
  - Category: `BUSINESS_TRAVEL`
  - SubCategory: `DIESEL`
  - Factor Value: `2.6878`
  - Factor Unit: `LITERS`
  - Source Set: `DEFRA_2023`
  - Citation: `UK Department for Energy Security and Net Zero (DESNZ) / DEFRA (2024), Fuels: 100% Mineral Diesel (2.68001 kgCO2e/L)`

---

## 8. Strategy
- **Strategy Key:** `DISTANCE_FACTOR` (assigned from `activity_type_mappings` for `BUSINESS_TRAVEL`)
- **Calculation Formula Generated (`calculation_logs` line 293):**
  `1,64,650 TONNE_KM (converted to 1,64,650 LITERS) × 2.6878 kgCO₂e/LITERS = 4,42,546.27 kg CO₂e (442.5463 t CO₂e)`

---

## 9. First Mutation Point

`TONNE_KM → LITERS` first occurs during:

**Emission Factor Resolution & Strategy Mapping in `CarbonEngineService` (`carbon-engine.service.ts` line 129 / line 293)**

### Exact Mechanism:
1. The uploaded freight document was miscategorized at registration as `BUSINESS_TRAVEL` instead of `UPSTREAM_TRANSPORT`.
2. `CarbonEngineService` queried `activity_type_mappings` using `doc.category.code = 'BUSINESS_TRAVEL'`, which resolved `emissionCategory = 'BUSINESS_TRAVEL'` and `fallbackSubCategory = 'DIESEL'`.
3. `PostgresEmissionFactorProvider` selected the liquid fuel factor `cmrxg0uvd000a102uhf8jf87a` ($2.6878\text{ kgCO}_2\text{e/LITER}$).
4. Because the resolved factor had `unit = 'LITERS'` while the extracted activity had `rawUnit = 'TONNE_KM'`, the engine applied the numerical activity ($164,650$) against the liquid volume factor and generated the formula string `"164,650 TONNE_KM (converted to 164,650 LITERS)"`.

---

## 10. Root Cause
Document Misclassification at Ingestion: The freight Bill of Lading document was assigned category `BUSINESS_TRAVEL` (`cmrx89emr0014lkmm3lezcxk8`) instead of `UPSTREAM_TRANSPORT` (`cmrx89emn0013lkmmzdfa442e`), forcing the engine to resolve a DEFRA passenger diesel fuel factor (`kgCO2e/LITER`) instead of a GLEC freight transport factor (`kgCO2e/TONNE_KM`).

---

## 11. Why Previous Validation Did Not Catch This
In the Phase 9 validation campaign and Phase 8 readiness tests, freight documents (`complex_scope3_freight_bol.pdf`) were registered under category `UPSTREAM_TRANSPORT`, where `activity_type_mappings` mapped to `UPSTREAM_TRANSPORT` / `ROAD_HEAVY_TRUCK` with GLEC factor `cmt1votg6002mj2crknjikb08` ($0.0921\text{ kgCO}_2\text{e/tkm}$), preserving `TONNE_KM` with 100% fidelity. This issue only manifested when a user selected `BUSINESS_TRAVEL` during manual upload of a freight BOL.

---

## 12. Recommended Action
In `UploadWizard.tsx` and `DocumentReviewWorkspace.tsx`, ensure category reassignment or automatic classification validates that freight Bill of Lading documents are assigned category `UPSTREAM_TRANSPORT` (or enforce category validation in `DimensionalValidator` to block volume factors from being applied to Tonne-Km activity).

---

## 13. Safety Confirmation
- ACCOUNTING ENGINE MODIFIED: **NO**
- EMISSION FACTORS MODIFIED: **NO**
- DATABASE MODIFIED: **NO**
- VALIDATION LOGIC MODIFIED: **NO**
- FRONTEND MODIFIED: **NO**
- VALIDATION CAMPAIGN STARTED: **NO**
- UPLOADED DOCUMENT MODIFIED: **NO**
