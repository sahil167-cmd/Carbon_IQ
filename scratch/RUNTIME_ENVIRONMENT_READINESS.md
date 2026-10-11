# CarbonIQ Runtime Environment Readiness Report

**Audit Date:** August 28, 2026  
**Environment Target:** Local Full-Stack Development / Manual Execution Mode  

---

## 1. Environment Variable Verification Matrix (Zero Secrets Exposed)

| Variable Name | Status | Used By | Required For |
| :--- | :--- | :--- | :--- |
| `PORT` | **PRESENT** | core-api | HTTP server port |
| `NODE_ENV` | **PRESENT** | core-api / web | Execution environment mode |
| `DATABASE_URL` | **PRESENT** | core-api / Prisma | PostgreSQL database connection |
| `REDIS_URL` | **PRESENT** | core-api / BullMQ | Redis connection for queue and caching |
| `JWT_ACCESS_SECRET` | **PRESENT** | core-api | JWT token signing and verification |
| `JWT_REFRESH_SECRET` | **PRESENT** | core-api | JWT refresh token signing |
| `S3_ENDPOINT` | **PRESENT** | core-api | MinIO / S3 document storage endpoint |
| `S3_BUCKET` | **PRESENT** | core-api | MinIO / S3 bucket name |
| `S3_ACCESS_KEY` | **PRESENT** | core-api | MinIO / S3 access credentials |
| `S3_SECRET_KEY` | **PRESENT** | core-api | MinIO / S3 secret credentials |
| `S3_REGION` | **PRESENT** | core-api | S3 regional configuration |
| `S3_FORCE_PATH_STYLE` | **PRESENT** | core-api | MinIO path-style addressing |
| `LLM_API_KEY` | **PRESENT** | core-api / Mistral OCR | Mistral Vision & AI API Key |
| `MISTRAL_API_KEY` | **PRESENT (via LLM_API_KEY)** | core-api / Mistral OCR | Direct Mistral Vision API Key |
| `ML_SERVICE_URL` | **PRESENT** | core-api | Internal ML forecasting service endpoint |

---

## 2. Infrastructure Connectivity Summary

- **PostgreSQL:** Fully reachable at port `5432` (`carbon_os_dev`).
- **Redis:** Configured for port `6379` (`ai-queue` and `calc-queue`).
- **MinIO Object Storage:** Configured for `http://localhost:9000` (bucket `carbon-os-dev`).
- **Mistral Vision API:** Authenticated and active for Pixtral OCR.
