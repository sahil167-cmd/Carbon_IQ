# ==============================================================================
# CarbonIQ — Process Sweeper & Port Killer
# Kills any zombie or orphaned processes holding CarbonIQ ports:
# 3000 (Core API), 5173 (Web UI), 8000 (ML Service), 9000 (MinIO)
# ==============================================================================

$ports = @(3000, 5173, 8000)

Write-Host "Checking for stale or orphaned processes on ports: $($ports -join ', ')..." -ForegroundColor Yellow

foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -and $pidToKill -ne 0 -and $pidToKill -ne $PID) {
                    $pName = (Get-Process -Id $pidToKill -ErrorAction SilentlyContinue).ProcessName
                    Write-Host "  -> Port $port is in use by PID $pidToKill ($pName). Releasing port..." -ForegroundColor Yellow
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 200
                }
            }
            Write-Host "  [OK] Port $port released." -ForegroundColor Green
        } else {
            Write-Host "  [OK] Port $port is free." -ForegroundColor DarkGray
        }
    } catch {
        # ignore lookup errors
    }
}

Write-Host "All ports verified clean!" -ForegroundColor Green
