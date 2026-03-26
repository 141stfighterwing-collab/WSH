#Requires -Version 7.0
<#
.SYNOPSIS
    Logging Engine - Structured logging with timestamps and severity levels
.DESCRIPTION
    Provides comprehensive logging capabilities for PowerShell execution with
    persistent storage, rotation, and structured output formats.
#>

# Module-level variables
$script:LogSession = $null
$script:LogBuffer = [System.Collections.Concurrent.ConcurrentQueue[object]]::new()
$script:LogLevels = @{
    'DEBUG'   = 10
    'INFO'    = 20
    'SUCCESS' = 25
    'WARNING' = 30
    'ERROR'   = 40
    'CRITICAL' = 50
}

# Default configuration
$script:DefaultLogConfig = @{
    LogPath = '/logs'
    LogLevel = 'INFO'
    MaxLogSizeMB = 100
    MaxLogFiles = 30
    EnableConsole = $true
    EnableFile = $true
    EnableBuffer = $true
    LogFormat = 'text'  # text, json, csv
    TimestampFormat = 'yyyy-MM-dd HH:mm:ss.fff'
    IncludeHostName = $true
    IncludeProcessId = $true
}

function Initialize-LogDirectory {
    <#
    .SYNOPSIS
        Ensures log directory exists with proper permissions
    #>
    param(
        [string]$Path = $script:DefaultLogConfig.LogPath
    )
    
    if (-not (Test-Path -Path $Path)) {
        try {
            New-Item -Path $Path -ItemType Directory -Force | Out-Null
            Write-Host "[INIT] Created log directory: $Path" -ForegroundColor Cyan
        }
        catch {
            throw "Failed to create log directory '$Path': $($_.Exception.Message)"
        }
    }
}

function Get-LogLevelValue {
    param([string]$Level)
    
    if ($script:LogLevels.ContainsKey($Level.ToUpper())) {
        return $script:LogLevels[$Level.ToUpper()]
    }
    return 20  # Default to INFO
}

function Format-LogEntry {
    <#
    .SYNOPSIS
        Formats a log entry based on configuration
    #>
    param(
        [datetime]$Timestamp,
        [string]$Level,
        [string]$Message,
        [string]$Source = 'Executor',
        [hashtable]$Metadata = @{},
        [string]$Format = 'text'
    )
    
    $timestampStr = $Timestamp.ToString($script:DefaultLogConfig.TimestampFormat)
    $hostName = if ($script:DefaultLogConfig.IncludeHostName) { " [$env:COMPUTERNAME]" } else { '' }
    $processId = if ($script:DefaultLogConfig.IncludeProcessId) { " [$PID]" } else { '' }
    
    switch ($Format.ToLower()) {
        'json' {
            $entry = @{
                timestamp = $Timestamp.ToString('o')
                level = $Level.ToUpper()
                message = $Message
                source = $Source
                hostName = $env:COMPUTERNAME
                processId = $PID
                metadata = $Metadata
            }
            return $entry | ConvertTo-Json -Compress -Depth 10
        }
        'csv' {
            return '"{0}","{1}","{2}","{3}"' -f $timestampStr, $Level.ToUpper(), $Source, $Message
        }
        default {
            return "[$timestampStr]$hostName$processId [$($Level.ToUpper())] [$Source] $Message"
        }
    }
}

