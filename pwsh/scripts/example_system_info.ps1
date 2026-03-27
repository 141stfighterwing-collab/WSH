#Requires -Version 7.0
<#
.SYNOPSIS
    Example Script - System Information Collector
.DESCRIPTION
    Demonstrates safe script execution with logging, error handling,
    and structured output generation.
.EXAMPLE
    ./example_system_info.ps1 -OutputPath /output -LogLevel DEBUG
#>

[CmdletBinding()]
param(
    [string]$OutputPath = '/output',
    [ValidateSet('DEBUG', 'INFO', 'WARNING', 'ERROR')]
    [string]$LogLevel = 'INFO'
)

# ============================================================================
# STRICT MODE AND ERROR HANDLING
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# FUNCTIONS
# ============================================================================

function Write-LogMessage {
    param(
        [string]$Message,
        [ValidateSet('DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR')]
        [string]$Level = 'INFO'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $color = switch ($Level) {
        'DEBUG'   { 'Gray' }
        'INFO'    { 'White' }
        'SUCCESS' { 'Green' }
        'WARNING' { 'Yellow' }
        'ERROR'   { 'Red' }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Get-SystemInformation {
    <#
    .SYNOPSIS
        Collects system information
    #>
    
    $info = @{
        Timestamp = Get-Date -Format 'o'
        MachineName = $env:COMPUTERNAME
        OS = $PSVersionTable.OS
        PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        Process = @{
            Id = $PID
            WorkingSetMB = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            StartTime = (Get-Process -Id $PID).StartTime
        }
        Environment = @{
            EXECUTOR_MODE = $env:EXECUTOR_MODE
            LOG_LEVEL = $env:LOG_LEVEL
        }
    }
    
    return $info
}

function Get-FileSystemInfo {
    <#
    .SYNOPSIS
        Collects file system information for mounted paths
    #>
    
    $paths = @('/scripts', '/logs', '/config', '/output')
    $fsInfo = @{}
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $items = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
            $fsInfo[$path] = @{
                Exists = $true
                ItemCount = $items.Count
                TotalSizeBytes = ($items | Measure-Object -Property Length -Sum).Sum
            }
        }
        else {
            $fsInfo[$path] = @{
                Exists = $false
                ItemCount = 0
                TotalSizeBytes = 0
            }
        }
    }
    
    return $fsInfo
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-LogMessage "Starting System Information Collector" -Level 'INFO'
Write-LogMessage "Output Path: $OutputPath" -Level 'DEBUG'
Write-LogMessage "Log Level: $LogLevel" -Level 'DEBUG'

try {
    # Validate output path
    Write-LogMessage "Validating output path..." -Level 'DEBUG'
    if (-not (Test-Path $OutputPath)) {
        Write-LogMessage "Creating output directory: $OutputPath" -Level 'INFO'
        New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
    }
    
    # Collect information
    Write-LogMessage "Collecting system information..." -Level 'INFO'
    $systemInfo = Get-SystemInformation
    
    Write-LogMessage "Collecting file system information..." -Level 'INFO'
    $fsInfo = Get-FileSystemInfo
    
    # Build report
    $report = @{
        ReportName = 'System Information'
        GeneratedAt = Get-Date -Format 'o'
        GeneratedBy = 'PowerShell Executor Example Script'
        System = $systemInfo
        FileSystem = $fsInfo
        Status = 'Success'
    }
    
    # Export report
    $reportPath = Join-Path $OutputPath "system_info_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    Write-LogMessage "Exporting report to: $reportPath" -Level 'INFO'
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-LogMessage "Report generated successfully!" -Level 'SUCCESS'
    Write-LogMessage "System: $($systemInfo.MachineName)" -Level 'INFO'
    Write-LogMessage "PowerShell: $($systemInfo.PowerShellVersion)" -Level 'INFO'
    Write-LogMessage "Memory: $($systemInfo.Process.WorkingSetMB) MB" -Level 'INFO'
    
    exit 0
}
catch {
    Write-LogMessage "Script execution failed: $($_.Exception.Message)" -Level 'ERROR'
    Write-LogMessage "Stack trace: $($_.ScriptStackTrace)" -Level 'DEBUG'
    exit 1
}
