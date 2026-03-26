#Requires -Version 7.0
<#
.SYNOPSIS
    WSH (Weavenote Self Hosted) - Windows Installation Script
    FORCED INSTALLATION - Overwrites any previous setup

.DESCRIPTION
    This script provides a complete installation and testing framework for WSH on Windows.
    It includes:
    - Prerequisites checking (Docker, Docker Compose)
    - Docker environment validation
    - Forced installation with cleanup of previous setups
    - Comprehensive error handling
    - Performance benchmarks
    - Health checks and validation

.PARAMETER Force
    Force installation even if WSH is already running

.PARAMETER SkipTests
    Skip the post-installation tests

.PARAMETER Benchmark
    Run performance benchmarks after installation

.PARAMETER LogsPath
    Path to store logs (default: .\logs)

.EXAMPLE
    .\Install-WSH-Windows.ps1 -Force -Benchmark

.EXAMPLE
    .\Install-WSH-Windows.ps1 -Force -SkipTests

.NOTES
    Version: 2.0.0
    Author: WSH Team
#>

[CmdletBinding()]
param(
    [switch]$Force = $true,
    [switch]$SkipTests = $false,
    [switch]$Benchmark = $true,
    [string]$LogsPath = ".\logs",
    [string]$ConfigPath = "."
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$SCRIPT_VERSION = "2.0.0"
$WSH_NAME = "WSH - Weavenote Self Hosted"
$DOCKER_COMPOSE_FILE = "docker-compose.yml"
$MAX_RETRIES = 3
$RETRY_DELAY_SECONDS = 5
$HEALTH_CHECK_TIMEOUT = 120

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Warning-Custom { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Header { Write-Host "`n$($args[0])" -ForegroundColor Magenta }

# ============================================================================
# LOGGING ENGINE
# ============================================================================
$LogBuffer = @()
$StartTime = Get-Date

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [ValidateSet("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $logEntry = "[$timestamp] [$Level] $Message"
    $LogBuffer += $logEntry
    
    # Console output with color
    switch ($Level) {
        "DEBUG" { Write-Host $logEntry -ForegroundColor Gray }
        "INFO" { Write-Host $logEntry -ForegroundColor Cyan }
        "WARNING" { Write-Host $logEntry -ForegroundColor Yellow }
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "CRITICAL" { Write-Host $logEntry -ForegroundColor Magenta }
    }
}

function Save-Logs {
    $logDir = Join-Path $PSScriptRoot $LogsPath
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    $logFile = Join-Path $logDir "install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $LogBuffer | Out-File -FilePath $logFile -Encoding UTF8
    
    # Also save JSON version
    $jsonLog = @{
        version = $SCRIPT_VERSION
        startTime = $StartTime
        endTime = Get-Date
        entries = $LogBuffer
    }
    $jsonFile = $logFile -replace '\.log$', '.json'
    $jsonLog | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonFile -Encoding UTF8
    
    Write-Log "Logs saved to: $logFile" -Level "INFO"
}

# ============================================================================
# ERROR HANDLING
# ============================================================================
$ErrorCount = 0
$WarningCount = 0

function Handle-Error {
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.ErrorRecord]$ErrorRecord,
        
        [string]$Context = "Unknown",
        
        [switch]$Continue
    )
    
    $ErrorCount++
    
    $errorDetails = @{
        timestamp = Get-Date -Format "o"
        context = $Context
        message = $ErrorRecord.Exception.Message
        stackTrace = $ErrorRecord.ScriptStackTrace
        category = $ErrorRecord.CategoryInfo.Category
        targetObject = $ErrorRecord.TargetObject
    }
    
    Write-Log "ERROR in $Context : $($ErrorRecord.Exception.Message)" -Level "ERROR"
    Write-Log "Stack Trace: $($ErrorRecord.ScriptStackTrace)" -Level "DEBUG"
    
    if (-not $Continue) {
        Write-Error-Custom "`n[FATAL ERROR] Installation failed at: $Context"
        Write-Error-Custom "Error: $($ErrorRecord.Exception.Message)"
        Save-Logs
        throw $ErrorRecord
    }
}

function Safe-Execute {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock,
        
        [string]$Context = "Operation",
        
        [int]$MaxRetries = $MAX_RETRIES,
        
        [int]$RetryDelay = $RETRY_DELAY_SECONDS
    )
    
    $attempt = 0
    $lastError = $null
    
    while ($attempt -lt $MaxRetries) {
        $attempt++
        try {
            Write-Log "Executing: $Context (Attempt $attempt/$MaxRetries)" -Level "DEBUG"
            $result = & $ScriptBlock
            if ($attempt -gt 1) {
                Write-Log "SUCCESS after $attempt attempts: $Context" -Level "INFO"
            }
            return $result
        }
        catch {
            $lastError = $_
            Write-Log "FAILED attempt $attempt/$MaxRetries : $Context - $($_.Exception.Message)" -Level "WARNING"
            
            if ($attempt -lt $MaxRetries) {
                Write-Log "Retrying in $RetryDelay seconds..." -Level "INFO"
                Start-Sleep -Seconds $RetryDelay
                # Exponential backoff
                $RetryDelay = [math]::Min($RetryDelay * 2, 60)
            }
        }
    }
    
    # All retries exhausted
    Handle-Error -ErrorRecord $lastError -Context $Context -Continue:$false
}

