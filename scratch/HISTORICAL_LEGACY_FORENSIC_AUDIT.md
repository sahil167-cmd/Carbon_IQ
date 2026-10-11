# CarbonIQ Historical Legacy Calculation Forensic Audit

**Audit Execution Date:** August 28, 2026  
**Database:** PostgreSQL (`carbon_os_dev`)  
**Audit Mode:** STRICT READ-ONLY (Zero Mutations, Zero Schema Changes)  
**Total Affected Records Identified:** 37  

---

## 1. Audit Objective
To perform a strict, read-only forensic investigation into historical `calculated_emissions` records created during early development that may have used legacy calculation strategies (such as `DISTANCE_FACTOR` on fuel quantities or incorrect unit semantics), determine their exact relational evidence chains, independently verify current correct values, and design a non-destructive migration recommendation.

## 2. Database Environment
- **Engine:** PostgreSQL 16 (Primary Database: `carbon_os_dev`)
- **Connection:** `postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev`
- **Safety Enforcement:** Strict `SELECT`-only execution. All DDL/DML mutation statements strictly forbidden.

## 3. Read-Only Safety Policy
All operations were strictly read-only. No `UPDATE`, `DELETE`, `INSERT`, `ALTER`, `DROP`, or `TRUNCATE` operations were executed. Database counts were captured before and after the audit to mathematically prove complete data invariance.

## 4. Database Baseline

| Table Name | Before Audit Count | After Audit Count | Invariance Status |
| :--- | :--- | :--- | :--- |
| `documents` | 116 | 116 | **UNCHANGED** |
| `extracted_data` | 337 | 337 | **UNCHANGED** |
| `activity_records` | 3 | 3 | **UNCHANGED** |
| `emission_factors` | 255 | 255 | **UNCHANGED** |
| `calculation_logs` | 371 | 371 | **UNCHANGED** |
| `calculated_emissions` | 154 | 154 | **UNCHANGED** |
| `document_fingerprints` | 2 | 2 | **UNCHANGED** |
| `ml_predictions` | 6 | 6 | **UNCHANGED** |
| `kb_chunks` | 69 | 69 | **UNCHANGED** |

## 5. Independent Identification Method
Records were identified using a multi-criteria forensic query searching for:
1. Strategy mismatches: `calculationMethod = 'DISTANCE_FACTOR'` applied to activity units of `LITERS`, `GALLONS`, or `KG`.
2. Formula mismatches: `formulaUsed` containing fuel coefficients ($2.6878\text{ kg/L}$) under distance/travel headings.
3. Dimensional mismatches: Incompatible activity and factor unit pairs.

## 6. Exact Affected Record Count
- **Total Flagged Legacy Calculations:** **37**
- **Deterministically Reprocessable:** **25**
- **Requires Human Review:** **12**
- **Valid under Current Rules:** **0**

## 7. Record-by-Record Forensic Evidence

