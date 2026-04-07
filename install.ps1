#!/usr/bin/env pwsh
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# v3.9.2: Multi-stage Docker build. Installs a pre-built image.
# Updates are non-destructive: just `.\update.ps1` to pull + rebuild.
#
# Usage:  .\install.ps1
#         .\install.ps1 -Port 8080
#         .\install.ps1 -CleanOnly
#         .\install.ps1 -WithPgAdmin
#
# SAFETY: This script ONLY removes containers, images, volumes, and
#         networks that belong to WSH. It will NEVER touch resources
#         from other Docker Compose projects or standalone containers.

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

# ---- PHASE 1: Stop & remove WSH containers (exact names only) ----
Write-Host "[1/5] Stopping WSH containers..." -ForegroundColor Yellow

# Use docker compose down for project-scoped cleanup (containers + networks)
# This ONLY touches resources defined in docker-compose.yml
docker compose down -v --remove-orphans 2>$null | Out-Null
docker compose --profile admin down -v --remove-orphans 2>$null | Out-Null

# Also remove any orphaned WSH containers by their EXACT container_name values
# These are the only container_name values defined in docker-compose.yml
$wshContainers = @("wsh-postgres", "weavenote-app", "wsh-dbviewer", "wsh-pgadmin")
$foundCount = 0
$allContainers = docker ps -a --format "{{.Names}}" 2>$null
if ($allContainers) {
    foreach ($c in $wshContainers) {
        if ($allContainers -contains $c) {
            Write-Host "  - Removing container: $c" -ForegroundColor DarkGray
            docker rm -f $c 2>$null | Out-Null
            $foundCount++
        }
    }
}
if ($foundCount -gt 0) {
    Write-Host "  [OK] Removed $foundCount orphaned container(s)" -ForegroundColor Green
} else {
    Write-Host "  [OK] No orphaned containers" -ForegroundColor Green
}

# ---- PHASE 2: Remove WSH images (exact matches only) ----
Write-Host "[2/5] Removing WSH Docker images..." -ForegroundColor Yellow

# Only remove images that WSH explicitly builds or tags
# We do NOT remove shared images like postgres:16-alpine, adminer:latest, etc.
$wshImages = @("weavenote:3.9.2", "weavenote:latest", "weavenote-app")
$foundImages = 0
$allImages = docker images --format "{{.Repository}}:{{.Tag}}" 2>$null
if ($allImages) {
    foreach ($img in $wshImages) {
        if ($allImages -contains $img) {
            Write-Host "  - Removing image: $img" -ForegroundColor DarkGray
            docker rmi -f $img 2>$null | Out-Null
            $foundImages++
        }
    }
}
if ($foundImages -gt 0) {
    Write-Host "  [OK] Removed $foundImages image(s)" -ForegroundColor Green
} else {
    Write-Host "  [OK] No WSH images to remove" -ForegroundColor Green
}

# ---- PHASE 3: Remove WSH volumes & networks (exact names only) ----
Write-Host "[3/5] Removing WSH volumes and networks..." -ForegroundColor Yellow

# Docker Compose prefixes volumes with the project directory name (e.g., "WSH_postgres-data")
# Remove known WSH volume names by exact match
$projectName = (Split-Path -Leaf (Get-Location)).ToLower()
$wshVolumes = @(
    "postgres-data",
    "weavenote-data",
    "pgadmin-data",
    "${projectName}_postgres-data",
    "${projectName}_weavenote-data",
    "${projectName}_pgadmin-data",
    "WSH_postgres-data",
    "WSH_weavenote-data",
    "WSH_pgadmin-data"
)
$allVolumes = docker volume ls --format "{{.Name}}" 2>$null
if ($allVolumes) {
    foreach ($v in $wshVolumes) {
        if ($allVolumes -contains $v) {
            Write-Host "  - Removing volume: $v" -ForegroundColor DarkGray
            docker volume rm $v 2>$null | Out-Null
        }
    }
}

# Remove WSH networks by exact name
$wshNetworks = @("wsh-net", "${projectName}_wsh-net", "WSH_wsh-net", "WSH_default")
$allNetworks = docker network ls --format "{{.Name}}" 2>$null
if ($allNetworks) {
    foreach ($n in $wshNetworks) {
        if ($allNetworks -contains $n) {
            Write-Host "  - Removing network: $n" -ForegroundColor DarkGray
            docker network rm $n 2>$null | Out-Null
        }
    }
}

Write-Host "  [OK] Cleaned" -ForegroundColor Green

# ---- PHASE 4: Clean WSH build cache only ----
Write-Host "[4/5] Cleaning WSH build cache..." -ForegroundColor Yellow

# Use --filter to ONLY prune build cache for this project
# We DO NOT use "docker system prune -af" as that would destroy resources
# from other Docker Compose projects and standalone containers.
docker builder prune -f --filter "label=com.docker.compose.project=$projectName" 2>$null | Out-Null
Write-Host "  [OK] Build cache cleaned" -ForegroundColor Green

if ($CleanOnly) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  CLEAN COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Only WSH resources were removed." -ForegroundColor Cyan
    Write-Host "  Other Docker containers/images/volumes are untouched." -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# ---- PHASE 5: Build and start ----
Write-Host "[5/5] Building WSH Docker image..." -ForegroundColor Yellow
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

# ---- Validate ----
Write-Host ""
Write-Host "Validating services..." -ForegroundColor Yellow
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