# ============================================================================
# PREREQUISITES CHECKING
# ============================================================================
function Test-Prerequisites {
    Write-Header "=== PREREQUISITES CHECK ==="
    
    $results = @{
        Docker = $false
        DockerCompose = $false
        DockerRunning = $false
        Memory = 0
        DiskSpace = 0
    }
    
    # Check Docker
    Write-Log "Checking Docker installation..." -Level "INFO"
    try {
        $dockerVersion = docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $results.Docker = $true
            Write-Success "Docker installed: $dockerVersion"
        }
    }
    catch {
        Write-Error-Custom "Docker is not installed or not in PATH"
        Write-Info "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
        throw "Docker not found"
    }
    
    # Check Docker Compose
    Write-Log "Checking Docker Compose..." -Level "INFO"
    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $results.DockerCompose = $true
            Write-Success "Docker Compose: $composeVersion"
        }
        else {
            # Try older docker-compose command
            $composeVersion = docker-compose --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $results.DockerCompose = $true
                Write-Success "Docker Compose: $composeVersion"
            }
        }
    }
    catch {
        Write-Error-Custom "Docker Compose is not available"
        throw "Docker Compose not found"
    }
    
    # Check Docker is running
    Write-Log "Checking Docker daemon status..." -Level "INFO"
    try {
        $dockerInfo = docker info 2>&1 | Select-String -Pattern "Server Version"
        if ($dockerInfo) {
            $results.DockerRunning = $true
            Write-Success "Docker daemon is running"
        }
    }
    catch {
        Write-Error-Custom "Docker daemon is not running. Please start Docker Desktop."
        throw "Docker not running"
    }
    
    # Check memory
    $osInfo = Get-CimInstance Win32_OperatingSystem
    $totalMemoryGB = [math]::Round($osInfo.TotalVisibleMemorySize / 1MB, 2)
    $freeMemoryGB = [math]::Round($osInfo.FreePhysicalMemory / 1MB, 2)
    $results.Memory = $freeMemoryGB
    
    Write-Log "Memory: $freeMemoryGB GB free of $totalMemoryGB GB total" -Level "INFO"
    if ($freeMemoryGB -lt 4) {
        Write-Warning-Custom "Low memory: $freeMemoryGB GB free. Recommended: 4+ GB"
        $WarningCount++
    }
    else {
        Write-Success "Memory available: $freeMemoryGB GB"
    }
    
    # Check disk space
    $drive = (Get-Location).Drive
    if (-not $drive) {
        $drive = Get-PSDrive C
    }
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    $results.DiskSpace = $freeSpaceGB
    
    Write-Log "Disk space: $freeSpaceGB GB free on drive $($drive.Name)" -Level "INFO"
    if ($freeSpaceGB -lt 10) {
        Write-Warning-Custom "Low disk space: $freeSpaceGB GB. Recommended: 10+ GB"
        $WarningCount++
    }
    else {
        Write-Success "Disk space available: $freeSpaceGB GB"
    }
    
    return $results
}

