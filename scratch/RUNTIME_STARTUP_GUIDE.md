# CarbonIQ Runtime Startup Guide

This guide provides the exact commands, ports, and procedures to start all CarbonIQ services for manual end-to-end testing and execution.

---

## 1. Service Architecture & Port Directory

| Service | Technology | Port | Health-Check URL | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **PostgreSQL** | Docker (`pgvector/pgvector:pg16`) | `5432` | `pg_isready -U carbon_os -d carbon_os_dev` | Relational carbon ledger & vector store |
| **Redis** | Docker (`redis:7-alpine`) | `6379` | `redis-cli ping` | BullMQ queues (`ai-queue`, `calc-queue`) |
| **MinIO** | Docker (`minio/minio`) | `9000` / `9001` | `http://localhost:9000/minio/health/live` | S3-compatible document file storage |
| **Core API** | Node.js / Express / TypeScript | `3000` | `http://localhost:3000/health` | REST API, auth, document ingestion, calculation |
| **AI Worker** | Node.js / BullMQ | Background | Log: `aiWorker` job received | OCR & LangGraph extraction worker |
| **Calc Worker** | Node.js / BullMQ | Background | Log: `calcWorker` job received | Carbon accounting deterministic worker |
| **Web Frontend** | Vite / React / TypeScript | `5173` | `http://localhost:5173` | User interface, upload wizard, carbon ledger UI |

---

## 2. Startup Procedure (Recommended Terminal Layout)

### Step 1: Start Infrastructure Containers (Docker)
In your primary terminal, start the required background infrastructure:
```powershell
docker compose up -d postgres redis minio
```
*Verification:*
```powershell
docker ps
```
Ensure `carbon_os_postgres`, `carbon_os_redis`, and `carbon_os_minio` show status `Up (healthy)`.

---

### Step 2: Option A — Launch Everything with One Command
Run the platform launcher in the root workspace directory:
```powershell
start-dev.bat
# or
pnpm start
```
This automatically runs `scripts/doctor.js`, checks port availability, and spawns dedicated terminals for Core API, Web Frontend, ML Service, and Workers.

---

### Step 2: Option B — Launch Microservices in Separate Terminals

#### Terminal 1: Core API Server
```powershell
pnpm dev:api
```
*Expected Log:* `🚀 CarbonIQ core-api started on port 3000`

#### Terminal 2: AI & Calculation Background Workers
```powershell
pnpm worker:ai
```
*(In another tab/window for calc worker if needed:)*
```powershell
pnpm worker:calc
```

#### Terminal 3: Web Frontend
```powershell
pnpm dev:web
```
*Expected Log:* `VITE v8.1.1 ready in ... ms -> Local: http://localhost:5173/`

---

## 3. How to Stop Services

To stop all running microservices and release ports:
```powershell
pnpm kill-ports
```
To shut down Docker containers:
```powershell
docker compose down
```
