#Requires -Version 7.0
<#
.SYNOPSIS
    WSH Database Maintenance Script
.DESCRIPTION
    Performs database maintenance tasks including cleanup, optimization,
    and backup verification. Uses retry logic and comprehensive logging.
.PARAMETER Mode
    Maintenance mode: 'cleanup', 'optimize', 'backup', 'all'
.PARAMETER DryRun
    Preview changes without executing
.EXAMPLE
    ./wsh_maintenance.ps1 -Mode cleanup -DryRun
#>

[CmdletBinding()]
param(
    [ValidateSet('cleanup', 'optimize', 'backup', 'all')]
    [string]$Mode = 'all',
    
    [switch]$DryRun
)

# ============================================================================
# STRICT MODE AND ERROR HANDLING
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# CONFIGURATION
# ============================================================================

$Config = @{
    LogPath = $env:LOG_PATH ?? '/logs'
    OutputPath = $env:OUTPUT_PATH ?? '/output'
    DatabaseUrl = $env:DATABASE_URL
    MaxRetries = [int]($env:MAX_RETRIES ?? 3)
    RetryDelay = [int]($env:RETRY_DELAY ?? 5)
}

# ============================================================================
# FUNCTIONS
# ============================================================================

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL')]
        [string]$Level = 'INFO',
        [string]$Source = 'Maintenance'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $color = switch ($Level) {
        'DEBUG'    { 'Gray' }
        'INFO'     { 'White' }
        'SUCCESS'  { 'Green' }
        'WARNING'  { 'Yellow' }
        'ERROR'    { 'Red' }
        'CRITICAL' { 'Magenta' }
    }
    
    $icon = switch ($Level) {
        'DEBUG'    { '🔍' }
        'INFO'     { 'ℹ️' }
        'SUCCESS'  { '✅' }
        'WARNING'  { '⚠️' }
        'ERROR'    { '❌' }
        'CRITICAL' { '🔥' }
    }
    
    $logMessage = "[$timestamp] [$Level] [$Source] $Message"
    Write-Host "$icon $logMessage" -ForegroundColor $color
    
    # Write to log file
    $logFile = Join-Path $Config.LogPath 'maintenance.log'
    Add-Content -Path $logFile -Value $logMessage -ErrorAction SilentlyContinue
}

function Invoke-WithRetry {
    param(
        [scriptblock]$Action,
        [string]$ActionName = 'Action',
        [int]$MaxRetries = $Config.MaxRetries,
        [int]$RetryDelay = $Config.RetryDelay
    )
    
    $attempt = 0
    $lastError = $null
    
    while ($attempt -lt $MaxRetries) {
        $attempt++
        try {
            Write-Log "Attempt $attempt of $MaxRetries for: $ActionName" -Level 'DEBUG'
            $result = & $Action
            Write-Log "Success: $ActionName (attempt $attempt)" -Level 'SUCCESS'
            return $result
        }
        catch {
            $lastError = $_
            Write-Log "Attempt $attempt failed for $ActionName`: $($_.Exception.Message)" -Level 'WARNING'
            
            if ($attempt -lt $MaxRetries) {
                $delay = $RetryDelay * $attempt
                Write-Log "Waiting $delay seconds before retry..." -Level 'DEBUG'
                Start-Sleep -Seconds $delay
            }
        }
    }
    
    Write-Log "All retries exhausted for: $ActionName" -Level 'ERROR'
    throw $lastError
}

function Invoke-Cleanup {
    <#
    .SYNOPSIS
        Cleanup old logs and temporary files
    #>
    
    Write-Log "Starting cleanup process..." -Level 'INFO'
    
    $stats = @{
        FilesDeleted = 0
        BytesFreed = 0
        Errors = 0
    }
    
    # Cleanup old log files (older than 30 days)
    $cutoffDate = (Get-Date).AddDays(-30)
    $logFiles = Get-ChildItem -Path $Config.LogPath -Filter '*.log' -ErrorAction SilentlyContinue
    
    foreach ($file in $logFiles) {
        if ($file.LastWriteTime -lt $cutoffDate) {
            if ($DryRun) {
                Write-Log "[DRY RUN] Would delete: $($file.Name)" -Level 'INFO'
            }
            else {
                try {
                    $size = $file.Length
                    Remove-Item $file.FullName -Force
                    $stats.FilesDeleted++
                    $stats.BytesFreed += $size
                    Write-Log "Deleted: $($file.Name)" -Level 'SUCCESS'
                }
                catch {
                    Write-Log "Failed to delete $($file.Name): $($_.Exception.Message)" -Level 'WARNING'
                    $stats.Errors++
                }
            }
        }
    }
    
    Write-Log "Cleanup complete: $($stats.FilesDeleted) files, $([Math]::Round($stats.BytesFreed / 1MB, 2)) MB freed" -Level 'SUCCESS'
    return $stats
}