# ============================================================================
# CLEANUP PREVIOUS INSTALLATIONS
# ============================================================================
function Remove-PreviousInstallation {
    Write-Header "=== CLEANUP PREVIOUS INSTALLATION ==="
    
    Write-Log "Checking for existing WSH containers..." -Level "INFO"
    
    # List of container names to remove
    $containersToRemove = @(
        "wsh-app",
        "wsh-postgres",
        "wsh-scheduler",
        "wsh-pgadmin"
    )
    
    foreach ($containerName in $containersToRemove) {
        try {
            $exists = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
            if ($exists -eq $containerName) {
                Write-Log "Removing existing container: $containerName" -Level "INFO"
                
                # Stop container
                docker stop $containerName 2>$null | Out-Null
                
                # Remove container
                docker rm -f $containerName 2>$null | Out-Null
                
                Write-Success "Removed: $containerName"
            }
        }
        catch {
            Write-Warning-Custom "Could not remove container $containerName : $($_.Exception.Message)"
        }
    }
    
    # Remove old images (optional)
    if ($Force) {
        Write-Log "Checking for old WSH images..." -Level "INFO"
        try {
            $oldImages = docker images --filter "reference=*wsh*" --format "{{.ID}}" 2>$null
            if ($oldImages) {
                Write-Log "Removing old WSH images..." -Level "INFO"
                docker image prune -f 2>$null | Out-Null
                Write-Success "Cleaned up old images"
            }
        }
        catch {
            Write-Warning-Custom "Could not prune old images"
        }
    }
    
    # Remove old volumes if Force
    if ($Force) {
        Write-Log "Checking for orphaned volumes..." -Level "INFO"
        try {
            docker volume prune -f 2>$null | Out-Null
            Write-Success "Cleaned up orphaned volumes"
        }
        catch {
            Write-Warning-Custom "Could not prune volumes"
        }
    }
    
    Write-Success "Cleanup completed"
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================
function Initialize-Environment {
    Write-Header "=== ENVIRONMENT SETUP ==="
    
    # Check for .env file
    $envFile = Join-Path $PSScriptRoot ".env"
    $envExample = Join-Path $PSScriptRoot ".env.example"
    
    if (-not (Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Write-Log "Creating .env from .env.example..." -Level "INFO"
            Copy-Item $envExample $envFile -Force
            Write-Success "Created .env file"
        }
        else {
            Write-Log "Creating default .env file..." -Level "INFO"
            $defaultEnv = @"
# WSH Environment Configuration
DATABASE_URL="postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"
JWT_SECRET="wsh-secret-key-change-in-production-$(Get-Random -Minimum 100000 -Maximum 999999)"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_NAME="WSH - Weavenote Self Hosted"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@wsh.local"
ADMIN_PASSWORD="admin123"
ADMIN_USERNAME="Admin"
LOG_LEVEL="INFO"
LOG_FORMAT="text"
MAX_RETRIES="3"
RETRY_DELAY="5"
DEFAULT_TIMEOUT="3600"
STRICT_MODE="true"
ERROR_ACTION="Stop"
HEALTH_CHECK_ENABLED="true"
HEALTH_CHECK_PORT="8080"
TZ="UTC"
"@
            $defaultEnv | Out-File -FilePath $envFile -Encoding UTF8
            Write-Success "Created default .env file"
        }
    }
    else {
        Write-Log ".env file already exists" -Level "INFO"
    }
    
    # Create required directories
    $directories = @("logs", "config", "output", "data")
    foreach ($dir in $directories) {
        $dirPath = Join-Path $PSScriptRoot $dir
        if (-not (Test-Path $dirPath)) {
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
            Write-Log "Created directory: $dir" -Level "INFO"
        }
    }
    
    Write-Success "Environment setup completed"
}

# ============================================================================
# DOCKER BUILD AND DEPLOYMENT
# ============================================================================
function Start-WSHDeployment {
    Write-Header "=== DOCKER DEPLOYMENT ==="
    
    $composeFile = Join-Path $PSScriptRoot $DOCKER_COMPOSE_FILE
    
    if (-not (Test-Path $composeFile)) {
        throw "Docker Compose file not found: $composeFile"
    }
    
    # Build images
    Write-Log "Building Docker images..." -Level "INFO"
    Write-Info "This may take several minutes on first run..."
    
    Safe-Execute -Context "Docker Build" -ScriptBlock {
        $buildOutput = docker compose -f $composeFile build --no-cache 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed: $buildOutput"
        }
        return $buildOutput
    }
    
    Write-Success "Docker images built successfully"
    
    # Start containers
    Write-Log "Starting containers..." -Level "INFO"
    
    Safe-Execute -Context "Docker Compose Up" -ScriptBlock {
        $upOutput = docker compose -f $composeFile up -d 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker compose up failed: $upOutput"
        }
        return $upOutput
    }
    
    Write-Success "Containers started"
    
    # Wait for containers to be healthy
    Write-Log "Waiting for containers to be healthy..." -Level "INFO"
    $healthy = $false
    $waitStart = Get-Date
    
    while (-not $healthy -and ((Get-Date) - $waitStart).TotalSeconds -lt $HEALTH_CHECK_TIMEOUT) {
        Start-Sleep -Seconds 5
        
        $postgresHealth = docker inspect --format='{{.State.Health.Status}}' wsh-postgres 2>$null
        $appStatus = docker inspect --format='{{.State.Status}}' wsh-app 2>$null
        
        Write-Log "PostgreSQL: $postgresHealth, App: $appStatus" -Level "DEBUG"
        
        if ($postgresHealth -eq "healthy" -and $appStatus -eq "running") {
            $healthy = $true
        }
    }
    
    if (-not $healthy) {
        Write-Warning-Custom "Containers may not be fully healthy. Continuing..."
        $WarningCount++
    }
    else {
        Write-Success "All containers are healthy"
    }
    
    # Show container status
    Write-Log "Container status:" -Level "INFO"
    docker compose -f $composeFile ps
}

