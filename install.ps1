#!/usr/bin/env pwsh
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# v3.9.2: Multi-stage Docker build. Installs a pre-built image.
# Updates are non-destructive: just `.\update.ps1` to pull + rebuild.
#
# Usage:  .\install.ps1
#         .\install.ps1 -Port 8080
#         .\install.ps1 -CleanOnly
#         .\install.ps1 -WithPgAdmin

param(
    [int]$Port = 3000,
    [switch]$CleanOnly,
    [switch]$WithPgAdmin
)

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.ForegroundColor = "Cyan"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSH - Auto Nuke & Reinstall v3.9.2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- PHASE 1: Kill ALL containers ----
Write-Host "[1/6] Stopping ALL WSH/WeaveNote containers..." -ForegroundColor Yellow

$containers = docker ps -a --format "{{.Names}}" | Where-Object {
    $_ -match "wsh|weavenote|pgadmin"
}

if ($containers) {
    foreach ($c in $containers) {
        Write-Host "  - Removing container: $c" -ForegroundColor DarkGray
        docker rm -f $c 2>$null
    }
    Write-Host "  [OK] Removed $($containers.Count) container(s)" -ForegroundColor Green
} else {
    Write-Host "  [OK] No existing containers found" -ForegroundColor Green
}

# ---- PHASE 2: Remove ALL matching images ----
Write-Host "[2/6] Removing ALL WSH/WeaveNote Docker images..." -ForegroundColor Yellow

$images = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object {
    $_ -match "wsh|weavenote|adminer|pgadmin|postgres"
}

if ($images) {
    foreach ($img in $images) {
        Write-Host "  - Removing image: $img" -ForegroundColor DarkGray
        docker rmi -f $img 2>$null
    }
    Write-Host "  [OK] Removed $($images.Count) image(s)" -ForegroundColor Green
} else {
    Write-Host "  [OK] No existing images found" -ForegroundColor Green
}

# ---- PHASE 3: Remove volumes & networks ----
Write-Host "[3/6] Removing volumes and networks..." -ForegroundColor Yellow

foreach ($v in $(docker volume ls --format "{{.Name}}" | Where-Object { $_ -match "wsh|weavenote|postgres|pgadmin" })) {
    docker volume rm $v 2>$null
}

foreach ($n in $(docker network ls --format "{{.Name}}" | Where-Object { $_ -match "wsh|weavenote" -and $_ -ne "bridge" -and $_ -ne "host" -and $_ -ne "none" })) {
    docker network rm $n 2>$null
}

Write-Host "  [OK] Cleaned" -ForegroundColor Green

# ---- PHASE 4: Prune ----
Write-Host "[4/6] Pruning Docker resources..." -ForegroundColor Yellow
docker system prune -af 2>$null | Out-Null
docker builder prune -af 2>$null | Out-Null
Write-Host "  [OK] Pruned" -ForegroundColor Green

if ($CleanOnly) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  CLEAN COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# ---- PHASE 5: Build and start ----
Write-Host "[5/6] Building WSH Docker image..." -ForegroundColor Yellow
Write-Host "  (this may take 3-5 minutes)" -ForegroundColor DarkGray
Write-Host ""

$env:WSH_PORT = $Port
& docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Starting WSH stack..." -ForegroundColor Yellow

if ($WithPgAdmin) {
    docker compose --profile admin up -d --force-recreate
} else {
    docker compose up -d --force-recreate
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Docker start failed!" -ForegroundColor Red
    exit 1
}

# ---- PHASE 6: Validate ----
Write-Host ""
Write-Host "[6/6] Validating services..." -ForegroundColor Yellow
Write-Host "  Waiting 30s for services to start..." -ForegroundColor DarkGray
Start-Sleep -Seconds 30

$allOk = $true
foreach ($svc in @(
    @{ Name = "weavenote-app"; Port = $Port;  Label = "WSH App" },
    @{ Name = "wsh-dbviewer";  Port = 5682;  Label = "DB Viewer" },
    @{ Name = "wsh-postgres";  Port = 5432;  Label = "PostgreSQL" }
)) {
    $running = docker inspect -f '{{.State.Running}}' $svc.Name 2>$null
    if ($running -eq "true") {
        Write-Host "  [OK] $($svc.Label) is RUNNING" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($svc.Label) is NOT running" -ForegroundColor Red
        $allOk = $false
    }
}

# Check health
try {
    $health = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        $body = $health.Content | ConvertFrom-Json
        Write-Host "  [OK] Health check PASSED -- v$($body.version)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Still initializing. Watch logs:" -ForegroundColor Yellow
    Write-Host "         docker compose logs -f weavenote" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  WSH INSTALLED SUCCESSFULLY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App:        http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  DB Viewer:  http://localhost:5682" -ForegroundColor Cyan
Write-Host "  PostgreSQL: localhost:5432 (internal)" -ForegroundColor DarkGray
if ($WithPgAdmin) {
    Write-Host "  pgAdmin:    http://localhost:5050" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Logs:        docker compose logs -f weavenote" -ForegroundColor DarkGray
Write-Host "  Stop:        docker compose down" -ForegroundColor DarkGray
Write-Host '  Update:      .\update.ps1  (preserves data!)' -ForegroundColor Green
Write-Host '  Full nuke:   .\install.ps1' -ForegroundColor DarkGray
Write-Host ""