function Invoke-Optimize {
    <#
    .SYNOPSIS
        Optimize database tables
    #>
    
    Write-Log "Starting database optimization..." -Level 'INFO'
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would run: VACUUM ANALYZE on all tables" -Level 'INFO'
        return @{ Optimized = $true; DryRun = $true }
    }
    
    # Check for psql
    $psqlAvailable = Get-Command 'psql' -ErrorAction SilentlyContinue
    
    if ($psqlAvailable) {
        Invoke-WithRetry -ActionName 'Database VACUUM' -Action {
            # Run VACUUM ANALYZE
            $env:PGPASSWORD = ($Config.DatabaseUrl -split 'password=|:')[1] -split '@')[0]
            $result = psql $Config.DatabaseUrl -c 'VACUUM ANALYZE;' 2>&1
            Write-Log "VACUUM output: $result" -Level 'DEBUG'
            return @{ Optimized = $true; Output = $result }
        }
    }
    else {
        Write-Log "psql not available, skipping database optimization" -Level 'WARNING'
        return @{ Optimized = $false; Reason = 'psql not available' }
    }
}

function Invoke-BackupCheck {
    <#
    .SYNOPSIS
        Verify backup integrity
    #>
    
    Write-Log "Checking backup status..." -Level 'INFO'
    
    $backupPath = Join-Path $Config.OutputPath 'backups'
    $result = @{
        BackupPath = $backupPath
        Exists = Test-Path $backupPath
        LastBackup = $null
        BackupSize = 0
    }
    
    if ($result.Exists) {
        $backups = Get-ChildItem -Path $backupPath -Filter '*.sql' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        
        if ($backups) {
            $result.LastBackup = $backups.LastWriteTime
            $result.BackupSize = $backups.Length
            Write-Log "Last backup: $($backups.Name) at $($backups.LastWriteTime)" -Level 'SUCCESS'
        }
        else {
            Write-Log "No backup files found in $backupPath" -Level 'WARNING'
        }
    }
    else {
        Write-Log "Backup directory does not exist: $backupPath" -Level 'WARNING'
    }
    
    return $result
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Log "========================================" -Level 'INFO'
Write-Log "WSH Database Maintenance" -Level 'INFO'
Write-Log "Mode: $Mode" -Level 'INFO'
Write-Log "DryRun: $DryRun" -Level 'INFO'
Write-Log "========================================" -Level 'INFO'

try {
    $results = @{
        StartTime = Get-Date
        Mode = $Mode
        DryRun = $DryRun
        Cleanup = $null
        Optimize = $null
        Backup = $null
    }
    
    switch ($Mode) {
        'cleanup' {
            $results.Cleanup = Invoke-Cleanup
        }
        'optimize' {
            $results.Optimize = Invoke-Optimize
        }
        'backup' {
            $results.Backup = Invoke-BackupCheck
        }
        'all' {
            $results.Cleanup = Invoke-Cleanup
            $results.Optimize = Invoke-Optimize
            $results.Backup = Invoke-BackupCheck
        }
    }
    
    $results.EndTime = Get-Date
    $results.Duration = $results.EndTime - $results.StartTime
    
    # Export results
    $reportPath = Join-Path $Config.OutputPath "maintenance_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $results | ConvertTo-Json -Depth 10 | Out-File $reportPath -Encoding UTF8
    
    Write-Log "========================================" -Level 'SUCCESS'
    Write-Log "Maintenance completed successfully" -Level 'SUCCESS'
    Write-Log "Duration: $($results.Duration.ToString('mm\:ss'))" -Level 'SUCCESS'
    Write-Log "Report: $reportPath" -Level 'SUCCESS'
    Write-Log "========================================" -Level 'SUCCESS'
    
    exit 0
}
catch {
    Write-Log "CRITICAL ERROR: $($_.Exception.Message)" -Level 'CRITICAL'
    Write-Log $_.ScriptStackTrace -Level 'DEBUG'
    exit 1
}
