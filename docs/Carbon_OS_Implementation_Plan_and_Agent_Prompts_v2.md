# Carbon OS — Implementation Plan & Antigravity Opus Agent Prompts (v2)

Built from: `Carbon_OS_Enterprise_PRD.pdf` (v1.0), `trd.pdf` (v1.0), `CarbonOS_FWS_v1.0.pdf` (v1.2, incorporates the "Scope Rationalization v1.2" locked simplifications) — plus a round of external review incorporated in this v2 (see the changelog below).

> Note on sources: the TRD is a 39-page, fully image-rendered PDF (no extractable text layer beyond its opening pages). The architectural decisions it locks down are also restated, in implementation-ready form, throughout the FWS ("Locked architecture this document assumes") — that's what this plan builds on for anything TRD-specific (workers, queues, LangGraph scope, provider interfaces). If you have the TRD's full Prisma schema, detailed API contracts, coding-standards section (§20), or phased-delivery section (§21) as text/markdown rather than a scanned PDF, drop that in too. I also don't have the contents of the `shipmind-ai` / `stitch_shipmind_ai_platform` folders (your UI/UX export) — the UI instructions below are built from PRD §7 (Screen Inventory) and the per-module Frontend Behaviour sections, not from actual Stitch mockups.

## Changelog — what's new in v2

A review pass raised ten gaps and some minor technical suggestions. All are incorporated below; nothing about the original architecture changed (module order, Carbon Engine's position, the AI architecture, the two-LangGraph-graph restriction, the two-worker/two-queue design, the tenant-scoped repository pattern, the auth-first sequencing, and the org → site → data hierarchy are all unchanged, on purpose).

| # | Gap raised | What changed in v2 |
|---|---|---|
| 1 | Missing project-initialization phase | New **Phase -1** — repo planning, requirements freeze, conventions, templates, branching strategy, before any code. |
| 2 | Missing shared component library | New **Phase 1** — a dedicated frontend milestone (layout, sidebar, navbar, buttons, cards, modal, table, form, toast, loader, error boundary, theme) built before any feature screens. |
| 3 | Missing API versioning strategy | New **Appendix B** — versioning, deprecation, backward-compatibility, breaking-change policy. |
| 4 | Missing configuration module | Added to **Phase 0** — a dedicated `ConfigService` instead of config scattered across modules. |
| 5 | Missing feature flags | Added to **Phase 0** — a `feature_flags` table + service, with named flags for Forecast/RAG/Compliance/OCR/AI Validation, checked by the modules that need them. |
| 6 | Observability under-specified | Pulled forward into **Phase 0** — structured logging, request/job IDs, tracing, health endpoints, metrics, queue monitoring — instead of only appearing in the final hardening phase. |
| 7 | ML training assumes 6 months of real data | **Phase 10** (ML) now explicitly documents the dev progression: Development → Synthetic Dataset → Historical Public Dataset → Demo Organization → Production Data Later. |
| 8 | Notifications only appear as one late phase | Split: notification **infrastructure** moved into **Phase 0**; notification **triggers** are now a required deliverable inside each module phase that owns a real event (Phases 5, 6, 7, 10, 12). |
| 9 | Missing documentation phase | New **Phase 16** (final) — developer docs, API docs, architecture docs, deployment docs, admin manual, user manual. |
| 10 | Testing only shows up at the end | Every module phase (2–14) now has an explicit **TESTING** requirement as part of that phase's own deliverables — a module isn't "done" without its own unit + integration tests. Phase 15 remains, but is now scoped to cross-cutting hardening/security/load/reconciliation testing only, not first-time unit testing. |

Minor technical suggestions from the review (`.env.example`, Dependabot/Renovate, Prisma migration naming convention, branching strategy, reserved OpenAPI/Swagger space, Postgres backup/restore, object-storage DR) are folded into Phase -1, Phase 0, and Appendix B below, each at the point where it's actually actionable.

A new **Appendix A** gives you a plain, non-AI, human-readable status table to track progress across all 18 phases without editing this prompt document itself.

---

## 0. How to use this document

1. **Prep your repo first** (Phase -1, then Phase 0) — these create the conventions, the monorepo skeleton, the locked architectural guardrails, and a `docs/` folder, in that order.
2. Copy `Carbon_OS_Enterprise_PRD.pdf`, `trd.pdf`, and `CarbonOS_FWS_v1.0.pdf` into `docs/` in the repo (convert to `.md`/`.txt` if your Antigravity agent reads text better than PDFs) as `docs/PRD.md`, `docs/TRD.md`, `docs/FWS.md`. Every prompt below tells the agent to read specific sections of these — it needs them to actually be there.
3. Work through the phases **in order**, Phase -1 through Phase 16. Each has a hard dependency on the previous one (documented under "Why this order"). Don't let the agent skip ahead.
4. **Paste "Prompt 0 — Project Constitution" once**, at the very start, before any module work — ideally saved as the agent's persistent rules file (Antigravity's equivalent of `AGENTS.md` / always-on context), not just a one-off chat message. Every later prompt assumes the agent still has this in view.
5. Each module prompt is self-contained: it restates the entities, endpoints, business rules, edge cases, testing requirement, and acceptance criteria it needs, so it works even if the agent's context window has rolled past earlier phases. Paste each one as its own task/turn to the Opus agent, let it finish and pass its own acceptance checklist (**including its own tests — don't let it move on without them**), then move to the next.
6. Where a prompt says "read docs/PRD.md §X" / "docs/FWS.md §Y" — those section numbers match the PRD's module numbering (1–13) and the FWS's section numbering (1–22).
7. Keep **Appendix A**'s checklist table updated as you go — it's the single non-AI place to see where the project actually stands.

---

## 1. Build Order & Dependency Rationale

