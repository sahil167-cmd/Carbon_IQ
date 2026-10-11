# CarbonIQ Pre-Validation Database & System Baseline Snapshot

**Snapshot Date:** August 28, 2026  
**Database:** PostgreSQL (`carbon_os_dev`)  
**Integrity Status:** Pure Read-Only Baseline Captured  

---

## 1. Database Table Row Counts

| Table Name | Record Count | Description |
| :--- | :---:| :--- |
| `documents` | **116** | Core ledger / relational metadata |
| `extracted_data` | **337** | Core ledger / relational metadata |
| `activity_records` | **3** | Core ledger / relational metadata |
| `emission_factors` | **255** | Core ledger / relational metadata |
| `calculation_logs` | **371** | Core ledger / relational metadata |
| `calculated_emissions` | **154** | Core ledger / relational metadata |
| `document_fingerprints` | **2** | Core ledger / relational metadata |
| `ml_predictions` | **6** | Core ledger / relational metadata |
| `kb_chunks` | **69** | Core ledger / relational metadata |

---

## 2. Emission Factor Provenance Baseline

- **Total Factors in PostgreSQL:** 255 rows
- **Independently Verified Factors (`VERIFIED_REFERENCE`):** 252 (98.8%)
- **Quarantined Legacy Placeholders (`REFERENCE_REQUIRES_VERIFICATION`):** 3 (1.2%)

---

## 3. Build & Compilation State

- **Core API Build:** `tsc` compiled clean (0 errors).
- **Web Frontend Build:** Vite compiled clean in 3.69s (0 errors).
- **Golden Carbon Engine Tests:** 6/6 test cases passing (100% accuracy).
