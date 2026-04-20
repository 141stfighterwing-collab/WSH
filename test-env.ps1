# WSH — ENV Persistence Test Script (PowerShell) v4.3.8
#
# Validates the full lifecycle of environment variable persistence:
#   1. Health check
#   2. Login & JWT auth
#   3. Save test API key via POST /api/admin/env
#   4. Verify key is active in memory via GET /api/synthesis
#   5. Verify key exists on disk (runtime.env in container)
#   6. Soft restart the app container
#   7. Verify key persists after restart
#
# Usage:
#   .\test-env.ps1
#   $env:ADMIN_USER="admin"; $env:ADMIN_PASS="admin123"; .\test-env.ps1
#   $env:ADMIN_USER="admin"; $env:ADMIN_PASS="admin123"; $env:TEST_KEY="sk-test-12345"; .\test-env.ps1
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed

$ErrorActionPreference = "SilentlyContinue"

# ── Configuration ────────────────────────────────────────────────────────────
$Port = if ($env:WSH_PORT) { $env:WSH_PORT } else { "8883" }
$BaseUrl = "http://localhost:$Port"
$AdminUser = if ($env:ADMIN_USER) { $env:ADMIN_USER } else { "admin" }
$AdminPass = if ($env:ADMIN_PASS) { $env:ADMIN_PASS } else { "admin123" }
$TestKey = if ($env:TEST_KEY) { $env:TEST_KEY } else { "sk-test-key-for-validation-$(Get-Random)" }
$TestEnvKey = "OPENAI_API_KEY"

$PassCount = 0
$FailCount = 0
$WarnCount = 0

# ── Helpers ─────────────────────────────────────────────────────────────────
function Pass-Test([string]$Msg) {
    $script:PassCount++
    Write-Host "  [PASS] $Msg" -ForegroundColor Green
}
function Fail-Test([string]$Msg) {
    $script:FailCount++
    Write-Host "  [FAIL] $Msg" -ForegroundColor Red
}
function Warn-Test([string]$Msg) {
    $script:WarnCount++
    Write-Host "  [WARN] $Msg" -ForegroundColor Yellow
}
function Info-Test([string]$Msg) {
    Write-Host "  [INFO] $Msg" -ForegroundColor Cyan
}
function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host "── $Title ──" -ForegroundColor White
}

# ── Pre-flight ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  WSH - ENV Persistence Test v4.3.8" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Info-Test "Base URL:  $BaseUrl"
Info-Test "Admin:     $AdminUser"
Info-Test "Test Key:  $($TestKey.Substring(0, [Math]::Min(20, $TestKey.Length)))..."
Info-Test "Test ENV:  $TestEnvKey"
Write-Host ""

# Check Docker is running
$dockerCheck = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Fail-Test "Docker is not running"
    exit 1
}
Pass-Test "Docker is running"

# Check container is running
$runningContainers = docker ps --format "{{.Names}}" 2>$null
if ($runningContainers -notcontains "weavenote-app") {
    Fail-Test "weavenote-app container is not running. Start with: docker compose up -d"
    exit 1
}
Pass-Test "weavenote-app container is running"

# ── Test 1: Health Check ────────────────────────────────────────────────────
Write-Section "Test 1: Health Check"

try {
    $healthJson = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 10 -ErrorAction Stop
    Pass-Test "Health endpoint responded"

    if ($healthJson.version) {
        Info-Test "Version: $($healthJson.version)"
        Pass-Test "Version detected: $($healthJson.version)"
    } else {
        Warn-Test "Could not parse version from health response"
    }

    if ($healthJson.database.status -eq "connected" -or $healthJson.database.status -eq "connected_no_tables") {
        Pass-Test "Database: $($healthJson.database.status)"
    } else {
        Warn-Test "Database status: $($healthJson.database.status)"
    }
} catch {
    Fail-Test "Health endpoint unreachable at $BaseUrl/api/health"
    Write-Host "  Run: docker compose up -d; Start-Sleep 15"
    exit 1
}

# ── Test 2: Login ───────────────────────────────────────────────────────────
Write-Section "Test 2: Login & JWT Authentication"

$loginBody = @{ username = $AdminUser; password = $AdminPass } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/admin/users/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
    $JwtToken = $loginResponse.token
    $UserRole = $loginResponse.user.role

    if (-not $JwtToken) {
        Fail-Test "No JWT token in login response"
        exit 1
    }
    Pass-Test "Login successful"
    Info-Test "JWT token: $($JwtToken.Substring(0, [Math]::Min(30, $JwtToken.Length)))..."

    if ($UserRole -eq "admin" -or $UserRole -eq "super-admin") {
        Pass-Test "User role: $UserRole (has admin access)"
    } else {
        Fail-Test "User role '$UserRole' does not have admin access. Need 'admin' or 'super-admin'."
        exit 1
    }
} catch {
    $errBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    $errMsg = if ($errBody.error) { $errBody.error } else { $_.Exception.Message }
    Fail-Test "Login failed: $errMsg"
    exit 1
}

