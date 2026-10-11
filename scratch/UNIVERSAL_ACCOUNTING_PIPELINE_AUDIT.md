# CarbonIQ Universal Accounting Pipeline Audit

## Document Trace Matrix

| Document | Scope | Category | Extracted Activity | Unit | Quantity | Required Factor Key | Factor Found | Calculation Outcome |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **A. scope1_mobile_fleet_diesel.pdf** | Scope 1 | `MOBILE_COMBUSTION` | Diesel Commercial Fuel | `GALLONS` | 6,850 | `MOBILE_COMBUSTION:DIESEL` | Yes (DEFRA 2024, $2.70\text{ kg/L}$) | $25,930.06\text{ L} \times 2.70 = 70,011.16\text{ kgCO}_2\text{e}$ (**PASS**) |
| **B. scope1_stationary_diesel_generator.pdf** | Scope 1 | `STATIONARY_COMBUSTION` | Ultra-Low Sulfur Diesel | `LITERS` | 4,250 | `STATIONARY_COMBUSTION:DIESEL` | Yes (DEFRA 2024, $2.68\text{ kg/L}$) | $4,250\text{ L} \times 2.68 = 11,390.00\text{ kgCO}_2\text{e}$ (**PASS**) |
| **C. scope1_natural_gas_utility.pdf** | Scope 1 | `STATIONARY_COMBUSTION` | Pipeline Natural Gas | `M3` | 18,400 | `STATIONARY_COMBUSTION:NATURAL_GAS` | Yes (GHG Protocol, $2.02\text{ kg/m}^3$) | $18,400\text{ m}^3 \times 2.02 = 37,168.00\text{ kgCO}_2\text{e}$ (**PASS**) |
| **D. scope3_purchased_goods_steel.pdf** | Scope 3 | `PURCHASED_GOODS` | Primary Structural Steel | `KG` | 28,500 | `PURCHASED_GOODS:STEEL` | Yes (DEFRA 2024, $1.83\text{ kg/kg}$) | $28,500\text{ kg} \times 1.83 = 52,155.00\text{ kgCO}_2\text{e}$ (**PASS**) |
| **E. sample_scope3_freight_bol.pdf** | Scope 3 | `UPSTREAM_TRANSPORT` | Intermodal Ocean/Road Freight | `TONNE_KM` | 164,650 | `UPSTREAM_TRANSPORT:OCEAN_CONTAINER` | Yes (GLEC v3, $0.0161\text{ kg/tkm}$) | $164,650\text{ tkm} \times 0.0161 = 2,650.87\text{ kgCO}_2\text{e}$ (**PASS**) |

---

## Ingestion & Factor Audit Findings

1. **Emission Factor Authority & Dataset Integrity:**
   - Database contains 255 verified emission factor rows sourced from DEFRA 2024, GLEC Framework v3.0, US EPA 2023, and IEA/CEA 2023.
   - Exact physical factor keys exist for all supported categories.
2. **Ambiguous Factor Resolution Gap:**
   - Multi-version seed executions created duplicate version records for certain factors, which previously triggered `AmbiguousFactorError`.
   - The Canonical Activity Normalization Layer now deterministically pairs the normalized physical unit with the factor's target denominator unit.
3. **Unit Integrity:**
   - `TONNE_KM` is preserved through transport calculations and strictly isolated from liquid volume conversions (`LITERS`).
   - Liquid volume gallon-to-liter conversions are only applied when matching volume combustion factors.
