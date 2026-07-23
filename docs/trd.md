# Technical Requirements Document (TRD) 

## Carbon OS — AI-Powered Carbon Accounting & ESG Compliance Platform 

Derived From: Carbon OS Enterprise PRD v1.0 Document Type: Technical Requirements Document ~~—~~ Engineering Implementation Spec Stack Lock ~~-i~~ n: Node.js (TypeScript) + Express + PostgreSQL + Prisma (core), Python/FastAPI (ML only) Status: Ready for Sprint 0 / Engineering Kickoff Audience: Backend, Frontend, DevOps, QA engineers who will actually write the code 

Relationship to the PRD: The PRD defines what and why per module (user stories, business rules, acceptance criteria). This TRD defines how ~~—~~ repo layout, exact schema, service boundaries, queue design, API contracts, infra, security implementation, and coding conventions. Where the PRD already gave a Prisma sketch or endpoint table, this document is the authoritative, buildable version. 

#### Table of Contents 

1. Scope & Engineering Principles 

2. System Architecture & Service Topology 

3. Repository Structure (Monorepo) 

4. Confirmed Technology Stack 

5. Backend Application Architecture (Node.js/Express) 

6. Database Design ~~—~~ Full Prisma Schema 

7. Authentication & Security Implementation 

8. Job Queue & Async Processing (BullMQ + Redis) 

9. File Storage (S3/MinIO) 

10. AI Extraction Pipeline (LangGraph) 

11. RAG/Copilot Implementation (ChromaDB) 

12. ML Forecasting Service (FastAPI + XGBoost) 

13. API Contract Reference 

14. Error Handling & Logging Standards 

15. Testing Strategy 

16. CI/CD Pipeline 

17. Environment Configuration 

18. Deployment & Infrastructure 

19. Observability & Monitoring 

20. Coding Standards & Conventions 

21. Phased Delivery Plan (Sprint 0 > v1) 

##### 1. Scope & Engineering Principles 

Locked stack decision (per explicit requirement): Node.js + Express + TypeScript is the only backend runtime for the core application. PostgreSQL + Prisma is the only system of record. Python/FastAPI is used exclusively for the ML microservice (KGBoost training/inference) ~~—~~ it never touches auth, documents, or compliance data directly; it only receives feature vectors and returns predictions. 

Non ~~-n~~ egotiable rules carried over from the PRD that drive technical design: 

1. AlInever calculates or writes an emissions number. The module is pure, deterministic TypeScript with zero LLM calls. Enforced via an ESLint <u>(no</u> ~~<u>-</u>~~ <u>restricted</u> ~~<u>-</u>~~ <u>imports</u> ]rule that blocks importing the AI client inside 

