#Requires -Version 7.0
<#
.SYNOPSIS
    Example Script - File Cleanup Task
.DESCRIPTION
    Scheduled task that cleans up old log and output files
    Demonstrates scheduled execution pattern
.PARAMETER DaysToKeep
    Number of days to keep files (default: 30)
.PARAMETER PathsToClean
    Array of paths to clean
.EXAMPLE
    ./example_cleanup.ps1 -DaysToKeep 7 -PathsToClean @('/logs', '/output')
#>

[CmdletBinding()]
param(
    [int]$DaysToKeep = 30,
    [string[]]$PathsToClean = @('/logs', '/output')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $color = switch ($Level) {
        'INFO'    { 'White' }
        'SUCCESS' { 'Green' }
        'WARNING' { 'Yellow' }
        'ERROR'   { 'Red' }
        default   { 'Gray' }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Log "Starting cleanup task..." -Level 'INFO'
Write-Log "Days to keep: $DaysToKeep" -Level 'INFO'
Write-Log "Paths to clean: $($PathsToClean -join ', ')" -Level 'INFO'

$stats = @{
    FilesChecked = 0
    FilesDeleted = 0
    BytesFreed = 0
    Errors = @()
}

$cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
Write-Log "Cutoff date: $($cutoffDate.ToString('yyyy-MM-dd'))" -Level 'INFO'

try {
    foreach ($path in $PathsToClean) {
        if (-not (Test-Path $path)) {
            Write-Log "Path not found, skipping: $path" -Level 'WARNING'
            continue
        }
        
        Write-Log "Processing path: $path" -Level 'INFO'
        
        $files = Get-ChildItem -Path $path -File -Recurse -ErrorAction SilentlyContinue
        
        foreach ($file in $files) {
            $stats.FilesChecked++
            
            if ($file.LastWriteTime -lt $cutoffDate) {
                try {
                    $fileSize = $file.Length
                    $file | Remove-Item -Force -ErrorAction Stop
                    
                    $stats.FilesDeleted++
                    $stats.BytesFreed += $fileSize
                    
                    Write-Log "Deleted: $($file.FullName) ($([Math]::Round($fileSize / 1KB, 2)) KB)" -Level 'SUCCESS'
                }
                catch {
                    $stats.Errors += "Failed to delete $($file.FullName): $($_.Exception.Message)"
                    Write-Log "Failed to delete: $($file.FullName)" -Level 'ERROR'
                }
            }
        }
    }
    
    # Summary
    Write-Log "`n========== CLEANUP SUMMARY ==========" -Level 'INFO'
    Write-Log "Files checked: $($stats.FilesChecked)" -Level 'INFO'
    Write-Log "Files deleted: $($stats.FilesDeleted)" -Level 'SUCCESS'
    Write-Log "Space freed: $([Math]::Round($stats.BytesFreed / 1MB, 2)) MB" -Level 'SUCCESS'
    
    if ($stats.Errors.Count -gt 0) {
        Write-Log "Errors: $($stats.Errors.Count)" -Level 'WARNING'
    }
    
    Write-Log "=====================================`n" -Level 'INFO'
    
    exit 0
}
catch {
    Write-Log "Cleanup task failed: $($_.Exception.Message)" -Level 'ERROR'
    exit 1
}
