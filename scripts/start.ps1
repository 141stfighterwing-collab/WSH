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
Write-Host "Database URL: $($env:DATABASE_URL -replace 'password[^@]*', 'password=****')" -ForegroundColor Gray

# Wait for database to be ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxDbWait = 60
$dbWaited = 0
$dbReady = $false

while ($dbWaited -lt $maxDbWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("postgres", 5432, $null, $null)
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

# Function to check if tables exist using PSQL
function Test-TablesExist {
    try {
        $result = & psql "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';" 2>$null
        return ($result -as [int]) -gt 0
    } catch {
        return $false
    }
}

# Function to create tables using direct SQL
function Invoke-CreateTablesSQL {
    Write-Host "Creating tables using direct SQL..." -ForegroundColor Yellow
    
    $sqlStatements = @'
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
'@

    try {
        # Write SQL to temp file and execute
        $sqlStatements | Out-File -FilePath "/tmp/create-tables.sql" -Encoding utf8 -Force
        $result = & psql "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db" -f "/tmp/create-tables.sql" 2>&1
        Write-Host $result -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "SQL Error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to verify tables using PSQL
function Invoke-VerifyTables {
    Write-Host "Verifying tables..." -ForegroundColor Yellow
    
    try {
        $tables = & psql "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>$null
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

# Check if tables already exist
Write-Host "Checking if database tables already exist..." -ForegroundColor Yellow
$tablesExist = Test-TablesExist

if ($tablesExist) {
    Write-Host "Database tables already exist!" -ForegroundColor Green
    Invoke-VerifyTables
} else {
    Write-Host "Tables do not exist, attempting schema creation..." -ForegroundColor Yellow
    
    # PRIORITY 1: Use direct SQL via psql (most reliable)
    $schemaCreated = $false
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "METHOD 1: Direct SQL via psql" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $sqlResult = Invoke-CreateTablesSQL
    if ($sqlResult) {
        $schemaCreated = $true
        Write-Host "SQL table creation succeeded!" -ForegroundColor Green
    }
    
    # PRIORITY 2: Try Prisma db push as fallback
    if (-not $schemaCreated) {
        Write-Host ""
        Write-Host "SQL failed, trying Prisma db push..." -ForegroundColor Yellow
        
        Push-Location /app
        for ($i = 1; $i -le 3; $i++) {
            Write-Host "Attempt $i/3: Running prisma db push..." -ForegroundColor Yellow
            
            $prismaOutput = & npx prisma db push --accept-data-loss 2>&1 | Out-String
            
            Write-Host "=== PRISMA OUTPUT ===" -ForegroundColor Cyan
            Write-Host $prismaOutput -ForegroundColor Gray
            Write-Host "=== END PRISMA OUTPUT ===" -ForegroundColor Cyan
            
            if ($LASTEXITCODE -eq 0 -or $prismaOutput -match "already in sync" -or $prismaOutput -match "success" -or $prismaOutput -match "pushed") {
                $schemaCreated = $true
                Write-Host "Prisma schema push succeeded!" -ForegroundColor Green
                break
            }
            
            Write-Host "Prisma failed with exit code: $LASTEXITCODE" -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
        Pop-Location
    }
    
    # PRIORITY 3: Try Node.js with pg module
    if (-not $schemaCreated) {
        if (Test-Path "/app/inject-schema.js") {
            Write-Host ""
            Write-Host "Trying Node.js inject-schema.js..." -ForegroundColor Yellow
            
            Push-Location /app
            $injectResult = & node /app/inject-schema.js --verbose 2>&1 | Out-String
            Write-Host $injectResult -ForegroundColor Gray
            Pop-Location
            
            if ($injectResult -match "completed successfully" -or $injectResult -match "Created table") {
                $schemaCreated = $true
                Write-Host "Node.js schema injection succeeded!" -ForegroundColor Green
            }
        }
    }
    
    # Final verification
    Write-Host ""
    Invoke-VerifyTables
    
    if (-not $schemaCreated) {
        Write-Warning "WARNING: Could not verify all tables were created. App may have issues."
    }
}

# Create default admin user if not exists
Write-Host ""
Write-Host "Checking for default admin user..." -ForegroundColor Yellow

$adminExists = & psql "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db" -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@wsh.local';" 2>$null
$adminCount = ($adminExists -as [int])

if ($adminCount -eq 0) {
    Write-Host "Creating default admin user..." -ForegroundColor Yellow
    
    # Generate bcrypt hash for 'admin123' - using Node.js
    $hashScript = @'
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);
'@
    
    try {
        # Try to create admin via Node.js
        $createAdminScript = @'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
    try {
        const existing = await prisma.user.findUnique({ where: { email: 'admin@wsh.local' } });
        if (existing) {
            console.log('Admin already exists');
            return;
        }
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user = await prisma.user.create({
            data: {
                email: 'admin@wsh.local',
                username: 'Admin',
                password: hashedPassword,
                role: 'super-admin',
                permission: 'edit',
                status: 'active'
            }
        });
        console.log('Admin created:', user.email);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
createAdmin();
'@
        
        $createAdminScript | Out-File -FilePath "/tmp/create-admin.js" -Encoding utf8 -Force
        Push-Location /app
        $adminResult = & node /tmp/create-admin.js 2>&1 | Out-String
        Pop-Location
        Write-Host $adminResult -ForegroundColor Gray
    } catch {
        Write-Host "Could not create admin via Node.js, will be created on first login attempt" -ForegroundColor Yellow
    }
} else {
    Write-Host "Admin user already exists" -ForegroundColor Green
}

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
        Write-Host "  Password:    admin123" -ForegroundColor White
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
