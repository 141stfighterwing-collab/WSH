#!/usr/bin/env pwsh
# WSH -- Non-destructive Update Script v4.1.1
# Pulls latest code, rebuilds image, and restarts containers.
# Your data (PostgreSQL, volumes) is NEVER destroyed.
#
# Usage:
#   .\update.ps1
#   .\update.ps1 -NoCache    # Force full rebuild

param(
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSH -- Update v4.1.1" -ForegroundColor Cyan
Write-Host "  (data-preserving update)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -- Step 1: Pull latest code ---------------------------------
Write-Host "[1/4] Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin main 2>&1 | ForEach-Object { Write-Host "  $_" }
Write-Host "  [OK] Code updated" -ForegroundColor Green

# -- Step 2: Rebuild Docker image -----------------------------
Write-Host ""
Write-Host "[2/4] Rebuilding Docker image..." -ForegroundColor Yellow
Write-Host "  (this may take 2-4 minutes on first run)" -ForegroundColor DarkGray
Write-Host ""

if ($NoCache) {
    docker compose build --no-cache 2>&1 | ForEach-Object { Write-Host "  $_" }
} else {
    docker compose build 2>&1 | ForEach-Object { Write-Host "  $_" }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [OK] Image built" -ForegroundColor Green

# -- Step 3: Restart containers -------------------------------
Write-Host ""
Write-Host "[3/4] Restarting containers (preserving data)..." -ForegroundColor Yellow
docker compose up -d --force-recreate 2>&1 | ForEach-Object { Write-Host "  $_" }

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Container restart failed!" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Containers restarted" -ForegroundColor Green

# -- Step 4: Validate -----------------------------------------
Write-Host ""
Write-Host "[4/4] Validating services..." -ForegroundColor Yellow
Write-Host "  Waiting 15s for services to start..." -ForegroundColor DarkGray
Start-Sleep -Seconds 15

$allOk = $true
foreach ($svc in @("weavenote-app", "wsh-dbviewer", "wsh-postgres")) {
    $running = docker inspect -f '{{.State.Running}}' $svc 2>$null
    if ($running -eq "true") {
        Write-Host "  [OK] $svc is RUNNING" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $svc is NOT running" -ForegroundColor Red
        $allOk = $false
    }
}

# Health check
$port = if ($env:WSH_PORT) { $env:WSH_PORT } else { 8883 }
try {
    $health = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Host "  [OK] Health check PASSED (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Health check not ready yet (container may still be initializing)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  UPDATE COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App:        http://localhost:$port" -ForegroundColor Cyan
Write-Host "  DB Viewer:  http://localhost:5682" -ForegroundColor Cyan
Write-Host "  Logs:       docker compose logs -f weavenote" -ForegroundColor DarkGray
Write-Host ""
Write-Host '  To do a full clean install:  .\install.ps1' -ForegroundColor DarkGray
Write-Host ""