function Write-Log {
    <#
    .SYNOPSIS
        Writes a structured log entry with timestamp and severity level
    .DESCRIPTION
        Core logging function that handles multiple output targets (console, file, buffer)
        with configurable formatting and severity filtering.
    .PARAMETER Message
        The log message to write
    .PARAMETER Level
        Severity level (DEBUG, INFO, SUCCESS, WARNING, ERROR, CRITICAL)
    .PARAMETER Source
        Source identifier for the log entry
    .PARAMETER Metadata
        Additional metadata as hashtable
    .PARAMETER NoConsole
        Skip console output
    .PARAMETER NoFile
        Skip file output
    .PARAMETER Exception
        Exception object for error logging
    .EXAMPLE
        Write-Log -Message "Script started" -Level "INFO" -Source "Main"
    .EXAMPLE
        Write-Log -Message "Connection failed" -Level "ERROR" -Exception $_.Exception
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message,
        
        [Parameter(Position = 1)]
        [ValidateSet('DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL')]
        [string]$Level = 'INFO',
        
        [Parameter(Position = 2)]
        [string]$Source = 'Executor',
        
        [Parameter()]
        [hashtable]$Metadata = @{},
        
        [Parameter()]
        [switch]$NoConsole,
        
        [Parameter()]
        [switch]$NoFile,
        
        [Parameter()]
        [System.Management.Automation.ErrorRecord]$Exception
    )
    
    # Check log level threshold
    $configLevel = Get-LogLevelValue -Level $script:DefaultLogConfig.LogLevel
    $entryLevel = Get-LogLevelValue -Level $Level
    
    if ($entryLevel -lt $configLevel) {
        return  # Skip below threshold
    }
    
    $timestamp = Get-Date
    
    # Add exception details if provided
    if ($Exception) {
        $Metadata.ExceptionType = $Exception.GetType().Name
        $Metadata.ExceptionMessage = $Exception.Exception.Message
        $Metadata.StackTrace = $Exception.ScriptStackTrace
        $Message = "$Message - Exception: $($Exception.Exception.Message)"
    }
    
    # Format the log entry
    $formattedEntry = Format-LogEntry -Timestamp $timestamp -Level $Level -Message $Message -Source $Source -Metadata $Metadata -Format $script:DefaultLogConfig.LogFormat
    
    # Console output with colors
    if ($script:DefaultLogConfig.EnableConsole -and -not $NoConsole) {
        $consoleColor = switch ($Level.ToUpper()) {
            'DEBUG'    { 'Gray' }
            'INFO'     { 'White' }
            'SUCCESS'  { 'Green' }
            'WARNING'  { 'Yellow' }
            'ERROR'    { 'Red' }
            'CRITICAL' { 'Magenta' }
            default    { 'White' }
        }
        
        $prefix = switch ($Level.ToUpper()) {
            'DEBUG'    { '🔍' }
            'INFO'     { 'ℹ️' }
            'SUCCESS'  { '✅' }
            'WARNING'  { '⚠️' }
            'ERROR'    { '❌' }
            'CRITICAL' { '🔥' }
            default    { '•' }
        }
        
        Write-Host "$prefix $formattedEntry" -ForegroundColor $consoleColor
    }
    
    # File output
    if ($script:DefaultLogConfig.EnableFile -and -not $NoFile -and $script:LogSession) {
        try {
            $logFile = Join-Path $script:DefaultLogConfig.LogPath $script:LogSession.LogFileName
            
            # Check log rotation
            if (Test-Path $logFile) {
                $fileInfo = Get-Item $logFile
                if ($fileInfo.Length -gt ($script:DefaultLogConfig.MaxLogSizeMB * 1MB)) {
                    Invoke-LogRotation -LogPath $script:DefaultLogConfig.LogPath
                }
            }
            
            Add-Content -Path $logFile -Value $formattedEntry -Encoding UTF8 -ErrorAction Stop
        }
        catch {
            Write-Warning "Failed to write to log file: $($_.Exception.Message)"
        }
    }
    
    # Buffer output for in-memory access
    if ($script:DefaultLogConfig.EnableBuffer) {
        $bufferEntry = [PSCustomObject]@{
            Timestamp = $timestamp
            Level = $Level.ToUpper()
            Message = $Message
            Source = $Source
            Metadata = $Metadata
            Formatted = $formattedEntry
        }
        $script:LogBuffer.Enqueue($bufferEntry)
    }
    
    return $formattedEntry
}

function Write-LogInfo {
    param([string]$Message, [string]$Source = 'Executor', [hashtable]$Metadata = @{})
    Write-Log -Message $Message -Level 'INFO' -Source $Source -Metadata $Metadata
}

function Write-LogWarning {
    param([string]$Message, [string]$Source = 'Executor', [hashtable]$Metadata = @{})
    Write-Log -Message $Message -Level 'WARNING' -Source $Source -Metadata $Metadata
}

function Write-LogError {
    param([string]$Message, [string]$Source = 'Executor', [hashtable]$Metadata = @{}, [System.Management.Automation.ErrorRecord]$Exception)
    Write-Log -Message $Message -Level 'ERROR' -Source $Source -Metadata $Metadata -Exception $Exception
}

