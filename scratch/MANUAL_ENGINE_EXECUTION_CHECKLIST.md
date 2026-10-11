# CarbonIQ Manual Engine Execution & Verification Checklist

Follow this exact step-by-step checklist when performing manual test uploads through the frontend.

---

## 1. Pre-Start Health Verification
- [ ] Docker infrastructure containers running (`postgres`, `redis`, `minio`).
- [ ] PostgreSQL database reachable on port `5432`.
- [ ] Redis reachable on port `6379`.
- [ ] MinIO storage dashboard accessible at `http://localhost:9001`.
- [ ] Core API running on `http://localhost:3000/health` (returns `{ status: "ok" }`).
- [ ] AI Worker running in dedicated terminal (`pnpm worker:ai`).
- [ ] Web Frontend running on `http://localhost:5173`.
- [ ] Mistral API key configured in `.env`.

---

## 2. Manual Document Upload
- [ ] Open browser to `http://localhost:5173`.
- [ ] Log in with user credentials (or demo org credentials).
- [ ] Navigate to the **Upload Wizard** (`/app/documents` or `/app/upload`).
- [ ] Select test document file (PDF or scanned PNG image).
- [ ] Select Category / Facility (e.g. Scope 1 Fleet, Scope 2 Electricity, Scope 3 Logistics).
- [ ] Click **Upload & Process**.
- [ ] Confirm file upload progress reaches 100% and returns a valid `documentId`.

---

## 3. Asynchronous Pipeline Processing
- [ ] Observe Core API logs: confirm `POST /api/v1/documents` registered the document with status `PENDING_SCAN`.
- [ ] Confirm SHA-256 fingerprint generated and checked in `document_fingerprints`.
- [ ] Confirm job enqueued on BullMQ `ai-queue`.
- [ ] Observe AI Worker logs: confirm `EXTRACT_DOCUMENT` job received for `documentId`.
- [ ] Confirm OCR executed (Native PDF parser for text or Mistral Vision `pixtral-12b-2409` for scanned image).
- [ ] Confirm ExtractionGraph structured extraction completed (`fieldsJson` populated).
- [ ] Confirm document classification assigned appropriate Scope and Category.
- [ ] Confirm factor resolution matched authoritative factor by category, unit, and region.
- [ ] Confirm deterministic calculation executed via `Decimal.js`.
- [ ] Confirm all 10 DimensionalValidator safety gates evaluated.

---

## 4. Result & Ledger Inspection in UI
- [ ] Navigate to **Document Details** (`/app/documents/:id`).
- [ ] Confirm extracted activity quantity and unit match verbatim document text.
- [ ] Confirm selected emission factor ID, value, unit, and published source citation match standards.
- [ ] Confirm calculation formula and total CO₂e value match expected physics/math.
- [ ] Confirm validation status badge:
  - Valid documents show **`VERIFIED`** badge.
  - Ambiguous / missing-unit / duplicate documents show **`NEEDS_REVIEW`** badge with explanatory flags.
- [ ] Click **Audit Trail** / **Calculation Breakdown** modal to inspect complete end-to-end provenance.

---

## 5. PostgreSQL Database Verification
- [ ] `documents` row exists with assigned `categoryId`, `fileSize`, and `status`.
- [ ] `extracted_data` row exists with `fieldsJson` matching document.
- [ ] `activity_records` row exists with raw and normalized activity quantities.
- [ ] `calculated_emissions` row exists with deterministic `co2e` and `validationStatus`.
- [ ] `calculation_logs` row exists with exact `formulaUsed` and `factorVersion`.
- [ ] `document_fingerprints` row exists with SHA-256 checksum.