# ── Test 3: Check Current AI Status ────────────────────────────────────────
Write-Section "Test 3: Check Current AI Provider Status"

try {
    $synthResponse = Invoke-RestMethod -Uri "$BaseUrl/api/synthesis" -Headers @{ Authorization = "Bearer $JwtToken" } -TimeoutSec 10 -ErrorAction Stop
    Pass-Test "Synthesis endpoint responded"
    $currentOpenai = $synthResponse.available.openai
    Info-Test "Current OPENAI availability: $currentOpenai"
} catch {
    Fail-Test "Synthesis endpoint not reachable"
}

# ── Test 4: Save Test API Key ───────────────────────────────────────────────
Write-Section "Test 4: Save Test API Key via POST /api/admin/env"

$saveBody = @{ key = $TestEnvKey; value = $TestKey } | ConvertTo-Json
try {
    $saveResponse = Invoke-RestMethod -Uri "$BaseUrl/api/admin/env" -Method Post -Body $saveBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $JwtToken" } -TimeoutSec 10 -ErrorAction Stop
    if ($saveResponse.success) {
        Pass-Test "API key saved successfully"
        if ($saveResponse.persisted) {
            Pass-Test "Key persisted to disk (runtime.env)"
        } else {
            Warn-Test "Key saved to memory but persistence flag not confirmed"
        }
    } else {
        Fail-Test "Failed to save key: $($saveResponse.error)"
    }
} catch {
    $errBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    $errMsg = if ($errBody.error) { $errBody.error } else { $_.Exception.Message }
    Fail-Test "Failed to save key: $errMsg"
}

# ── Test 5: Verify Key Active in Memory ────────────────────────────────────
Write-Section "Test 5: Verify Key Active in Memory (GET /api/synthesis)"

try {
    $synthAfter = Invoke-RestMethod -Uri "$BaseUrl/api/synthesis" -Headers @{ Authorization = "Bearer $JwtToken" } -TimeoutSec 10 -ErrorAction Stop
    $openaiNow = $synthAfter.available.openai
    if ($openaiNow) {
        Pass-Test "OPENAI_API_KEY is now active in memory"
    } else {
        Fail-Test "OPENAI_API_KEY not detected after save (got: $openaiNow)"
    }
} catch {
    Fail-Test "Synthesis endpoint not reachable after save"
}

# ── Test 6: Verify Key on Disk (runtime.env) ───────────────────────────────
Write-Section "Test 6: Verify Key Persisted on Disk (runtime.env in container)"

$diskContents = docker exec weavenote-app cat /app/tmp/env/runtime.env 2>$null
if (-not $diskContents) {
    Warn-Test "runtime.env file not found or empty inside container"
    Warn-Test "The volume may not be mounted yet. This is OK on first use."
} else {
    if ($diskContents -match "$TestEnvKey") {
        Pass-Test "runtime.env contains $TestEnvKey"
    } else {
        Fail-Test "$TestEnvKey not found in runtime.env"
    }

    if ($diskContents -match "sk-test-key-for-validation") {
        Pass-Test "runtime.env contains the test key value"
    } else {
        $keyLine = ($diskContents -split "`n" | Where-Object { $_ -match "^$TestEnvKey=" } | Select-Object -First 1)
        if ($keyLine) {
            Pass-Test "Key line found: $($keyLine.Trim())"
        } else {
            Warn-Test "Test key value not found in runtime.env"
        }
    }
}

# ── Test 7: Soft Restart ────────────────────────────────────────────────────
Write-Section "Test 7: Soft Restart Container"

Write-Host "  Restarting weavenote-app..." -ForegroundColor Gray
docker compose restart weavenote 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Pass-Test "Container restart command executed"
} else {
    Fail-Test "Container restart command failed"
}

Write-Host "  Waiting for container to become healthy..." -ForegroundColor Gray
Start-Sleep -Seconds 5
$retries = 0
$maxRetries = 24
$healthy = $false
while ($retries -lt $maxRetries) {
    $health = docker inspect --format='{{.State.Health.Status}}' weavenote-app 2>$null
    if ($health -eq "healthy") {
        $healthy = $true
        break
    }
    $retries++
    if ($retries -eq $maxRetries) { break }
    Start-Sleep -Seconds 5
}

if ($healthy) {
    Pass-Test "Container is healthy after restart"
} else {
    Warn-Test "Container health check not passing yet (may still be starting)"
}

Start-Sleep -Seconds 3
try {
    $null = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 10 -ErrorAction Stop
    Pass-Test "HTTP health endpoint responding after restart"
} catch {
    Warn-Test "HTTP health endpoint not ready yet after restart"
}

