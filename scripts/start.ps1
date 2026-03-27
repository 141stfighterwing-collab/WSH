#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet("app", "script", "daemon")]
    [string]$Mode = "app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH - Weavenote Self Hosted v2.5.0" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Set database URL from environment or default
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"
}

Write-Host "Database URL: $($env:DATABASE_URL -replace ':([^@]+)@', ':****@')" -ForegroundColor Gray

# Parse database host for TCP check
$DbHost = "postgres"
$DbPort = 5432
if ($env:DATABASE_URL -match '@([^:]+):(\d+)/') {
    $DbHost = $matches[1]
    $DbPort = [int]$matches[2]
}

# Wait for database TCP port
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxDbWait = 30
$dbWaited = 0
$dbReady = $false

while ($dbWaited -lt $maxDbWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($DbHost, $DbPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait) {
            try { $tcp.EndConnect($connect) } catch {}
            $tcp.Close()
            $dbReady = $true
            Write-Host "PostgreSQL is reachable!" -ForegroundColor Green
            break
        }
        $tcp.Close()
    } catch {}
    
    $dbWaited += 1
    Start-Sleep -Seconds 1
}

if (-not $dbReady) {
    Write-Warning "Database connection timeout - proceeding anyway"
}

Start-Sleep -Seconds 2

# Set up database with Prisma
Push-Location /app

Write-Host "Setting up database schema with Prisma..." -ForegroundColor Yellow

# Generate Prisma client first
Write-Host "Generating Prisma client..." -ForegroundColor Gray
& npx prisma generate 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

# Push schema to database
Write-Host "Pushing database schema..." -ForegroundColor Gray
& npx prisma db push --skip-generate --accept-data-loss 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

# Create admin user with pre-hashed password (password: 123456)
# Bcrypt hash for '123456' with cost 10
$adminPasswordHash = '$2a$10$OWGz9bmMQaFSv5AqB5UihuRmlzpH6xiPr1WxnPdzVyomRAF3kV6AS'

Write-Host "Creating admin user..." -ForegroundColor Yellow

$seedScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
  console.log('Admin user ready:', admin.email);
}

main().catch(e => console.error(e)).finally(() => prisma.\$disconnect());
"@

$seedScript | Out-File -FilePath "/tmp/seed.js" -Encoding UTF8 -Force

# Set NODE_PATH to include the app node_modules
$env:NODE_PATH = "/app/node_modules"
& node /tmp/seed.js 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Pop-Location

# Start the application
switch ($Mode) {
    "app" {
        Write-Host ""
        
        # Start Database Viewer in background
        if (Test-Path "/app/db-viewer.js") {
            Write-Host "Starting Database Viewer on port 5682..." -ForegroundColor Green
            Start-Process -FilePath "node" -ArgumentList "/app/db-viewer.js" -NoNewWindow
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "WSH READY!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  App:         http://localhost:3000" -ForegroundColor White
        Write-Host "  DB Viewer:   http://localhost:5682" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Login:" -ForegroundColor Yellow
        Write-Host "  Email:    admin@wsh.local" -ForegroundColor White
        Write-Host "  Password: 123456" -ForegroundColor White
        Write-Host ""
        
        Push-Location /app
        
        # CRITICAL: Set HOST to 0.0.0.0 for Docker
        $env:HOST = "0.0.0.0"
        $env:PORT = "3000"
        
        & node server.js
    }
    "script" {
        $ScriptPath = $env:SCRIPT_PATH
        if (-not $ScriptPath) { 
            Write-Error "SCRIPT_PATH not set"
            exit 1
        }
        & pwsh -NoProfile -File $ScriptPath
    }
    "daemon" {
        $env:HOST = "0.0.0.0"
        & node server.js &
        while ($true) { Start-Sleep -Seconds 60 }
    }
}
