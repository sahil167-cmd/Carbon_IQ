# Carbon OS — Engineering Conventions & Standards

## 1. Directory & Monorepo Structure

```
Carbon_IQ/
├── apps/
│   ├── core-api/        # Node.js Express backend API & workers
│   ├── ml-service/      # Python FastAPI microservice (XGBoost)
│   └── web/             # React + Tailwind frontend (shipmind-ai)
├── packages/
│   ├── db/              # Prisma schema, migrations, seed script
│   └── shared-types/    # Shared API contracts & TypeScript interfaces
├── docs/                # Architecture, PRD, TRD, FWS, and standards
└── docker-compose.yml   # Infrastructure (PostgreSQL + pgvector, Redis, MinIO)
```

---

## 2. Git & Commit Conventions

- **Branching Strategy:** GitHub Flow (short-lived feature branches off `main`, PR + review + squash-merge).
- **Commit Format:** Conventional Commits
  - `feat:` New feature or endpoint
  - `fix:` Bug fix
  - `chore:` Configuration, dependencies, or workspace updates
  - `docs:` Documentation changes
  - `test:` Unit or integration test additions
  - `refactor:` Code restructuring without functional changes

---

## 3. Coding & Naming Standards

- **TypeScript:** Strict mode enabled (`"strict": true`). `any` is restricted unless explicitly justified with a lint override comment.
- **Variable/Function Naming:** `camelCase` (e.g., `calculateEmissions`, `tenantId`).
- **Type/Class Naming:** `PascalCase` (e.g., `TenantScopedRepository`, `ConfigService`).
- **Filename Naming:** `kebab-case` with specific suffix (e.g., `rate-limiter.middleware.ts`, `health.routes.ts`, `env.schema.ts`).
- **Prisma Migration Naming:** `YYYYMMDDHHMM_verb_noun` (e.g., `202601150900_add_sites_table`).

---

## 4. API & Error Envelope Standards

All API responses strictly adhere to the standard envelope format:

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "uuid" }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description",
    "details": { "field": ["Error detail"] }
  }
}
```
