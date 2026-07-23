# Carbon OS — Requirements Freeze (v1.0 Scope)

**Status:** Locked Scope  
**Effective Date:** Engineering Kickoff  

> **Rule:** Any change to this requirements list requires updating this document and explicitly flagging the proposed delta in a PR / engineering review.

---

## 1. Confirmed Technology Stack

| Layer | Technology | Locked Version | Notes |
|---|---|---|---|
| Frontend Framework | React + TypeScript | 18.x / 5.x | Vite build pipeline (`shipmind-ai`) |
| Frontend Router | React Router | 6.x / 7.x | Single Page Application routing |
| State & Data Fetching | TanStack React Query | 5.x | Server state management & polling |
| Styling | TailwindCSS | 3.x | Custom utility classes & dark mode |
| Backend Runtime | Node.js | 20.x LTS | **Only** runtime for primary API & workers |
| Backend Framework | Express.js | 4.x | REST API server |
| Primary Database | PostgreSQL | 16.x | System of record with `pgvector` extension |
| ORM | Prisma | 5.x | Database schema management & queries |
| Queue System | BullMQ | 5.x | Backed by Redis 7.x (exactly 2 queues) |
| Validation | Zod | 3.x | Runtime request/response schema validation |
| ML Microservice | Python + FastAPI + XGBoost | 3.11 / 2.0 | **Only** Python component (isolated container) |
| Object Storage | MinIO (Dev) / AWS S3 (Prod) | Latest | Document & report PDF storage |

---

## 2. Platform Core Rules (Non-Negotiable)

1. **Deterministic Carbon Engine:** AI *never* calculates or invents an emissions number. Only the pure TypeScript Carbon Accounting Engine (`src/modules/carbon-engine/**`) calculates `co2e_value`. Enforced via ESLint boundary rule.
2. **Multi-Tenancy:** Data isolation enforced at the database layer via `TenantScopedRepository`. Every query automatically injects `organizationId`.
3. **Async Job Processing:** All OCR, AI extraction, validation, and calculation operations run asynchronously via BullMQ on `ai-queue` or `calc-queue`.
4. **Human Review Gate:** AI extracted data passes through 3 validation layers and requires human approval before being fed into the Carbon Accounting Engine.