# ── Test 8: Re-login and Verify Key Persisted ──────────────────────────────
Write-Section "Test 8: Verify Key Persisted After Restart"

$loginBody2 = @{ username = $AdminUser; password = $AdminPass } | ConvertTo-Json
try {
    $loginAfter = Invoke-RestMethod -Uri "$BaseUrl/api/admin/users/login" -Method Post -Body $loginBody2 -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
    $JwtAfter = $loginAfter.token
    if ($JwtAfter) {
        Pass-Test "Re-login successful after restart"

        $synthFinal = Invoke-RestMethod -Uri "$BaseUrl/api/synthesis" -Headers @{ Authorization = "Bearer $JwtAfter" } -TimeoutSec 10 -ErrorAction Stop
        $openaiFinal = $synthFinal.available.openai
        if ($openaiFinal) {
            Pass-Test "OPENAI_API_KEY PERSISTS after container restart"
        } else {
            Fail-Test "OPENAI_API_KEY lost after restart (persistence not working)"
        }
    } else {
        Fail-Test "No JWT token received after restart"
    }
} catch {
    Fail-Test "Login failed after restart"
}

# ── Test 9: Check runtime.env Still on Disk ────────────────────────────────
Write-Section "Test 9: Verify runtime.env Still on Disk After Restart"

$diskAfter = docker exec weavenote-app cat /app/tmp/env/runtime.env 2>$null
if (-not $diskAfter) {
    Fail-Test "runtime.env is missing after restart (volume not persisting)"
} else {
    if ($diskAfter -match "$TestEnvKey") {
        Pass-Test "runtime.env still contains $TestEnvKey after restart"
    } else {
        Fail-Test "$TestEnvKey lost from runtime.env after restart"
    fi
}

# ── Test 10: Admin ENV GET Endpoint ────────────────────────────────────────
Write-Section "Test 10: Admin ENV GET Endpoint"

try {
    $envGet = Invoke-RestMethod -Uri "$BaseUrl/api/admin/env" -Headers @{ Authorization = "Bearer $JwtAfter" } -TimeoutSec 10 -ErrorAction Stop
    $envOpenai = $envGet.env.OPENAI_API_KEY
    if ($envOpenai -eq "configured") {
        Pass-Test "Admin ENV endpoint confirms OPENAI_API_KEY is configured"
    } elseif ($envOpenai -eq "not set") {
        Fail-Test "Admin ENV endpoint says OPENAI_API_KEY is 'not set'"
    } else {
        Warn-Test "Unexpected OPENAI_API_KEY status: $envOpenai"
    }
} catch {
    Fail-Test "GET /api/admin/env returned no response"
}

# ── Cleanup: Remove Test Key ────────────────────────────────────────────────
Write-Section "Cleanup: Remove Test Key"

$cleanupBody = @{ key = $TestEnvKey; value = "" } | ConvertTo-Json
try {
    $cleanupResponse = Invoke-RestMethod -Uri "$BaseUrl/api/admin/env" -Method Post -Body $cleanupBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $JwtAfter" } -TimeoutSec 10 -ErrorAction Stop
    if ($cleanupResponse.success) {
        Pass-Test "Test key cleared (set to empty string)"
    } else {
        Warn-Test "Could not clear test key (may need manual cleanup)"
    }
} catch {
    Warn-Test "Cleanup request failed (test key may still be set)"
}

# ── Summary ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Passed:   $PassCount" -ForegroundColor Green
Write-Host "  Failed:   $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Warnings: $WarnCount" -ForegroundColor Yellow
Write-Host ""

if ($FailCount -eq 0) {
    Write-Host "  ALL TESTS PASSED" -ForegroundColor Green -BackgroundColor Black
    Write-Host ""
    Write-Host "  The ENV persistence system is working correctly." -ForegroundColor Gray
    Write-Host "  API keys saved via Settings > AI Engine will survive container restarts." -ForegroundColor Gray
} else {
    Write-Host "  $FailCount TEST(S) FAILED" -ForegroundColor Red -BackgroundColor Black
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check wsh-env volume: docker volume inspect wsh_wsh-env" -ForegroundColor Gray
    Write-Host "  2. Check container logs: docker compose logs weavenote --tail 50" -ForegroundColor Gray
    Write-Host "  3. Check entrypoint logs: docker compose logs weavenote | Select-String 'persistent|runtime.env'" -ForegroundColor Gray
    Write-Host "  4. Manual volume check: docker exec weavenote-app ls -la /app/tmp/env/" -ForegroundColor Gray
    Write-Host "  5. If volume is empty, try: docker compose down; docker compose up -d" -ForegroundColor Gray
}
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($FailCount -gt 0) { exit 1 }
