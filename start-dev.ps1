# ==============================================================================
# CarbonIQ Enterprise SaaS Platform Launcher (PowerShell)
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          CARBONIQ ENTERPRISE PRODUCTION STACK LAUNCHER               " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Run Platform Doctor
Write-Host "`n[Step 1/2] Running Platform Doctor, Docker Check & Port Sweeper..." -ForegroundColor Yellow
node scripts/doctor.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Platform Doctor detected an issue above. Ensure Docker Desktop is running!" -ForegroundColor Red
    exit 1
}

# 2. Apply Database Migrations & Generate Prisma Client
Write-Host "`n[Step 2/3] Applying database migrations..." -ForegroundColor Yellow
pnpm --filter @carbon-iq/db exec prisma generate 2>$null | Out-Null
pnpm --filter @carbon-iq/db exec prisma migrate deploy 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Migration failed — DB may already be up-to-date or unreachable." -ForegroundColor DarkYellow
} else {
    Write-Host "  Migrations applied successfully." -ForegroundColor Green
}

# 3. Launch Services in Independent, Resilient Windows
Write-Host "`n[Step 3/3] Launching Microservices in Dedicated Windows..." -ForegroundColor Green

Start-Process cmd -ArgumentList "/k", "title CarbonIQ - Core API && pnpm dev:api"
Start-Process cmd -ArgumentList "/k", "title CarbonIQ - Web Frontend && pnpm dev:web"
Start-Process cmd -ArgumentList "/k", "title CarbonIQ - ML Service && pnpm dev:ml"
Start-Process cmd -ArgumentList "/k", "title CarbonIQ - Calc Worker && pnpm worker:calc"

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "   ALL MICROSERVICES LAUNCHED SUCCESSFULLY!                           " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "`n  * Web Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  * Core API:        http://localhost:3000/health" -ForegroundColor White
Write-Host "  * ML & LangGraph:  http://localhost:8000/health" -ForegroundColor White
Write-Host "`nKeep the service windows open while developing." -ForegroundColor DarkGray
Write-Host "To stop everything later, close the windows or run: pnpm kill-ports`n" -ForegroundColor DarkGray
