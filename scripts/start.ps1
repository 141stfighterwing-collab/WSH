#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet("app", "script", "daemon")]
    [string]$Mode = "app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH - Weavenote Self Hosted v3.1.0" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Set database URL from environment or default
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"
}

# Parse database connection info
$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$DbPassword = "wsh_secure_password"

Write-Host "Database URL: $($env:DATABASE_URL -replace 'password[^@]*', 'password=****')" -ForegroundColor Gray

# Wait for database to be ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxDbWait = 60
$dbWaited = 0
$dbReady = $false

while ($dbWaited -lt $maxDbWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($DbHost, $DbPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($wait) {
            try { $tcp.EndConnect($connect) } catch {}
            $tcp.Close()
            $dbReady = $true
            Write-Host "PostgreSQL is reachable!" -ForegroundColor Green
            break
        }
        $tcp.Close()
    } catch {}
    
    $dbWaited += 2
    Write-Host "  Waiting for database... ($dbWaited/$maxDbWait seconds)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Warning "Database connection timeout after $maxDbWait seconds"
}

# Give PostgreSQL extra time to finish initialization
Write-Host "Giving PostgreSQL 5 seconds to complete initialization..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Database connection string for psql
$PsqlConn = "postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}"

# Function to check if tables exist
function Test-TablesExist {
    try {
        $result = & psql $PsqlConn -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';" 2>$null
        $count = ($result | Where-Object { $_ -match '^\d' } | ForEach-Object { $_.Trim() }) -as [int]
        return $count -gt 0
    } catch {
        return $false
    }
}

# Function to create tables using direct SQL
function Invoke-CreateTablesSQL {
    Write-Host "Creating tables using direct SQL..." -ForegroundColor Yellow
    
    $sqlFile = "/tmp/create-tables.sql"
    
    @"
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) DEFAULT 'user',
    "permission" VARCHAR(50) DEFAULT 'edit',
    "status" VARCHAR(50) DEFAULT 'active',
    "lastLogin" TIMESTAMP,
    "aiUsageCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Folders table
CREATE TABLE IF NOT EXISTS "folders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "order" INTEGER DEFAULT 0,
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS "notes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "rawContent" TEXT,
    "category" VARCHAR(50) DEFAULT 'QUICK',
    "type" VARCHAR(50) DEFAULT 'quick',
    "tags" TEXT[] DEFAULT '{}',
    "color" VARCHAR(50) DEFAULT 'yellow',
    "textColor" VARCHAR(50),
    "backgroundColor" VARCHAR(50),
    "folderId" UUID REFERENCES "folders"("id") ON DELETE SET NULL,
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "isDeleted" BOOLEAN DEFAULT false,
    "deletedAt" TIMESTAMP,
    "isSynthesized" BOOLEAN DEFAULT false,
    "accessCount" INTEGER DEFAULT 0,
    "wordCount" INTEGER DEFAULT 0,
    "projectData" JSONB,
    "attachments" TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "action" VARCHAR(255) NOT NULL,
    "actor" VARCHAR(255) NOT NULL,
    "target" VARCHAR(255),
    "details" TEXT,
    "timestamp" TIMESTAMP DEFAULT NOW(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);

-- System config table
CREATE TABLE IF NOT EXISTS "system_config" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "key" VARCHAR(255) UNIQUE NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Script executions table
CREATE TABLE IF NOT EXISTS "script_executions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "scriptName" VARCHAR(255) NOT NULL,
    "scriptPath" VARCHAR(500) NOT NULL,
    "parameters" JSONB,
    "status" VARCHAR(50) DEFAULT 'pending',
    "startTime" TIMESTAMP DEFAULT NOW(),
    "endTime" TIMESTAMP,
    "duration" INTEGER,
    "output" TEXT,
    "error" TEXT,
    "exitCode" INTEGER,
    "retryCount" INTEGER DEFAULT 0,
    "triggeredBy" VARCHAR(50),
    "userId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "metadata" JSONB
);

-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS "scheduled_tasks" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "scriptPath" VARCHAR(500) NOT NULL,
    "cron" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "lastRun" TIMESTAMP,
    "nextRun" TIMESTAMP,
    "lastStatus" VARCHAR(50),
    "parameters" JSONB,
    "userId" UUID REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_userId ON "notes"("userId");
