#!/usr/bin/env pwsh
<#
.SYNOPSIS
    WSH Database Schema Injector - PowerShell Version
    Reads JSON schema and creates PostgreSQL tables

.DESCRIPTION
    This script reads the tables.json schema file and creates all required
    database tables for WSH application. Use this when Prisma db push fails.

.PARAMETER Drop
    Drop existing tables before creating new ones (CASCADE)

.PARAMETER Verbose
    Show detailed SQL statements being executed

.PARAMETER DatabaseUrl
    PostgreSQL connection string (default: from DATABASE_URL env var)

.EXAMPLE
    ./inject-schema.ps1 -Drop -Verbose
    Drops all tables and recreates with verbose output

.EXAMPLE
    ./inject-schema.ps1
    Creates missing tables without dropping existing ones
#>

param(
    [switch]$Drop,
    [switch]$VerboseOutput,
    [string]$DatabaseUrl = $env:DATABASE_URL
)

# Default connection string
if (-not $DatabaseUrl) {
    $DatabaseUrl = "postgresql://wsh:wsh123@postgres:5432/wshdb"
}

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Parse DATABASE_URL
function Parse-ConnectionString {
    param([string]$connStr)
    
    # Parse: postgresql://user:pass@host:port/dbname
    if ($connStr -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
        return @{
            User = $matches[1]
            Password = $matches[2]
            Host = $matches[3]
            Port = $matches[4]
            Database = $matches[5]
        }
    }
    
    # Parse without port: postgresql://user:pass@host/dbname
    if ($connStr -match "postgresql://([^:]+):([^@]+)@([^/]+)/(.+)") {
        return @{
            User = $matches[1]
            Password = $matches[2]
            Host = $matches[3]
            Port = "5432"
            Database = $matches[4]
        }
    }
    
    throw "Invalid DATABASE_URL format"
}

# Execute SQL via psql
function Invoke-SQL {
    param(
        [string]$SQL,
        $ConnInfo
    )
    
    $env:PGPASSWORD = $ConnInfo.Password
    
    $result = & psql -h $ConnInfo.Host -p $ConnInfo.Port -U $ConnInfo.User -d $ConnInfo.Database -c $SQL 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "SQL execution failed: $result"
    }
    
    return $result
}

# Load JSON Schema
function Get-Schema {
    $schemaPath = Join-Path $PSScriptRoot ".." "schema" "tables.json"
    
    if (-not (Test-Path $schemaPath)) {
        throw "Schema file not found at $schemaPath"
    }
    
    $content = Get-Content $schemaPath -Raw
    return $content | ConvertFrom-Json
}