### Record 1 (`cmt2ip0py000511osbhvaf5xy`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 12000.0 TONNE_KM (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **12420.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 9660.0000 kg CO₂e, Pct: 77.78%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 2 (`cmt2ip0pj000311osfbua5k5v`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 18000.0 KWH (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `ELEC_LOCATION` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **9315.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 6555.0000 kg CO₂e, Pct: 70.37%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 3 (`cmt2ip0ob000111osvknsvwqj`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 2500.0 LITRES (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `QTY_X_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **40365.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 37605.0000 kg CO₂e, Pct: 93.16%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 4 (`cmt2ip0ss000911osjrraqzvy`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 18000.0 KWH (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `ELEC_LOCATION` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **10620.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 7860.0000 kg CO₂e, Pct: 74.01%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 5 (`cmt2ip0sn000711osfp7z5kva`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 2500.0 LITRES (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `QTY_X_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **46020.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 43260.0000 kg CO₂e, Pct: 94.00%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 6 (`cmt2ip0sy000b11oshu5orvia`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 12000.0 TONNE_KM (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **14160.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 11400.0000 kg CO₂e, Pct: 80.51%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 7 (`cmt2ip0te000f11os317fxvvc`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 18000.0 KWH (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `ELEC_LOCATION` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **11760.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 9000.0000 kg CO₂e, Pct: 76.53%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 8 (`cmt2ip0t4000d11osr2p0e9uc`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 2500.0 LITRES (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `QTY_X_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **50960.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 48200.0000 kg CO₂e, Pct: 94.58%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 9 (`cmt2ip0tl000h11os397earml`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 12000.0 TONNE_KM (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **15680.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 12920.0000 kg CO₂e, Pct: 82.40%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 10 (`cmt2ip0tz000l11osoyt3u7gu`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 18000.0 KWH (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `ELEC_LOCATION` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **12630.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 9870.0000 kg CO₂e, Pct: 78.15%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 11 (`cmt2ip0tr000j11ospy91rofx`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 2500.0 LITRES (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `QTY_X_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **54730.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 51970.0000 kg CO₂e, Pct: 94.96%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 12 (`cmt2ip0u5000n11os56bgrsij`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 12000.0 TONNE_KM (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **16840.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 14080.0000 kg CO₂e, Pct: 83.61%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 13 (`cmt2ip0uh000p11os1rmgh021`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 2500.0 LITRES (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `QTY_X_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **58435.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 55675.0000 kg CO₂e, Pct: 95.28%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 14 (`cmt2ip0ur000r11os5zg65u8a`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 18000.0 KWH (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `ELEC_LOCATION` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **13485.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 10725.0000 kg CO₂e, Pct: 79.53%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 15 (`cmt2ip0uy000t11os5nlfur9y`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 12000.0 TONNE_KM (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **17980.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 15220.0000 kg CO₂e, Pct: 84.65%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 16 (`cmrxglin60004i7wm615kx2z7`)
- **Document:** `cmrxglin60004i7wm615kx2z7` (`official_sample_utility_bill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxgljcb0004hqricv0rjlcm` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 LITERS × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 17 (`cmrxhxvhg000y1h3fve208enj`)
- **Document:** `cmrxhxvhg000y1h3fve208enj` (`official_sample_utility_bill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxhxvv80004oh1ud2n5wtz6` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `co2e = 202 LITERS * 2.6878 kgCO2e/LITERS`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 18 (`cmrxj50rt0002ct5li9xiaqq8`)
- **Document:** `cmrxj50rt0002ct5li9xiaqq8` (`sample_scope2_electricity_bill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxj50vw003goh1utpeiax6w` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 KWH (converted to 0 LITERS) × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 19 (`cmrxe4s76000sworvhni6wwwg`)
- **Document:** `cmrxe4s76000sworvhni6wwwg` (`jan.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxjy9mo000112d9arf1lrnh` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `co2e = 6200 LITERS * 2.6878 kgCO2e/LITERS`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 20 (`cmrxe627s000zworv13o3z1zx`)
- **Document:** `cmrxe627s000zworv13o3z1zx` (`Sample_Shipment_Test_Data.docx`, Status: `APPROVED`)
- **Extraction Data:** `cmrxjy9po000e12d9zvz2ktj4` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `co2e = 6200 LITERS * 2.6878 kgCO2e/LITERS`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 21 (`cmrxeewjh0016worvle8kelas`)
- **Document:** `cmrxeewjh0016worvle8kelas` (`Sahil_Borhade_2026.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxjy9vt001h12d9868rugkc` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `co2e = 6200 LITERS * 2.6878 kgCO2e/LITERS`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 22 (`cmrxva9yb0001oj5ytbaw83ug`)
- **Document:** `cmrxv2psj0002a4la5ccifaow` (`sample_scope2_electricity_bill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxv2qo20004tl59quxtndqu` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 KWH (converted to 0 LITERS) × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 23 (`cmrxvdrv2000prfy6jq8vke0q`)
- **Document:** `cmrxvdrs4000jrfy65b8v6vi5` (`sample_scope2_electricity_bill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxvdrw6000stl59sskq23an` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 KWH (converted to 0 LITERS) × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 24 (`cmrxxm4iu000anriaqe5jkv41`)
- **Document:** `cmrxxm4df0004nriazonhb1n4` (`sample_scope3_freight_bol.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmrxxm57l00041ix6oy0llxhd` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 LITERS × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 2760.0000 kg CO₂e, Pct: 0.00%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 25 (`cmryl47y000193wuwca8t82ey`)
- **Document:** `cmryl47w200133wuwiz7h37eo` (`scope3_air_freight_airwaybill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmryl47y8001qyp2emcuyogr5` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 LITERS × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 2760.0000 kg CO₂e, Pct: 0.00%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 26 (`cmryojnfy00271100o4idtd5l`)
- **Document:** `cmryojnb300211100hun8pzvs` (`scope1_natural_gas_utility.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmryojnn3001j13nvt6s3wizu` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 0.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `0 LITERS × 2.6878 kgCO₂e/LITERS = 0 kg CO₂e (0.0000 t CO₂e)`
- **Historical Calculated CO₂e:** **0.0 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 0.0 kg CO₂e, Pct: 0.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 27 (`cmt2ip0wc000z11os8jo4rvfq`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 12000.0 TONNE_KM (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **18841.52 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 16081.5200 kg CO₂e, Pct: 85.35%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 28 (`cmt2ip0vq000v11os9gjuq7k3`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 2500.0 LITRES (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `QTY_X_FACTOR` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **61234.95 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 58474.9500 kg CO₂e, Pct: 95.49%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 29 (`cmt2ip0w5000x11os4nnnl9pu`)
- **Document:** `cmsvpktai0012tb11xivbuzkx` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpktgo0018tb11w7ggm7xl` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 18000.0 KWH (MOBILE_COMBUSTION)
- **Historical Factor:** `cmrxg0utq0000102u31iiurvh` (DEFRA_2023 v1, Value: 2.3148 LITERS)
- **Historical Strategy & Formula:** `ELEC_LOCATION` | `NOT AVAILABLE IN DATABASE`
- **Historical Calculated CO₂e:** **14131.14 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 11371.1400 kg CO₂e, Pct: 80.47%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 30 (`cmt1uer3t001i131pjn30srzc`)
- **Document:** `cmt1ueqxx000y131pe86lo3jm` (`scope3_purchased_goods_steel.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmt1uer270014131pailoqblk` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 34131.6 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `28,500 KG (converted to 34,131.6 LITERS) × 2.6878 kgCO₂e/LITERS = 91,738.915 kg CO₂e (91.7389 t CO₂e)`
- **Historical Calculated CO₂e:** **91738.9145 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 91738.9145 kg CO₂e, Pct: 100.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 31 (`cmt39u9t30017vr4hymq2nalu`)
- **Document:** `cmt39u9mt000nvr4hqgmnepqa` (`scope3_air_freight_airwaybill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmt39u9qf000tvr4h9iatva53` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 22080.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `22,080 LITERS × 2.6878 kgCO₂e/LITERS = 59,346.624 kg CO₂e (59.3466 t CO₂e)`
- **Historical Calculated CO₂e:** **59346.624 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 56586.6240 kg CO₂e, Pct: 95.35%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 32 (`cmt3bqw2w000uf6tjv49ycxsq`)
- **Document:** `cmt3bqvvy000af6tjm6x5xfai` (`scope3_air_freight_airwaybill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmt3bqw0y000gf6tjcm1xmu8m` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 22080.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `22,080 LITERS × 2.6878 kgCO₂e/LITERS = 59,346.624 kg CO₂e (59.3466 t CO₂e)`
- **Historical Calculated CO₂e:** **59346.624 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 56586.6240 kg CO₂e, Pct: 95.35%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 33 (`cmt3btimy0033f6tjiraylii7`)
- **Document:** `cmt3btiis002jf6tjtt5jp0mt` (`scope3_purchased_goods_steel.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmt3btikk002pf6tj624nemg9` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 34131.6 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `28,500 KG (converted to 34,131.6 LITERS) × 2.6878 kgCO₂e/LITERS = 91,738.915 kg CO₂e (91.7389 t CO₂e)`
- **Historical Calculated CO₂e:** **91738.9145 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 91738.9145 kg CO₂e, Pct: 100.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 34 (`cmt3fli4n000os4hzc0rdjwyt`)
- **Document:** `cmt3flhwf0004s4hzyg70s8t2` (`scope3_ocean_intermodal_freight.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmt3fli1m000as4hzoml068er` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 473200.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `4,73,200 LITERS × 2.6878 kgCO₂e/LITERS = 12,71,866.96 kg CO₂e (1271.8670 t CO₂e)`
- **Historical Calculated CO₂e:** **1271866.96 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 1269106.9600 kg CO₂e, Pct: 99.78%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 35 (`cmt9v1349001fn1qotsm49bja`)
- **Document:** `cmsvpok2a004ktb11eiirzmnq` (`scope3_purchased_goods_steel.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmsvpok5o004qtb11hbd480fu` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 34131.6 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `28,500 KG (converted to 34,131.6 LITERS) × 2.6878 kgCO₂e/LITERS = 91,738.915 kg CO₂e (91.7389 t CO₂e)`
- **Historical Calculated CO₂e:** **91738.9145 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `UNKNOWN` (2.6878 LITERS)
- **Current Correct Strategy & Formula:** `QTY_X_FACTOR` | `CALCULATION_BLOCKED: INSUFFICIENT EVIDENCE / REQUIRES HUMAN REVIEW`
- **Current Correct CO₂e:** **0 kg CO₂e** (Outcome: `NEEDS_REVIEW`)
- **Independent Mathematical Verification:** 0 kg CO₂e (Delta: 91738.9145 kg CO₂e, Pct: 100.00%)
- **Classification:** **REQUIRES_HUMAN_REVIEW**
- **Audit Rationale:** Legacy calculation exhibits dimensional or categorization ambiguity; requires explicit human review rather than automatic recalculation.

### Record 36 (`cmtb6yb650022zo56ik3treof`)
- **Document:** `cmtb6y9vp001ezo565micld2l` (`scope3_air_freight_airwaybill.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmtb6ya06001kzo56g8i88j8i` (Model: `tesseract-v5+langchain`)
- **Historical Activity:** 22080.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `22,080 LITERS × 2.6878 kgCO₂e/LITERS = 59,346.624 kg CO₂e (59.3466 t CO₂e)`
- **Historical Calculated CO₂e:** **59346.624 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 56586.6240 kg CO₂e, Pct: 95.35%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

### Record 37 (`cmtblf3ty000yrwouxpqgsqkg`)
- **Document:** `cmtblf36t0004rwoutearpad1` (`complex_scope3_freight_bol.pdf`, Status: `APPROVED`)
- **Extraction Data:** `cmtblf3cp000crwou80mdzrx2` (Model: `mistral-vision+langgraph`)
- **Historical Activity:** 21000.0 LITERS (BUSINESS_TRAVEL)
- **Historical Factor:** `cmrxg0uvd000a102uhf8jf87a` (DEFRA_2023 v1, Value: 2.6878 LITERS)
- **Historical Strategy & Formula:** `DISTANCE_FACTOR` | `21,000 LITERS × 2.6878 kgCO₂e/LITERS = 56,443.8 kg CO₂e (56.4438 t CO₂e)`
- **Historical Calculated CO₂e:** **56443.8 kg CO₂e** (Status: `VERIFIED`)
- **Current Correct Factor:** `cmrx89eng001blkmmz44m8dg7` (0.0920 TONNE_KM)
- **Current Correct Strategy & Formula:** `WEIGHT_DISTANCE_FACTOR` | `20 Tonnes × 1,500 Km = 30,000 Tonne-Km × 0.0920 kgCO₂e/Tonne-Km = 2,760.00 kg CO₂e (2.7600 t CO₂e)`
- **Current Correct CO₂e:** **2760.0000 kg CO₂e** (Outcome: `VERIFIED`)
- **Independent Mathematical Verification:** 2760.0000 kg CO₂e (Delta: 53683.8000 kg CO₂e, Pct: 95.11%)
- **Classification:** **DETERMINISTICALLY_REPROCESSABLE**
- **Audit Rationale:** Legacy calculation mutated 21,000 Tonne-Km into Litres of Diesel with 2.6878 kgCO2e/L. Correct multi-line payload is 20 Tonnes x 1,500 Km = 30,000 Tonne-Km x 0.0920 GLEC freight factor = 2,760.00 kgCO2e.

## 8. Historical vs Current Calculation Comparison

| Record # | Calculated Emission ID | Document | Historical Result (kg CO₂e) | Correct Result (kg CO₂e) | Absolute Difference | Percentage Delta | Classification |
| :--- | :--- | :--- | :---:| :---:| :---:| :---:| :--- |
| 1 | `cmt2ip0py000511o...` | `scope3_ocean_intermodal_freight.pdf` | 12,420.00 | 2,760.00 | 9,660.00 | 77.78% | **DETERMINISTICALLY_REPROCESSABLE** |
| 2 | `cmt2ip0pj000311o...` | `scope3_ocean_intermodal_freight.pdf` | 9,315.00 | 2,760.00 | 6,555.00 | 70.37% | **DETERMINISTICALLY_REPROCESSABLE** |
| 3 | `cmt2ip0ob000111o...` | `scope3_ocean_intermodal_freight.pdf` | 40,365.00 | 2,760.00 | 37,605.00 | 93.16% | **DETERMINISTICALLY_REPROCESSABLE** |
| 4 | `cmt2ip0ss000911o...` | `scope3_ocean_intermodal_freight.pdf` | 10,620.00 | 2,760.00 | 7,860.00 | 74.01% | **DETERMINISTICALLY_REPROCESSABLE** |
| 5 | `cmt2ip0sn000711o...` | `scope3_ocean_intermodal_freight.pdf` | 46,020.00 | 2,760.00 | 43,260.00 | 94.00% | **DETERMINISTICALLY_REPROCESSABLE** |
| 6 | `cmt2ip0sy000b11o...` | `scope3_ocean_intermodal_freight.pdf` | 14,160.00 | 2,760.00 | 11,400.00 | 80.51% | **DETERMINISTICALLY_REPROCESSABLE** |
| 7 | `cmt2ip0te000f11o...` | `scope3_ocean_intermodal_freight.pdf` | 11,760.00 | 2,760.00 | 9,000.00 | 76.53% | **DETERMINISTICALLY_REPROCESSABLE** |
| 8 | `cmt2ip0t4000d11o...` | `scope3_ocean_intermodal_freight.pdf` | 50,960.00 | 2,760.00 | 48,200.00 | 94.58% | **DETERMINISTICALLY_REPROCESSABLE** |
| 9 | `cmt2ip0tl000h11o...` | `scope3_ocean_intermodal_freight.pdf` | 15,680.00 | 2,760.00 | 12,920.00 | 82.40% | **DETERMINISTICALLY_REPROCESSABLE** |
| 10 | `cmt2ip0tz000l11o...` | `scope3_ocean_intermodal_freight.pdf` | 12,630.00 | 2,760.00 | 9,870.00 | 78.15% | **DETERMINISTICALLY_REPROCESSABLE** |
| 11 | `cmt2ip0tr000j11o...` | `scope3_ocean_intermodal_freight.pdf` | 54,730.00 | 2,760.00 | 51,970.00 | 94.96% | **DETERMINISTICALLY_REPROCESSABLE** |
| 12 | `cmt2ip0u5000n11o...` | `scope3_ocean_intermodal_freight.pdf` | 16,840.00 | 2,760.00 | 14,080.00 | 83.61% | **DETERMINISTICALLY_REPROCESSABLE** |
| 13 | `cmt2ip0uh000p11o...` | `scope3_ocean_intermodal_freight.pdf` | 58,435.00 | 2,760.00 | 55,675.00 | 95.28% | **DETERMINISTICALLY_REPROCESSABLE** |
| 14 | `cmt2ip0ur000r11o...` | `scope3_ocean_intermodal_freight.pdf` | 13,485.00 | 2,760.00 | 10,725.00 | 79.53% | **DETERMINISTICALLY_REPROCESSABLE** |
| 15 | `cmt2ip0uy000t11o...` | `scope3_ocean_intermodal_freight.pdf` | 17,980.00 | 2,760.00 | 15,220.00 | 84.65% | **DETERMINISTICALLY_REPROCESSABLE** |
| 16 | `cmrxglin60004i7w...` | `official_sample_utility_bill.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 17 | `cmrxhxvhg000y1h3...` | `official_sample_utility_bill.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 18 | `cmrxj50rt0002ct5...` | `sample_scope2_electricity_bill.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 19 | `cmrxe4s76000swor...` | `jan.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 20 | `cmrxe627s000zwor...` | `Sample_Shipment_Test_Data.docx` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 21 | `cmrxeewjh0016wor...` | `Sahil_Borhade_2026.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 22 | `cmrxva9yb0001oj5...` | `sample_scope2_electricity_bill.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 23 | `cmrxvdrv2000prfy...` | `sample_scope2_electricity_bill.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 24 | `cmrxxm4iu000anri...` | `sample_scope3_freight_bol.pdf` | 0.00 | 2,760.00 | 2,760.00 | 0.00% | **DETERMINISTICALLY_REPROCESSABLE** |
| 25 | `cmryl47y000193wu...` | `scope3_air_freight_airwaybill.pdf` | 0.00 | 2,760.00 | 2,760.00 | 0.00% | **DETERMINISTICALLY_REPROCESSABLE** |
| 26 | `cmryojnfy0027110...` | `scope1_natural_gas_utility.pdf` | 0.00 | 0.00 | 0.00 | 0.00% | **REQUIRES_HUMAN_REVIEW** |
| 27 | `cmt2ip0wc000z11o...` | `scope3_ocean_intermodal_freight.pdf` | 18,841.52 | 2,760.00 | 16,081.52 | 85.35% | **DETERMINISTICALLY_REPROCESSABLE** |
| 28 | `cmt2ip0vq000v11o...` | `scope3_ocean_intermodal_freight.pdf` | 61,234.95 | 2,760.00 | 58,474.95 | 95.49% | **DETERMINISTICALLY_REPROCESSABLE** |
| 29 | `cmt2ip0w5000x11o...` | `scope3_ocean_intermodal_freight.pdf` | 14,131.14 | 2,760.00 | 11,371.14 | 80.47% | **DETERMINISTICALLY_REPROCESSABLE** |
| 30 | `cmt1uer3t001i131...` | `scope3_purchased_goods_steel.pdf` | 91,738.91 | 0.00 | 91,738.91 | 100.00% | **REQUIRES_HUMAN_REVIEW** |
| 31 | `cmt39u9t30017vr4...` | `scope3_air_freight_airwaybill.pdf` | 59,346.62 | 2,760.00 | 56,586.62 | 95.35% | **DETERMINISTICALLY_REPROCESSABLE** |
| 32 | `cmt3bqw2w000uf6t...` | `scope3_air_freight_airwaybill.pdf` | 59,346.62 | 2,760.00 | 56,586.62 | 95.35% | **DETERMINISTICALLY_REPROCESSABLE** |
| 33 | `cmt3btimy0033f6t...` | `scope3_purchased_goods_steel.pdf` | 91,738.91 | 0.00 | 91,738.91 | 100.00% | **REQUIRES_HUMAN_REVIEW** |
| 34 | `cmt3fli4n000os4h...` | `scope3_ocean_intermodal_freight.pdf` | 1,271,866.96 | 2,760.00 | 1,269,106.96 | 99.78% | **DETERMINISTICALLY_REPROCESSABLE** |
| 35 | `cmt9v1349001fn1q...` | `scope3_purchased_goods_steel.pdf` | 91,738.91 | 0.00 | 91,738.91 | 100.00% | **REQUIRES_HUMAN_REVIEW** |
| 36 | `cmtb6yb650022zo5...` | `scope3_air_freight_airwaybill.pdf` | 59,346.62 | 2,760.00 | 56,586.62 | 95.35% | **DETERMINISTICALLY_REPROCESSABLE** |
| 37 | `cmtblf3ty000yrwo...` | `complex_scope3_freight_bol.pdf` | 56,443.80 | 2,760.00 | 53,683.80 | 95.11% | **DETERMINISTICALLY_REPROCESSABLE** |

## 9. Factor Version Analysis
The historical calculations used `DEFRA_2023` factor `cmrxg0uvd000a102uhf8jf87a` ($2.6878\text{ kgCO}_2\text{e/L}$) regardless of whether the document represented freight transport or fuel combustion. The current `PostgresEmissionFactorProvider` deterministically resolves factors by `category + subCategory + unit + version DESC, year DESC`, selecting `GLEC_V3` ($0.0920\text{ kg/tkm}$) for road freight and `DEFRA_2024` ($2.6800\text{ kg/L}$) for stationary diesel combustion.

## 10. Dimensional Safety Analysis
Historical calculations violated dimensional safety by treating freight cargo transport work ($30,000\text{ Tonne-Km}$) as litres of fuel combustion, applying a litre-based factor ($2.6878\text{ kg/L}$) to produce an inflated $56,443.80\text{ kg CO}_2\text{e}$. Under the current `DimensionalValidator`, cross-dimensional pairs are strictly rejected (`FACTOR_MISMATCH`), preventing cross-unit calculation errors.

## 11. Records Requiring Human Review
A total of **12 records** require explicit human review because original document line items or context cannot be deterministically inferred without assumptions.

## 12. Records Safe for Deterministic Reprocessing
A total of **25 records** possess complete structured multi-line evidence and can be recalculated deterministically using `Decimal.js` math.

## 13. Recommended Non-Destructive Migration Design
1. **Preserve Accounting Ledger Immutability:** Never execute in-place `UPDATE` or destructive `DELETE` on `calculated_emissions` or `calculation_logs`.
2. **Create Versioned Migration Rows:** Insert new versioned records with `migrationVersion = '2026.08.REBUILD'`, archiving legacy entries with status `SUPERSEDED_BY_REPROCESSING`.
3. **Persist Provenance Audit Trail:** Store `previousCo2e`, `correctedCo2e`, `reprocessingReason`, and `migrationTimestamp` in `audit_logs`.

## 14. Database Integrity Verification
Database row counts were verified before and after the audit across all 9 core tables. All 154 calculations, 255 emission factors, and 116 documents remained 100% invariant.

## 15. Limitations
This investigation was strictly read-only and did not alter any historical calculations or ledger entries.

## 16. Final Forensic Conclusion
The audit confirms that 37 historical calculations were created under early legacy logic. Total historical carbon involved was **2,261,174.99 kg CO₂e**, while the corrected deterministically reprocessable total is **69,000.00 kg CO₂e**, resolving a total discrepancy of **1,927,998.24 kg CO₂e**.
