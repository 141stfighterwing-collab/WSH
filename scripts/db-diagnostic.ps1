#!/usr/bin/env pwsh
# WSH Database Diagnostic Script
# Diagnoses database connectivity, schema status, and application health

param(
    [switch]$Fix,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH Database Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public" }
$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$AppPort = 3000

# 1. Check Network Connectivity
Write-Host "[1/7] Checking network connectivity..." -ForegroundColor Yellow

function Test-Port {
    param($HostName, $Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
        if ($wait) {
            try { $tcp.EndConnect($connect) } catch {}
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

$dbReachable = Test-Port -HostName $DbHost -Port $DbPort
if ($dbReachable) {
    Write-Host "  [OK] Database port $DbHost`:$DbPort is reachable" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Cannot reach database at $DbHost`:$DbPort" -ForegroundColor Red
    Write-Host "  Check if postgres container is running: docker ps" -ForegroundColor Yellow
}

# 2. Check PostgreSQL Connection via psql
Write-Host ""
Write-Host "[2/7] Checking PostgreSQL connection..." -ForegroundColor Yellow

$psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlAvailable) {
    $psqlTest = & psql "postgresql://$DbUser`:wsh_secure_password@$DbHost`:$DbPort/$DbName" -c "SELECT 1 as test;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] PostgreSQL connection successful" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] PostgreSQL connection failed: $psqlTest" -ForegroundColor Red
    }
} else {
    Write-Host "  [SKIP] psql not available, using alternative methods" -ForegroundColor Gray
}

# 3. Check Prisma Connection
Write-Host ""
Write-Host "[3/7] Checking Prisma database connection..." -ForegroundColor Yellow

Push-Location /app
$prismaTest = & npx prisma db pull --print 2>&1 | Out-String
Pop-Location

if ($prismaTest -match "model" -or $prismaTest -match "datasource") {
    Write-Host "  [OK] Prisma can connect to database" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Prisma connection issue" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "  Output: $prismaTest" -ForegroundColor Gray
    }
}

# 4. Check Existing Tables
Write-Host ""
Write-Host "[4/7] Checking existing database tables..." -ForegroundColor Yellow

$requiredTables = @("users", "notes", "folders", "audit_logs", "system_config", "script_executions", "scheduled_tasks")
$existingTables = @()
$missingTables = @()

# Use Prisma raw query to check tables
Push-Location /app
$tableCheckScript = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
    try {
        const result = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `;
        console.log(JSON.stringify(result.map(r => r.table_name)));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}
checkTables();
'@

$tableCheckScript | Out-File -FilePath "/tmp/check-tables.js" -Encoding utf8
$tablesJson = node /tmp/check-tables.js 2>&1
Pop-Location

if ($tablesJson -match "^\[") {
    try {
        $existingTables = $tablesJson | ConvertFrom-Json
        Write-Host "  Found tables: $($existingTables -join ', ')" -ForegroundColor Gray
        
        foreach ($table in $requiredTables) {
            if ($existingTables -contains $table) {
                Write-Host "  [OK] Table '$table' exists" -ForegroundColor Green
            } else {
                Write-Host "  [MISSING] Table '$table' does not exist" -ForegroundColor Red
                $missingTables += $table
            }
        }
    } catch {
        Write-Host "  [ERROR] Could not parse table list: $tablesJson" -ForegroundColor Red
    }
} else {
    Write-Host "  [ERROR] Could not check tables: $tablesJson" -ForegroundColor Red
    $missingTables = $requiredTables
}

# 5. Check Application Health Endpoint
Write-Host ""
Write-Host "[5/7] Checking application health endpoint..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:$AppPort/api/health" -TimeoutSec 5 -UseBasicParsing 2>$null
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "  [OK] Health endpoint responding" -ForegroundColor Green
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "  Database: $($healthData.database)" -ForegroundColor Gray
} catch {
    Write-Host "  [FAIL] Health endpoint not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Check Prisma Version and Configuration
Write-Host ""
Write-Host "[6/7] Checking Prisma configuration..." -ForegroundColor Yellow

Push-Location /app
$prismaVersion = & npx prisma --version 2>&1 | Select-String "prisma" | Select-Object -First 1
Pop-Location
Write-Host "  Prisma version: $prismaVersion" -ForegroundColor Gray

$schemaExists = Test-Path "/app/prisma/schema.prisma"
if ($schemaExists) {
    Write-Host "  [OK] Prisma schema file exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Prisma schema file not found!" -ForegroundColor Red
}

# 7. Summary and Fix Option
Write-Host ""
Write-Host "[7/7] Diagnostic Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

if ($missingTables.Count -gt 0) {
    Write-Host ""
    Write-Host "ISSUE DETECTED: Missing tables!" -ForegroundColor Red
    Write-Host "Missing tables: $($missingTables -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    
    if ($Fix) {
        Write-Host "Running database fix..." -ForegroundColor Yellow
        & /scripts/db-inject-schema.ps1
    } else {
        Write-Host "Run with -Fix flag to automatically create missing tables:" -ForegroundColor Yellow
        Write-Host "  pwsh /scripts/db-diagnostic.ps1 -Fix" -ForegroundColor Gray
    }
} else {
    Write-Host "All required tables exist!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostic complete." -ForegroundColor Cyan
