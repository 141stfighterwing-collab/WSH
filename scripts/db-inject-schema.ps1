#!/usr/bin/env pwsh
# WSH Database Schema Injection Script
# Manually creates database tables when Prisma db push fails

param(
    [switch]$Force,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSH Database Schema Injection Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set database URL
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public" }
Write-Host "Database URL: $($env:DATABASE_URL -replace 'password[^@]*', 'password=****')" -ForegroundColor Gray

Push-Location /app

# SQL statements to create all tables
$CreateTableStatements = @(
    # Users table
    @"
-- Users table
CREATE TABLE IF NOT EXISTS users (
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
);
"@,
    # Notes table
    @"
-- Notes table
CREATE TABLE IF NOT EXISTS notes (
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
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notes_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
"@,
    # Folders table
    @"
-- Folders table
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT folders_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
"@,
    # Audit logs table
    @"
-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    target TEXT,
    details TEXT,
    timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT audit_logs_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
"@,
    # System config table
    @"
-- System config table
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
"@,
    # Script executions table
    @"
-- Script executions table
CREATE TABLE IF NOT EXISTS script_executions (
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
);
"@,
    # Scheduled tasks table
    @"
-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
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
);
"@
)

# Create indexes statements
$CreateIndexStatements = @(
    "CREATE INDEX IF NOT EXISTS notes_userId_idx ON notes(\"userId\");",
    "CREATE INDEX IF NOT EXISTS notes_folderId_idx ON notes(\"folderId\");",
    "CREATE INDEX IF NOT EXISTS notes_isDeleted_idx ON notes(\"isDeleted\");",
    "CREATE INDEX IF NOT EXISTS folders_userId_idx ON folders(\"userId\");",
    "CREATE INDEX IF NOT EXISTS audit_logs_userId_idx ON audit_logs(\"userId\");",
    "CREATE INDEX IF NOT EXISTS script_executions_status_idx ON script_executions(status);",
    "CREATE INDEX IF NOT EXISTS script_executions_startTime_idx ON script_executions(\"startTime\");"
)

# Node.js script to execute SQL
$ExecuteSqlScript = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function executeSql(sql) {
    try {
        await prisma.$executeRawUnsafe(sql);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function main() {
    const statements = process.argv.slice(2);
    const results = [];
    
    for (const sql of statements) {
        const result = await executeSql(sql);
        results.push(result);
        if (!result.success) {
            console.error('FAILED:', result.error);
        }
    }
    
    process.exit(results.every(r => r.success) ? 0 : 1);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
'@

# Save the executor script
$ExecuteSqlScript | Out-File -FilePath "/tmp/execute-sql.js" -Encoding utf8

Write-Host ""
Write-Host "Step 1: Creating database tables..." -ForegroundColor Yellow
Write-Host ""

$tablesCreated = 0
$tablesFailed = 0

foreach ($statement in $CreateTableStatements) {
    # Extract table name from statement
    if ($statement -match 'CREATE TABLE IF NOT EXISTS (\w+)') {
        $tableName = $matches[1]
        
        Write-Host "  Creating table: $tableName" -NoNewline
        
        # Write SQL to temp file and execute
        $statement | Out-File -FilePath "/tmp/create-table.sql" -Encoding utf8
        
        $result = node /tmp/execute-sql.js $statement 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
            $tablesCreated++
        } else {
            Write-Host " [FAIL]" -ForegroundColor Red
            if ($Verbose) {
                Write-Host "    Error: $result" -ForegroundColor Gray
            }
            $tablesFailed++
        }
    }
}

Write-Host ""
Write-Host "Step 2: Creating indexes..." -ForegroundColor Yellow
Write-Host ""

$indexesCreated = 0

foreach ($indexSql in $CreateIndexStatements) {
    if ($indexSql -match 'ON (\w+)') {
        $indexTable = $matches[1]
        Write-Host "  Creating index on $indexTable" -NoNewline
        
        $result = node /tmp/execute-sql.js $indexSql 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
            $indexesCreated++
        } else {
            Write-Host " [SKIP]" -ForegroundColor Yellow
        }
    }
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Schema Injection Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tables created: $tablesCreated" -ForegroundColor Green
Write-Host "  Tables failed:  $tablesFailed" -ForegroundColor $(if ($tablesFailed -gt 0) { "Red" } else { "Green" })
Write-Host "  Indexes created: $indexesCreated" -ForegroundColor Green
Write-Host ""

if ($tablesFailed -eq 0) {
    Write-Host "SUCCESS: All tables created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Yellow
    Write-Host "  1. Visit http://localhost:3000" -ForegroundColor Gray
    Write-Host "  2. Register a new account" -ForegroundColor Gray
    Write-Host "  3. Or use default admin if seeded" -ForegroundColor Gray
} else {
    Write-Host "WARNING: Some tables failed to create." -ForegroundColor Yellow
    Write-Host "Check the error messages above and retry." -ForegroundColor Yellow
}

Write-Host ""

# Verify tables exist
Write-Host "Verifying tables..." -ForegroundColor Yellow

$VerifyScript = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `;
    console.log('Tables in database:');
    tables.forEach(t => console.log('  - ' + t.table_name));
}

main().finally(() => prisma.$disconnect());
'@

Push-Location /app
$VerifyScript | Out-File -FilePath "/tmp/verify-tables.js" -Encoding utf8
node /tmp/verify-tables.js 2>&1
Pop-Location

Write-Host ""