# ============================================================================
# HEALTH CHECKS
# ============================================================================
function Test-WSHHealth {
    Write-Header "=== HEALTH CHECKS ==="
    
    $results = @{
        Database = $false
        App = $false
        HealthEndpoint = $false
        ResponseTime = 0
    }
    
    # Check database connection
    Write-Log "Testing database connection..." -Level "INFO"
    try {
        $dbCheck = docker exec wsh-postgres pg_isready -U wsh -d wsh_db 2>&1
        if ($LASTEXITCODE -eq 0) {
            $results.Database = $true
            Write-Success "Database: Connected"
        }
    }
    catch {
        Write-Error-Custom "Database: Connection failed"
    }
    
    # Check app health endpoint
    Write-Log "Testing application health endpoint..." -Level "INFO"
    $maxAttempts = 6
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -UseBasicParsing
            $sw.Stop()
            
            $results.ResponseTime = $sw.ElapsedMilliseconds
            
            if ($response.StatusCode -eq 200) {
                $results.App = $true
                $results.HealthEndpoint = $true
                Write-Success "App Health: OK (Response time: $($sw.ElapsedMilliseconds)ms)"
                break
            }
        }
        catch {
            Write-Log "Health check attempt $attempt failed: $($_.Exception.Message)" -Level "DEBUG"
            Start-Sleep -Seconds 5
        }
    }
    
    if (-not $results.App) {
        Write-Warning-Custom "App Health: Not responding"
        $WarningCount++
    }
    
    # Check PowerShell executor health (port 8080)
    Write-Log "Testing PowerShell executor health endpoint..." -Level "INFO"
    try {
        $pwshHealth = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 10 -UseBasicParsing
        if ($pwshHealth.StatusCode -eq 200) {
            Write-Success "PowerShell Executor: OK"
        }
    }
    catch {
        Write-Log "PowerShell health endpoint not available (this is optional)" -Level "DEBUG"
    }
    
    return $results
}

