# Carbon OS — Deployment & Disaster Recovery Policy

## 1. Environment & Architecture Overview

Carbon OS is deployed as containerized services:
- **Core API Container (`apps/core-api`):** Stateless Node.js server. Horizontally scalable.
- **Worker Containers (`aiWorker`, `calcWorker`):** Node.js worker instances consuming BullMQ queues. Separately scalable from API instances.
- **ML Service Container (`apps/ml-service`):** Isolated Python FastAPI container for XGBoost inference/training.
- **Database (`PostgreSQL 16`):** Primary relational database with `pgvector` extension for vector storage.
- **Queue & Cache (`Redis 7`):** BullMQ job queue & rate-limiting key store.
- **Object Storage (`AWS S3` / `MinIO`):** Uploaded raw activity documents and generated compliance report PDFs/Excels.

---

## 2. Backup & Disaster Recovery (DR) Strategy

### PostgreSQL Target Recovery Metrics
- **Recovery Point Objective (RPO):** ≤ 1 hour (Target: Point-in-time recovery to within 5 minutes using WAL archiving).
- **Recovery Time Objective (RTO):** ≤ 4 hours for full system restoration.

### Automated Backup Pipeline
1. **Daily Full Snapshots:** Automated nightly database snapshots stored in an isolated, multi-region backup storage bucket with Object Lock enabled (Write Once Read Many / WORM policy).
2. **Continuous WAL Archiving:** Write-Ahead Logs (WAL) continuously streamed to S3 every 5 minutes to support Point-In-Time Recovery (PITR).
3. **Object Storage Replication:** Document buckets configured with Cross-Region Replication (CRR) and versioning enabled to prevent accidental deletion or corruption.

### Disaster Recovery Runbook (Summary)
1. **Database Restore:** Restore PostgreSQL instance from latest PITR snapshot. Run `pnpm db:migrate:deploy` to verify schema version compatibility.
2. **Redis Flush & Re-sync:** Redis stores transient queue jobs and rate limits. If lost, re-enqueue unprocessed documents by inspecting `documents` table rows with status `UPLOADED` or `EXTRACTING`.
3. **Object Storage Re-attach:** Point S3 client environment variables (`S3_BUCKET`, `S3_ENDPOINT`) to secondary replica bucket.
4. **Health Verification:** Ping `/health` and `/ready` endpoints to confirm database connection and queue readiness before reopening load balancer traffic.
