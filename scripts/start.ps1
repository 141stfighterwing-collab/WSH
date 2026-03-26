#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet("app", "script", "daemon")]
    [string]$Mode = "app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH - Weavenote Self Hosted" -ForegroundColor Cyan
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
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
        console.log(result[0].count > 0 ? 'EXISTS' : 'NOT_EXISTS');
        process.exit(0);
    } catch (e) {
        console.log('ERROR:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
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
    
    # Try Prisma db push first
    $schemaPushed = $false
    Push-Location /app
    
    for ($i = 1; $i -le 3; $i++) {
        Write-Host "Attempt $i/3: Running prisma db push..." -ForegroundColor Yellow
        
        # Run prisma db push and capture ALL output
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
    
    # If Prisma failed, use the inject script
    if (-not $schemaPushed) {
        Write-Host ""
        Write-Host "Prisma db push failed. Using fallback schema injection..." -ForegroundColor Yellow
        
        # Check if inject script exists
        if (Test-Path "/scripts/db-inject-schema.ps1") {
            Write-Host "Running db-inject-schema.ps1..." -ForegroundColor Yellow
            & pwsh -NoProfile -File /scripts/db-inject-schema.ps1 -Verbose
        } else {
            Write-Host "Inject script not found at /scripts/db-inject-schema.ps1, creating tables inline..." -ForegroundColor Yellow
            
            Push-Location /app
            $inlineScript = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

const createTableSQL = [
    `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        permission TEXT DEFAULT 'edit',
        status TEXT DEFAULT 'active',
        "lastLogin" TIMESTAMP(3),
        "aiUsageCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        content TEXT,
        "rawContent" TEXT,
        category TEXT DEFAULT 'QUICK',
        type TEXT DEFAULT 'quick',
        tags TEXT[] DEFAULT '{}',
        color TEXT DEFAULT 'yellow',
        "textColor" TEXT,
        "backgroundColor" TEXT,
        "folderId" TEXT,
        "userId" TEXT NOT NULL,
        "isDeleted" BOOLEAN DEFAULT false,
        "deletedAt" TIMESTAMP(3),
        "isSynthesized" BOOLEAN DEFAULT false,
        "accessCount" INTEGER DEFAULT 0,
        "wordCount" INTEGER DEFAULT 0,
        "projectData" JSONB,
        attachments TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        "order" INTEGER DEFAULT 0,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        target TEXT,
        details TEXT,
        timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS system_config (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS script_executions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "scriptName" TEXT NOT NULL,
        "scriptPath" TEXT NOT NULL,
        parameters JSONB,
        status TEXT DEFAULT 'pending',
        "startTime" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "endTime" TIMESTAMP(3),
        duration INTEGER,
        output TEXT,
        error TEXT,
        "exitCode" INTEGER,
        "retryCount" INTEGER DEFAULT 0,
        "triggeredBy" TEXT,
        "userId" TEXT,
        metadata JSONB
    )`,
    `CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        "scriptPath" TEXT NOT NULL,
        cron TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        "lastRun" TIMESTAMP(3),
        "nextRun" TIMESTAMP(3),
        "lastStatus" TEXT,
        parameters JSONB,
        "userId" TEXT
    )`
];

async function main() {
    console.log('Creating tables...');
    for (const sql of createTableSQL) {
        try {
            await prisma.$executeRawUnsafe(sql);
            console.log('Created table successfully');
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
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); }).finally(() => prisma.$disconnect());
'@
            $inlineScript | Out-File -FilePath "/tmp/inline-create.js" -Encoding utf8 -Force
            $result = node /tmp/inline-create.js 2>&1 | Out-String
            Write-Host $result -ForegroundColor Gray
            Pop-Location
        }
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
