# WSH — Soft Restart Script (PowerShell)
# Restarts the WSH application container WITHOUT rebuilding.
# This preserves all runtime environment changes (API keys, settings).
#
# Usage: .\restart.ps1
#        .\restart.ps1 -Logs    (show container logs after restart)

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  WSH - Soft Restart (no rebuild)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Restart just the app container
Write-Host "[1/4] Restarting weavenote-app container..." -ForegroundColor Yellow
docker compose restart weavenote
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to restart container." -ForegroundColor Red
    Write-Host "  Make sure you're in the WSH directory with docker-compose.yml" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Wait for health check
Write-Host "[2/4] Waiting for health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$retries = 0
$maxRetries = 12
while ($retries -lt $maxRetries) {
    $health = docker inspect --format='{{.State.Health.Status}}' weavenote-app 2>$null
    if ($health -eq "healthy") {
        Write-Host "[+] Application is healthy" -ForegroundColor Green
        break
    }
    $retries++
    if ($retries -eq $maxRetries) {
        Write-Host "[!] Health check not passing yet - container is starting up" -ForegroundColor Yellow
        Write-Host "    Check: docker compose logs weavenote --tail 50" -ForegroundColor Yellow
        break
    }
    Start-Sleep -Seconds 5
}
Write-Host ""

# Step 3: Verify version
Write-Host "[3/4] Checking version..." -ForegroundColor Yellow
$port = if ($env:WSH_PORT) { $env:WSH_PORT } else { "8883" }
try {
    $healthJson = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "    Version: $($healthJson.version)" -ForegroundColor Green
} catch {
    Write-Host "    (health endpoint not reachable yet)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Show logs or done
if ($args -contains "-Logs" -or $args -contains "-l" -or $args -contains "--logs") {
    Write-Host "[4/4] Container logs (live):" -ForegroundColor Yellow
    Write-Host "=======================================" -ForegroundColor Cyan
    docker compose logs weavenote --tail 30 -f
} else {
    Write-Host "[4/4] Done. Application restarted." -ForegroundColor Green
    Write-Host ""
    Write-Host "  To view logs:  docker compose logs weavenote --tail 50" -ForegroundColor Gray
    Write-Host "  To follow logs: docker compose logs weavenote -f" -ForegroundColor Gray
    Write-Host "  To rebuild:     .\update.ps1" -ForegroundColor Gray
}
Write-Host ""