| Phase | Name | Depends on | Why this order |
|---|---|---|---|
| -1 | Project Initialization & Repository Planning | — | Conventions (naming, branching, folder layout, PR/issue templates) have to exist before the first commit or they never get retrofitted consistently across a multi-session, multi-agent build. |
| 0 | Infrastructure, Configuration, Feature Flags & Observability Bootstrap | Phase -1 | Everything else needs the DB, queues, config service, feature flags, logging/tracing, and architectural guardrails (ESLint boundary, TenantScopedRepository) in place before any feature code exists. |
| 1 | Shared Frontend Component Library | Phase 0 | Every later module's UI reuses the same primitives (buttons, tables, modals, forms, toasts). Building features first means every team reinvents these and they drift apart. |
| 2 | Module 1: Authentication & Authorization | Phase 0 | Every other module needs to know who's acting and which org their data belongs to. |
| 3 | Module 2: Organization Management | Phase 2 | Sites, documents, and calculations all hang off org context (industry → emission factor mapping, reporting year). |
| 4 | Module 3: Site Management | Phase 3 | Documents/calculations must attribute to a site (or org-level pseudo-site). |
| 5 | Module 4: Carbon Data Collection Wizard | Phase 4 | Needs Org + Site + Reporting Period to exist before "select site → select period → upload" makes sense. Also where the "missing documents" / "review pending" notification triggers first become real. |
| 6 | Module 5: AI Data Collector Agent | Phase 5 | Needs documents to exist in `UPLOADED` status to extract from. Also where the "upload completed / extraction finished" notification trigger lives. |
| 7 | Module 6: Validation & Human Review (3 layers) | Phase 6 | Needs `extracted_data` to validate. Also where the "validation failed / flags raised" notification trigger lives. |
| 8 | Module 7: Carbon Accounting Engine | Phase 7 | Only `APPROVED` records (post-Module-6) may be calculated — the hard architectural boundary of the whole product. |
| 9 | Module 8: Dashboard & Analytics | Phase 8 | Reads only from `emissions_aggregates`, which Module 7 populates. |
| 10 | Module 9: ML Forecasting Service | Phase 8 (needs ≥6 months of `calculated_emissions`, or the seeded synthetic/demo path — see Phase 10's dataset-strategy note) | Independent of Dashboard but needs real or seeded calculated data to train against. Also where the "forecast ready" notification trigger lives. |
| 11 | Module 10: RAG Sustainability Copilot | Phase 0 (infra) + Phase 9 (nice-to-have cross-links) | v1 knowledge base is static reference material (GLEC/GHG/BRSR/ESG/ISO) — technically independent of calculation data, but ship it after the core numeric pipeline is trustworthy. |
| 12 | Module 11: Compliance Agent (AI Drafting) | Phase 8 + Phase 9 | Narrative drafting needs real hotspot/trend data to reference, and numeric fields come only from Module 7's tables. Also where the "report generated / draft ready" notification trigger lives. |
| 13 | Module 12: Compliance Reporting (Export/Versioning) | Phase 12 | Exports what Module 11 assembled. |
| 14 | Module 13: Admin Console (Super Admin) | All of the above | It's a read/manage surface over every other module's data — build it last so there's something real to administer, though its Auth isolation (Phase 2) must exist from day one. |
| 15 | Security / Hardening / CI / QA Pass | All | Cross-cutting final pass: rate limits, WCAG, determinism CI test, cross-tenant isolation test suite, load test on aggregates, and a full audit that every notification trigger from Phases 5/6/7/10/12 actually fires. This is verification of what's already been tested per-module — not first-time unit testing. |
| 16 | Documentation Phase | All | Developer, API, architecture, deployment, admin, and user documentation — written last because it documents what was actually built, not what was planned. |

---

## 2. Prompt 0 — Project Constitution (paste once, keep persistent)

```
You are the lead engineer building "Carbon OS" — an AI-powered carbon accounting & ESG
compliance platform — inside this repository, working phase by phase across many
sessions. Before writing any code in ANY task, re-read this constitution. It overrides
convenience, speed, or "simpler" alternatives every time.

PROJECT DOCS
- docs/PRD.md — Product Requirements Document (the "what" and "why", module-by-module,
  numbered Modules 1–13).
- docs/TRD.md — Technical Requirements Document (the "how": stack, schema, infra).
- docs/FWS.md — Functional Workflow Specification (behavioral implementation reference:
  user journey → frontend → backend → DB → API → AI processing → validation → error
  handling → state changes → permissions, per feature). This is the most implementation-
  literal of the three and also encodes the "Scope Rationalization v1.2" locked decisions
  that narrow/clarify the PRD/TRD for a buildable v1. When the FWS and PRD ever conflict
  on a locked-architecture point, the FWS wins — it is the more recent, more specific spec.
- docs/CONVENTIONS.md — created in Phase -1; the folder/git/coding/naming conventions for
  this repo. Read it before writing any file path, branch name, or commit message.
- docs/CHECKLIST.md — created in Phase -1, updated after every phase; the human-readable
  progress tracker (Appendix A of this plan). Update its status table when you finish a
  phase — this is not optional bookkeeping, it's how the human overseeing this project
  knows what's actually done.

CONFIRMED TECH STACK — DO NOT SUBSTITUTE
- Frontend: React + TypeScript, TailwindCSS, React Router, React Query, Recharts.
- Backend (core app): Node.js + Express.js + TypeScript. This is the ONLY backend runtime
  for the core application — never introduce a second backend language/framework for
  anything except the ML service below.
- Database: PostgreSQL + Prisma ORM — the only system of record. Enable the `pgvector`
  extension on this same primary instance for the RAG knowledge base — there is no
  separate ChromaDB service in this build (that's a PRD-era idea; TRD/FWS locked it to
  pgvector on primary Postgres).
- File storage: local disk in dev → MinIO/S3-compatible object storage in prod.
- AI/LLM orchestration: an OpenAI-compatible LLM + LangChain. LangGraph is used for
  EXACTLY TWO graphs platform-wide: (1) AI Extraction (Module 5), (2) Compliance Drafting
  (Module 11). The RAG Copilot (Module 10) is a plain LangChain retrieval chain — NOT a
  LangGraph graph. Do not add a third graph or convert the RAG chain into a graph without
  being explicitly asked.
- OCR: hidden behind an `IOcrProvider` interface. v1 concrete implementation is
  Tesseract.js + OpenCV/Sharp for preprocessing (deskew, binarize, contrast-normalize).
- ML service: Python + FastAPI + XGBoost (primary) + scikit-learn (cold-start baseline).
  This is the ONLY Python runtime in the entire platform, and it is reached from the core
  API for exactly two internal endpoints: `/train` and `/predict`. It never touches auth,
  documents, or compliance data directly — only feature vectors in, predictions out.
- Auth: JWT (short-lived access + rotating refresh tokens).
- Async processing: BullMQ (Redis-backed), with EXACTLY TWO workers platform-wide:
  `aiWorker` (consumes `ai-queue`: document extraction, Layer-3 AI validation, compliance
  drafting) and `calcWorker` (consumes `calc-queue`: emissions calculation, recalculation).
  Everything else in the system is synchronous, INCLUDING notifications (see below).
  Do not introduce additional named workers or queues without being explicitly asked.

FOUR NON-NEGOTIABLE ARCHITECTURAL RULES
1. AI NEVER CALCULATES OR INVENTS AN EMISSIONS NUMBER. The `carbon-engine` module
   (Module 7) is pure, deterministic TypeScript with ZERO LLM/AI client imports of any
   kind — enforce this with an ESLint `no-restricted-imports` rule scoped to
   `src/modules/carbon-engine/**` that blocks importing the LLM/LangChain client. This
   applies symmetrically to Module 11 (Compliance Agent): the LLM drafts narrative TEXT
   ONLY; every numeric value in a report is inserted via a template engine reading
   directly from `calculated_emissions` / `emissions_aggregates` — the LLM is never
   prompted in a way that lets it output, round, or "fill in" a number.
2. MULTI-TENANCY IS ENFORCED AT THE DATA-ACCESS LAYER, NOT PER-ENDPOINT. Every
   tenant-scoped Prisma model is read/written through a shared `TenantScopedRepository`
   base class that injects `organizationId` (from the authenticated JWT claim, never from
   request body/params) into every query automatically.
3. EVERYTHING ASYNC GOES THROUGH BULLMQ, on exactly the two queues above. No long-running
   work — OCR, LLM calls, PDF/Excel rendering, ML training — ever runs inline inside an
   HTTP request handler. Notifications are the one deliberate exception: they are
   synchronous, fire-and-forget (see Phase 0) — do not queue them.
4. IDEMPOTENCY BY DESIGN. Every BullMQ job handler and every retryable mutating endpoint
   (uploads, extraction, calculation, bulk-approve) must be safely re-runnable without
   creating duplicate rows or double-counting.

CROSS-CUTTING PLATFORM SERVICES (built in Phase 0, used by every module thereafter)
- `ConfigService` — a single internal configuration service that owns things like AI
  provider settings, upload size/batch limits, confidence thresholds, and default
  emission-factor-set mappings. Modules read config through this service; they never
  read `process.env` directly for anything beyond true deployment-environment secrets
  (DB URL, JWT secret, etc.), and they never hardcode a business-tunable number inline.
- `FeatureFlagService`, backed by the `feature_flags` table — named flags at minimum:
  `ENABLE_FORECAST`, `ENABLE_RAG`, `ENABLE_COMPLIANCE`, `ENABLE_OCR`, `ENABLE_AI_VALIDATION`.
  Every module that corresponds to one of these (Modules 9, 10, 11, 5, 6 respectively)
  must check its flag before running that logic path, so any of these can be switched off
  in production without a redeploy. Default all flags to `true` in dev, but wire the
  checks in from day one — don't retrofit them later.
- Structured observability — Pino JSON logs everywhere, a `requestId` (HTTP) and `jobId`
  (BullMQ) attached to every log line and threaded through every async boundary, OTLP-
  compatible tracing, `/health` and `/ready` endpoints on every service (core-api,
  ml-service), and a Prometheus-compatible `/metrics` endpoint. This is built in Phase 0,
  not bolted on during the final hardening pass.
- Notification infrastructure (service + `notifications` table + synchronous send path)
  is built in Phase 0. Each module phase from Phase 5 onward is responsible for wiring
  its OWN real trigger points into this already-built service — see each phase's
  "NOTIFICATION TRIGGERS" section where relevant.

OTHER RULES THAT APPLY ACROSS EVERY MODULE
- AI Layer 3 validation output vocabulary is locked to exactly: `OK | SUSPICIOUS |
  LIKELY_ERROR | MISSING_INFO`, each with a mandatory plain-language explanation string.
  It never outputs `APPROVED`/`REJECTED` — only a human action sets those statuses.
- Roles: `SUPER_ADMIN` (platform operator, fully isolated auth route/JWT audience —
  never issuable via public signup), `ORG_ADMIN` (client admin), `ORG_MEMBER` (client
  user). Every `/api/admin/*` route sits behind one shared middleware checking the
  `SUPER_ADMIN` claim — never ad hoc per-route checks.
- There are two parallel data-entry paths feeding the SAME downstream pipeline: (a)
  Document Upload → OCR → AI Extraction, and (b) Manual Structured Entry (skips
  OCR/LLM extraction entirely, but still passes through Validation Layers 1/2/3 and
  Human Review like every other record).
- Standard API response envelope (every endpoint, always):
  `{ "success": true, "data": {}, "meta": {...} }` on success,
  `{ "success": false, "error": { "code": "...", "message": "...", "details": {} } }` on
  failure. Base path `/api/v1/...`. Internal service-to-service routes live under
  `/internal/...` and are never publicly exposed. Full versioning/deprecation policy is
  in docs/API_VERSIONING.md (Appendix B of the plan this constitution comes from) —
  follow it for every new route.
- Determinism is a hard requirement for Module 7: identical inputs + identical emission
  factor version must produce a bit-for-bit identical `co2e_value` every time. Use
  fixed-precision decimal arithmetic, never native floats, for any CO2e math.
- Every state-changing action writes to `audit_logs`. Super Admin cross-tenant data
  views additionally write to `admin_access_logs` with a mandatory reason.
- TESTING IS PART OF EVERY MODULE, NOT A FINAL STEP. Every module phase (2 through 14)
  has its own explicit "TESTING" deliverable. Do not mark a module complete, and do not
  move on to the next phase, until that module's own unit and integration tests exist
  and pass in CI. The final Security/Hardening/QA phase (15) verifies cross-cutting
  concerns (tenant isolation, determinism, reconciliation, load, WCAG) — it is not where
  first-time testing of a module's own logic happens.

WHEN YOU'RE UNSURE
If a requirement in a task prompt seems to conflict with something above, STOP and ask
rather than silently picking one. Do not "helpfully" simplify away an explicit business
rule (e.g., never skip the human-approval gate, never let recalculation silently mutate
a locked period) even if it would make a demo look better faster.
```

---

## 3. Phase -1 — Project Initialization & Repository Planning

**Why first:** conventions, templates, and a requirements freeze have to exist before the first commit, or a multi-session, multi-agent build ends up with inconsistent folder names, commit styles, and PR quality from week one onward.

```
TASK: Initialize the Carbon OS repository — conventions and process only, zero
application code in this task. Read docs/PRD.md (skim all of it once) and
docs/FWS.md's "Locked architecture" table before starting, so every convention you set
is consistent with what's coming.

DELIVERABLES
1. docs/REQUIREMENTS_FREEZE.md — a one-page snapshot: confirmed tech stack (copy the
   "CONFIRMED TECH STACK" list from the Project Constitution), the 13 PRD modules by
   name, and an explicit "changes to this list require updating this file and flagging
   it in the next standup/PR" note. This is what "v1.0 scope" means for this project —
   point back to it whenever scope creep is proposed.
2. docs/CONVENTIONS.md covering:
   - Folder convention: mirror the monorepo layout that Phase 0 will create
     (apps/web, apps/core-api, apps/ml-service, packages/db, packages/shared-types,
     docs/, infra/) — write this file now as the target structure, Phase 0 builds
     to it.
   - Git convention: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`,
     `refactor:`) and a branching strategy — use GitHub Flow (short-lived feature
     branches off `main`, PR + review + squash-merge, no long-lived `develop` branch)
     since this is a single-deployable-target v1, not a multi-release-train product.
     Document it explicitly so there's no ambiguity later.
   - Coding convention: camelCase for variables/functions, PascalCase for types/classes,
     kebab-case.type.ts for filenames (e.g., create-site.validator.ts). TypeScript
     `strict: true` everywhere; `any` banned via lint rule except in explicitly
     justified, commented exceptions. ESLint + Prettier, shared config in a
     packages/eslint-config workspace package.
   - Prisma migration naming convention: `YYYYMMDDHHMM_verb_noun` (e.g.,
     `202601150900_add_sites_table`), one logical change per migration, and every
     migration PR must include a one-line rollback note in the PR description.
   - Environment variables & secrets: document that all env vars are validated at boot
     via a Zod schema (built in Phase 0) and that a committed `.env.example` (with
     placeholder, non-real values) must be updated in the SAME PR that introduces a new
     env var — a PR that adds a var without updating `.env.example` should fail review.
     Real secrets are never committed; document your secrets-management approach for
     prod (e.g., a secrets manager or platform-native env injection) even if it's just a
     placeholder decision for now ("TBD at deploy time, tracked in
     docs/DEPLOYMENT.md" is an acceptable placeholder).
   - Dependency hygiene: enable Dependabot (or Renovate) config for the monorepo now,
     even if it's just the config file — automated dependency PRs from week one avoid a
     giant, risky upgrade later.
3. .github/ISSUE_TEMPLATE/ — at least a "bug_report.md" and a "feature_or_module_task.md"
   template (the latter should have checkboxes mirroring this plan's module structure:
   PRD section read, FWS section read, entities implemented, tests written, acceptance
   criteria met).
4. .github/PULL_REQUEST_TEMPLATE.md — must include: what changed, which PRD/FWS section
   this implements, a checklist item for "tests added/updated," a checklist item for
   "migration rollback note included (if schema changed)," and a checklist item for any
   module touching money/emissions/security: "confirms the relevant hard rule
   (determinism / AI-never-writes-numbers / tenant isolation) was not violated."
5. docs/CHECKLIST.md — create this now using the exact table structure in Appendix A of
   this plan (copy it verbatim as the starting point), with every phase marked ⬜ Not
   Started. This is the single human-readable progress tracker for the whole project —
   update it at the end of every phase from here on.
6. README.md (repo root, initial version) — project name, one-paragraph description,
   link to docs/REQUIREMENTS_FREEZE.md, docs/CONVENTIONS.md, and docs/CHECKLIST.md.
   Phase 0 will extend this with actual run instructions once there's something to run.

ACCEPTANCE CRITERIA
- A new contributor (or a new agent session with zero prior context) can read
  docs/CONVENTIONS.md and docs/REQUIREMENTS_FREEZE.md and know exactly how to name a
  branch, a commit, a file, and a migration, without asking.
- Issue and PR templates exist and render correctly on GitHub (or your Git host).
- docs/CHECKLIST.md exists with all 18 phases listed and marked Not Started.

DO NOT write any application code, install any framework, or create the monorepo
skeleton in this task — that's Phase 0. This phase is process and conventions only.
```

---

## 4. Phase 0 — Infrastructure, Configuration, Feature Flags & Observability Bootstrap

**Why now:** every guardrail (ESLint boundary, `TenantScopedRepository`, queue names, Prisma schema skeleton) plus every cross-cutting service (config, feature flags, observability, notifications) has to exist before feature code, or you're retrofitting architecture into code that already violates it.

```
TASK: Bootstrap the Carbon OS monorepo, shared infrastructure, and cross-cutting
platform services. No feature/business logic yet — this task only builds the skeleton,
guardrails, and shared services everything else plugs into. Read docs/PRD.md §3 (Tech
Stack) and §5 (Database Design intro), docs/FWS.md "Locked architecture" table, and
docs/CONVENTIONS.md (from Phase -1) before starting — follow the folder layout and
naming conventions exactly as already documented there.

DELIVERABLES
1. Monorepo layout (per docs/CONVENTIONS.md):
   - apps/web              — React + TypeScript + Tailwind + React Router + React Query
   - apps/core-api          — Node.js + Express + TypeScript
   - apps/ml-service        — Python + FastAPI (skeleton only: /health, /predict, /train
                              stubs returning 501 Not Implemented for now)
   - packages/db            — Prisma schema + generated client, shared by core-api and
                              any worker processes
   - packages/shared-types   — TypeScript types/interfaces shared between web and core-api
     (e.g., the API response envelope type)
   - packages/eslint-config — shared lint config (from Phase -1's convention doc)
   - docs/                  — PRD.md, TRD.md, FWS.md, CONVENTIONS.md, CHECKLIST.md live
                              here (assume already placed by earlier phases)
2. Prisma schema skeleton in packages/db/schema.prisma:
   - Enable the `pgvector` Postgres extension.
   - Define ONLY these foundational models for now: `users`, `organizations`,
     `sessions`, `feature_flags`, `config_entries` (see item 5 below), with fields
     matching docs/PRD.md §5.1 (Identity & Organization Domain) — just enough to prove
     the schema/migration pipeline works end-to-end. Every other model gets added in its
     own module's phase, not here.
   - Every model that will eventually be tenant-scoped must already follow the naming
     convention `organizationId` (camelCase FK) so `TenantScopedRepository` can rely on
     it consistently later.
   - Follow the migration naming convention from docs/CONVENTIONS.md for every
     migration file from the very first one.
3. `TenantScopedRepository` base class in apps/core-api/src/repositories/ — a generic
   base class/mixin that requires the caller to pass the authenticated `organizationId`
   at construction time (accept it as a constructor arg for now, since Auth isn't built
   yet; wire it to the real JWT claim when Phase 2/Module 1 lands) and automatically
   injects `where: { organizationId }` into every Prisma query it wraps. Write at least
   one unit test proving a query WITHOUT explicit org filtering still comes back scoped.
4. ESLint rule enforcing the carbon-engine boundary: a `no-restricted-imports` (or
   equivalent custom rule) that fails the build if anything under
   apps/core-api/src/modules/carbon-engine/** imports any LLM/LangChain/OpenAI client
   package. Create the empty `carbon-engine` folder with a placeholder file, prove the
   rule fires on a deliberately-added violating import, then remove it, committing the
   passing state.
5. `ConfigService` (apps/core-api/src/core/config/) — a single internal service that
   owns business-tunable configuration: default AI confidence threshold (0.7), upload
   limits (25 files/batch, 20MB/file), default emission-factor-set mappings, and any
   other value that a later module would otherwise hardcode. Back it with a
   `config_entries` table (key, value_json, description, updated_by, updated_at) so
   Super Admin can eventually tune these without a redeploy (Module 13 gets the UI for
   this later; this phase just builds the service + table + a seed of sane defaults).
   Modules must call `configService.get('someKey')` rather than reading `process.env` or
   hardcoding a business number.
6. `FeatureFlagService` + `feature_flags` table (id, key, description, is_enabled, scope
   enum(GLOBAL, ORG), organization_id nullable). Seed exactly these five flags, all
   `is_enabled = true` by default: `ENABLE_FORECAST`, `ENABLE_RAG`, `ENABLE_COMPLIANCE`,
   `ENABLE_OCR`, `ENABLE_AI_VALIDATION`. Provide a simple
   `featureFlagService.isEnabled(key, organizationId?)` helper that later modules will
   call as a guard clause.
7. BullMQ + Redis setup:
   - Define exactly two queues: `ai-queue` and `calc-queue` (as named constants in
     packages/shared-types or similar, not magic strings scattered around).
   - Two worker entrypoints: apps/core-api/src/workers/aiWorker.ts and
     apps/core-api/src/workers/calcWorker.ts — each currently just logs "job received"
     with the job's `jobId` and acks it. Real job handlers get added per-module later.
8. Observability, built now (not deferred to Phase 15):
   - Pino structured JSON logging, wired so every log line includes `requestId` (HTTP,
     via middleware) and, inside workers, `jobId` — both threaded through async
     boundaries so a document's full lifecycle is traceable via
     `grep requestId` across API and worker logs.
   - `/health` (liveness) and `/ready` (readiness — checks DB + Redis connectivity)
     endpoints on core-api and ml-service.
   - A `/metrics` endpoint (Prometheus-compatible) on core-api exposing at minimum:
     request latency histograms and BullMQ queue depth for both queues.
   - OpenTelemetry SDK instrumentation wired for Express + Prisma + BullMQ, exported to
     any OTLP-compatible backend (stub the exporter target as a documented env var for
     now — you don't need a real backend running in dev).
9. Notification infrastructure (build the pipe now; Phases 5/6/7/10/12 wire in the real
   trigger points later):
   - `notifications` table (id, user_id, type, message, is_read, created_at).
   - A `NotificationService.send(userId, type, message)` that: INSERTs the row, then
     attempts an email send SYNCHRONOUSLY and best-effort (log-and-continue on failure —
     never queued, never retried via BullMQ, per the locked v1 decision).
   - GET /api/v1/notifications and PATCH /api/v1/notifications/:id/read endpoints, plus
     a placeholder "no triggers wired yet" comment where later phases will call
     `notificationService.send(...)`.
10. docker-compose.yml (or equivalent) for local dev: Postgres (with pgvector image),
    Redis, MinIO. Include a seed script (packages/db/seed.ts) that seeds the
    feature_flags and config_entries defaults above.
11. Backup / disaster-recovery notes (documentation only in this phase — real
    automation is a deploy-time concern, but the plan must exist now):
    - docs/DEPLOYMENT.md — add a "Backup & DR" section documenting the target policy:
      automated daily PostgreSQL backups with point-in-time recovery, object-storage
      versioning enabled for uploaded documents and generated reports, and target
      RTO/RPO (RPO ≤ 24h, RTO ≤ 4h for v1). This gets *implemented* against real infra
      in Phase 15/deployment, but the policy is written down starting now so it's never
      an afterthought.
12. `.env.example` — every env var currently in use, with placeholder values, committed
    at the repo root. All env vars validated at boot via a Zod schema
    (src/core/config/env.schema.ts) — the process refuses to start if any required
    variable is missing/malformed.
13. CI skeleton (GitHub Actions or equivalent): lint, typecheck, and test steps that
    currently just prove the repo builds. Add a placeholder test file
    apps/core-api/src/modules/carbon-engine/__tests__/determinism.placeholder.test.ts
    with a TODO comment referencing FWS §9.4 rule 6 (determinism) — this becomes a real
    test in Phase 8, but reserve the CI slot now.
14. README.md — extend Phase -1's version with: how to install, run migrations, run both
    apps, run both workers, run tests, and hit /health, /ready, /metrics locally.
15. Update docs/CHECKLIST.md: mark Phase -1 and Phase 0 as Done.

ACCEPTANCE CRITERIA
- `npm install && npm run db:migrate && npm run dev` (or documented equivalent) brings
  up web + core-api + ml-service stub with no errors.
- A deliberate LLM import inside carbon-engine/ fails lint; removing it passes.
- TenantScopedRepository unit test passes.
- /health, /ready, /metrics all return sane responses on core-api.
- ConfigService and FeatureFlagService both have at least one passing unit test.
- CI pipeline is green on a clean clone.

DO NOT build any auth, organization, or business logic yet — this phase is infrastructure
and shared platform services only.
```

---

## 5. Phase 1 — Shared Frontend Component Library

**Why now:** every feature screen from Phase 2 onward reuses these primitives. Building them once, deliberately, prevents thirteen modules from each inventing their own button/table/modal.

```
TASK: Build the shared frontend component library in apps/web before any feature/module
screens exist. This is a UI-primitives-only task — no auth screens, no dashboard, no
business logic. Read docs/PRD.md §7 (UI Requirements — Screen Inventory, especially
§7.1 Global Layout and §7.3 Cross-Cutting UI Rules) before starting; every component you
build here must satisfy those cross-cutting rules from day one (loading states,
empty-state pairing, accessibility) rather than needing rework later.

DELIVERABLES — build in this order, each as a reusable, documented component with
Storybook (or an equivalent lightweight component-preview setup) if the team wants one,
otherwise a simple demo route (/component-showcase) is an acceptable substitute:
1. App Layout — persistent left sidebar (collapses to icon-only <1024px, bottom tab bar
   <640px per PRD §7.1), top bar with reporting-period selector slot and user-menu slot.
2. Sidebar — nav item component with active-state styling, icon + label, badge slot (for
   future notification counts / missing-document counts).
3. Navbar / top bar — org name/switcher slot, reporting-period selector, user menu.
4. Buttons — primary/secondary/destructive/ghost variants, loading-spinner state
   (disables + spins on click, per the PRD's "prevent double-submit" rule referenced in
   Module 1), icon-button variant.
5. Cards — a generic content card (used for KPI cards, site cards, etc.), with a
   loading-skeleton variant matching its own final layout shape (never a generic
   spinner-only blank card — this is a hard PRD §7.3 rule, bake it into the component).
6. Modal — supports a "type CONFIRM to proceed" pattern (needed repeatedly later:
   industry change, org suspension, unlocking a locked period) as a configurable prop,
   not something each module reimplements.
7. Table — sortable columns, pagination, empty-state slot (with a required "next action"
   CTA prop — PRD §7.3 says empty states must never be a bare "no data" message), and a
   documented mobile fallback to a card layout (data-dense tables switch to cards on
   mobile per PRD §7.1).
8. Form primitives — text input, select, date picker, file dropzone, all wired to accept
   a Zod-schema-derived error shape so every module's form can show inline field-level
   errors consistently (PRD §7.3: inline field-level errors preferred over toast-only
   errors for form validation).
9. Toast — for action confirmations/failures only (per PRD §7.3 — not for form
   validation, which uses inline errors).
10. Loader / Skeleton primitives — a small set of skeleton shapes (text line, card,
    table row, chart placeholder) that every later module's loading state composes from,
    rather than each module drawing its own bespoke skeleton.
11. Error Boundary — a top-level React error boundary plus a per-widget-scoped variant
    (needed later so one broken Dashboard widget doesn't blank the whole page, per PRD
    §8.14 in the Dashboard module).
12. Theme — Tailwind theme tokens (colors, spacing, type scale) defined once; status/
    confidence-badge colors (green/yellow/red for confidence scores, used repeatedly in
    Modules 5/6) defined as named tokens here, always paired with an icon/text label
    per the accessibility rule in PRD §7.3 ("color is never the sole indicator of
    status") — build that pairing into the badge component itself so no later module can
    accidentally ship a color-only badge.

TESTING (required before this phase is "done" — do not defer)
- A unit/snapshot test per component covering at least: default state, loading state,
  empty state (where applicable), and error state.
- An accessibility check (e.g., axe-core or equivalent) run against the component
  showcase route, asserting no color-only status indicators and full keyboard
  navigability on interactive components.

ACCEPTANCE CRITERIA
- Every component listed above exists, is exported from a single
  packages/shared-types-or-ui entry point (your call on exact package name — document it
  in README.md), and has at least one passing test.
- The component showcase route renders every component in its default/loading/empty/
  error states without errors.
- No later module phase should need to build a net-new button, table, modal, or toast
  from scratch — confirm this is genuinely true by skimming the Frontend Behaviour
  section of PRD Modules 1–13 and checking every mentioned UI pattern maps to a
  component built here.
- Update docs/CHECKLIST.md: mark Phase 1 Done.

DO NOT build anything specific to Auth, Organizations, Sites, or any other module's
business data in this phase — these are pure, content-agnostic UI primitives.
```

---

## 6. Phase 2 — Module 1: Authentication & Authorization

**Why now:** everything downstream needs to know who's acting and which org their data belongs to.

```
TASK: Implement Module 1 (Authentication & Authorization) exactly as specified in
docs/PRD.md §Module 1 and docs/FWS.md §2 (Authentication Flow). Read both in full before
starting — the FWS §2 sequence diagrams (2.1–2.5) are the literal request/response
contract; implement to match them precisely, including exact status codes and error
codes. Build all screens using the shared component library from Phase 1 — do not create
one-off buttons/forms/modals for this module.

SCOPE
Two roles at launch: SUPER_ADMIN (platform operator) and ORG_ADMIN / ORG_MEMBER
(client-side; ORG_MEMBER is a Phase-2-of-the-PRD role but model the `role` enum as
SUPER_ADMIN | ORG_ADMIN | ORG_MEMBER now so no schema rewrite is needed later).

DATA MODEL (Prisma, extend packages/db/schema.prisma, following the migration naming
convention from docs/CONVENTIONS.md)
- users: id (uuid), email (unique, citext/lowercased), password_hash, full_name, role
  enum(SUPER_ADMIN, ORG_ADMIN, ORG_MEMBER), organization_id (nullable FK, null for
  SUPER_ADMIN), status enum(PENDING_VERIFICATION, ACTIVE, SUSPENDED), email_verified_at,
  last_login_at.
- sessions: id, user_id (FK), refresh_token_hash, device_info, ip_address, expires_at,
  revoked_at.
- auth_tokens (covers both email-verification and password-reset per FWS naming): id,
  user_id (FK), token_hash, purpose enum(EMAIL_VERIFY, PASSWORD_RESET), expires_at,
  used_at.
- invites: id, organization_id (FK), email, invited_by (FK users), token_hash, status,
  expires_at.

API CONTRACT (base path /api/v1/auth, plus /api/v1/org for invites, plus a fully
separate /api/v1/admin/auth/login for Super Admin)
- POST /auth/signup — { email, password, orgName } → validate email format + password
  policy (min 10 chars, 1 upper, 1 lower, 1 number, 1 symbol) → check uniqueness → bcrypt
  hash (cost ≥ 12, async so it never blocks the event loop) → INSERT users
  (PENDING_VERIFICATION) + organizations in ONE transaction → INSERT auth_tokens
  (purpose=EMAIL_VERIFY, 24h expiry) → send verification email via NotificationService's
  email path (fire-and-forget, best-effort, per the Phase 0 notification infra — reuse
  it, don't build a second email-sending path) → 201.
- POST /auth/verify-email — validate token (signature, expiry, single-use — mark used_at
  on consumption) → UPDATE users.status = ACTIVE. Clicking an already-used link shows
  "already verified, please log in" — not a generic error.
- POST /auth/resend-verification — rate-limited to 1/60s.
- POST /auth/login — generic "invalid email or password" on any failure (user not found
  OR bad password) to prevent enumeration; 403 EMAIL_NOT_VERIFIED if pending; 403
  ACCOUNT_SUSPENDED if suspended; on success, issue JWT access token (15 min, claims:
  userId, orgId, role) + rotating refresh token (7 days, random, HASHED before storage,
  returned to client as HttpOnly + Secure + SameSite=Strict cookie) → INSERT sessions row
  with device_info + ip_address.
- POST /auth/refresh — reads refresh cookie → look up by hash → if not found/revoked/
  expired → 401, force full logout client-side. If valid and NOT previously rotated →
  rotate (new hash, same session row), return new access token + new refresh cookie. If
  the presented token was ALREADY rotated once before (reuse — theft signal) → revoke the
  ENTIRE session family for that user, return 401 SESSION_COMPROMISED, log a security
  event.
- POST /auth/logout — deletes current sessions row.
- POST /auth/logout-all — deletes all sessions rows for the user.
- POST /auth/forgot-password — ALWAYS returns the same generic success message
  regardless of whether the email exists; only sends an email server-side if it does.
- POST /auth/reset-password — validate token (expiry, single-use) → UPDATE password_hash
  → mark token used → DELETE ALL sessions rows for that user (force logout everywhere).
- POST /org/invite (ORG_ADMIN only) — invite teammate by email.
- POST /org/invite/:token/accept (public, token-authenticated) — invited user sets their
  own password on first login.
- DELETE /org/users/:id (ORG_ADMIN only) — remove a user from the org; block with a
  validation error if this would remove the last ORG_ADMIN.
- POST /admin/auth/login (SUPER_ADMIN only, fully separate route + separate JWT audience
  claim) — never issuable via public signup.

RATE LIMITING
5 failed login attempts / 15 min / account → 429 with `retry_after_seconds`, then require
captcha on next attempt (implement the lockout counter + 429 now; captcha integration can
be a TODO stub that always "passes" until a real captcha provider is wired in).

FRONTEND (apps/web, built from Phase 1's component library)
Screens: Signup, Email Verification Pending, Login (with "remember this device"
checkbox), Forgot Password, Reset Password, Team Invite table (ORG_ADMIN only). Store the
access token in memory only — never localStorage. Wire an axios/fetch interceptor that
on a 401 silently calls /auth/refresh once and retries the original request; on refresh
failure, redirect to /login with "session expired, please log in again".

EDGE CASES YOU MUST HANDLE
- Duplicate email on signup → 409, generic "account with this email may already exist".
- Refresh token reuse after rotation → revoke entire session family, force re-login, log
  security event (see FWS §2.4 sequence diagram exactly).
- ORG_ADMIN removes themselves as the last admin → blocked.
- User clicks an old, already-consumed verification link → "already verified" message.

TESTING (required before this phase is "done")
- Unit tests: password policy validation, JWT issuance/claims shape, bcrypt hashing path.
- Integration tests (against a real ephemeral Postgres, not mocks): full signup → verify
  → login flow; refresh-token rotation; refresh-token reuse-after-rotation revokes the
  whole session family (this is the single most important security test in this module —
  write it explicitly); SUPER_ADMIN login route rejects any client-facing JWT.

ACCEPTANCE CRITERIA
- A new user can sign up, verify email, and log in end-to-end with no support
  intervention.
- An unverified user cannot reach any organization-data endpoint.
- SUPER_ADMIN login is fully isolated from the client-facing login route and JWT
  audience/scope.
- Update docs/CHECKLIST.md: mark Phase 2 Done.

DO NOT implement SSO, 2FA/MFA, or multi-org membership — those are explicitly Future
Enhancements (PRD §1.18), not v1 scope.
```

---

## 7. Phase 3 — Module 2: Organization Management

**Why now:** industry + country drive emission-factor mapping and compliance-framework defaults that every later module depends on.

```
TASK: Implement Module 2 (Organization Management) per docs/PRD.md §Module 2 and
docs/FWS.md §3 (Organization Workflow). Auth (Phase 2) already exists — build on top of
it; every route here is authenticated and org-scoped via TenantScopedRepository. Use the
shared component library (Phase 1) for every screen.

DATA MODEL
- organizations: id, name, legal_entity_name, industry_id (FK), country (ISO-3166,
  char(2)), reporting_year_start_month (int 1–12), status enum(ACTIVE, SUSPENDED),
  default_framework enum(BRSR, ESG_SUMMARY).
- organization_settings: id, organization_id (FK, unique), unit_system (metric only in
  v1), default_currency, notification_preferences (jsonb).
- industries (lookup/seed table): id, name, default_emission_factor_set_id.
- industry_emission_factor_mappings: industry_id (FK), emission_factor_category_id (FK).
- reporting_periods: id, organization_id (FK), start_date, end_date, status
  enum(OPEN, LOCKED), locked_at, locked_by (FK users).

SEED DATA
Seed a reasonable controlled industry list (e.g., Cement/Steel Manufacturing, Textile
Manufacturing, Chemicals, Automotive Manufacturing, Logistics/Warehousing, Food & Beverage
Manufacturing, General Manufacturing, Corporate/Office) into `industries` via
packages/db/seed.ts — industry must be a controlled enum-like lookup, never free text.

API CONTRACT
- POST /organizations (ORG_ADMIN, post-signup) — creates org profile as part of the
  mandatory setup wizard; seeds a `reporting_periods` row for the selected fiscal year
  and applies the industry's default emission-factor-set reference.
- GET /organizations/:id — org member, read.
- PATCH /organizations/:id — ORG_ADMIN. If `industry_id` is changing AND the org already
  has any calculated emissions, REQUIRE a `confirmed: true` flag or reject with 409; when
  confirmed, write an audit_logs entry.
- GET /industries — public/authenticated lookup list.
- PATCH /organizations/:id/reporting-year — ORG_ADMIN; reject with 409
  REPORTING_PERIOD_LOCKED if the current period is already locked.

FRONTEND
- Organization Setup Wizard (first login, cannot be skipped, blocks access to every
  other module until complete): 3 steps — Company Details → Industry & Country →
  Reporting Year → Confirm.
- Organization Settings screen: tabbed (Profile / Reporting / Preferences), inline save
  per tab with toast confirmation.
- Industry-change warning modal: use the shared Modal's "type CONFIRM" mode from Phase 1.

BUSINESS RULES
- Industry list is a controlled enum/lookup table (FK constraint), never free text.
- Reporting year cannot change once a reporting period under it has locked/calculated
  data, without SUPER_ADMIN override.
- Only one active reporting-year configuration per org at a time.
- v1 supports exactly one HQ country per organization.

EDGE CASES
- Org Admin tries to set a reporting year overlapping an existing locked period → blocked
  with explanation.
- Every settings change writes an audit_logs entry.

TESTING (required before this phase is "done")
- Unit tests: industry-change confirmation-gate logic, reporting-year overlap validation.
- Integration tests: setup wizard end-to-end creates org + settings + seeded reporting
  period + emission-factor-set mapping in one transaction; industry change without
  `confirmed: true` is rejected when calculated data exists.

ACCEPTANCE CRITERIA
- A new organization cannot reach Module 4 (data collection) until the setup wizard is
  fully completed — enforced as a route guard, not just a UI nudge.
- Changing industry after calculated data exists requires the typed confirmation and is
  audit-logged.
- Update docs/CHECKLIST.md: mark Phase 3 Done.

DO NOT build multi-entity/subsidiary org hierarchies or custom emission-factor overrides
— both are explicit Future Enhancements (PRD §2.18).
```

---

## 8. Phase 4 — Module 3: Site Management

**Why now:** every document and every calculated emission must attribute to exactly one site (or an explicit org-level pseudo-site) — this has to exist before Module 4's upload wizard can ask "which site?".

```
TASK: Implement Module 3 (Site Management) per docs/PRD.md §Module 3 and docs/FWS.md §4
(Site Workflow). Use the shared component library (Phase 1) for every screen.

DATA MODEL
- sites: id, organization_id (FK), name (unique within org, not globally), site_type
  enum(MANUFACTURING_PLANT, WAREHOUSE, OFFICE, DISTRIBUTION_CENTER), address, country,
  state, city, production_capacity (numeric, nullable), production_capacity_unit (text,
  nullable), status enum(ACTIVE, INACTIVE).

API CONTRACT
- GET /sites — org member, list.
- POST /sites — ORG_ADMIN; organization_id ALWAYS derived from JWT, never trusted from
  request body.
- GET /sites/:id — org member.
- PATCH /sites/:id — ORG_ADMIN.
- PATCH /sites/:id/deactivate — ORG_ADMIN; SOFT delete only (status → INACTIVE); 409
  CONFLICT if hard-delete is attempted on a site with data.
- GET /sites/:id/dashboard — org member; reads from `emissions_aggregates` filtered by
  site_id (this table doesn't exist until Phase 8/9 — for now, stub this endpoint to
  return an empty/zeroed shape with a TODO comment, and revisit once Module 8 lands).

FRONTEND
- Site List: table (from Phase 1's shared Table component) with status badge, quick
  stats, "Add Site" CTA, empty state "No sites yet — add your first plant or facility to
  start tracking emissions."
- Add/Edit Site form: site_type selection changes visible fields.
- Site Dashboard: filterable by reporting period, scope 1/2/3 split, trend, "compare to
  other sites" toggle (auto-hidden when the org has only one site).
- Deactivate confirmation modal (shared Modal component).

BUSINESS RULES / EDGE CASES
- Every document upload (Module 4) and every calculated emission record must attribute to
  exactly one site OR be explicitly tagged "organization-level / shared" — model this now
  (a nullable site_id + isOrgLevel handling) so Module 4/7 don't have to retrofit it.
- Uploading against an INACTIVE site → 400 SITE_INACTIVE (enforced when Module 4 lands).
- Add a composite index on (organization_id, name) and paginate the list endpoint to stay
  performant to at least 200 sites per org.

TESTING (required before this phase is "done")
- Unit tests: site_type-driven field visibility logic (if any server-side), unique-name
  constraint behavior.
- Integration tests: create/edit/deactivate flow; hard-delete attempt on a site with data
  returns 409; deactivated site excluded from active dropdowns but present in historical
  filters.

ACCEPTANCE CRITERIA
- Create, edit, and deactivate a site; deactivated sites disappear from active "add data"
  flows/dropdowns but remain in historical filters.
- Duplicate site name within the same org is rejected; the same name IS allowed across
  different orgs.
- Update docs/CHECKLIST.md: mark Phase 4 Done.

DO NOT build site hierarchy/grouping, site-level user permissions, or a map/geolocation
view — all explicit Future Enhancements (PRD §3.18).
```

---

## 9. Phase 5 — Module 4: Carbon Data Collection Wizard

**Why now:** the first module that actually produces data for the AI/validation/calculation pipeline — needs Org + Site + Reporting Period to already exist. Also the first phase with real notification triggers to wire in.

```
TASK: Implement Module 4 (Carbon Data Collection Module — Guided Wizard) per
docs/PRD.md §Module 4 and docs/FWS.md §5 (Carbon Data Collection Workflow, Detailed) in
full, including the 5.3 Document Status State Machine and 5.4 Feature Details table.
Use the shared component library (Phase 1) throughout.

DATA MODEL
- document_categories (lookup): id, scope enum(SCOPE_1, SCOPE_2, SCOPE_3), name,
  description, is_required_default (bool), sample_template_url.
- documents: id, organization_id, site_id, reporting_period_id, category_id (FKs), file_url,
  file_type, file_size_bytes, source enum(UPLOAD, MANUAL), status
  enum(UPLOADED, EXTRACTING, EXTRACTED, EXTRACTION_FAILED, VALIDATING, NEEDS_REVIEW,
  VALIDATED, APPROVED, REJECTED, CALCULATION_BLOCKED), uploaded_by (FK users).
- document_status_history: id, document_id (FK), from_status, to_status, changed_by,
  changed_at, note.

SEED DATA — the full document category taxonomy from PRD §4.4 / FWS §5.2 (Stationary
Combustion, Mobile Combustion, Fugitive Emissions, Purchased Electricity, Renewable
Energy, Upstream Transport, Downstream Transport, Purchased Goods & Services, Waste,
Business Travel & Commuting).

API CONTRACT
- GET /document-categories — list categories with requirement status for a given
  site/period.
- POST /documents/upload-url — get pre-signed upload URL(s) (max 25 files/batch, 20MB/
  file — server does MIME-sniff verification, never trusts file extension alone). Read
  these limits from `ConfigService` (Phase 0), not hardcoded constants.
- POST /documents — register uploaded document metadata → INSERT documents
  (status=UPLOADED) → enqueue `ai-queue` job EXTRACT_DOCUMENT (Phase 6 will consume this
  — fine if it doesn't exist yet, just prove the job lands on the queue). Check
  `ENABLE_OCR` via FeatureFlagService before enqueueing — if disabled, leave the document
  at UPLOADED with a clear "extraction is currently disabled" status note rather than
  silently doing nothing.
- POST /activity-data/manual — the manual-entry path: structured form per category
  schema → INSERT documents (source=MANUAL, status jumps straight to EXTRACTED) +
  extracted_data directly, with NO OCR/LLM job enqueued.
- GET /documents — list, filterable by site/period/category/status.
- GET /documents/:id — detail (stub gracefully if Module 5/6 data isn't available yet).
- GET /reporting-periods/:id/progress — returns [{category, requiredStatus,
  approvedCount}] — progress bar counts APPROVED documents only.
- POST /reporting-periods/:id/lock — ORG_ADMIN only; sets status=LOCKED, blocks further
  uploads (409 PERIOD_LOCKED on attempt).

NOTIFICATION TRIGGERS (wire these into the already-built NotificationService from
Phase 0 — do not build a second notification path)
- "Missing documents reminder" — In-app banner + email, recipient ORG_ADMIN, scheduled
  cron, configurable days before period close (read the interval from ConfigService).
  Build the scheduled job now even though it depends on categories that may still be
  incomplete — it's this module's own event, not a later phase's responsibility.
- "Review pending (reminder)" — Email, scheduled, recipient ORG_ADMIN, configurable
  interval before the reporting period's target close date.

FRONTEND
- Wizard: Select Site → Select Reporting Period → Category grid (scope 1/2/3, progress
  badges) → click a category → Upload Guide → Upload File OR Type Manually.
- Document Detail Drawer, Missing Documents persistent sidebar banner, empty-state
  category screens — all built from Phase 1's Card/Table/Loader primitives.

VALIDATIONS
File type ∈ {PDF, JPG, PNG, XLSX, CSV} (server MIME-sniff) · size ≤ 20MB · batch ≤ 25
files · category must belong to a valid scope · site must be ACTIVE · reporting period
must be OPEN. (Limits sourced from ConfigService, not hardcoded — see above.)

ERROR HANDLING (exact user-facing copy + codes, per FWS §5.7) — implement exactly:
INVALID_FILE_TYPE (400), FILE_TOO_LARGE (400), PERIOD_LOCKED (409), and the
EXTRACTION_FAILED status path for corrupt/unreadable files.

DOCUMENT STATUS STATE MACHINE — implement exactly as FWS §5.3 diagrams it (see the v1
plan's original Phase 5 write-up for the full transition list — unchanged in this
revision).

EDGE CASES
- Duplicate upload of the same invoice → flagged by Module 6 Layer 1, not silently
  double-counted.
- Reporting period spans a site deactivation mid-period → historical uploads remain
  valid; no new uploads accepted post-deactivation.
- "Replace" a document at the UI level = upload new file + mark old documents row
  status=REJECTED, reason='superseded' — never a destructive delete.

TESTING (required before this phase is "done")
- Unit tests: file validation rules (type/size/batch), state-machine transition guards.
- Integration tests: full wizard flow (select site → period → category → upload →
  register) enqueues exactly one EXTRACT_DOCUMENT job per file; manual-entry path skips
  that job entirely; period lock blocks further uploads with 409; retrying an
  EXTRACTION_FAILED document is idempotent (no duplicate row).

ACCEPTANCE CRITERIA
- A user can complete an entire reporting period's required categories end-to-end via the
  wizard alone.
- Progress indicator reflects APPROVED counts only.
- Locking a period blocks further uploads and is reversible only by ORG_ADMIN with an
  audit trail entry.
- The two notification triggers above actually fire under their real conditions (test
  this, don't just assert the code path exists).
- Update docs/CHECKLIST.md: mark Phase 5 Done.

DO NOT build bulk multi-tab Excel import, email-to-upload, or a mobile capture app — all
explicit Future Enhancements (PRD §4.20).
```

---

## 10. Phase 6 — Module 5: AI Data Collector Agent

**Why now:** needs real `documents` rows in `UPLOADED` status (Phase 5) to extract from.

```
TASK: Implement Module 5 (AI Data Collector Agent) per docs/PRD.md §Module 5 and
docs/FWS.md §6 (AI Data Collector Workflow — LangGraph Extraction Pipeline) in full,
including §6.2's exact sequence diagram and §6.4's input/output/retry-policy table per
node. This is the FIRST of the platform's exactly-two LangGraph graphs. It runs inside
`aiWorker` on `ai-queue`, job type EXTRACT_DOCUMENT. Before running any extraction logic,
check `FeatureFlagService.isEnabled('ENABLE_OCR', organizationId)` — if disabled, leave
the job as a no-op with a clear log line, don't fail it.

GRAPH STRUCTURE (5 nodes, exactly as FWS §6.1/6.4 specifies)
1. OCR node — `IOcrProvider` (Tesseract.js + OpenCV/Sharp preprocessing) → raw text +
   layout/bounding-box data. Globally-low OCR confidence → EXTRACTION_FAILED directly.
   Retry: 3x exponential backoff, then EXTRACTION_FAILED.
2. Classify/Confirm Category node — flags category mismatches for human decision, never
   silently reclassifies.
3. Extract Fields node — LangChain structured-output parsing against the category-
   specific JSON schema. Malformed JSON: 1x repair-prompt retry, then EXTRACTION_FAILED.
4. Confidence Scoring node — every field gets a 0–1 score; below the threshold read from
   `ConfigService` (default 0.7) → `needs_review = true`.
5. Persist node — INSERT a NEW `extracted_data` row (incremented `extraction_version`,
   never overwritten) → UPDATE documents.status = EXTRACTED.

EXTRACTION SCHEMAS — the exact four categories (Shipment/Transport, Electricity Bill,
Fuel Bill, Waste Document) with the full field lists from PRD §5.4 / FWS §6.3 — unchanged
from the v1 plan. Every field ships with `confidence` (0–1) and `source_bounding_box`.

DATA MODEL
- extracted_data: id, document_id (FK), extraction_version, fields_json,
  field_confidence_json, model_version, status enum(SUCCESS, FAILED, PARTIAL).
- extraction_jobs: id, document_id (FK), status, attempt_count, last_error, started_at,
  completed_at.
- ai_logs: id, feature enum(EXTRACTION, VALIDATION_L3, COPILOT, COMPLIANCE_DRAFT),
  organization_id, input_ref, prompt_text, response_text, tokens_used, latency_ms,
  cost_estimate, created_at.

API CONTRACT
- POST /internal/ai/extract — service-to-service.
- GET /documents/:id/extraction — org member, fetch extracted fields + confidence.
- PATCH /documents/:id/extraction — org member, manually correct a field BEFORE approval.
- POST /documents/:id/reprocess — org member, re-triggers extraction; MUST be idempotent.

NOTIFICATION TRIGGERS
- "Upload completed / extraction finished" — In-app + email, recipient = uploader,
  trigger point: aiWorker after the EXTRACT_DOCUMENT job completes (success OR
  EXTRACTION_FAILED — the message copy differs, but both paths notify).

VALIDATIONS
- Extracted numeric fields must parse as valid numbers with a resolvable unit.
- Dates resolve to ISO-8601; ambiguous formats resolve using the org's locale, flagged if
  ambiguity remains.

EDGE CASES
- Multi-invoice PDF → attempt logical split; if uncertain, flag the WHOLE document.
- Handwritten annotations → naturally low confidence; surface, don't guess.

FALLBACK
Exhausted retries → EXTRACTION_FAILED with a clear code; user can Retry or switch to
Manual Entry (Phase 5's path B).

TESTING (required before this phase is "done")
- Unit tests: each LangGraph node's happy path + failure/retry path, mocked at the
  LLM/OCR boundary (no live LLM calls in unit tests — use recorded fixtures).
- Integration tests: a full document → EXTRACT_DOCUMENT job → extracted_data row,
  end-to-end against the real queue infra (Redis) in CI; re-uploading a document creates
  a NEW extraction record without deleting the previous one; a deliberately corrupt test
  file results in EXTRACTION_FAILED, never a silently wrong value; the notification
  trigger above actually fires.

ACCEPTANCE CRITERIA
- For each of the four schema categories, the agent reports field-level confidence, and
  fields below threshold are flaggable in the review UI.
- Extraction turnaround target: < 60s per document at p95.
- Update docs/CHECKLIST.md: mark Phase 6 Done.

DO NOT let this module write to `calculated_emissions` or anything Module 7 reads as
authoritative. DO NOT build fine-tuned custom models, auto multi-invoice splitting, or a
feedback-loop confidence auto-tuner — all explicit Future Enhancements (PRD §5.20).
```

---

## 11. Phase 7 — Module 6: AI Data Validation & Review (Three-Layer System)

**Why now:** needs `extracted_data` (Phase 6) to validate before anything reaches the calculation engine.

```
TASK: Implement Module 6 (AI Data Validation & Review) per docs/PRD.md §Module 6 and
docs/FWS.md §7 (Validation Workflow, Three Layers) and §8 (Human Review Workflow) in
full, including the exact state diagram in FWS §8.2. Before running Layer 3, check
`FeatureFlagService.isEnabled('ENABLE_AI_VALIDATION', organizationId)` — if disabled,
skip straight to human review with a note "AI validation disabled for this
organization" rather than blocking the pipeline.

LAYER SEQUENCE: Layer 1 → Layer 2 → Layer 3, in that order, exactly as specified in the
v1 plan (Layer 1/2 synchronous deterministic checks in core-api; Layer 3 asynchronous,
`ai-queue` job VALIDATE_LAYER3, aiWorker). Output vocabulary for Layer 3 is locked to
`OK | SUSPICIOUS | LIKELY_ERROR | MISSING_INFO` with a mandatory explanation string —
never APPROVED/REJECTED. Full check tables (missing fields, fuel-vehicle mismatch,
impossible geography, OCR mistake detection, wrong units, cross-document inconsistency,
semantic duplicate detection) are unchanged from the v1 plan — implement every one.

DATA MODEL
- validation_rules: id, name, description, rule_type, config_json, is_active.
- validation_results: id, document_id (FK), layer (1/2/3), status (PASS/FLAGGED),
  issues_json, explanation_text, created_at.
- review_actions: id, document_id (FK), action (APPROVE/REJECT/EDIT), performed_by (FK
  users), reason, previous_values_json, created_at.
- Add `version` (int) to extracted_data for optimistic locking.

API CONTRACT
- GET /review-queue — list pending records, filterable by flag severity/site/category.
- GET /documents/:id/validation — all-layer validation results.
- POST /documents/:id/approve — writes review_actions (HUMAN_REVIEW) → status=APPROVED →
  enqueue `calc-queue` job CALCULATE_RECORD.
- POST /documents/:id/reject — requires reason, min 10 chars → status=REJECTED, retained.
- PATCH /documents/:id/extraction — edit → RE-TRIGGERS Layers 1→2→3.
- POST /review-queue/bulk-approve — zero-flags-only, server-side re-checked.

NOTIFICATION TRIGGERS
- "Validation failed / flags raised" — In-app, recipients = uploader + all ORG_MEMBERs
  with review rights, trigger point: after Layer 1/2/3 aggregate for a record.

FRONTEND (built from Phase 1's shared components)
Review Queue, Record Review Panel (side-by-side original + editable fields + flags panel
with confidence color-coding — using the accessible badge component from Phase 1, never
color-only), bulk actions, empty state "Review queue is empty — all caught up!".

BUSINESS RULES (hard)
- Layer 1 failure cannot be approved as-is.
- A record with ONLY Layer 3 flags CAN be approved by a human judgment call.
- Only APPROVED records are ever eligible as input to Module 7.

CONCURRENCY EDGE CASE
Two reviewers editing simultaneously → optimistic locking via `version`, second submitter
gets "this record was updated, please refresh".

TESTING (required before this phase is "done")
- Unit tests: each Layer 1 and Layer 2 rule individually (table-driven tests covering
  every check listed in PRD §6.3).
- Integration tests: full Layer1→2→3→review→approve flow enqueues exactly one
  CALCULATE_RECORD job; a record with a missing required field cannot be approved via a
  direct API call (bypassing the UI) — this is the most important test in this module;
  bulk-approve server-side re-validation rejects a record with an unresolved flag even if
  the client claims otherwise; the notification trigger above fires correctly.

ACCEPTANCE CRITERIA
- A record with a missing required field cannot be approved until corrected — enforced
  server-side.
- Every Layer 3 flag displayed includes a human-readable explanation, never a bare code.
- Only APPROVED records appear when Module 7's inputs are later inspected/audited.
- Update docs/CHECKLIST.md: mark Phase 7 Done.

DO NOT implement configurable multi-person sign-off workflows or ML-based auto-approval
— both are explicit Future Enhancements (PRD §6.19).
```

---

## 12. Phase 8 — Module 7: Carbon Accounting Engine (Deterministic)

**Why now:** the trust anchor of the whole platform. Only `APPROVED` records (Phase 7) may enter it.

```
TASK: Implement Module 7 (Carbon Accounting Engine) per docs/PRD.md §Module 7 and
docs/FWS.md §9 (Carbon Accounting Workflow, Deterministic Engine) in full, including the
9.1 provider-abstracted architecture, 9.2 sequence diagram, 9.3 scope-specific decision
trees, and 9.4's six exhaustive business rules. This module contains ZERO AI/LLM logic —
re-read the Project Constitution's Rule 1 before writing a single line.

ARCHITECTURE (non-negotiable)
`carbon-engine`: pure, deterministic TypeScript. Never imports an LLM client (ESLint-
enforced from Phase 0). Resolves emission factors through `IEmissionFactorProvider`
(`PostgresEmissionFactorProvider` v1 implementation). Fixed-precision decimal arithmetic
only — never native floats. Promote the Phase 0 determinism placeholder test to a real
CI-blocking test now: run the same calculation twice on unchanged data, assert
byte-identical output.

DATA MODEL — emission_factors, unit_conversions, calculated_emissions,
calculation_logs (immutable), emissions_aggregates — exact field lists and constraints
unchanged from the v1 plan (see docs/TRD.md / docs/FWS.md §9 for the authoritative
field-by-field spec; this task should reproduce them precisely, including the FK
`ON DELETE RESTRICT` on `calculated_emissions.emission_factor_id` and the unique
constraint on emission_factors (category, sub_category, region, version)).

CALCULATION LOGIC — Scope 1/2/3 decision trees exactly as FWS §9.3 diagrams (Stationary/
Mobile Combustion/Fugitive for Scope 1; location-based vs. market-based branching for
Scope 2, storing both methods separately, never overwriting one with the other;
category-routed Transport/Purchased Goods/Waste/Business Travel for Scope 3).

WORKFLOW (calcWorker, calc-queue, job CALCULATE_RECORD) — resolve factor → NO match sets
CALCULATION_BLOCKED + ops alert (never silently skip) → AMBIGUOUS match throws
AmbiguousFactorError, CALCULATION_BLOCKED with code AMBIGUOUS_FACTOR_MATCH (never
silently pick one) → unit-convert if needed → fixed-precision co2e = activity_value ×
factor_value → INSERT calculated_emissions + calculation_logs → UPSERT
emissions_aggregates.

MANUAL RECALCULATION (RECALCULATE_PERIOD, ORG_ADMIN-triggered) — validate OPEN or
force-unlocked with mandatory audit-logged reason → re-run for every APPROVED record →
NEW calculation_logs entries (old ones never deleted) → refresh emissions_aggregates.

API CONTRACT — POST /internal/calc/run, POST /reporting-periods/:id/recalculate (ORG_
ADMIN), GET /emissions/:calculationId, GET /emission-factors, POST /admin/emission-
factors (SUPER_ADMIN, additive only), GET /admin/emission-factors/:id/history.

BUSINESS RULES (all six from FWS §9.4) — locked-period freeze unless force-unlocked with
audit trail; SUPER_ADMIN-only additive factor edits; market-based Scope 2 only with valid
RECs on file; no-match never silently skipped; ambiguous match throws rather than
guessing; determinism is CI-tested.

TESTING (required before this phase is "done" — this is the highest-scrutiny module in
the platform, budget real time for this)
- Unit tests: every Scope 1/2/3 branch of the decision tree, unit conversion correctness,
  AmbiguousFactorError path, CALCULATION_BLOCKED path (no match).
- Property-based tests (fast-check or equivalent) verifying determinism across
  randomized valid inputs — not just one hardcoded example.
- Integration tests: approve a record → calculation_logs + calculated_emissions +
  emissions_aggregates all update correctly in one flow; locking a period then updating an
  unrelated factor does NOT change the locked period's numbers (this is the single most
  important regression test in the whole platform — write it explicitly and keep it in
  CI forever).

ACCEPTANCE CRITERIA
- Re-running the exact same calculation twice on unchanged data produces an identical
  result (automated determinism test, CI-blocking).
- Every calculated_emissions row traces to exactly one calculation_logs entry.
- A locked period's numbers do NOT change when an unrelated emission factor is updated
  afterward (automated test).
- Bulk recalculation of ~50,000 records completes within a bounded window (target: under
  30 minutes) without blocking other tenants' calculations.
- Update docs/CHECKLIST.md: mark Phase 8 Done.

DO NOT add support for additional Scope 3 categories beyond the v1 set, bring-your-own
customer-specific emission factors, or automated factor-feed ingestion — all explicit
Future Enhancements (PRD §7.18).
```

---

## 13. Phase 9 — Module 8: Dashboard & Analytics

**Why now:** reads exclusively from `emissions_aggregates`, populated by Phase 8.

```
TASK: Implement Module 8 (Dashboard & Analytics) per docs/PRD.md §Module 8 and
docs/FWS.md §10 (Dashboard Workflow) in full. Use the shared component library (Phase 1),
especially the per-widget Error Boundary and Skeleton primitives.

HARD RULE: reads ONLY from `emissions_aggregates`, NEVER queries raw
`calculated_emissions` directly for any widget.

API CONTRACT — GET /dashboard/summary, /dashboard/trend, /dashboard/site-comparison,
/dashboard/hotspots, POST /dashboard/export — all org member, all inject organization_id
server-side from JWT, exactly as specified in the v1 plan (KPI cards with % change,
Scope 1/2/3 split, Emissions Intensity hidden entirely if no production/revenue
denominator supplied; trend chart; paginated site comparison; hotspot panel; PDF/Excel
export matching the on-screen filtered view exactly).

FRONTEND — Executive Dashboard, Site Comparison View, Export Modal; a single failing/
slow widget shows its own skeleton/error state (Phase 1's per-widget Error Boundary)
without blocking the rest of the page; empty state "Once you approve your first data in
the Review Queue, your dashboard will populate here"; a period with partial data is
explicitly labeled "in progress."

CACHING / REFRESH — emissions_aggregates refreshes synchronously as part of calcWorker's
jobs; a race shows "data updating, refresh in a moment" rather than a stale number.

BUSINESS RULE — dashboard reflects ONLY APPROVED + calculated data.

TESTING (required before this phase is "done")
- Unit tests: KPI calculation helpers (% change, intensity-hidden logic).
- Integration tests: the reconciliation invariant — dashboard total for any filter
  combination exactly equals SUM of matching APPROVED calculated_emissions rows. Promote
  this from a plan-level idea to a real, CI-blocking test in this phase (don't defer it
  to Phase 15 — that phase only re-verifies it still holds after later modules land).

ACCEPTANCE CRITERIA
- Dashboard totals always exactly match the sum of underlying APPROVED + calculated
  records for the selected filters (automated reconciliation test, written HERE).
- Filter state is shareable via URL and reproduces the same view for another logged-in
  user in the same org.
- Export produces a PDF/Excel that matches what's on-screen at export time.
- Update docs/CHECKLIST.md: mark Phase 9 Done.

DO NOT build configurable/drag-and-drop custom dashboards, peer/industry benchmarking, or
automated Slack/email threshold alerting — all explicit Future Enhancements (PRD §8.18).
```

---

## 14. Phase 10 — Module 9: ML Carbon Emission Forecasting

**Why now:** needs real (or seeded) `calculated_emissions` history — build after Phase 8.

```
TASK: Implement Module 9 (ML Emission Forecasting) per docs/PRD.md §Module 9 and
docs/FWS.md §11 (Machine Learning Workflow) in full, including the 11.2 cold-start/
synthetic-data strategy. Check `FeatureFlagService.isEnabled('ENABLE_FORECAST',
organizationId)` before exposing any forecast UI/API — if disabled, the dashboard simply
omits the Forecast Card, same as the "insufficient history" case.

DATASET STRATEGY — MAKE THIS EXPLICIT (this is a student/early-stage project; you will
NOT have six months of real production data during development, so build and demo
against the right stage of this progression rather than getting stuck waiting for data
that doesn't exist yet):
1. Development — build and unit-test the feature-engineering + XGBoost pipeline against
   small hand-crafted fixtures (a handful of months of made-up numbers) purely to prove
   the code paths work.
2. Synthetic Dataset — use `seedSyntheticHistory.ts` (below) to generate a full,
   internally-consistent 12–18 month history for a dedicated DEMO organization. This is
   what you actually build and demo the full XGBoost path against during development —
   NOT the scikit-learn cold-start fallback.
3. Historical Public Dataset (optional, strengthens realism) — if available, blend in a
   public logistics/manufacturing emissions dataset (e.g., a public GHG/CDP/company-
   disclosure dataset) to sanity-check that engineered features and model behavior look
   reasonable against real-world shapes, without treating it as this platform's own
   tenant data.
4. Demo Organization — the seeded synthetic org from step 2 is what you actually show in
   a walkthrough/interview/demo; label it clearly as a demo org, never mixed into any
   real customer's numbers.
5. Production Data Later — the cold-start scikit-learn fallback (trailing-average/trend,
   clearly labeled "basic trend estimate") is what REAL customer organizations see until
   they individually accumulate 6 real months of their own approved data — this is a
   per-organization threshold, not a platform-wide one, and it's the expected, correct
   experience for a brand-new real customer, not a bug to work around.

SERVICE BOUNDARY — ONLY feature reaching apps/ml-service (Python + FastAPI), via exactly
POST /train and POST /predict. Never touches auth/documents/compliance data directly.

FEATURE ENGINEERING, MODEL & TRAINING — exactly per PRD §9.5/§9.6 and FWS §11.1/§11.3:
monthly aggregates by scope, shipment volume, transport distance, fuel volume, mode mix,
site id, optional production volume, seasonality, lag features; XGBoost primary with a
scikit-learn cold-start fallback; time-based train/validation split; promote only if MAPE
beats the currently-deployed model.

COLD-START / SYNTHETIC DATA — build `seedSyntheticHistory.ts` exactly as described above
and in FWS §11.2.

DATA MODEL — ml_models, ml_training_runs, ml_predictions (unchanged from the v1 plan).

API CONTRACT — GET /forecast (returns INSUFFICIENT_HISTORY with monthsAvailable if <6
real months for a non-demo org), POST /internal/ml/train, POST /internal/ml/predict, GET
/admin/ml-models.

NOTIFICATION TRIGGERS
- "Forecast ready" — In-app, recipients = dashboard viewers, trigger point: after a
  TRAIN_FORECAST_MODEL run promotes a new model.

FRONTEND — Forecast Card (Current vs. Predicted vs. Confidence vs. Trend Arrow, "why this
prediction" expandable section).

HARD RULES — forecasts are predictions, never compliance figures, never appear inside an
exported BRSR/ESG report; forecast recalculates whenever new actuals are approved.

FAILURE HANDLING — FastAPI unavailable → hide the forecast card entirely; wildly
out-of-bounds prediction → internal sanity-check flag, never shown unguarded.

TESTING (required before this phase is "done")
- Unit tests (pytest, ml-service): feature engineering functions, MAPE/RMSE evaluation
  gate logic, cold-start fallback selection logic.
- Integration tests: seedSyntheticHistory.ts produces a demo org whose forecast uses the
  real XGBoost path, not the fallback; a fresh, non-demo org with <6 months correctly
  returns INSUFFICIENT_HISTORY; the "forecast ready" notification trigger fires after a
  model promotion.

ACCEPTANCE CRITERIA
- Forecast is never shown for a non-demo org with <6 months of approved historical data.
- Forecast card always shows a confidence score and a top-level explanation.
- Forecast values never appear inside an exported BRSR/ESG compliance report (automated
  test).
- Update docs/CHECKLIST.md: mark Phase 10 Done.

DO NOT build site-level forecasting or scenario "what-if" modeling yet — both are
explicit Future Enhancements (PRD §9.19).
```

---

## 15. Phase 11 — Module 10: Sustainability AI Copilot (RAG)

**Why now:** v1 knowledge base is static reference material, independent of the calculation pipeline, but sequenced after the core numeric modules exist.

```
TASK: Implement Module 10 (Sustainability AI Copilot) per docs/PRD.md §Module 10 and
docs/FWS.md §12 (RAG Workflow) in full. LOCKED v1 SCOPE: knowledge base = GLEC + GHG
Protocol + BRSR + ESG Standards + ISO 14064 reference material ONLY. Plain LangChain
retrieval chain, NOT LangGraph. Check `FeatureFlagService.isEnabled('ENABLE_RAG',
organizationId)` before exposing the copilot panel — if disabled, hide it entirely.

INFRASTRUCTURE — `pgvector` on the primary PostgreSQL instance (no separate ChromaDB).

INGESTION (SUPER_ADMIN only) and QUERY SEQUENCE — exactly per FWS §12.1/§12.2: chunk
~500–800 tokens/~15% overlap, OpenAI-compatible embeddings, top-k=5 pgvector similarity,
answer-only-from-context prompt with an explicit "I don't know" path, streamed answer
with clickable citation chips.

DATA MODEL — kb_documents, kb_chunks (organization_id nullable, always NULL/global in
v1), chat_sessions, chat_messages; reuse ai_logs from Phase 6.

API CONTRACT — POST /copilot/query (2,000 char cap), GET /copilot/sessions/:id, POST
/internal/rag/ingest (SUPER_ADMIN/service).

FRONTEND — persistent chat panel, citation chips, starter questions, streaming with
typing indicator (all from Phase 1's shared components where applicable).

CRITICAL RULE — v1 copilot answers ONLY from the static knowledge base; it does NOT
independently compute or state any number about the org's own emissions data (that hybrid
capability is an explicit Phase-2/out-of-v1-scope feature). If asked for the org's own
numbers, politely redirect to the Dashboard.

FAILURE / NO-RESULTS HANDLING — no chunk above threshold → "I don't have enough
information to answer that confidently"; LLM/DB unavailable → temporary-unavailable
message; out-of-domain question → polite decline; ambiguous framework reference →
clarifying question.

SECURITY — SUPER_ADMIN-only ingestion; retrieved content wrapped in clearly delimited
"data, not instructions" context blocks (prompt-injection mitigation).

TESTING (required before this phase is "done")
- Unit tests: chunking function (token count + overlap correctness), citation-extraction
  logic.
- Integration tests: a deliberately out-of-scope question never fabricates an answer
  (asserts the "I don't know" path); a question asking for the org's own numeric data is
  politely redirected, never answered with an invented figure; SUPER_ADMIN-only ingestion
  endpoint rejects non-Super-Admin callers.

ACCEPTANCE CRITERIA
- Every factual/statistical claim in a copilot answer has an attached, clickable
  citation.
- Copilot never fabricates an answer when retrieval confidence is below threshold.
- Update docs/CHECKLIST.md: mark Phase 11 Done.

DO NOT build company-document ingestion, per-tenant vector filtering, a query-intent
classifier, proactive unprompted suggestions, or voice I/O — all out of locked v1 scope.
```

---

## 16. Phase 12 — Module 11: Compliance Agent (AI Drafting)

**Why now:** narrative drafting needs real hotspot/trend context (Phase 9) and numeric source data (Phase 8) to reference meaningfully.

```
TASK: Implement Module 11 (Compliance Agent) per docs/PRD.md §Module 11 and
docs/FWS.md §13 (Compliance Agent Workflow) in full. This is the SECOND and FINAL
LangGraph graph platform-wide. Runs in aiWorker, job type DRAFT_COMPLIANCE_SECTION.
Check `FeatureFlagService.isEnabled('ENABLE_COMPLIANCE', organizationId)` before allowing
draft generation — if disabled, the Report Builder should explain the feature is
currently unavailable rather than silently failing.

THE HARD RULE — restate at the top of every file in this module: the LLM writes
narrative text only; every numeric value comes from a template engine reading directly
from calculated_emissions/emissions_aggregates, with ZERO LLM calls on that code path.

WORKFLOW, DATA MODEL, API CONTRACT, FRONTEND, STALE-DATA GUARD, VALIDATIONS, EDGE CASES —
exactly as specified in the v1 plan (framework/period selection with a hard block on
incomplete numeric data; per-section independent/parallel generation; AI-drafted badges;
read-only numeric rendering; DRAFT_FAILED isolation with a manual textarea fallback).

NOTIFICATION TRIGGERS
- "Report generated / draft ready" — In-app + email, recipient ORG_ADMIN, trigger point:
  after all DRAFT_COMPLIANCE_SECTION jobs for a report complete.

TESTING (required before this phase is "done")
- Unit tests: the numeric-template code path has zero LLM imports (a static-analysis-
  style test, e.g., grepping the module's dependency graph, in addition to manual
  review); narrative-prompt construction never embeds an editable numeric slot.
- Integration tests: generate-draft blocked when required numeric data is incomplete,
  with the exact missing-items list; one narrative section's DRAFT_FAILED never blocks
  the others; the notification trigger fires after all sections complete.

ACCEPTANCE CRITERIA
- No compliance report can be finalized with any un-reviewed AI-drafted section.
- Every numeric value in an exported report is byte-identical to its corresponding
  calculated_emissions figure (automated reconciliation test, written HERE — Phase 15
  only re-verifies it).
- Static analysis / prompt review confirms the narrative-drafting prompt contains NO
  code path by which the LLM could output a number not already provided as fixed
  context.
- Update docs/CHECKLIST.md: mark Phase 12 Done.

DO NOT build additional frameworks (CSRD/GRI/CBAM) or automated "what changed since last
year" redline generation yet — explicit Future Enhancements (PRD §11.20).
```

---

## 17. Phase 13 — Module 12: Compliance Reporting (Export, Versioning, Audit Trail)

**Why now:** turns Phase 12's approved draft into the final downloadable artifact.

```
TASK: Implement Module 12 (Compliance Reporting) per docs/PRD.md §Module 12 and
docs/FWS.md §13.4/13.5 in full.

WORKFLOW, ROLLBACK POLICY, SUPPORTED REPORT TYPES, API CONTRACT, FRONTEND, BUSINESS
RULES, EDGE CASES, PERFORMANCE — exactly as specified in the v1 plan (finalize validates
all sections approved, renders PDF + Excel with one final consistency re-read from
calculated_emissions, wraps both renders + the version INSERT in a single transaction
that rolls back entirely on any partial failure; immutable report_versions; ORG_ADMIN-
only finalize; ~30s target for a full BRSR render).

TESTING (required before this phase is "done")
- Unit tests: rollback behavior when one of the two file renders fails (assert no
  report_versions row is created and compliance_reports stays in its pre-finalize
  state).
- Integration tests: cross-tenant download isolation (Org A can never download Org B's
  report — write this explicitly here, don't wait for Phase 15 to catch it first);
  finalized version immutability (attempt to mutate a finalized report_versions row's
  content and assert it's rejected/impossible at the data layer).

ACCEPTANCE CRITERIA
- Every finalized report version is downloadable indefinitely and never mutates after
  creation.
- Audit Trail correctly links every numeric figure back to its source calculation_logs
  entry.
- A user from Organization A can NEVER download a report belonging to Organization B
  (explicit test, written HERE).
- Update docs/CHECKLIST.md: mark Phase 13 Done.

DO NOT build direct e-filing/regulatory-portal integration, digital signature/e-sign
workflow, or scheduled automatic report generation — all explicit Future Enhancements
(PRD §12.18).
```

---

## 18. Phase 14 — Module 13: Admin Dashboard (Super Admin Console)

**Why now:** a read/manage surface over every other module's data — build it last so there's something real to administer, though its auth isolation (Phase 2) has existed since the beginning.

```
TASK: Implement Module 13 (Admin Dashboard / Super Admin Console) per docs/PRD.md
§Module 13 and docs/FWS.md §14 (Admin Workflow) in full.

SCOPE / ISOLATION, CROSS-TENANT ACCESS RULE, DATA MODEL, API CONTRACT, FRONTEND — exactly
as specified in the v1 plan (separate route/subdomain/JWT audience, shorter session
timeout, mandatory-reason gate on detailed cross-tenant views, admin_access_logs,
feature_flags management UI wired to Phase 0's FeatureFlagService, emission-factor admin
UI wired to Phase 8, AI Logs view wired to ai_logs from Phase 6).

Also add here (net-new vs. the v1 plan, closing the config/observability loop):
- A "Configuration" admin screen exposing `ConfigService` entries (Phase 0) for editing
  by SUPER_ADMIN — upload limits, AI confidence thresholds, etc. — instead of leaving
  ConfigService admin-invisible.
- An "Observability" admin screen (or a documented link out to your metrics/tracing
  backend) surfacing queue depth (ai-queue/calc-queue), failed-job counts, and basic
  latency percentiles pulled from the Phase 0 `/metrics` endpoint.

TESTING (required before this phase is "done")
- Unit tests: cross-tenant-access reason-gating logic (metadata listing needs no reason;
  opening detailed org data does).
- Integration tests: automated authorization test suite — every /api/admin/* route
  rejected with 403 for ORG_ADMIN and ORG_MEMBER tokens; suspending an organization
  blocks new logins immediately while leaving existing data intact; every Super Admin
  view into a specific org's detailed data writes an admin_access_logs row with a
  non-empty reason.

ACCEPTANCE CRITERIA
- A non-Super-Admin user cannot reach any admin API route or view under any
  circumstance.
- Every Super Admin view into a specific organization's detailed data is logged with
  actor, target org, timestamp, and reason.
- Update docs/CHECKLIST.md: mark Phase 14 Done.

DO NOT build usage-based billing dashboards, customer health scoring, or a delegated
"Support Agent" sub-role — all explicit Future Enhancements (PRD §13.18).
```

---

## 19. Phase 15 — Security, Hardening & Cross-Cutting QA Pass

**Why last:** every module's real surface area now exists to test against. This phase is verification and gap-closing — it does NOT do first-time unit/integration testing of any module's own logic (that already happened in Phases 2–14).

```
TASK: Run the final cross-cutting security/hardening/QA pass across the entire Carbon OS
platform per docs/PRD.md §8 (Security) and §9 (Non-Functional Requirements). Do not add
new product features in this phase. This is verification, gap-closing, and load/security
testing — every module already has its own unit/integration tests from its own phase;
this phase's job is to prove the SYSTEM as a whole holds up, and to re-run the handful of
CI-blocking reconciliation/determinism tests that were written earlier to confirm nothing
since has broken them.

SECURITY CHECKLIST (each with its own automated test)
- Cross-tenant isolation, platform-wide: for every tenant-scoped resource type, attempt
  access via an Org A JWT against an Org B resource and assert 404 (not 403, per the
  "same response either way" convention) on every route across every module — this is a
  full-platform sweep, broader than any single module's own test from its own phase.
- RBAC sweep: every /api/admin/* route rejects ORG_ADMIN/ORG_MEMBER; every ORG_ADMIN-only
  route (finalize report, lock period, invite users, deactivate site) rejects ORG_MEMBER.
- Refresh-token theft/reuse detection (Phase 2) still passes as a regression test now
  that every other module has been added.
- File upload security: MIME verification enforced, non-guessable object keys, signed
  URLs only.
- Prompt injection mitigation across every LLM touchpoint (Phases 6, 11, 12): a test that
  embeds an adversarial instruction in a fake document/query and asserts no behavior
  change (no cross-tenant reveal, no numeric fabrication).
- Rate limiting actually enforced (not just configured) on auth, general API, and
  AI-heavy endpoints.
- Audit logging: every state-changing action across every module writes to audit_logs;
  every Super Admin cross-tenant view additionally writes to admin_access_logs with a
  reason.

RE-VERIFY THE CI-BLOCKING TESTS WRITTEN IN EARLIER PHASES (don't rewrite them — confirm
they still pass with the full system assembled)
- Module 7 determinism test (written in Phase 8).
- Module 8 dashboard reconciliation test (written in Phase 9).
- Module 11/12 report-numeric reconciliation test (written in Phase 12).
- Module 9 "no forecast in a compliance report" test (written in Phase 10).
- Every notification trigger from Phases 5/6/7/10/12 still fires correctly end-to-end
  now that the full pipeline exists (a good place to catch any trigger that got wired to
  the wrong event during its own phase).

PERFORMANCE / NON-FUNCTIONAL VERIFICATION (per PRD §9 table)
- API p95 latency < 500ms for standard CRUD (load test the busiest endpoints).
- Dashboard aggregate queries < 1.5s.
- AI extraction < 60s/doc at p95.
- Copilot first-token < 2s.
- Simulate a transient AI Service outage and confirm no document's processing state is
  lost or corrupted (retry + dead-letter handling actually works, not just configured).

ACCESSIBILITY
Full WCAG 2.1 AA pass across all client-facing screens — this is where you audit that
Phase 1's accessible-badge component actually got used everywhere it should have been,
across all thirteen modules' screens.

MONITORING
Confirm the Phase 0 observability stack (structured logs, requestId/jobId threading,
tracing, /metrics) is actually populated with meaningful data now that real modules
exist, and that Module 13's AI Logs / Observability admin screens (Phase 14) correctly
surface it.

BACKUP / DR
Move from Phase 0's documented DR *policy* to an actually-configured backup: automated
daily PostgreSQL backups with point-in-time recovery, object storage versioning enabled.
Document the real RTO/RPO achieved (target: RPO ≤ 24h, RTO ≤ 4h) in docs/DEPLOYMENT.md.

DELIVERABLE
docs/SECURITY_QA_SIGNOFF.md — every checklist item above, its corresponding automated
test (file + test name), and pass/fail status.

TESTING
This phase's own "tests" ARE the checklist above — there is no separate testing
requirement beyond delivering the checklist with every item genuinely automated and
passing.

ACCEPTANCE CRITERIA
- CI is green with all of the above tests included and blocking merge.
- docs/SECURITY_QA_SIGNOFF.md exists and every row is marked PASS with a linked test.
- No P0/P1 gap remains between this checklist and what's actually enforced in code.
- Update docs/CHECKLIST.md: mark Phase 15 Done.
```

---

## 20. Phase 16 — Documentation Phase (final)

**Why last:** documents what was actually built, not what was planned — writing this earlier means it's stale by the time the project ships.

```
TASK: Produce the full documentation set for Carbon OS, now that every module is built
and hardened. This phase produces docs only — no code changes except fixing anything the
documentation process reveals is actually broken/undocumented-because-it-doesn't-exist.

DELIVERABLES
1. docs/DEVELOPER_GUIDE.md — repo layout (link back to docs/CONVENTIONS.md), how to run
   everything locally, how to add a new module following the established
   routes→controller→service→repository pattern, how the two LangGraph graphs and the
   two BullMQ workers fit together, and a "where do I add X" quick-reference (new emission
   factor → Module 7/13; new document category → Module 4 seed data; new feature flag →
   Phase 0's FeatureFlagService).
2. docs/API_REFERENCE.md — generate from the OpenAPI spec (zod-to-openapi, per the
   TRD's approach) rather than hand-maintaining a second copy; this is the reserved
   Swagger/OpenAPI space called for in Appendix B — link it here.
3. docs/ARCHITECTURE.md — the system topology diagram (React SPA → Express Core API →
   two workers → Postgres+pgvector / Redis / object storage / FastAPI ML service),
   restating the four non-negotiable architectural rules from the Project Constitution
   and where each is enforced in code (ESLint rule location, TenantScopedRepository
   location, queue definitions, idempotency patterns).
4. docs/DEPLOYMENT.md — finalize what Phase 0/15 started: environment variables (link
   .env.example), migration process, backup/DR procedures with the actual configured
   RTO/RPO, and a rollback runbook for a bad deploy.
5. docs/ADMIN_MANUAL.md — for whoever operates the Super Admin console: how to suspend
   an org, add an emission factor version (with the mandatory source-citation
   requirement explained), read AI Logs, and toggle feature flags safely.
6. docs/USER_MANUAL.md — for an end customer (ORG_ADMIN/ORG_MEMBER): walking through
   onboarding (org setup wizard → add a site → data collection wizard → review queue →
   dashboard → forecast → copilot → compliance report builder → export), written for a
   non-technical sustainability manager, not a developer.
7. Update README.md to link all of the above rather than duplicating content in it.
8. Final update to docs/CHECKLIST.md: mark Phase 16 Done, and mark the whole project
   Done at the top of the file.

ACCEPTANCE CRITERIA
- A new developer can go from `git clone` to a running local environment using only
  docs/DEVELOPER_GUIDE.md.
- docs/API_REFERENCE.md is generated from the actual OpenAPI spec, not hand-written, and
  is verifiably in sync with the real routes (regenerate it as part of this phase and
  diff against what's committed).
- A non-technical reader can follow docs/USER_MANUAL.md and understand the full product
  workflow without needing to read any code.
- docs/CHECKLIST.md shows all 18 phases Done.
```

---

## Appendix A — Human-Readable Implementation Checklist

Copy this table into `docs/CHECKLIST.md` in Phase -1 and keep it updated — this is the one place to see project status without opening the AI prompt document.

| Phase | Name | Status | Notes |
|---|---|---|---|
| -1 | Project Initialization & Repository Planning | ⬜ | |
| 0 | Infrastructure, Configuration, Feature Flags & Observability | ⬜ | |
| 1 | Shared Frontend Component Library | ⬜ | |
| 2 | Module 1: Authentication & Authorization | ⬜ | |
| 3 | Module 2: Organization Management | ⬜ | |
| 4 | Module 3: Site Management | ⬜ | |
| 5 | Module 4: Carbon Data Collection Wizard | ⬜ | |
| 6 | Module 5: AI Data Collector Agent | ⬜ | |
| 7 | Module 6: AI Data Validation & Review | ⬜ | |
| 8 | Module 7: Carbon Accounting Engine | ⬜ | |
| 9 | Module 8: Dashboard & Analytics | ⬜ | |
| 10 | Module 9: ML Carbon Emission Forecasting | ⬜ | |
| 11 | Module 10: Sustainability AI Copilot (RAG) | ⬜ | |
| 12 | Module 11: Compliance Agent (AI Drafting) | ⬜ | |
| 13 | Module 12: Compliance Reporting | ⬜ | |
| 14 | Module 13: Admin Dashboard (Super Admin Console) | ⬜ | |
| 15 | Security, Hardening & Cross-Cutting QA Pass | ⬜ | |
| 16 | Documentation Phase | ⬜ | |

Legend: ⬜ Not Started · 🟨 In Progress · ✅ Done · 🟥 Blocked (add why in Notes)

---

## Appendix B — API Versioning, Deprecation & Backward-Compatibility Policy

```
VERSIONING POLICY
- Every route is prefixed /api/v1/... from day one (already established in the Project
  Constitution). There is no unversioned route surface.
- A new major version (/api/v2/...) is only introduced for a breaking change that cannot
  be made backward-compatible any other way (see below) — not for routine feature
  additions, which land as new fields/endpoints under the existing v1 prefix.
- Internal service-to-service routes (/internal/...) are NOT versioned the same way —
  they're private, deployed-in-lockstep contracts between core-api and its own workers/
  ml-service, and can change freely as long as both sides of the same deploy agree.

WHAT COUNTS AS A BREAKING CHANGE (requires a deprecation cycle, not a silent change)
- Removing a field from a response.
- Renaming a field.
- Changing a field's type or semantics (e.g., a status enum gaining/losing a value that
  callers branch on).
- Changing an error code's meaning.
- Tightening a validation rule that previously-valid client payloads would now fail.

WHAT DOES NOT COUNT AS BREAKING (safe to ship directly under v1)
- Adding a new optional request field.
- Adding a new field to a response (clients should already ignore unknown fields).
- Adding a wholly new endpoint.
- Adding a new enum value that non-exhaustive client switches already default-handle
  (call this out explicitly in the PR if you're relying on it).

DEPRECATION PROCESS
1. Mark the old field/endpoint as deprecated in the OpenAPI spec (zod-to-openapi
   annotation) and in docs/API_REFERENCE.md, with the planned removal milestone.
2. Continue serving both the old and new shape for at least one full release cycle
   (define "release cycle" concretely once you have a real release cadence — for a
   single-deployable v1 product, treat this as "at least one sprint" per the Phase -1
   branching strategy).
3. Log a warning (not an error) server-side whenever the deprecated shape is actually
   used, so you can tell when it's safe to remove.
4. Only remove after zero observed usage for a full cycle, or an explicit, documented
   decision to force the break (e.g., a security fix that can't wait).

BACKWARD-COMPATIBILITY RULE FOR DATABASE MIGRATIONS
Every migration must be backward-compatible with the previous app version for at least
one deploy cycle, to support zero-downtime rolling deploys (this mirrors the TRD's
"migration-compatibility rule" for the deploy pipeline) — e.g., add a new nullable
column and backfill in a follow-up migration, rather than adding a NOT NULL column with
no default in the same migration that also removes the old one.

REVIEW GATE
Any PR that changes an existing route's request/response shape must answer, in the PR
description (per the Phase -1 PR template): "Is this a breaking change per the
definition above? If yes, has the deprecation process been followed?" — a reviewer
should block merge if the answer is missing or wrong.
```

---

## 21. What I'd want next (optional, not blocking)

- If you can export the **TRD's text content** (not just the scanned PDF) — especially §20 Coding Standards & Conventions and §21 Phased Delivery Plan — I can tighten these prompts further against your team's actual naming/folder/lint conventions instead of the reasonable defaults picked in Phase -1/0.
- If you share the contents of **`stitch_shipmind_ai_platform`** (your Stitch UI/UX export), I can fold exact component structure, screen-by-screen visual spec, and design tokens into Phase 1's component library and each later phase's "FRONTEND" section instead of the PRD's textual Screen Inventory / Frontend Behaviour tables.
