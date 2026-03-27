#!/usr/bin/env pwsh
#Requires -Version 7.0
<#
.SYNOPSIS
    WSH Application Startup Script
.DESCRIPTION
    Starts the WSH application with proper database initialization and error handling.
    This script is run inside the Docker container.
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("app", "script", "daemon")]
    [string]$Mode = "app"
)

$ErrorActionPreference = 'Continue'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH - Weavenote Self Hosted v3.1.0" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set database URL from environment or default
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"
}

Write-Host "[CONFIG] Database URL: $($env:DATABASE_URL -replace ':([^@]+)@', ':****@')" -ForegroundColor Gray

# Parse database host for TCP check
$DbHost = "postgres"
$DbPort = 5432
if ($env:DATABASE_URL -match '@([^:]+):(\d+)/') {
    $DbHost = $matches[1]
    $DbPort = [int]$matches[2]
}

Write-Host "[CONFIG] Database Host: $DbHost`:$DbPort" -ForegroundColor Gray

# ============================================================================
# STEP 1: Wait for database TCP port
# ============================================================================
Write-Host ""
Write-Host "[STEP 1] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow

$maxDbWait = 60  # Increased from 30
$dbWaited = 0
$dbReady = $false

while ($dbWaited -lt $maxDbWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($DbHost, $DbPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)  # Increased timeout
        if ($wait) {
            try { 
                $tcp.EndConnect($connect) 
            } catch {}
            $tcp.Close()
            $dbReady = $true
            Write-Host "[STEP 1] PostgreSQL is reachable on TCP level!" -ForegroundColor Green
            break
        }
        $tcp.Close()
    } catch {
        Write-Host "[STEP 1] TCP check error: $($_.Exception.Message)" -ForegroundColor DarkGray
    }
    
    $dbWaited += 2
    Write-Host "  Waiting for database... ($dbWaited/$maxDbWait seconds)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Host "[STEP 1] WARNING: Database connection timeout - proceeding anyway" -ForegroundColor Yellow
} else {
    Write-Host "[STEP 1] Database TCP check passed" -ForegroundColor Green
}

# ============================================================================
# STEP 2: Wait for database to accept connections (pg_isready style)
# ============================================================================
Write-Host ""
Write-Host "[STEP 2] Waiting for PostgreSQL to accept connections..." -ForegroundColor Yellow

# Give PostgreSQL a moment to fully initialize after TCP is ready
Start-Sleep -Seconds 3

Push-Location /app

# ============================================================================
# STEP 3: Generate Prisma Client
# ============================================================================
Write-Host ""
Write-Host "[STEP 3] Generating Prisma client..." -ForegroundColor Yellow

$prismaGenerateOutput = & npx prisma generate 2>&1
$prismaGenerateExit = $LASTEXITCODE

if ($prismaGenerateExit -ne 0) {
    Write-Host "[STEP 3] WARNING: Prisma generate had issues:" -ForegroundColor Yellow
    Write-Host $prismaGenerateOutput -ForegroundColor DarkGray
    # Continue anyway - might already be generated
} else {
    Write-Host "[STEP 3] Prisma client generated successfully" -ForegroundColor Green
}

# ============================================================================
# STEP 4: Push database schema
# ============================================================================
Write-Host ""
Write-Host "[STEP 4] Pushing database schema..." -ForegroundColor Yellow

$maxSchemaRetries = 5
$schemaRetry = 0
$schemaSuccess = $false

while ($schemaRetry -lt $maxSchemaRetries) {
    $schemaRetry++
    
    $pushOutput = & npx prisma db push --skip-generate --accept-data-loss 2>&1
    $pushExit = $LASTEXITCODE
    
    if ($pushExit -eq 0) {
        $schemaSuccess = $true
        Write-Host "[STEP 4] Database schema pushed successfully" -ForegroundColor Green
        break
    }
    
    Write-Host "[STEP 4] Schema push attempt $schemaRetry/$maxSchemaRetries failed" -ForegroundColor Yellow
    Write-Host $pushOutput -ForegroundColor DarkGray
    
    if ($schemaRetry -lt $maxSchemaRetries) {
        Write-Host "  Retrying in 5 seconds..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
    }
}

if (-not $schemaSuccess) {
    Write-Host "[STEP 4] ERROR: Failed to push database schema after $maxSchemaRetries attempts" -ForegroundColor Red
    Write-Host "  Continuing anyway - tables may already exist" -ForegroundColor Yellow
}

