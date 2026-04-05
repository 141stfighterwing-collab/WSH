#!/usr/bin/env pwsh
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# This script automatically detects and removes ALL old WSH/WeaveNote
# Docker containers, images, volumes, and networks, then rebuilds from scratch.
#
# Usage:  .\install.ps1
#         .\install.ps1 -Port 8080
#         .\install.ps1 -CleanOnly  (nuke without rebuilding)

param(
    [int]$Port = 3000,
    [switch]$CleanOnly,
    [switch]$NoCache
)

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.ForegroundColor = "Cyan"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WEAVENOTE - Auto Nuke & Reinstall" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- PHASE 1: Kill all containers matching wsh/weavenote ----
Write-Host "[1/6] Stopping all WSH/WeaveNote containers..." -ForegroundColor Yellow

$containers = docker ps -a --format "{{.Names}}" | Where-Object {
    $_ -match "wsh|weavenote"
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

# ---- PHASE 2: Remove all matching images ----
Write-Host "[2/6] Removing all WSH/WeaveNote Docker images..." -ForegroundColor Yellow

$images = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object {
    $_ -match "wsh|weavenote"
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

# ---- PHASE 3: Remove all matching volumes ----
Write-Host "[3/6] Removing all WSH/WeaveNote Docker volumes..." -ForegroundColor Yellow

$volumes = docker volume ls --format "{{.Name}}" | Where-Object {
    $_ -match "wsh|weavenote"
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

# ---- PHASE 4: Remove all matching networks ----
Write-Host "[4/6] Removing all WSH/WeaveNote Docker networks..." -ForegroundColor Yellow

$networks = docker network ls --format "{{.Name}}" | Where-Object {
    $_ -match "wsh|weavenote|default" -and $_ -ne "bridge" -and $_ -ne "host" -and $_ -ne "none"
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
Write-Host "[5/6] Pruning dangling Docker resources..." -ForegroundColor Yellow
docker system prune -f 2>$null | Out-Null
docker builder prune -f 2>$null | Out-Null
Write-Host "  [OK] Docker pruned" -ForegroundColor Green

if ($CleanOnly) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  CLEAN COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# ---- PHASE 6: Build and start ----
Write-Host "[6/6] Building WeaveNote from scratch (no cache)..." -ForegroundColor Yellow
Write-Host ""

$buildArgs = @("compose", "build", "--no-cache")
if ($Port -ne 3000) {
    $env:WSH_PORT = $Port
}

& docker @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Docker build failed!" -ForegroundColor Red
    Write-Host "Check the build output above for errors." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Starting WeaveNote..." -ForegroundColor Yellow
docker compose up -d --force-recreate

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Docker start failed!" -ForegroundColor Red
    exit 1
}

# ---- Show logs ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  WEAVENOTE INSTALLED SUCCESSFULLY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL:      http://localhost:$Port" -ForegroundColor White
Write-Host "  Logs:     docker compose logs -f weavenote" -ForegroundColor DarkGray
Write-Host "  Stop:     docker compose down" -ForegroundColor DarkGray
Write-Host "  Nuke:     .\install.ps1" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Watching startup logs (Ctrl+C to stop)..." -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 2
docker compose logs -f weavenote
