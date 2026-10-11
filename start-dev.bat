
@echo off
setlocal enabledelayedexpansion

title CarbonIQ Enterprise SaaS Platform Launcher

echo ======================================================================
echo           CARBONIQ ENTERPRISE PRODUCTION STACK LAUNCHER               
echo ======================================================================

:: 1. Auto-Healer & Platform Doctor Check
echo.
echo [Step 1/2] Running Platform Doctor, Docker Check & Port Sweeper...
call node scripts/doctor.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Platform Doctor detected an issue above.
    echo Please make sure Docker Desktop is open and running!
    pause
    exit /b 1
)

:: 2. Launch Services in Independent, Resilient Windows
echo.
echo [Step 2/2] Launching Microservices in Dedicated Windows...
echo.

start "CarbonIQ [1] Core API (Port 3000)" cmd /k "title CarbonIQ - Core API && pnpm dev:api"
start "CarbonIQ [2] Web Frontend (Port 5173)" cmd /k "title CarbonIQ - Web Frontend && pnpm dev:web"
start "CarbonIQ [3] ML Service & LangGraph (Port 8000)" cmd /k "title CarbonIQ - ML Service && pnpm dev:ml"
start "CarbonIQ [4] Background Calculation Worker" cmd /k "title CarbonIQ - Calc Worker && pnpm worker:calc"

echo ======================================================================
echo    ALL MICROSERVICES LAUNCHED SUCCESSFULLY!                           
echo ======================================================================
echo.
echo   * Web Frontend:    http://localhost:5173
echo   * Core API:        http://localhost:3000/health
echo   * ML & LangGraph:  http://localhost:8000/health
echo.
echo Keep the service windows open while developing.
echo To stop everything later, close the windows or run: pnpm kill-ports
echo ======================================================================
echo.