function Write-LogSuccess {
    param([string]$Message, [string]$Source = 'Executor', [hashtable]$Metadata = @{})
    Write-Log -Message $Message -Level 'SUCCESS' -Source $Source -Metadata $Metadata
}

function Write-LogDebug {
    param([string]$Message, [string]$Source = 'Executor', [hashtable]$Metadata = @{})
    Write-Log -Message $Message -Level 'DEBUG' -Source $Source -Metadata $Metadata
}

function Invoke-LogRotation {
    <#
    .SYNOPSIS
        Rotates log files when they exceed size limits
    #>
    param([string]$LogPath)
    
    $logFiles = Get-ChildItem -Path $LogPath -Filter '*.log' | Sort-Object LastWriteTime -Descending
    
    # Remove old files beyond max count
    if ($logFiles.Count -gt $script:DefaultLogConfig.MaxLogFiles) {
        $filesToRemove = $logFiles | Select-Object -Skip $script:DefaultLogConfig.MaxLogFiles
        foreach ($file in $filesToRemove) {
            Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "[ROTATE] Removed old log file: $($file.Name)" -ForegroundColor Yellow
        }
    }
    
    # Rotate current log
    $currentLog = Join-Path $LogPath 'executor.log'
    if (Test-Path $currentLog) {
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        $newName = "executor_$timestamp.log"
        Rename-Item -Path $currentLog -NewName $newName -Force
        Write-Host "[ROTATE] Rotated log to: $newName" -ForegroundColor Yellow
    }
}

function Start-LoggingSession {
    <#
    .SYNOPSIS
        Initializes a new logging session with configuration
    .DESCRIPTION
        Creates log directory, sets up session tracking, and writes session header
    .PARAMETER SessionName
        Name for this logging session
    .PARAMETER LogPath
        Path for log files
    .PARAMETER LogLevel
        Minimum log level to capture
    .EXAMPLE
        Start-LoggingSession -SessionName "BackupJob" -LogLevel "DEBUG"
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$SessionName = "Executor_$(Get-Date -Format 'yyyyMMdd_HHmmss')",
        
        [Parameter()]
        [string]$LogPath = '/logs',
        
        [Parameter()]
        [ValidateSet('DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL')]
        [string]$LogLevel = 'INFO',
        
        [Parameter()]
        [ValidateSet('text', 'json', 'csv')]
        [string]$LogFormat = 'text'
    )
    
    # Update configuration
    $script:DefaultLogConfig.LogPath = $LogPath
    $script:DefaultLogConfig.LogLevel = $LogLevel
    $script:DefaultLogConfig.LogFormat = $LogFormat
    
    # Initialize log directory
    Initialize-LogDirectory -Path $LogPath
    
    # Create session object
    $script:LogSession = @{
        SessionId = [Guid]::NewGuid().ToString()
        SessionName = $SessionName
        StartTime = Get-Date
        LogFileName = 'executor.log'
        Status = 'Active'
    }
    
    # Write session header
    $header = @"
================================================================================
POWERSHELL EXECUTOR - LOGGING SESSION
================================================================================
Session ID    : $($script:LogSession.SessionId)
Session Name  : $SessionName
Start Time    : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Host Name     : $env:COMPUTERNAME
Process ID    : $PID
Log Level     : $LogLevel
Log Format    : $LogFormat
================================================================================

"@
    
    $logFile = Join-Path $LogPath $script:LogSession.LogFileName
    Add-Content -Path $logFile -Value $header -Encoding UTF8
    
    Write-Host $header -ForegroundColor Cyan
    
    Write-Log -Message "Logging session started: $SessionName" -Level 'INFO' -Source 'LoggingEngine'
    
    return $script:LogSession
}

function Stop-LoggingSession {
    <#
    .SYNOPSIS
        Finalizes the logging session and generates summary
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Status = 'Completed',
        
        [Parameter()]
        [switch]$ExportReport
    )
    
    if (-not $script:LogSession) {
        Write-Warning "No active logging session to stop"
        return
    }
    
    $endTime = Get-Date
    $duration = $endTime - $script:LogSession.StartTime
    
    # Get log statistics
    $logStats = Get-LogHistory | Group-Object Level | ForEach-Object {
        @{ Level = $_.Name; Count = $_.Count }
    }
    
    $footer = @"