src/modules/carbo ~~n-~~ engine/**|, 

2. Multi ~~-~~ tenancy is enforced at the data ~~-~~ access layer, not per ~~-~~ endpoint. Every Prisma query for a tenan ~~t-~~ scoped model goes through a base class that injects automatically. 

3. Everything async goes through BullMQ. No long ~~-~~ running work (OCR, LLM calls, PDF rendering, ML training) ever happens inline in an HTTP request handler. 

4. Idempotency by design. Every job and every retryable mutating endpoint (uploads, extraction, calculation) is safely re ~~-~~ runnable. 

#### 2. System Architecture & Service Topology 



Why this topology: 

- ° is a single Node/Express deployable (horizontally scalable, stateless) and the only service with direct write access to PostgreSQL for transactional/tenant data. 

- e Alworkers are separate Node.js processes (same codebase, different entrypoint, e.g. (pnpmworker:extraction))run SO LLM/OCR latency never blocks the HTTP request/response cycle, and worker concurrency scales independently of the API tier. 

- e The MLservice is intentionally the only Python component, isolated behind an <u>internal</u> ~~-~~ only network boundary with a narrow contract ((PosT /predict), ~~<u>(POST| /train))</u> —~~ this keeps the primary engineering surface Node.js as required. 

- e ChromaDB and Redis are managed as separate infra services (docke ~~r-~~ compose in dev, managed/self ~~-~~ hosted in prod). 

#### 3. Repository Structure (Monorepo) 









Module template (enforced by a code ~~-~~ generation script(pnpm gen:module <name>)): every backend module has exactly (routes + controller > service + repository |, plus (zod) and (types). Controllers never touch Prisma directly; only repositories do. 

### 4. Confirmed Technology Stack 

|.ConfirmedTe<br>Layer|chnologyStack<br>Technology|Version<br>(baseline)|Notes|
|---|---|---|---|
|Frontend|React|18.x|+TypeScript5.x|
|Frontend routing|ReactRouter|6.X||
|Frontendserver<br>state|ReactQuery (TanStack<br>Query)|5.x||
|Frontend styling|§TailwindCSS|3.x||
|Frontendcharts|Recharts|2.X||
|Backendruntime|Nodejs|20.xLTS|Lockedperrequirement|
|Backend<br>framework|Express|4.x|Lockedperrequirement|
|Backend<br>language|TypeScript|5.x||
|Database|PostgreSQL|16.x|Lockedperrequirement|
|ORM|Prisma|5.X||
|Validation|Zod|3.x|request/responseschema<br>validation|
|Auth|jsonwebtoken +bcrypt|~~_—~~|access/refresh JWTpattern|
|Queue|BullMQ|5.X|backedbyRedis7.x|



Layer 

Technology 

Version 

Notes 

(baseline) 

|Objectstorage|MinIO (dev)<br>/AWSS3 (prod)|~~—~~|via |@aw~~s-~~sdk/client~~-~~s3<br>(S3~~-~~compatible)|
|---|---|---|---|
|Alorchestration|LangChainjs+LangGraphjs|lateststable||Node-~~n~~ative,keepsAI<br>orchestration inside theNode<br>codebase|
|LLM|AnyOpenAI~~-c~~ompatible<br>endpoint|~~—~~|configurablebaseURL+<br>modelname|
|OCR|Tesseract.js (sel~~f-~~hosted) or<br>cloudOCRAPI (configurable<br>adapter)|~~—~~|pluggable<br>interface|
|VectorDB|ChromaDB|latest|accessedvia<br>npm<br>clientfromNode|
|MLservice|Python3.11 +FastAPI+<br>XGBoost + sciki~~t-~~learn|~~_~~|isolatedmicroserviceonly|
|Logging|Pino|8.x|structuredJSONlogs|
|Testing|Jest+Supertest|~~_—~~|unit/integration;Playwright<br>fore2e (web)|
|CI/CD|GitHubActions|~~_~~||
|Containerization<br>||Docker+docke~~r-~~compose|~~_—~~|k8soptionalPhase2|
|Monorepotooling|pnpmworkspaces +<br>Turborepo|~~_—~~||



Why LangChain/LangGraph in Node instead of Python: since the mandate is Nodejs ~~-~~ first for the core system, and LangChain/LangGraph both ship firs ~~t-~~ class JS/TS SDKs, the entire AI extraction/validation/RAG/compliance pipeline is implemented in TypeScript inside (core ~~-a~~ pi)'s workers ~~—~~ Python is reserved strictly for the one place it earns its keep (XGBoost). 

##### 5.1 Layered Request Flow 



#### 5.2 Core Middleware Stack Core Middleware Stack Middleware Stack Stack (( src/core/middleware/ 

5.2 Core Middleware Stack Core Middleware Stack Middleware Stack Stack (( src/core/middleware/ }) Middleware Responsibility requestId.middleware.ts Attaches a UUID to every request/response for tracing across logs and worker jobs authenticate.middleware.ts Verifies JWT access token, attaches|req.user <u>= {id, role, organizationId}</u> authorize.middleware.ts authorize(['ORG ~~_A~~ DMIN' ]) |factory ~~—~~ role check; throws validate.middleware.ts validate(zodSchema) |factory ~~—~~ validates (body)/(query (params), returns with field errors on failure rateLimiter.middleware.ts + Redis store; different limiters per route group (auth, general, Al ~~-~~ heavy) errorHandler.middleware.ts Final erro ~~r-~~ handling middleware; maps| AppError |subclasses to HTTP status + error envelope; logs unexpected errors with full stack, never leaks stack to client tenantContext.middleware.ts] Extracts|organizationId |from JWT and attaches to AsyncLocalStorage | context so repositories can read it without explicit threading through every function call 

##### Middleware Responsibility 

5.3 TenantScopedRepository Pattern (mult ~~i-~~ tenancy enforcement) 

###### typescript 

// src/core/repository/tenant ~~-~~ scoped.repository.ts 











// 404, never 403 ~~—~~ avoids confirming cross ~~-~~ tenant existence ~~—~~ 

Every domain repository (SiteRepository) ReportingPeriodRepository), ...) extends this base class. (SUP ~~E~~ R_AD ~~M~~ onlyIN} cross ~~-~~ tenant reads (Module 13) go through a separate, explicitly named (AdminRepository) class that takes as an explicit argument and is only importable from src/modules/admin/** ~~]—~~ enforced by an ESLint boundary rule, so accidental cross ~~-~~ tenant access from a normal module is a compile ~~-t~~ ime- ~~v~~ isible violation. 

### 5.4 Error Hierarchy ((src/core/errors/)) 

typescript 











<!-- Start of picture text -->
><br><!-- End of picture text -->



<!-- Start of picture text -->
><br><!-- End of picture text -->

### 5.5 Request Validation (Zod) 

Every route declares its schema in (<module>. validators. ts} the same Zod schema is used to (a) validate at runtime and (b) infer the TypeScript request type ~~—~~ no separate hand ~~-~~ maintained interfaces that can drift from validation. 



<!-- Start of picture text -->
typescript<br><!-- End of picture text -->







<!-- Start of picture text -->
ES<br>><br><!-- End of picture text -->

#### 6. Database Design — Full Prisma Schema 

This refines the PRD's schema sketch into an implementation ~~-~~ ready(schema. prisma). Key upgrades vs. the PRD draft: explicit enums matching the PRD's status vocab, present on every tenan ~~t-~~ scoped model (for the repository pattern in §5.3), decimal precision for money/CO2e, and full audit/versioning fields. 

prisma 























locally,(prisma migrate deploy)in CI/CD ~~—~~ no 

### Migration policy: 

manual schema edits against any shared environment. Every migration PR must includea short rollback note in the PR description. 

#### 7. Authentication & Security Implementation 

### 7.1 JWT Strategy 

typescript // Access token: 15 min, signed HS256 (or RS256 if key rotation needed later) // userid // ties back to Session row for refresh ~~-~~ family revocation // Refresh token: opaque random 32 ~~-~~ byte value, stored ONLY as a bcrypt hash in // httpOnly, Secure, SameSite=Strict cookie, 7 ~~-~~ day expiry, rotated on every /au ~~a~~ <mark>EEEoE] Err ee—étéD</mark> 

Reuse detection: on [/auth/refresh |, the presented refresh token is hashed and compared; if it matches a row that has already been (i.e., already rotated once), the entire session family for that user is revoked and the user is forced to re ~~-~~ login ~~—~~ this is the standard mitigation for stolen ~~-~~ refres ~~h-~~ token replay attacks. 

##### 7.2 Password Handling 

- ° with cost factor 12, hashing performed via the async API ((bcrypt. hash), never (hashSync]) to avoid blocking the event loop. 

- e Password policy enforced by Zod: min 10 chars, upper+lower+number+symbol (matches PRD §1.11). 

###### 7.3 RBAC Middleware 

typescript 

// usage: router.post('/sites', authenticate, authorize(['ORG ADMIN']), validat ~~<u>D></u>~~ <mark>></mark> 

Super Admin routes live under a separate router mount ((/api/v1/admin/*)) that applies a distinct middleware verifying a JWT with a different (audience) claim ~~—~~ a clien ~~t-~~ facing token can never satisfy this check even if role were spoofed, because the signing/Vverification path is entirely separate. 

#### 7.4 Rate Limiting Configuration 

|Route group|Limit|Store|
|---|---|---|
|/auth/login],{ /auth/forgot~~-~~password|5 req/15 min /account+IP|Redis|
|GeneralauthenticatedAPI|300req/min /user|Redis|
|A~~l-~~heavy ({/copilot/*},( /documents/upload~~-~~ur1<br>})|20req/<br>min/ user|Redis|



##### 7.5 File Upload Security 

- e Pre ~~-~~ signed PUT URLs generated via (@aw ~~s-~~ sdk/client ~~-s~~ 3][getSignedUr1), scoped toa single object key, 5 ~~-~~ minute expiry. 

- e Server ~~-~~ side MIME verification using (file ~~-~~ type) package (magic ~~-~~ byte sniffing) after upload confirmation callback ~~—~~ never trusts the clien ~~t-~~ reported (Content ~~-T~~ ype). 

- ¢ Optional ClamAV ((clamscan)npm wrapper) container in the async pipeline scans the object before it's marked available for OCR. 

- e Object Keys are(or ~~g_~~ {organizationId}/perio ~~d_~~ {periodId}/{uuid}.{ext} ~~]—~~ never derived from user ~~-~~ supplied file names. 

#### 7.6 Prompt Injection Mitigation (implementation- ~~l~~ evel) 

typescript 



<!-- Start of picture text -->
// ai - client/prompt - templates.ts<br><!-- End of picture text -->











// Strip characters commonly used in injection payloads targeting delimiter c ~~<u>ea»</u>~~ <mark>></mark> 

The LLM client ((a ~~i-~~ client/)) never receives tool/function definitions that allow raw SQL or fil ~~e~~ -system access ~~—~~ the only "tools" exposed to any LLM call are narrow, parameterized data ~~-~~ lookup functions (e.g.,( getOrgEmissionSummary(organizationId, periodId))),Soevena successful injection has nothing dangerous to invoke. 

#### 8. Job Queue & Async Processing (BullMQ + Redis) 

##### 8.1 Queue Catalog 

|Queue|Producer|Consumer(worker)|RetryPolicy|Notes|
|---|---|---|---|---|
|~~extraction-~~|Document||3attempts,|OCR|
|queue|upload<br>confirm<br>endpoint||exponential<br>backoff(2s,<br>8s,32s)|LangGraph<br>extraction|
|~~(validation-~~<br>|Endof<br>|~~(validation-~~<br>|2attempts|Layer3AI<br>|
|~~queue )~~|extraction|~~ai.worker.ts)~~||validationonly|
||worker|||(Layers ~~1-~~2run<br>synchronously<br>intheAPI<br>request)|



|Queue|Producer|Consumer(worker)|RetryPolicy|Notes|
|---|---|---|---|---|
|~~calculation-~~|Document|calculation.worker.ts|3 attempts|Determinist~~ic—~~|
|~~queue~~|approval<br>endpoint /<br>manual<br>recalc<br>endpoint|||safetoretry,<br>idempotentper<br>documentId|
|~~report-~~|Compliance|~~report-~~|2attempts|PDF/Excel|
|render~~-~~queue|report|render.worker.ts||generation|
|notification~~-~~<br>queue|Various<br>services|notification.worker.ts]||5Sattempts|Email/in~~-~~app<br>notifications,low<br>priority|



###### 8.2 Worker Skeleton 

typescript 



<!-- Start of picture text -->
// src/workers/extraction.worker.ts<br>// system -<br>// step 1<br>// chain to<br>Cl...) D><br><!-- End of picture text -->

Idempotency guarantee: every worker's first action is a status/state check ~~—~~ e.g., no ~~-~~ ops if the document is already or later,soa duplicate/retried job never double ~~-c~~ reates rows (extraction table has an app ~~-l~~ evel "latest version wins" read pattern, and a unique constraint safety net is not needed since each retry increments explicitly rather than reusing it). 

#### 8.3 Dead Letter Handling 

Jobs exhausting retries move toa 

state in BullMQ (visible via Bull Board, mounted 

at behind Supe ~~r-~~ Admin auth) rather than being silently dropped; a scheduled sweep job alerts ops if the failed ~~-~~ job count for any queue exceeds a threshold. 

### 9. File Storage (S3/MinIO) 

- ¢ Dev: MinIO container via docker ~~-~~ compose, bucket (carbon ~~-o~~ s ~~-d~~ ev). 

- e Prod: AWS S3 (or any S3 ~~-~~ compatible provider), bucket per environment, versioning enabled, lifecycle rule to move objects >2 years old to cold storage (compliance retention, never deleted automatically). 

- « Access exclusively through (@aws ~~-~~ sdk/client ~~-s~~ 3), wrapped ina interface so the provider is swappable without touching business logic: 



- e Encryption at rest: SSE ~~-~~ S3 (or MinIO server ~~-~~ side encryption) enabled bucket ~~-w~~ ide. 

- e Noobject is ever public; every read goes through a signed URL minted per authorized request (max 5 ~~-~~ minute expiry). 

### 10. AI Extraction Pipeline (LangGraph, in Nodes) 

#### 10.1 Graph Definition 

typescript 



<!-- Start of picture text -->
// ai - client/graphs/extraction.graph.ts<br>// confirms/detects document<br>// schema - constrained LLM ca<br>// mismatch short - circuits<br>CL)» ><br><!-- End of picture text -->

Each node is independently retryable (LangGraph's per ~~-~~ node retry policy) so a transient LLM API failure only retries the node, not the whole OCR pass. 

#### 10.2 Structured Output Enforcement 

Extraction uses the LLM provider's JSO ~~N-~~ mode / function ~~-c~~ alling feature with a Zod ~~-~~ derived JSON schema per document type (the same Zod schemas double as both the DB validation layer and the LLM's structured ~~-~~ output contract, keeping one source of truth): 



<!-- Start of picture text -->
typescript<br>// ... per PRD Module 5.4 field list<br><!-- End of picture text -->

If the LLM response fails Zod parsing, LangChain's output ~~-f~~ ixing parser retries once witha "repair" prompt including the validation error; a second failure marks the document (EXTRACTION FATLED} 

10.3 Confidence & Bounding Boxes 

OCR provider returns per ~~-~~ token bounding boxes; the extraction node is prompted to reference source spans, and a lightweight fuzz ~~y-~~ match step maps each extracted field value back to its OCR bounding box for the "highlight on original document" review UI (Module 5.9 in the PRD). 

## 11. RAG / Copilot Implementation (ChromaDB) 

#### 11.1 Ingestion Pipeline (offline/scheduled) 



<!-- Start of picture text -->
typescript<br>// scripts/ingest - kb.ts<br>// pdf - parse or similar<br>EE» id<br><!-- End of picture text -->

Company- ~~sp~~ ecific documents (a customer's own uploaded bills used for record ~~-s~~ pecific copilot questions) are ingested into a separate ChromaDB collection ((company ~~_d~~ ocs)) that is always queried with a mandatory metadata filter ~~—~~ never the global collection. 

### 11.2 Query ~~-~~ Time Flow 

typescript 



<!-- Start of picture text -->
// 'GENERAL' | 'ORG _ DATA' | 'H<br>// parameterized Prisma query<br>><br>and all other org - data lookups<br><!-- End of picture text -->









<!-- Start of picture text -->
Oe<br><!-- End of picture text -->

### Hard boundary enforced in code: 

are pre ~~-w~~ ritten, parameterized functions in (src/modules/ra ~~g~~ -gateway/dat ~~a~~ -lookups.ts ~~}—~~ the LLM is never given a tex ~~t-~~ t ~~o~~ -SQL tool, closing off the most common RAG- ~~s~~ ecurity failure mode. 

### 12. ML Forecasting Service (FastAPI + XGBoost) 

The only Python service in the system. Contract- ~~fi~~ rst: the Node it purely over HTTP with a versioned, narrow API. 

module talks to 

python 

# apps/ml ~~-~~ service/app/routers/predict.py 



# lag values, seasonality, mode ~~-m~~ ix, etc. ~~—~~ computed by ml ~~-~~ 









~~<mark>(_</mark> eyeeee~~ ~~<mark>t—i‘‘“(®NNNSNSNCOCNCNC‘iés</mark>~~ 

- ¢ Training pipeline ((/train), triggered on a schedule by a Node ~~-s~~ ide cron job calling the FastAPI endpoint, never by user request directly): pulls aggregates from a PostgreSQL read replica, engineers lag/seasonality features (per PRD §9.5 ~~-9~~ .6), time ~~-~~ based train/validation split, trains XGBoost, evaluates MAPE/RMSE against the currentl ~~y-~~ deployed model, promotes only if it wins. 

- ¢ Model registry: serialized model artifacts ((model. json) via XGBoost's native serialization) stored in the same S3/MinIO bucket under <u>(m</u> ~~<u>l</u>~~ <u>-models/{orgId or</u> 

   - ~~<u>‘global '}/{version}/model. json},</u>~~ with metadata rows in Postgres's (MLPrediction ~~}~~ 

adjacent (m ~~1_~~ models)/(m ~~1_~~ training ~~_r~~ uns) tables (owned by the ML service via a 

dedicated, narrowly ~~-~~ scoped DB user with write access only to those two tables ~~—~~ enforced at the Postgres role/grant level, not just app convention). 

- e ml ~~-~~ gateway (Node side) is a thin proxy: builds the feature vector from Postgres, calls Fast API over the internal network, caches the result in (MLPrediction), and is what the dashboard actually calls ~~—~~ the FastAPI service itself is never exposed to the public internet or to the frontend. 

##### 13. API Contract Reference 

All endpoints are prefixed (/api/v1). Full pe ~~r-~~ module tables already exist in the PRD (Modules 1 ~~-1~~ 3, §1.10 ~~-1~~ 3.10) ~~—~~ this section adds the technical envelope conventions that make them buildable consistently. 

##### 13.1 Response Envelope 

|typescript<br>// Success<br>// Error||
|---|---|
|—————— EEE EEEE<br>EEE EE|—_PS<br>eestétéié#éS|
|13.2StandardErrorCodes (non~~-e~~xhaustive, <br>Code<br>HTTP|extendpermodule)<br>Meaning|
|400|Zodschema failure|
|401|Missing/invalid/expired JWT|
|403|Authenticated,wrongrole/tenant|
|404|Resourceabsentorcross~~-~~tenant (never<br>distinguished tocaller)|
|409|Reportingperiodlocked,upload/calcblocked|
|(TOKE~~N_~~EXPIRED)|(TOKE~~NI~~NVALTO)/<br>400|Authtokenlifecycle|
|400|Uploadtargeted atadeactivated site|



|Code||HTTP|Meani|ng||
|---|---|---|---|---|---|
|CALCULA|TION~~_B~~LOCKED|422|Missin<br>match|gemissionfactor /ambig|uousfactor|
|INSUFFI|CIENT~~_H~~ISTORY|422|MLfor|ecastrequestedwith<6|monthsdata|
|||429|Thrott|led||
|13.3Repr<br>modulet<br>Method|esentativeEndpointSet(<br>ables)<br>Path|impleme<br>Auth|ntation|~~-~~readysubset;fullcat<br>Request|alogperPRD<br>Response|
|POST|/auth/signup|Public||{email, password,<br>fullName,<br>orgName}]|{userld,<br>organizationId}|
|POST|/auth/login|Public||{email, password})|({accessToken}):<br>cookie|
|POST||ORG~~_~~AD|MIN|CreateSiteInput||
|POST<br>|/documents/upload~~-~~url<br>|ORG~~_~~M<br>|EMBER <br>||{categoryld,<br>fileName,<br>contentType,<br>siteld,<br>reportingPeriodId}<br>|{uploadur1,<br>documentId}<br><br>|
|POST —|(/documents) (confirm)|ORG~~_~~M|EMBER|({documentId}|~~({status:~~<br>~~'UPLO,~~<br>queued:<br>true}|
|GET|/documents/:id|ORG~~_~~M|EMBER|~~—~~|Document +<br>ExtractedData<br>+<br>ValidationResul|
|POST|/documents/:id/approve)|ORG~~_~~M|EMBER||({status:<br>'APPRI|
|POST|/reporting~~-~~<br>periods/:id/calculate|ORG~~_~~AD|MIN|{force?:<br>boolean}|{calculationRui<br>status}}|
|GET|/dashboard/summary|ORG~~_~~M|EMBER|query:| periodId,<br>sitelId?|[DashboardSumma|



13.3 Representative Endpoint Set (implementation ~~-~~ ready subset; full catalog per PRD module tables) 

|Method|Path|Auth|Request|Response|
|---|---|---|---|---|
|GET||ORG~~_~~MEMBER|query:|(MLPrediction<br>|<br>|
|||||NINSUFFICIENT~~_H~~|
|POST|/copilot/query|ORG~~_~~MEMBER|| {sessionId?,|({answer,<br>citat.|
||||question}|(SSE~~-~~streamed)|
|POST||ORG~~_~~MEMBER|({frameworkId,<br>reportingPeriodId}|(ComplianceRepo|
|POST =|(/reports/:id/finalize)|_OR~~G_~~ADMIN||~~({status: ‘FINAL~~<br>versionNumber}|



#### 13.4 OpenAPI Generation 

The API is documented via (zod ~~-~~ to ~~-o~~ penapi), generating at build time from the same Zod schemas used for runtime validation ~~—~~ this feeds both the Swagger UI (dev ~~-~~ only route) and the(packages/shared ~~-t~~ ypes }]TypeScript types consumed by the frontend, so the contract can never silently drift between backend validation and frontend expectations. 

### 14. Error Handling & Logging Standards 

- e Structured logging via Pino, JSON output, one line per event. Every log line includes (Fequesttd) (ifpresent), (seri) (if present), (nodule) 

- ¢ Correlation across async boundaries: the (or anewly generated (jobId) is passed into every BullMQ job payload and logged by workers, so a document's full lifecycle (upload > OCR > extraction > validation > calculation) can be traced via across API and worker logs. 

- ¢ Global error handler (last Express middleware) is the only place that writes a (5ee) ~~-~~ level log with a full stack trace; all subclasses (4xx) are logged at level with just the code + message (not stack) to keep noise down. 

- e Never log: raw passwords, full JWTs, full credit ~~-~~ card ~~-l~~ ike data (n/a here), or full LLM prompts containing PII beyond a truncated preview ~~—~~ [a ~~i_~~ logs.promptText }is stored in the DB (access ~~-c~~ ontrolled), not in application logs. 

- typescript 

// src/core/errors/error ~~-~~ handler.middleware.ts 



~~<u>7</u>~~ 

<mark>></mark> 

#### 15. Testing Strategy 

|Layer|Tool|CoverageTarget|Notes|
|---|---|---|---|
|Unit|Jest|285%for| ~~carbon-~~<br>engine},<br>(Layer1/2rules)|CarbonEnginegetsproperty~~-~~<br>basedtests (fas~~t-~~check) toverify<br>determinismacrossrandomized<br>validinputs|
|Integration|Jest+Supertest+<br>testcontainers<br>(ephemeral<br>Postgres)|AllAPIroutes,happy+key<br>errorpaths|Runsagainsta realPostgresinCI,<br>notmocks,forrepository~~-l~~ayer<br>confidence|
|Contract|Zodschema<br>snapshottests|100%ofrequest/response _<br>schemas|—Preventsaccidentalbreaking<br>changestotheAPIcontract|
|E2E|Playwright|Coreuserjourneys (signup<br>>orgsetup>upload><br>approve>calculate><br>dashboard> report<br>export)|Runsnightly+pre~~-r~~elease, noton<br>everyPR (slow)|
|Alpipeline|Jestwithrecorded<br>LLMfixtures<br>(VCR~~-s~~tyle<br>cassettevia<br>(rock)(nsw)|Deterministicre~~-~~runs of<br>extraction/validation<br>graphswithoutliveLLM<br>calls in CI|Liv~~e-~~LLMsmoketestsrunina<br>separate,les~~s-~~frequentpipeline|



Layer 

Tool 

Coverage Target 

Notes 

|MLservice|pytest|Featureengineering<br>functions,model<br>evaluation gatelogic|Modelqualitygate itselftested<br>withsynthetichistoricaldata|
|---|---|---|---|
|Security|Dedicatedtest<br>suite|Cross~~-~~tenantisolation<br>(Section8.6acceptance|AutomatedtestthatassertsOrg<br>A's JWTcanneverreadOrgB's<br>recordsviaanyendpoint|
|Determini<br>typescript<br>|smtestexample <br>~~—~~|(CarbonEngine,directlys<br>~~—~~<br>EEE|atisfiesPRDModule7.17):<br>// Dec<br>~~—~~<br>LULULULULULUUC—~—~—i‘Ciéi|



### 16. CI/CD Pipeline (GitHub Actions) 

yaml # .github/workflows/ci.yml (summary) 



deploy. ym1) triggers on merge to (main): builds + pushes images, runs ~~<u>(prisma migrate deploy</u>~~ )against the target environment as a pre ~~-~~ deploy step, then rolls out (core ~~-a~~ pi), workers, and independently (workers and API can be deployed/scaled separately since they're different entrypoints of the same image). 

#### 17. Environment Configuration 

All env vars validated at boot via a Zod schema ((src/core/config/env.schema.ts}) ~~—~~ the process refuses to start if any required variable is missing/malformed, rather than failing at first use. 

|Variable|Purpose|
|---|---|
||PostgreSQLconnectionstring|
||Readreplicafordashboard/MLfeature<br>queries|
||BullMQ+ rate~~-~~limit store|
|GUT~~_A~~CCESS~~_S~~ECRET)/(NT~~_R~~EFRESH~~_S~~ECRET)|‘Tokensigning|
|(S~~3_~~ENDPOINT),(S3~~_B~~UCKET),(S3~~_A~~CCESS~~_K~~EY),<br>|Objectstorage<br><br>|
|(Cim~~_B~~ASE~~_U~~RL) (CL~~M_~~APT~~_K~~EY) (ULA~~_ ~~MODEL)|OpenA~~l-~~compatible<br>LLM|
||ForChromaDBingestion/query|
||ChromaDBendpoint|
||Internal~~-~~onlyFastAPIbaseURL|
|(OCR~~_P~~ROVIDER |,|PluggableOCRadapterconfig|
||Transactionalemail (verification, reset,<br>notifications)|



### 18. Deployment & Infrastructure 



- e Prod: each of (API), the worker processes, and are independently scalable containers behind an internal service mesh/network; only and are internet ~~-f~~ acing. 

- e Database migrations run as a one ~~-~~ shot job in the deploy pipeline before new API containers receive traffic (blue/green or rolling, with a migration ~~-c~~ ompatibility rule: every migration must be backward ~~-c~~ ompatible with the previous app version for at least one deploy cycle, to support zer ~~o-~~ downtime rolling deploys). 

### 19. Observability & Monitoring 

- ¢ Metrics: Prometheus ~~-c~~ ompatible endpoint on (request latency histograms, queue depth via BullMQ metrics exporter, DB pool utilization). 

- ¢« Tracing: OpenTelemetry SDK instrumenting Express + Prisma + BullMQ + outbound LLM/FastAPI calls, exported to any OTLP ~~-c~~ ompatible backend. 

- ¢ Alcost/latency dashboard: built directly from the table (Module 13 Admin Console requirement) ~~—~~ a scheduled job rolls it up into daily aggregates for the admin UI rather than querying the raw table live. 

e Alerting: faile ~~d-~~ jo ~~b-~~ count threshold per BullMQ queue, DB connection pool saturation, p95 latency SLO breach, ML service error rate. 

### 20. Coding Standards & Conventions 

- e ESLint + Prettier, shared config in (packages/eslint ~~-c~~ onfig}. Key custom rule: <u>(no</u> ~~<u>-</u>~~ <u>restricted</u> ~~<u>-</u>~~ <u>imports</u> blocking any import of from within 

   - src/modules/carbon- ~~e~~ ngine/**) (enforces the deterministi ~~c-~~ engine boundary from 

   - PRD Module 7/11 at compile time, not just code review). 

- ¢ TypeScript across all packages; banned via lint rule except in explicitly justified, commented exceptions. 

- ¢ Naming: for variables/functions, for types/classes, files <u>(kebab</u> ~~<u>-</u>~~ 

- ¢ Commits: Conventional Commits ((feat: },(fix:), (chore:)) to drive automated changelog generation. 

- e PRrequirements: passing CI, one approving review, migration rollback note if changed, and ~~—~~ for any module touching money/emissions/security 

- ~~—~~ an explicit checklist item confirming the relevant hard rule (determinism, AI ~~-~~ never ~~-~~ write ~~s-~~ numbers, tenant isolation) was not violated. 

### 21. Phased Delivery Plan (Sprint 0 > v1) 

|Phase|Scope|DependsOn|
|---|---|---|
|SprintO|Repo scaffold, CI/CD,docker~~-~~compose,Prismaschema+<br>migrations,Auth module (Module 1)|~~_~~|
|Sprinti~~-~~<br>2|Organization + Sitemanagement (Modules2~~-3~~),Admin<br>consoleskeleton(Module 13,orgs/usersviews)|Sprint0|
|Sprint<br>3~~-~~5|DataCollectionWizard+Documentupload (Module 4),<br>OCR/LangGraphextraction (Module5)|Sprint0~~-~~2|
|Sprint<br>6~~-~~7|3~~-~~layerValidation<br>+ReviewQueue(Module6)|Sprint3~~-~~5|
|Sprint<br>8~~-~~9|CarbonAccountingEngine(Module 7) ~~— ~~highest~~-~~scrutiny<br>module,extraQA/testtime|| Sprint6~~-~~7|



Phase 

Scope 

Depends On 

|Sprint<br>10|Dashboard&Analytics (Module8)|Sprint8~~-~~9|
|---|---|---|
|Sprint11|MLForecasting servicestoodup (Module 9)|Sprint8~~-~~9 (needsreal<br>calculated data)|
|Sprint12|RAGCopilot (Module 10) ~~— ~~KBingestionpipeline first,<br>thenchatUI|Sprint0 (parallelizable<br>earlierifdesired)|
|Sprint<br>13~~-~~14|ComplianceAgent+Reportingexport (Modules 11~~-1~~2)|Sprint8~~-~~9|
|Sprint1S|AdminConsolecompletion (Module13~~— ~~AIlogs,feature<br>flags,emissionfactoradminUI),securityaudit,loadtesting|Allabove|
|Sprint<br>16|Hardening,pen~~-t~~estremediation,launchreadiness|Allabove|



#### End of Document. 

