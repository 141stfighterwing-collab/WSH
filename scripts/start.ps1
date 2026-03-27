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

# Parse database connection info from DATABASE_URL environment variable
$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$DbPassword = "wsh_secure_password"

if ($env:DATABASE_URL) {
    try {
        $dbUrl = $env:DATABASE_URL
        if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
            $DbUser = $matches[1]
            $DbPassword = $matches[2]
            $DbHost = $matches[3]
            $DbPort = [int]$matches[4]
            $DbName = $matches[5]
            Write-Host "Parsed DATABASE_URL - Host: $DbHost, DB: $DbName, User: $DbUser" -ForegroundColor Gray
        }
    } catch {
        Write-Host "Warning: Could not parse DATABASE_URL" -ForegroundColor Yellow
    }
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
    Write-Host "  Waiting for database... ($dbWaited/$maxDbWait)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

if (-not $dbReady) {
    Write-Warning "Database connection timeout - proceeding anyway"
}

Start-Sleep -Seconds 2

# Use Prisma to set up database
Write-Host "Setting up database with Prisma..." -ForegroundColor Yellow

Push-Location /app

# Push schema to database (creates tables)
Write-Host "Running prisma db push..." -ForegroundColor Gray
$env:DATABASE_URL | Out-Null
$npxResult = & npx prisma db push --skip-generate 2>&1
Write-Host $npxResult -ForegroundColor Gray

# Create admin user using Node.js
Write-Host "Creating admin user..." -ForegroundColor Yellow

$createAdminScript = @'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@wsh.local';
  const password = process.env.ADMIN_PASSWORD || '123456';
  const username = process.env.ADMIN_USERNAME || 'Admin';
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { 
        password: hashedPassword,
        role: 'super-admin',
        status: 'active'
      },
      create: {
        email,
        username,
        password: hashedPassword,
        role: 'super-admin',
        permission: 'edit',
        status: 'active',
      }
    });
    console.log('Admin user ready:', user.email, 'Role:', user.role);
  } catch (e) {
    console.error('Error creating admin user:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
'@

$createAdminScript | Out-File -FilePath "/tmp/create-admin.js" -Encoding UTF8 -Force
& node /tmp/create-admin.js 2>&1

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
        
        Write-Host "Starting WSH Application on port 3000..." -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "AVAILABLE SERVICES:" -ForegroundColor Cyan
        Write-Host "  App:         http://localhost:3000" -ForegroundColor White
        Write-Host "  DB Viewer:   http://localhost:5682" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "DEFAULT LOGIN:" -ForegroundColor Yellow
        Write-Host "  Email:       admin@wsh.local" -ForegroundColor White
        Write-Host "  Password:    123456" -ForegroundColor White
        Write-Host ""
        
        Push-Location /app
        
        # CRITICAL: Set HOST to 0.0.0.0 for Docker container accessibility
        $env:HOST = "0.0.0.0"
        $env:PORT = "3000"
        
        Write-Host "Starting Node.js server on 0.0.0.0:3000..." -ForegroundColor Gray
        & node server.js
    }
    "script" {
        $ScriptPath = $env:SCRIPT_PATH
        if (-not $ScriptPath) { 
            Write-Error "SCRIPT_PATH environment variable not set"
            exit 1
        }
        Write-Host "Executing script: $ScriptPath" -ForegroundColor Green
        & pwsh -NoProfile -File $ScriptPath
    }
    "daemon" {
        Write-Host "Starting daemon mode..." -ForegroundColor Green
        $env:HOST = "0.0.0.0"
        & node server.js &
        Start-Sleep -Seconds 5
        while ($true) {
            Start-Sleep -Seconds 60
            Write-Host "Health check: $(Get-Date -Format 'o')"
        }
    }
}
