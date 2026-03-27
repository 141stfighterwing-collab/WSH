#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet("app", "script", "daemon")]
    [string]$Mode = "app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH - Weavenote Self Hosted v2.4.0" -ForegroundColor Cyan
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

# Function to check if tables exist
function Test-TablesExist {
    Push-Location /app
    $checkScript = @'
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function main() {
    try {
        await client.connect();
        const result = await client.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");
        console.log(result.rows[0].count > 0 ? 'EXISTS' : 'NOT_EXISTS');
        process.exit(0);
    } catch (e) {
        console.log('ERROR:', e.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}
main();
'@
    $checkScript | Out-File -FilePath "/tmp/check-tables.js" -Encoding utf8 -Force
    $result = node /tmp/check-tables.js 2>&1 | Out-String
    Pop-Location
    return $result -match "EXISTS"
}

# Check if tables already exist
Write-Host "Checking if database tables already exist..." -ForegroundColor Yellow
$tablesExist = Test-TablesExist

if ($tablesExist) {
    Write-Host "Database tables already exist!" -ForegroundColor Green
} else {
    Write-Host "Tables do not exist, attempting schema creation..." -ForegroundColor Yellow
    
    # PRIORITY 1: Use Node.js JSON Schema Injector (Most reliable)
    $schemaPushed = $false
    
    if (Test-Path "/app/inject-schema.js") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "PRIMARY: Using JSON Schema Injector" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        
        Push-Location /app
        $injectResult = & node /app/inject-schema.js --verbose 2>&1 | Out-String
        Write-Host $injectResult -ForegroundColor Gray
        Pop-Location
        
        if ($injectResult -match "completed successfully") {
            $schemaPushed = $true
            Write-Host "JSON Schema injection succeeded!" -ForegroundColor Green
        }
    }
    
    # PRIORITY 2: Try Prisma db push as fallback
    if (-not $schemaPushed) {
        Write-Host ""
        Write-Host "JSON injection failed, trying Prisma db push..." -ForegroundColor Yellow
        
        Push-Location /app
        for ($i = 1; $i -le 3; $i++) {
            Write-Host "Attempt $i/3: Running prisma db push..." -ForegroundColor Yellow
            
            $prismaOutput = & npx prisma db push --accept-data-loss --skip-generate 2>&1 | Out-String
            
            Write-Host "=== PRISMA OUTPUT ===" -ForegroundColor Cyan
            Write-Host $prismaOutput -ForegroundColor Gray
            Write-Host "=== END PRISMA OUTPUT ===" -ForegroundColor Cyan
            
            if ($LASTEXITCODE -eq 0 -or $prismaOutput -match "already in sync" -or $prismaOutput -match "success" -or $prismaOutput -match "pushed") {
                $schemaPushed = $true
                Write-Host "Prisma schema push succeeded!" -ForegroundColor Green
                break
            }
            
            Write-Host "Prisma failed with exit code: $LASTEXITCODE" -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
        Pop-Location
    }
    
    # PRIORITY 3: Try PowerShell inject script
    if (-not $schemaPushed) {
        if (Test-Path "/scripts/inject-schema.ps1") {
            Write-Host ""
            Write-Host "Trying PowerShell inject-schema.ps1..." -ForegroundColor Yellow
            & pwsh -NoProfile -File /scripts/inject-schema.ps1 -VerboseOutput
        }
    }
    
    # PRIORITY 4: Inline table creation as last resort
    if (-not $schemaPushed) {
        Write-Host ""
        Write-Host "All methods failed. Using inline table creation as last resort..." -ForegroundColor Yellow
        
        Push-Location /app
        $inlineScript = @'
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

const createTableSQL = [
    `CREATE TABLE IF NOT EXISTS "users" (
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
    )`,
    `CREATE TABLE IF NOT EXISTS "folders" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "order" INTEGER DEFAULT 0,
        "userId" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "notes" (
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
        "folderId" UUID,
        "userId" UUID NOT NULL,
        "isDeleted" BOOLEAN DEFAULT false,
        "deletedAt" TIMESTAMP,
        "isSynthesized" BOOLEAN DEFAULT false,
        "accessCount" INTEGER DEFAULT 0,
        "wordCount" INTEGER DEFAULT 0,
        "projectData" JSONB,
        "attachments" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" VARCHAR(255) NOT NULL,
        "actor" VARCHAR(255) NOT NULL,
        "target" VARCHAR(255),
        "details" TEXT,
        "timestamp" TIMESTAMP DEFAULT NOW(),
        "userId" UUID NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "system_config" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR(255) UNIQUE NOT NULL,
        "value" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "script_executions" (
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
        "userId" UUID,
        "metadata" JSONB
    )`,
    `CREATE TABLE IF NOT EXISTS "scheduled_tasks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "scriptPath" VARCHAR(500) NOT NULL,
        "cron" VARCHAR(100) NOT NULL,
        "enabled" BOOLEAN DEFAULT true,
        "lastRun" TIMESTAMP,
        "nextRun" TIMESTAMP,
        "lastStatus" VARCHAR(50),
        "parameters" JSONB,
        "userId" UUID
    )`
];

async function main() {
    try {
        await client.connect();
        console.log('Connected to database');
        
        for (const sql of createTableSQL) {
            try {
                await client.query(sql);
                const match = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/);
                console.log('Created table:', match ? match[1] : 'unknown');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('Table already exists, skipping');
                } else {
                    console.error('Error:', e.message);
                }
            }
        }
        
        console.log('Schema injection complete!');
        process.exit(0);
    } catch (e) {
        console.error('Fatal:', e.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
'@
        $inlineScript | Out-File -FilePath "/tmp/inline-create.js" -Encoding utf8 -Force
        $result = node /tmp/inline-create.js 2>&1 | Out-String
        Write-Host $result -ForegroundColor Gray
        Pop-Location
    }
    
    # Final verification
    Write-Host ""
    Write-Host "Verifying tables were created..." -ForegroundColor Yellow
    $finalCheck = Test-TablesExist
    if ($finalCheck) {
        Write-Host "SUCCESS: Database tables verified!" -ForegroundColor Green
    } else {
        Write-Warning "WARNING: Could not verify tables exist. App may fail."
    }
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
        Write-Host "TO FIX DATABASE ISSUES:" -ForegroundColor Yellow
        Write-Host "  docker exec -it wsh-app node /app/inject-schema.js --drop" -ForegroundColor Gray
        Write-Host "  docker exec -it wsh-app pwsh /scripts/db-fix-tool.ps1" -ForegroundColor Gray
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