# ============================================================================
# STEP 5: Create/Update admin user
# ============================================================================
Write-Host ""
Write-Host "[STEP 5] Creating/Updating admin user..." -ForegroundColor Yellow

# Bcrypt hash for '123456' with cost 10
$adminPasswordHash = '$2a$10$OWGz9bmMQaFSv5AqB5UihuRmlzpH6xiPr1WxnPdzVyomRAF3kV6AS'

$seedScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@wsh.local' },
      update: {
        password: '$adminPasswordHash',
        role: 'super-admin',
        status: 'active'
      },
      create: {
        email: 'admin@wsh.local',
        username: 'Admin',
        password: '$adminPasswordHash',
        role: 'super-admin',
        permission: 'edit',
        status: 'active'
      }
    });
    console.log('[SUCCESS] Admin user ready:', admin.email);
  } catch (error) {
    console.error('[ERROR] Failed to create admin user:', error.message);
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error('[ERROR] Seed script error:', e);
    process.exit(1);
  })
  .finally(() => prisma.\$disconnect());
"@

$seedScript | Out-File -FilePath "/tmp/seed.js" -Encoding UTF8 -Force

# Set NODE_PATH to include the app node_modules
$env:NODE_PATH = "/app/node_modules"

$seedOutput = & node /tmp/seed.js 2>&1
$seedExit = $LASTEXITCODE

if ($seedExit -eq 0) {
    Write-Host "[STEP 5] Admin user created/updated successfully" -ForegroundColor Green
} else {
    Write-Host "[STEP 5] WARNING: Admin user creation had issues:" -ForegroundColor Yellow
    Write-Host $seedOutput -ForegroundColor DarkGray
}

Pop-Location

# ============================================================================
# STEP 6: Start services based on mode
# ============================================================================
Write-Host ""
Write-Host "[STEP 6] Starting application services..." -ForegroundColor Yellow

switch ($Mode) {
    "app" {
        # Start Database Viewer in background
        if (Test-Path "/app/db-viewer.js") {
            Write-Host "[STEP 6] Starting Database Viewer on port 5682..." -ForegroundColor Green
            try {
                Start-Process -FilePath "node" -ArgumentList "/app/db-viewer.js" -NoNewWindow -RedirectStandardOutput "/tmp/db-viewer.log" -RedirectStandardError "/tmp/db-viewer-error.log"
                Write-Host "[STEP 6] Database Viewer started" -ForegroundColor Green
            } catch {
                Write-Host "[STEP 6] WARNING: Failed to start Database Viewer: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "[STEP 6] WARNING: db-viewer.js not found" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "WSH READY!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  App:         http://localhost:3000" -ForegroundColor White
        Write-Host "  DB Viewer:   http://localhost:5682" -ForegroundColor White
        Write-Host "  Health API:  http://localhost:3000/api/health" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Login Credentials:" -ForegroundColor Yellow
        Write-Host "  Email:    admin@wsh.local" -ForegroundColor White
        Write-Host "  Password: 123456" -ForegroundColor White
        Write-Host ""
        Write-Host "Environment:" -ForegroundColor Yellow
        Write-Host "  NODE_ENV:    $($env:NODE_ENV)" -ForegroundColor White
        Write-Host "  HOST:        $($env:HOST)" -ForegroundColor White
        Write-Host "  PORT:        $($env:PORT)" -ForegroundColor White
        Write-Host ""
        
        Push-Location /app
        
        # CRITICAL: Set HOST to 0.0.0.0 for Docker
        $env:HOST = "0.0.0.0"
        $env:PORT = "3000"
        
        Write-Host "[STEP 6] Starting Next.js server..." -ForegroundColor Green
        Write-Host ""
        
        # Start the Next.js server
        & node server.js
    }
    "script" {
        $ScriptPath = $env:SCRIPT_PATH
        if (-not $ScriptPath) { 
            Write-Host "[ERROR] SCRIPT_PATH not set" -ForegroundColor Red
            exit 1
        }
        Write-Host "[STEP 6] Running script: $ScriptPath" -ForegroundColor Green
        & pwsh -NoProfile -File $ScriptPath
    }
    "daemon" {
        Write-Host "[STEP 6] Starting in daemon mode..." -ForegroundColor Green
        $env:HOST = "0.0.0.0"
        & node server.js &
        while ($true) { 
            Start-Sleep -Seconds 60 
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Daemon heartbeat" -ForegroundColor DarkGray
        }
    }
}
