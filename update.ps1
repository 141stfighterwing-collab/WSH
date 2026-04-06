#!/usr/bin/env pwsh
# WSH - One-Command Update
# Pulls latest changes from GitHub and rebuilds the app inside the container.
# Your database and notes are preserved — only the app code changes.
#
# Usage:  .\update.ps1
#         .\update.ps1 -Branch develop

param(
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.ForegroundColor = "Cyan"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSH Update v3.9.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check container is running
$running = docker inspect -f '{{.State.Running}}' weavenote-app 2>$null
if ($running -ne "true") {
    Write-Host "[ERROR] WSH container is not running!" -ForegroundColor Red
    Write-Host "  Start it first:  docker compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/3] Triggering update inside container..." -ForegroundColor Yellow

# Method 1: Touch the update marker and restart (triggers git pull + rebuild)
docker exec weavenote-app sh -c "touch /app/tmp/.needs-update" 2>$null
if ($LASTEXITCODE -ne 0) {
    # Fallback: Use WSH_UPDATE env to force update on restart
    Write-Host "  Using WSH_UPDATE=true method..." -ForegroundColor DarkGray
    docker compose stop weavenote
    docker compose up -d -e WSH_UPDATE=true
} else {
    docker restart weavenote-app
}

Write-Host "[2/3] Waiting for rebuild (this takes 1-2 minutes)..." -ForegroundColor Yellow
Write-Host "  Watch progress:  docker compose logs -f weavenote" -ForegroundColor DarkGray
Write-Host ""

# Poll health endpoint
$waitSeconds = 120
$checked = 0
while ($checked -lt $waitSeconds) {
    Start-Sleep -Seconds 5
    $checked += 5
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($health.StatusCode -eq 200) {
            Write-Host "[3/3] Update complete! App is healthy." -ForegroundColor Green
            Write-Host ""
            Write-Host "  App: http://localhost:3000" -ForegroundColor Cyan
            $body = $health.Content | ConvertFrom-Json
            Write-Host "  Version: $($body.version)" -ForegroundColor Cyan
            Write-Host ""
            exit 0
        }
    } catch {
        Write-Host "  ... still building (${checked}s)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "[WARN] Update taking longer than expected." -ForegroundColor Yellow
Write-Host "  Check logs:  docker compose logs --tail 50 weavenote" -ForegroundColor Yellow
exit 1