# Generate CREATE TABLE SQL
function New-CreateTableSQL {
    param($TableName, $TableDef)
    
    $columns = @()
    
    foreach ($col in $TableDef.columns) {
        $colDef = "`"$($col.name)`" $($col.type)"
        
        if ($col.primary) {
            $colDef += " PRIMARY KEY"
        }
        
        if ($col.default) {
            $colDef += " DEFAULT $($col.default)"
        }
        
        if (-not $col.nullable -and -not $col.primary) {
            $colDef += " NOT NULL"
        }
        
        if ($col.unique -and -not $col.primary) {
            $colDef += " UNIQUE"
        }
        
        $columns += "  $colDef"
    }
    
    $sql = "CREATE TABLE IF NOT EXISTS `"$TableName`" ("
    $sql += [Environment]::NewLine + ($columns -join ",`n")
    $sql += [Environment]::NewLine + ");"
    
    return $sql
}

# Generate index SQL
function New-IndexSQL {
    param($TableName, $TableDef)
    
    $statements = @()
    
    if ($TableDef.indexes) {
        foreach ($idx in $TableDef.indexes) {
            $unique = if ($idx.unique) { "UNIQUE " } else { "" }
            $cols = ($idx.columns | ForEach-Object { "`"$_`"" }) -join ", "
            $statements += "CREATE ${unique}INDEX IF NOT EXISTS `"$($idx.name)`" ON `"$TableName`" ($cols);"
        }
    }
    
    return $statements
}

# Generate foreign key SQL
function New-ForeignKeySQL {
    param($TableName, $TableDef)
    
    $statements = @()
    
    if ($TableDef.foreignKeys) {
        foreach ($fk in $TableDef.foreignKeys) {
            $cols = ($fk.columns | ForEach-Object { "`"$_`"" }) -join ", "
            $refCols = ($fk.refColumns | ForEach-Object { "`"$_`"" }) -join ", "
            
            $statements += "ALTER TABLE `"$TableName`" DROP CONSTRAINT IF EXISTS `"$($fk.name)`";"
            $statements += "ALTER TABLE `"$TableName`" ADD CONSTRAINT `"$($fk.name)`" FOREIGN KEY ($cols) REFERENCES `"$($fk.references)`"($refCols) ON DELETE $($fk.onDelete);"
        }
    }
    
    return $statements
}

# Generate DROP TABLE SQL
function New-DropSQL {
    param($Schema)
    
    $tables = [array]$Schema.tableOrder
    [array]::Reverse($tables)
    
    return $tables | ForEach-Object { "DROP TABLE IF EXISTS `"$_`" CASCADE;" }
}

# Main
Write-ColorOutput Cyan "========================================"
Write-ColorOutput Cyan "  WSH Database Schema Injector (PS1)"
Write-ColorOutput Cyan "========================================"
Write-Output ""

try {
    # Load schema
    Write-ColorOutput Blue "[1/5] Loading JSON schema..."
    $schema = Get-Schema
    Write-ColorOutput Green "      Found $(($schema.tables.PSObject.Properties).Count) tables"
    
    if ($VerboseOutput) {
        Write-Output "      Tables: $($schema.tableOrder -join ', ')"
    }
    
    # Parse connection
    Write-ColorOutput Blue "[2/5] Parsing database connection..."
    $connInfo = Parse-ConnectionString -connStr $DatabaseUrl
    Write-ColorOutput Green "      Host: $($connInfo.Host):$($connInfo.Port)"
    Write-ColorOutput Green "      Database: $($connInfo.Database)"
    Write-ColorOutput Green "      User: $($connInfo.User)"
    
    # Drop tables if requested
    if ($Drop) {
        Write-ColorOutput Yellow "[3/5] Dropping existing tables (CASCADE)..."
        $dropStatements = New-DropSQL -Schema $schema
        
        foreach ($stmt in $dropStatements) {
            if ($VerboseOutput) { Write-Output "      $stmt" }
            Invoke-SQL -SQL $stmt -ConnInfo $connInfo | Out-Null
        }
        Write-ColorOutput Green "      Tables dropped"
    } else {
        Write-Output "[3/5] Skipping drop (-Drop not specified)"
    }
    
    # Create tables
    Write-ColorOutput Blue "[4/5] Creating tables..."
    foreach ($tableName in $schema.tableOrder) {
        $tableDef = $schema.tables.$tableName
        
        # Check if table exists
        $checkSQL = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$tableName')"
        $result = Invoke-SQL -SQL $checkSQL -ConnInfo $connInfo
        
        if ($result -match "t" -and -not $Drop) {
            Write-ColorOutput Yellow "      Table `"$tableName`" already exists - skipping"
            continue
        }
        
        $createSQL = New-CreateTableSQL -TableName $tableName -TableDef $tableDef
        
        if ($VerboseOutput) {
            Write-Output "      Creating: $tableName"
            Write-Output $createSQL
        }
        
        Invoke-SQL -SQL $createSQL -ConnInfo $connInfo | Out-Null
        Write-ColorOutput Green "      ✓ Created table: $tableName"
    }
    
    # Create indexes
    Write-ColorOutput Blue "[4.5/5] Creating indexes..."
    foreach ($tableName in $schema.tableOrder) {
        $tableDef = $schema.tables.$tableName
        $indexStatements = New-IndexSQL -TableName $tableName -TableDef $tableDef
        
        foreach ($stmt in $indexStatements) {
            if ($VerboseOutput) { Write-Output "      $stmt" }
            Invoke-SQL -SQL $stmt -ConnInfo $connInfo | Out-Null
        }
        
        if ($indexStatements.Count -gt 0) {
            Write-ColorOutput Green "      ✓ Created $($indexStatements.Count) indexes for $tableName"
        }
    }
    
    # Create foreign keys
    Write-ColorOutput Blue "[4.7/5] Creating foreign keys..."
    foreach ($tableName in $schema.tableOrder) {
        $tableDef = $schema.tables.$tableName
        $fkStatements = New-ForeignKeySQL -TableName $tableName -TableDef $tableDef
        
        foreach ($stmt in $fkStatements) {
            if ($VerboseOutput) { Write-Output "      $stmt" }
            Invoke-SQL -SQL $stmt -ConnInfo $connInfo | Out-Null
        }
        
        if ($fkStatements.Count -gt 0) {
            Write-ColorOutput Green "      ✓ Created foreign keys for $tableName"
        }
    }
    
    # Verify
    Write-ColorOutput Blue "[5/5] Verifying tables..."
    $listSQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    $result = Invoke-SQL -SQL $listSQL -ConnInfo $connInfo
    
    Write-ColorOutput Green "      Tables in database:"
    Write-Output $result
    
    Write-Output ""
    Write-ColorOutput Green "========================================"
    Write-ColorOutput Green "  Schema injection completed successfully!"
    Write-ColorOutput Green "========================================"
    
} catch {
    Write-Output ""
    Write-ColorOutput Red "========================================"
    Write-ColorOutput Red "  ERROR: Schema injection failed!"
    Write-ColorOutput Red "========================================"
    Write-ColorOutput Red "  $($_.Exception.Message)"
    
    if ($VerboseOutput) {
        Write-ColorOutput Red $_.ScriptStackTrace
    }
    
    exit 1
} finally {
    $env:PGPASSWORD = $null
}
