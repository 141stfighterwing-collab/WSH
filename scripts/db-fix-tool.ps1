#!/usr/bin/env pwsh
# WSH Database Fix Tool - Interactive Database Management
# Usage: pwsh /scripts/db-fix-tool.ps1

param(
    [Parameter(Position=0)]
    [ValidateSet("menu", "list-tables", "show-schema", "create-tables", "restart-db", "psql", "status")]
    [string]$Action = "menu"
)

$ErrorActionPreference = "Continue"

# Configuration
$env:DATABASE_URL = "postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"
$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$DbPass = "wsh_secure_password"

function Write-Header {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "WSH Database Fix Tool" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-DatabaseConnection {
    Write-Host "Testing database connection..." -ForegroundColor Yellow
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($DbHost, $DbPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
        if ($wait) {
            try { $tcp.EndConnect($connect) } catch {}
            $tcp.Close()
            Write-Host "[OK] Database is reachable at ${DbHost}:${DbPort}" -ForegroundColor Green
            return $true
        }
        $tcp.Close()
        Write-Host "[FAIL] Cannot reach database at ${DbHost}:${DbPort}" -ForegroundColor Red
        return $false
    } catch {
        Write-Host "[FAIL] Connection error: $_" -ForegroundColor Red
        return $false
    }
}

function Get-TableList {
    Write-Host ""
    Write-Host "=== DATABASE TABLES ===" -ForegroundColor Cyan
    
    Push-Location /app
    $script = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `;
        
        if (tables.length === 0) {
            console.log('NO TABLES FOUND IN DATABASE');
        } else {
            console.log('Found', tables.length, 'tables:');
            tables.forEach(t => console.log('  -', t.table_name, '(' + t.column_count + ' columns)'));
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

main().finally(() => prisma.$disconnect());
'@
    $script | Out-File -FilePath "/tmp/list-tables.js" -Encoding utf8 -Force
    node /tmp/list-tables.js 2>&1
    Pop-Location
    Write-Host ""
}

function Get-TableSchema {
    param([string]$TableName = "users")
    
    Write-Host ""
    Write-Host "=== TABLE SCHEMA: $TableName ===" -ForegroundColor Cyan
    
    Push-Location /app
    $script = @"
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.\`$queryRaw\`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '${TableName}'
            ORDER BY ordinal_position
        `;
        
        if (columns.length === 0) {
            console.log('Table "${TableName}" not found or has no columns');
        } else {
            console.log('Columns for table "${TableName}":');
            console.log('');
            columns.forEach(c => {
                console.log('  ' + c.column_name.padEnd(25) + ' ' + c.data_type.padEnd(20) + ' ' + (c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL') + ' ' + (c.column_default || ''));
            });
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

main().finally(() => prisma.\`$disconnect\`);
"@
    $script | Out-File -FilePath "/tmp/show-schema.js" -Encoding utf8 -Force
    node /tmp/show-schema.js 2>&1
    Pop-Location
    Write-Host ""
}

function Invoke-CreateTables {
    Write-Host ""
    Write-Host "=== CREATING ALL TABLES ===" -ForegroundColor Cyan
    
    Push-Location /app
    
    # SQL statements
    $sqlStatements = @{
        "users" = @"
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
)
"@
        "notes" = @"
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
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
)
"@
        "folders" = @"
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
)
"@
        "audit_logs" = @"
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    target TEXT,
    details TEXT,
    timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL
)
"@
        "system_config" = @"
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
)
"@
        "script_executions" = @"
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
)
"@
        "scheduled_tasks" = @"
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
)
"@
    }
    
    $executor = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

const sql = process.argv[2];
async function main() {
    try {
        await prisma.$executeRawUnsafe(sql);
        console.log('SUCCESS');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('ALREADY EXISTS');
        } else {
            console.error('ERROR:', e.message);
        }
    }
}

main().finally(() => prisma.$disconnect());
'@
    $executor | Out-File -FilePath "/tmp/exec-sql.js" -Encoding utf8 -Force
    
    $created = 0
    $skipped = 0
    $failed = 0
    
    foreach ($table in $sqlStatements.Keys) {
        Write-Host "Creating table: $table" -NoNewline
        $sql = $sqlStatements[$table] -replace '"', '\"'
        $result = node /tmp/exec-sql.js $sql 2>&1
        
        if ($result -match "SUCCESS") {
            Write-Host " [CREATED]" -ForegroundColor Green
            $created++
        } elseif ($result -match "ALREADY") {
            Write-Host " [EXISTS]" -ForegroundColor Yellow
            $skipped++
        } else {
            Write-Host " [FAILED: $result]" -ForegroundColor Red
            $failed++
        }
    }
    
    Pop-Location
    
    Write-Host ""
    Write-Host "Summary: $created created, $skipped already existed, $failed failed" -ForegroundColor Cyan
    Write-Host ""
}

function Start-PSQL {
    Write-Host ""
    Write-Host "=== PSQL SHELL ===" -ForegroundColor Cyan
    Write-Host "Connecting to: postgresql://${DbUser}:****@${DbHost}:${DbPort}/${DbName}" -ForegroundColor Gray
    Write-Host "Type \q to exit" -ForegroundColor Gray
    Write-Host ""
    
    # Check if psql is available
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($psql) {
        & psql "postgresql://${DbUser}:${DbPass}@${DbHost}:${DbPort}/${DbName}"
    } else {
        Write-Host "psql not installed. Using Node.js SQL shell instead." -ForegroundColor Yellow
        Write-Host "Enter SQL commands (type 'exit' to quit):" -ForegroundColor Gray
        
        Push-Location /app
        while ($true) {
            Write-Host "SQL> " -NoNewline -ForegroundColor Green
            $sql = Read-Host
            
            if ($sql -eq "exit" -or $sql -eq "quit" -or $sql -eq "\q") {
                break
            }
            
            if ($sql.Trim() -eq "") { continue }
            
            $exec = @'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const sql = process.argv[2];
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW')) {
            const result = await prisma.$queryRawUnsafe(sql);
            console.log(JSON.stringify(result, null, 2));
        } else {
            await prisma.$executeRawUnsafe(sql);
            console.log('OK - Command executed');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

main().finally(() => prisma.$disconnect());
'@
            $exec | Out-File -FilePath "/tmp/sql-shell.js" -Encoding utf8 -Force
            node /tmp/sql-shell.js $sql 2>&1
        }
        Pop-Location
    }
}

function Restart-Database {
    Write-Host ""
    Write-Host "=== RESTARTING DATABASE ===" -ForegroundColor Cyan
    Write-Host "This will restart the PostgreSQL container and recreate the schema." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Gray
    Write-Host "  1. Restart container only (keeps data)" -ForegroundColor Gray
    Write-Host "  2. Reset database (WARNING: deletes all data)" -ForegroundColor Gray
    Write-Host "  3. Cancel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Choice: " -NoNewline
    $choice = Read-Host
    
    switch ($choice) {
        "1" {
            Write-Host "Restarting postgres container..." -ForegroundColor Yellow
            docker restart wsh-postgres 2>&1
            Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            Test-DatabaseConnection
            Invoke-CreateTables
        }
        "2" {
            Write-Host "Stopping containers..." -ForegroundColor Yellow
            docker stop wsh-app wsh-postgres 2>&1
            Write-Host "Removing database volume..." -ForegroundColor Yellow
            docker volume rm wsh_postgres_data 2>&1
            Write-Host "Starting containers..." -ForegroundColor Yellow
            docker start wsh-postgres 2>&1
            Start-Sleep -Seconds 10
            Test-DatabaseConnection
            Invoke-CreateTables
        }
        default {
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    }
}

function Show-Menu {
    Write-Header
    Write-Host "Database Connection:" -ForegroundColor Yellow
    Write-Host "  Host: $DbHost" -ForegroundColor Gray
    Write-Host "  Port: $DbPort" -ForegroundColor Gray
    Write-Host "  Database: $DbName" -ForegroundColor Gray
    Write-Host "  User: $DbUser" -ForegroundColor Gray
    Write-Host ""
    
    Test-DatabaseConnection
    Write-Host ""
    
    Write-Host "OPTIONS:" -ForegroundColor Cyan
    Write-Host "  1. List all tables" -ForegroundColor White
    Write-Host "  2. Show table schema (users)" -ForegroundColor White
    Write-Host "  3. Show table schema (notes)" -ForegroundColor White
    Write-Host "  4. Show table schema (all tables)" -ForegroundColor White
    Write-Host "  5. CREATE ALL TABLES (fix schema)" -ForegroundColor Green
    Write-Host "  6. Open PSQL shell" -ForegroundColor White
    Write-Host "  7. Restart database" -ForegroundColor Yellow
    Write-Host "  8. Show database status" -ForegroundColor White
    Write-Host "  Q. Quit" -ForegroundColor White
    Write-Host ""
    Write-Host "Choice: " -NoNewline -ForegroundColor Green
    
    $choice = Read-Host
    
    switch ($choice.ToUpper()) {
        "1" { Get-TableList }
        "2" { Get-TableSchema -TableName "users" }
        "3" { Get-TableSchema -TableName "notes" }
        "4" { 
            Get-TableSchema -TableName "users"
            Get-TableSchema -TableName "notes"
            Get-TableSchema -TableName "folders"
            Get-TableSchema -TableName "audit_logs"
            Get-TableSchema -TableName "system_config"
            Get-TableSchema -TableName "script_executions"
            Get-TableSchema -TableName "scheduled_tasks"
        }
        "5" { Invoke-CreateTables }
        "6" { Start-PSQL }
        "7" { Restart-Database }
        "8" { Show-Status }
        "Q" { Write-Host "Goodbye!"; exit 0 }
        default { Write-Host "Invalid choice" -ForegroundColor Red }
    }
    
    # Loop back to menu
    Write-Host "Press Enter to continue..." -ForegroundColor Gray
    Read-Host | Out-Null
    Show-Menu
}

function Show-Status {
    Write-Host ""
    Write-Host "=== DATABASE STATUS ===" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Container Status:" -ForegroundColor Yellow
    docker ps -a --filter "name=wsh" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
    
    Write-Host ""
    Write-Host "Connection Test:" -ForegroundColor Yellow
    Test-DatabaseConnection
    
    Write-Host ""
    Write-Host "Tables:" -ForegroundColor Yellow
    Get-TableList
}

# Main execution
switch ($Action) {
    "menu" { Show-Menu }
    "list-tables" { Write-Header; Get-TableList }
    "show-schema" { Write-Header; Get-TableSchema -TableName "users" }
    "create-tables" { Write-Header; Invoke-CreateTables }
    "restart-db" { Write-Header; Restart-Database }
    "psql" { Write-Header; Start-PSQL }
    "status" { Write-Header; Show-Status }
}