================================================================================
SESSION SUMMARY
================================================================================
Session ID    : $($script:LogSession.SessionId)
Session Name  : $($script:LogSession.SessionName)
Start Time    : $($script:LogSession.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))
End Time      : $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))
Duration      : $($duration.ToString('hh\:mm\:ss'))
Status        : $Status
Log Entries   : $(if ($logStats) { ($logStats | ForEach-Object { "$($_.Level)=$($_.Count)" }) -join ', ' } else { 'None' })
================================================================================
"@
    
    $logFile = Join-Path $script:DefaultLogConfig.LogPath $script:LogSession.LogFileName
    Add-Content -Path $logFile -Value $footer -Encoding UTF8
    
    Write-Host $footer -ForegroundColor Cyan
    
    # Export report if requested
    if ($ExportReport) {
        Export-LogReport
    }
    
    $script:LogSession.Status = 'Stopped'
    return $script:LogSession
}

function Get-LogHistory {
    <#
    .SYNOPSIS
        Retrieves log entries from the in-memory buffer
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [ValidateSet('DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL')]
        [string]$Level,
        
        [Parameter()]
        [datetime]$After,
        
        [Parameter()]
        [datetime]$Before,
        
        [Parameter()]
        [string]$Source,
        
        [Parameter()]
        [int]$Last = 100
    )
    
    $entries = $script:LogBuffer.ToArray() | Select-Object -Last $Last
    
    if ($Level) {
        $entries = $entries | Where-Object { $_.Level -eq $Level }
    }
    if ($After) {
        $entries = $entries | Where-Object { $_.Timestamp -gt $After }
    }
    if ($Before) {
        $entries = $entries | Where-Object { $_.Timestamp -lt $Before }
    }
    if ($Source) {
        $entries = $entries | Where-Object { $_.Source -like "*$Source*" }
    }
    
    return $entries
}

function Export-LogReport {
    <#
    .SYNOPSIS
        Exports log history to a file
    .PARAMETER Path
        Output file path
    .PARAMETER Format
        Output format (json, csv, html)
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Path = '/output',
        
        [Parameter()]
        [ValidateSet('json', 'csv', 'html')]
        [string]$Format = 'json'
    )
    
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
    
    $entries = Get-LogHistory
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $fileName = "log_report_$timestamp"
    
    switch ($Format) {
        'json' {
            $filePath = Join-Path $Path "$fileName.json"
            $entries | ConvertTo-Json -Depth 10 | Out-File $filePath -Encoding UTF8
        }
        'csv' {
            $filePath = Join-Path $Path "$fileName.csv"
            $entries | Select-Object Timestamp, Level, Source, Message | Export-Csv $filePath -NoTypeInformation
        }
        'html' {
            $filePath = Join-Path $Path "$fileName.html"
            $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Log Report - $timestamp</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .DEBUG { color: gray; }
        .INFO { color: black; }
        .SUCCESS { color: green; }
        .WARNING { color: orange; }
        .ERROR { color: red; }
        .CRITICAL { color: magenta; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Log Report</h1>
    <p>Generated: $(Get-Date)</p>
    <table>
        <tr><th>Timestamp</th><th>Level</th><th>Source</th><th>Message</th></tr>
$(foreach ($entry in $entries) {
        "        <tr><td>$($entry.Timestamp)</td><td class='$($entry.Level)'>$($entry.Level)</td><td>$($entry.Source)</td><td>$($entry.Message)</td></tr>"
    })
    </table>
</body>
</html>
"@
            $html | Out-File $filePath -Encoding UTF8
        }
    }
    
    Write-Log -Message "Log report exported to: $filePath" -Level 'INFO' -Source 'LoggingEngine'
    return $filePath
}

# Export module members
Export-ModuleMember -Function @(
    'Write-Log'
    'Write-LogInfo'
    'Write-LogWarning'
    'Write-LogError'
    'Write-LogSuccess'
    'Write-LogDebug'
    'Start-LoggingSession'
    'Stop-LoggingSession'
    'Get-LogHistory'
    'Export-LogReport'
)