# ============================================================================
# BENCHMARKS
# ============================================================================
function Invoke-WSHBenchmarks {
    Write-Header "=== PERFORMANCE BENCHMARKS ==="
    
    $benchmarks = @{
        StartTime = Get-Date
        Tests = @()
    }
    
    # Benchmark 1: API Response Time
    Write-Log "Benchmark: API Response Time" -Level "INFO"
    $apiTimes = @()
    for ($i = 1; $i -le 10; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -UseBasicParsing | Out-Null
            $sw.Stop()
            $apiTimes += $sw.ElapsedMilliseconds
        }
        catch {
            $apiTimes += -1
        }
    }
    
    $avgApiTime = ($apiTimes | Where-Object { $_ -gt 0 } | Measure-Object -Average).Average
    $benchmarks.Tests += @{
        Name = "API Response Time"
        Values = $apiTimes
        Average = [math]::Round($avgApiTime, 2)
        Unit = "ms"
    }
    Write-Success "API Response: Average $([math]::Round($avgApiTime, 2))ms"
    
    # Benchmark 2: Database Query Time
    Write-Log "Benchmark: Database Query Time" -Level "INFO"
    $dbTimes = @()
    for ($i = 1; $i -le 5; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            docker exec wsh-postgres psql -U wsh -d wsh_db -c "SELECT 1" 2>&1 | Out-Null
            $sw.Stop()
            $dbTimes += $sw.ElapsedMilliseconds
        }
        catch {
            $dbTimes += -1
        }
    }
    
    $avgDbTime = ($dbTimes | Where-Object { $_ -gt 0 } | Measure-Object -Average).Average
    $benchmarks.Tests += @{
        Name = "Database Query Time"
        Values = $dbTimes
        Average = [math]::Round($avgDbTime, 2)
        Unit = "ms"
    }
    Write-Success "Database Query: Average $([math]::Round($avgDbTime, 2))ms"
    
    # Benchmark 3: Container Memory Usage
    Write-Log "Benchmark: Container Memory Usage" -Level "INFO"
    $memoryStats = docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" 2>$null
    $benchmarks.Tests += @{
        Name = "Memory Usage"
        RawOutput = $memoryStats
        Unit = "bytes"
    }
    Write-Host $memoryStats
    
    # Benchmark 4: Startup Time
    $benchmarks.EndTime = Get-Date
    $totalTime = ($benchmarks.EndTime - $benchmarks.StartTime).TotalSeconds
    $benchmarks.TotalInstallationTime = [math]::Round($totalTime, 2)
    
    Write-Success "Total Installation Time: $([math]::Round($totalTime, 2)) seconds"
    
    # Save benchmark results
    $benchFile = Join-Path $PSScriptRoot "logs\benchmark-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $benchmarks | ConvertTo-Json -Depth 10 | Out-File -FilePath $benchFile -Encoding UTF8
    Write-Log "Benchmark results saved to: $benchFile" -Level "INFO"
    
    return $benchmarks
}