CREATE INDEX IF NOT EXISTS idx_notes_folderId ON "notes"("folderId");
CREATE INDEX IF NOT EXISTS idx_folders_userId ON "folders"("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON "audit_logs"("userId");
"@ | Out-File -FilePath $sqlFile -Encoding utf8 -Force

    try {
        $result = & psql $PsqlConn -f $sqlFile 2>&1
        Write-Host $result -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "SQL Error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to verify tables
function Invoke-VerifyTables {
    Write-Host "Verifying tables..." -ForegroundColor Yellow
    
    try {
        $tables = & psql $PsqlConn -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" 2>$null
        Write-Host "Tables found:" -ForegroundColor Green
        $tables | ForEach-Object { 
            $t = $_.Trim()
            if ($t) { Write-Host "  - $t" -ForegroundColor White }
        }
        return $true
    } catch {
        Write-Host "Verification error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to create default admin user
function New-DefaultAdminUser {
    Write-Host "Checking for default admin user..." -ForegroundColor Yellow
    
    try {
        # Check if admin exists
        $exists = & psql $PsqlConn -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@wsh.local';" 2>$null
        $count = ($exists | Where-Object { $_ -match '^\d' } | ForEach-Object { $_.Trim() }) -as [int]
        
        if ($count -gt 0) {
            Write-Host "Admin user already exists" -ForegroundColor Green
            return $true
        }
        
        Write-Host "Creating default admin user..." -ForegroundColor Yellow
        
        # Bcrypt hash for password 'admin123' (generated with cost 10)
        # This is a valid bcrypt hash for 'admin123'
        $hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
        
        $createSQL = @"
INSERT INTO users (id, email, username, password, role, permission, status, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'admin@wsh.local',
    'Admin',
    '$hashedPassword',
    'super-admin',
    'edit',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;
"@
        
        $result = & psql $PsqlConn -c $createSQL 2>&1
        Write-Host "Insert result: $result" -ForegroundColor Gray
        
        # Verify user was created
        $verify = & psql $PsqlConn -t -c "SELECT email, username, role FROM users WHERE email = 'admin@wsh.local';" 2>$null
        Write-Host "Admin user created: $verify" -ForegroundColor Green
        
        return $true
    } catch {
        Write-Host "Error creating admin user: $_" -ForegroundColor Red
        return $false
    }
}

# Check if tables already exist
Write-Host "Checking if database tables already exist..." -ForegroundColor Yellow
$tablesExist = Test-TablesExist

if ($tablesExist) {
    Write-Host "Database tables already exist!" -ForegroundColor Green
    Invoke-VerifyTables
} else {
    Write-Host "Tables do not exist, attempting schema creation..." -ForegroundColor Yellow
    
    # Create tables using SQL
    $sqlResult = Invoke-CreateTablesSQL
    
    # Verify tables
    Invoke-VerifyTables
}

# Create default admin user
Write-Host ""
New-DefaultAdminUser

# Apply user updates (admin password = 123456, Shootre = SUPER ADMIN)
Write-Host ""
Write-Host "Applying user updates..." -ForegroundColor Yellow

# Update admin password to 123456
$adminPasswordHash = '$2a$10$OWGz9bmMQaFSv5AqB5UihuRmlzpH6xiPr1WxnPdzVyomRAF3kV6AS'
$UpdateAdmin = & psql $PsqlConn -c "UPDATE users SET password = '$adminPasswordHash', \"updatedAt\" = NOW() WHERE email = 'admin@wsh.local';" 2>&1
Write-Host "  Admin password updated to '123456'" -ForegroundColor Green

# Set Shootre to SUPER ADMIN
$UpdateShootre = & psql $PsqlConn -c "UPDATE users SET role = 'super-admin', \"updatedAt\" = NOW() WHERE username = 'Shootre' OR email LIKE '%shootre%';" 2>&1
Write-Host "  Shootre set to SUPER ADMIN" -ForegroundColor Green

# Final verification - show user count
Write-Host ""
Write-Host "Final verification:" -ForegroundColor Cyan
$userCount = & psql $PsqlConn -t -c "SELECT COUNT(*) FROM users;" 2>$null
Write-Host "  Users in database: $(($userCount | Where-Object { $_ -match '^\d' } | ForEach-Object { $_.Trim() }))" -ForegroundColor White

# Start the application
switch ($Mode) {
    "app" {
        Write-Host ""
        
        # Start Database Viewer in background
        Write-Host "Starting Database Viewer on port 5682..." -ForegroundColor Green
        if (Test-Path "/app/db-viewer.js") {
            Start-Process -FilePath "node" -ArgumentList "/app/db-viewer.js" -NoNewWindow
            Write-Host "  Database Viewer: http://localhost:5682" -ForegroundColor Gray
        }
        
        Write-Host "Starting WSH Application on port 3000..." -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "AVAILABLE SERVICES:" -ForegroundColor Cyan
        Write-Host "  App:         http://localhost:3000" -ForegroundColor White
        Write-Host "  DB Viewer:   http://localhost:5682" -ForegroundColor White
        Write-Host "  Health:      http://localhost:8080" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "DEFAULT LOGIN:" -ForegroundColor Yellow
        Write-Host "  Email:       admin@wsh.local" -ForegroundColor White
        Write-Host "  Password:    123456" -ForegroundColor White
        Write-Host ""
        
        Push-Location /app
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
        Write-Host "Starting daemon mode with health server..." -ForegroundColor Green
        & node server.js &
        Start-Sleep -Seconds 5
        while ($true) {
            Start-Sleep -Seconds 60
            Write-Host "Health check: $(Get-Date -Format 'o')"
        }
    }
}
