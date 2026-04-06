#!/usr/bin/env pwsh
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# This script automatically detects and removes ALL old WSH/WeaveNote
# Docker containers, images, volumes, and networks, then rebuilds from scratch.
# After install, it validates that all 3 required services are running.
#
# Usage:  .\install.ps1
#         .\install.ps1 -Port 8080
#         .\install.ps1 -CleanOnly  (nuke without rebuilding)
#         .\install.ps1 -WithPgAdmin  (include pgAdmin on port 5050)

param(
    [int]$Port = 3000,
    [switch]$CleanOnly,
    [switch]$NoCache,
    [switch]$WithPgAdmin
)

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.ForegroundColor = "Cyan"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSH - Auto Nuke & Reinstall v3.7.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- PHASE 1: Kill ALL containers matching wsh/weavenote/pgadmin ----
Write-Host "[1/7] Stopping ALL WSH/WeaveNote containers..." -ForegroundColor Yellow

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
Write-Host "[2/7] Removing ALL WSH/WeaveNote Docker images..." -ForegroundColor Yellow

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

# ---- PHASE 3: Remove ALL matching volumes ----
Write-Host "[3/7] Removing ALL WSH/WeaveNote Docker volumes..." -ForegroundColor Yellow

$volumes = docker volume ls --format "{{.Name}}" | Where-Object {
    $_ -match "wsh|weavenote|postgres|pgadmin"
}

if ($volumes) {
    foreach ($v in $volumes) {
        Write-Host "  - Removing volume: $v" -ForegroundColor DarkGray
        docker volume rm $v 2>$null
    }
    Write-Host "  [OK] Removed $($volumes.Count) volume(s)" -ForegroundColor Green
} else {
    Write-Host "  [OK] No existing volumes found" -ForegroundColor Green
}

# ---- PHASE 4: Remove ALL matching networks ----
Write-Host "[4/7] Removing ALL WSH/WeaveNote Docker networks..." -ForegroundColor Yellow

$networks = docker network ls --format "{{.Name}}" | Where-Object {
    $_ -match "wsh|weavenote" -and $_ -ne "bridge" -and $_ -ne "host" -and $_ -ne "none"
}

if ($networks) {
    foreach ($n in $networks) {
        Write-Host "  - Removing network: $n" -ForegroundColor DarkGray
        docker network rm $n 2>$null
    }
    Write-Host "  [OK] Removed $($networks.Count) network(s)" -ForegroundColor Green
} else {
    Write-Host "  [OK] No existing networks found" -ForegroundColor Green
}

# ---- PHASE 5: Docker prune ----
Write-Host "[5/7] Pruning dangling Docker resources..." -ForegroundColor Yellow
docker system prune -af 2>$null | Out-Null
docker builder prune -af 2>$null | Out-Null
Write-Host "  [OK] Docker fully pruned" -ForegroundColor Green

if ($CleanOnly) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  CLEAN COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# ---- PHASE 6: Build and start ----
Write-Host "[6/7] Building WSH from scratch (no cache)..." -ForegroundColor Yellow
Write-Host ""

$env:WSH_PORT = $Port
& docker compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Docker build failed!" -ForegroundColor Red
    Write-Host "Check the build output above for errors." -ForegroundColor Red
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
    Write-Host ""
    Write-Host "[FAIL] Docker start failed!" -ForegroundColor Red
    exit 1
}

# ---- PHASE 7: Validate all services ----
Write-Host ""
Write-Host "[7/7] Validating services..." -ForegroundColor Yellow
Write-Host ""

$expectedContainers = @(
    @{ Name = "weavenote-app";  Port = $Port;  Label = "WSH App" },
    @{ Name = "wsh-dbviewer";   Port = 5682;  Label = "DB Viewer" },
    @{ Name = "wsh-postgres";   Port = 5432;  Label = "PostgreSQL" }
)

if ($WithPgAdmin) {
    $expectedContainers += @{ Name = "wsh-pgadmin"; Port = 5050; Label = "pgAdmin" }
}

$allOk = $true
$waitSeconds = 30
Write-Host "  Waiting ${waitSeconds}s for services to start..." -ForegroundColor DarkGray
Start-Sleep -Seconds $waitSeconds

foreach ($svc in $expectedContainers) {
    $running = docker inspect -f '{{.State.Running}}' $svc.Name 2>$null
    if ($running -eq "true") {
        Write-Host "  [OK] $($svc.Label) is RUNNING (container: $($svc.Name))" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($svc.Label) is NOT running (container: $($svc.Name))" -ForegroundColor Red
        $allOk = $false
    }
}

# Check app health
try {
    $health = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Host "  [OK] App health check PASSED (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] App health check not ready yet (may still be initializing)" -ForegroundColor Yellow
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
Write-Host "  Logs:       docker compose logs -f weavenote" -ForegroundColor DarkGray
Write-Host "  Stop:       docker compose down" -ForegroundColor DarkGray
Write-Host "  Nuke:       .\install.ps1" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Watching startup logs (Ctrl+C to stop)..." -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 2
docker compose logs -f weavenote