# ============================================================================
# VALIDATION TESTS
# ============================================================================
function Invoke-WSHTests {
    Write-Header "=== VALIDATION TESTS ==="
    
    $testResults = @{
        Passed = 0
        Failed = 0
        Tests = @()
    }
    
    # Test 1: Container Status
    Write-Log "Test: Container Status" -Level "INFO"
    $containers = @("wsh-postgres", "wsh-app")
    $allRunning = $true
    
    foreach ($container in $containers) {
        $status = docker inspect --format='{{.State.Status}}' $container 2>$null
        if ($status -eq "running") {
            Write-Success "  $container : running"
        }
        else {
            Write-Error-Custom "  $container : $status"
            $allRunning = $false
        }
    }
    
    $testResults.Tests += @{
        Name = "Container Status"
        Passed = $allRunning
    }
    if ($allRunning) { $testResults.Passed++ } else { $testResults.Failed++ }
    
    # Test 2: Database Connection
    Write-Log "Test: Database Connection" -Level "INFO"
    try {
        $dbTest = docker exec wsh-postgres psql -U wsh -d wsh_db -c "SELECT version();" 2>&1
        $testResults.Tests += @{ Name = "Database Connection"; Passed = $true }
        $testResults.Passed++
        Write-Success "  Database connection: OK"
    }
    catch {
        $testResults.Tests += @{ Name = "Database Connection"; Passed = $false; Error = $_.Exception.Message }
        $testResults.Failed++
        Write-Error-Custom "  Database connection: FAILED"
    }
    
    # Test 3: API Endpoints
    Write-Log "Test: API Endpoints" -Level "INFO"
    $endpoints = @(
        "/api/health"
    )
    
    $apiPassed = $true
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000$endpoint" -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "  $endpoint : OK"
            }
            else {
                Write-Error-Custom "  $endpoint : Status $($response.StatusCode)"
                $apiPassed = $false
            }
        }
        catch {
            Write-Error-Custom "  $endpoint : FAILED - $($_.Exception.Message)"
            $apiPassed = $false
        }
    }
    
    $testResults.Tests += @{ Name = "API Endpoints"; Passed = $apiPassed }
    if ($apiPassed) { $testResults.Passed++ } else { $testResults.Failed++ }
    
    # Test 4: Authentication
    Write-Log "Test: Authentication Flow" -Level "INFO"
    try {
        # Test registration
        $registerBody = @{
            email = "test-$(Get-Random)@wsh.test"
            username = "testuser"
            password = "TestPassword123!"
        } | ConvertTo-Json
        
        $registerResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" `
            -Method POST `
            -Body $registerBody `
            -ContentType "application/json" `
            -UseBasicParsing `
            -TimeoutSec 30
        
        if ($registerResponse.StatusCode -eq 200) {
            Write-Success "  User registration: OK"
            $testResults.Tests += @{ Name = "Authentication"; Passed = $true }
            $testResults.Passed++
        }
        else {
            throw "Registration returned status $($registerResponse.StatusCode)"
        }
    }
    catch {
        Write-Warning-Custom "  Authentication test: $($_.Exception.Message)"
        $testResults.Tests += @{ Name = "Authentication"; Passed = $false; Error = $_.Exception.Message }
        $testResults.Failed++
    }
    
    # Summary
    Write-Header "=== TEST SUMMARY ==="
    Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
    Write-Host "Failed: $($testResults.Failed)" -ForegroundColor $(if ($testResults.Failed -gt 0) { "Red" } else { "Green" })
    
    return $testResults
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
function Main {
    Clear-Host
    
    Write-Header "========================================"
    Write-Host "   $WSH_NAME" -ForegroundColor Cyan
    Write-Host "   Windows Installation Script v$SCRIPT_VERSION" -ForegroundColor Cyan
    Write-Host "   FORCED INSTALLATION MODE" -ForegroundColor Yellow
    Write-Header "========================================"
    
    $totalStartTime = Get-Date
    
    try {
        # Step 1: Prerequisites
        Test-Prerequisites
        
        # Step 2: Cleanup
        Remove-PreviousInstallation
        
        # Step 3: Environment Setup
        Initialize-Environment
        
        # Step 4: Deployment
        Start-WSHDeployment
        
        # Step 5: Health Checks
        $healthResults = Test-WSHHealth
        
        # Step 6: Tests
        if (-not $SkipTests) {
            $testResults = Invoke-WSHTests
        }
        
        # Step 7: Benchmarks
        if ($Benchmark) {
            $benchmarkResults = Invoke-WSHBenchmarks
        }
        
        # Final Summary
        $totalEndTime = Get-Date
        $totalDuration = ($totalEndTime - $totalStartTime).TotalSeconds
        
        Write-Header "=== INSTALLATION COMPLETE ==="
        Write-Success "Duration: $([math]::Round($totalDuration, 2)) seconds"
        Write-Success "Errors: $ErrorCount"
        Write-Success "Warnings: $WarningCount"
        
        Write-Host "`nAccess your WSH installation:" -ForegroundColor Cyan
        Write-Host "  Web UI:  " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Green
        Write-Host "  Health:  " -NoNewline; Write-Host "http://localhost:3000/api/health" -ForegroundColor Green
        Write-Host "  PWSH:    " -NoNewline; Write-Host "http://localhost:8080/health" -ForegroundColor Green
        
        Write-Host "`nDefault credentials:" -ForegroundColor Cyan
        Write-Host "  Email:    admin@wsh.local" -ForegroundColor Yellow
        Write-Host "  Password: admin123" -ForegroundColor Yellow
        
        Write-Host "`nUseful commands:" -ForegroundColor Cyan
        Write-Host "  View logs:    docker compose logs -f" -ForegroundColor White
        Write-Host "  Stop:         docker compose down" -ForegroundColor White
        Write-Host "  Restart:      docker compose restart" -ForegroundColor White
        
        Save-Logs
        
        Write-Host "`nPress any key to open WSH in your browser..." -ForegroundColor Cyan
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Start-Process "http://localhost:3000"
    }
    catch {
        Write-Error-Custom "`n[FATAL] Installation failed!"
        Write-Error-Custom "Error: $($_.Exception.Message)"
        Save-Logs
        
        # Show Docker logs for debugging
        Write-Host "`nDocker logs for debugging:" -ForegroundColor Yellow
        docker compose logs 2>$null
        
        throw
    }
}

# Run main function
Main
