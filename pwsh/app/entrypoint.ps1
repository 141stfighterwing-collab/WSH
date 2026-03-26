#Requires -Version 7.0
<#
.SYNOPSIS
    PowerShell Executor Entrypoint
.DESCRIPTION
    Main entrypoint for the Docker container that initializes the execution
    environment, loads modules, and runs the specified script.
.NOTES
    This script is designed to run inside a Docker container with mounted
    volumes for /scripts, /logs, /config, and /output.
#>

# Set strict mode and error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# CONFIGURATION
# ============================================================================

$APP_VERSION = '1.0.0'
$APP_NAME = 'PowerShell Executor'

# ============================================================================
# INITIALIZATION
# ============================================================================

function Write-Banner {
    <#
    .SYNOPSIS
        Displays application banner
    #>
    $banner = @"

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     ██████╗  ██████╗ ███████╗██████╗  ██████╗ ███████╗                       ║
║     ██╔══██╗██╔═══██╗██╔════╝██╔══██╗██╔═══██╗██╔════╝                       ║
║     ██████╔╝██║   ██║█████╗  ██████╔╝██║   ██║███████╗                       ║
║     ██╔══██╗██║   ██║██╔══╝  ██╔══██╗██║   ██║╚════██║                       ║
║     ██║  ██║╚██████╔╝███████╗██║  ██║╚██████╔╝███████║                       ║
║     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                       ║
║                                                                              ║
║               E X E C U T O R   -   S e c u r e   R u n n e r                ║
║                                                                              ║
║                          Version: $APP_VERSION                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

"@
    Write-Host $banner -ForegroundColor Cyan
}

function Initialize-Modules {
    <#
    .SYNOPSIS
        Loads all required modules
    #>
    Write-Host "[INIT] Loading modules..." -ForegroundColor Cyan
    
    $modulesPath = '/modules'
    $modules = @('LoggingEngine', 'SafeExecutor', 'ConfigManager', 'HealthCheck')
    
    foreach ($moduleName in $modules) {
        $modulePath = Join-Path $modulesPath $moduleName
        
        if (Test-Path $modulePath) {
            try {
                Import-Module -Name $modulePath -Force -ErrorAction Stop
                Write-Host "[INIT] Loaded module: $moduleName" -ForegroundColor Green
            }
            catch {
                Write-Warning "[INIT] Failed to load module '$moduleName': $($_.Exception.Message)"
            }
        }
        else {
            Write-Warning "[INIT] Module not found: $moduleName at $modulePath"
        }
    }
}

function Initialize-Directories {
    <#
    .SYNOPSIS
        Ensures all required directories exist
    #>
    Write-Host "[INIT] Initializing directories..." -ForegroundColor Cyan
    
    $directories = @(
        @{ Path = '/scripts'; Description = 'Script files' }
        @{ Path = '/logs'; Description = 'Log files' }
        @{ Path = '/config'; Description = 'Configuration' }
        @{ Path = '/output'; Description = 'Output files' }
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir.Path)) {
            try {
                New-Item -Path $dir.Path -ItemType Directory -Force | Out-Null
                Write-Host "[INIT] Created directory: $($dir.Path) ($($dir.Description))" -ForegroundColor Green
            }
            catch {
                Write-Error "[INIT] Failed to create directory '$($dir.Path)': $($_.Exception.Message)"
            }
        }
        else {
            Write-Host "[INIT] Directory exists: $($dir.Path)" -ForegroundColor Gray
        }
    }
}

function Get-ExecutorParameters {
    <#
    .SYNOPSIS
        Parses command line arguments and environment variables
    #>
    param([string[]]$Arguments)
    
    $params = @{
        Mode = 'single'           # single, scheduled, daemon, help
        ScriptPath = $null
        Parameters = @{}
        Validate = $true
        HealthServer = $false
        HealthPort = 8080
    }
    
    # Get from environment variables first
    if ($env:SCRIPT_PATH) { $params.ScriptPath = $env:SCRIPT_PATH }
    if ($env:EXECUTOR_MODE) { $params.Mode = $env:EXECUTOR_MODE.ToLower() }
    if ($env:HEALTH_CHECK_PORT) { $params.HealthPort = [int]$env:HEALTH_CHECK_PORT }
    if ($env:HEALTH_CHECK_ENABLED -eq 'true') { $params.HealthServer = $true }
    
    # Parse command line arguments
    $i = 0
    while ($i -lt $Arguments.Count) {
        $arg = $Arguments[$i]
        
        switch -Regex ($arg) {
            '^(--help|-h|help)$' {
                $params.Mode = 'help'
            }
            '^(--script|-s)$' {
                $i++
                if ($i -lt $Arguments.Count) {
                    $params.ScriptPath = $Arguments[$i]
                }
            }
            '^(--mode|-m)$' {
                $i++
                if ($i -lt $Arguments.Count) {
                    $params.Mode = $Arguments[$i].ToLower()
                }
            }
            '^(--schedule|--cron)$' {
                $i++
                if ($i -lt $Arguments.Count) {
                    $params.Schedule = $Arguments[$i]
                    $params.Mode = 'scheduled'
                }
            }
            '^(--health)$' {
                $params.HealthServer = $true
            }
            '^(--port)$' {
                $i++
                if ($i -lt $Arguments.Count) {
                    $params.HealthPort = [int]$Arguments[$i]
                }
            }
            '^(--no-validate)$' {
                $params.Validate = $false
            }
            '^(--daemon)$' {
                $params.Mode = 'daemon'
            }
            '^--param-(.+)$' {
                $paramName = $Matches[1]
                $i++
                if ($i -lt $Arguments.Count) {
                    $params.Parameters[$paramName] = $Arguments[$i]
                }
            }
            default {
                # Treat as script path if it looks like a file
                if ($arg -match '\.ps1$' -or (Test-Path $arg -ErrorAction SilentlyContinue)) {
                    $params.ScriptPath = $arg
                }
            }
        }
        
        $i++
    }
    
    return $params
}

function Show-Help {
    <#
    .SYNOPSIS
        Displays usage information
    #>
    $help = @"

USAGE:
    pwsh -File entrypoint.ps1 [OPTIONS] [SCRIPT]

OPTIONS:
    --help, -h              Show this help message
    --script, -s PATH       Path to PowerShell script to execute
    --mode, -m MODE         Execution mode: single, scheduled, daemon
    --schedule EXPR         Cron expression for scheduled mode
    --health                Enable HTTP health check server
    --port PORT             Health check server port (default: 8080)
    --no-validate           Skip pre-flight validation
    --daemon                Run in daemon mode with continuous monitoring
    --param-NAME VALUE      Pass parameter to script

MODES:
    single      Execute script once and exit (default)
    scheduled   Execute script on a schedule
    daemon      Run continuously, monitoring for script changes

ENVIRONMENT VARIABLES:
    SCRIPT_PATH             Path to script file
    EXECUTOR_MODE           Execution mode
    LOG_LEVEL               Logging level (DEBUG, INFO, WARNING, ERROR)
    MAX_RETRIES             Maximum retry attempts (default: 3)
    DEFAULT_TIMEOUT         Script timeout in seconds (default: 3600)
    HEALTH_CHECK_ENABLED    Enable health check server
    HEALTH_CHECK_PORT       Health check port

EXAMPLES:
    # Run a script
    docker run -v ./scripts:/scripts executor --script /scripts/task.ps1

    # Run with environment variables
    docker run -e SCRIPT_PATH=/scripts/task.ps1 executor

    # Run scheduled task every hour
    docker run executor --mode scheduled --schedule "0 * * * *"

    # Run with health check server
    docker run -p 8080:8080 executor --script /scripts/task.ps1 --health

DIRECTORIES:
    /scripts    Mount your PowerShell scripts here
    /logs       Execution logs are written here
    /config     Configuration files
    /output     Script output and reports

"@
    Write-Host $help -ForegroundColor White
}

function Invoke-SingleExecution {
    <#
    .SYNOPSIS
        Executes a script once and exits
    #>
    param(
        [string]$ScriptPath,
        [hashtable]$Parameters,
        [bool]$Validate
    )
    
    # Start logging session
    Import-Module -Name '/modules/LoggingEngine' -Force
    Start-LoggingSession -SessionName 'SingleExecution' -LogLevel (Get-ExecutorConfig -Key 'LOG_LEVEL' -Default 'INFO')
    
    Write-Log -Message "Starting single execution mode" -Level 'INFO' -Source 'Entrypoint'
    Write-Log -Message "Script: $ScriptPath" -Level 'INFO' -Source 'Entrypoint'
    
    # Import SafeExecutor
    Import-Module -Name '/modules/SafeExecutor' -Force
    
    # Execute with retry and validation
    $result = Invoke-ScriptWithRetry -ScriptPath $ScriptPath -Parameters $Parameters -MaxRetries (Get-ExecutorConfig -Key 'MAX_RETRIES' -Default 3)
    
    # Stop logging session
    Stop-LoggingSession
    
    # Return appropriate exit code
    if ($result.Success) {
        Write-Host "`n[SUCCESS] Script executed successfully" -ForegroundColor Green
        exit 0
    }
    else {
        Write-Host "`n[FAILED] Script execution failed" -ForegroundColor Red
        Write-Host "Error: $($result.Error)" -ForegroundColor Red
        exit 1
    }
}

function Invoke-ScheduledExecution {
    <#
    .SYNOPSIS
        Executes a script on a schedule
    #>
    param(
        [string]$ScriptPath,
        [hashtable]$Parameters,
        [string]$Schedule
    )
    
    Import-Module -Name '/modules/LoggingEngine' -Force
    Start-LoggingSession -SessionName 'ScheduledExecution' -LogLevel 'INFO'
    
    Write-Log -Message "Starting scheduled execution mode" -Level 'INFO' -Source 'Entrypoint'
    Write-Log -Message "Schedule: $Schedule" -Level 'INFO' -Source 'Entrypoint'
    
    # Simple cron-like scheduler
    # For production, consider using a proper scheduler library
    
    $running = $true
    
    while ($running) {
        try {
            # Parse cron and wait (simplified)
            Write-Log -Message "Waiting for next scheduled execution..." -Level 'INFO' -Source 'Scheduler'
            
            # Execute script
            Import-Module -Name '/modules/SafeExecutor' -Force
            $result = Invoke-ScriptWithRetry -ScriptPath $ScriptPath -Parameters $Parameters
            
            if ($result.Success) {
                Write-Log -Message "Scheduled execution completed successfully" -Level 'SUCCESS' -Source 'Scheduler'
            }
            else {
                Write-Log -Message "Scheduled execution failed: $($result.Error)" -Level 'ERROR' -Source 'Scheduler'
            }
            
            # Wait for next interval (simplified: hourly)
            Start-Sleep -Seconds 3600
        }
        catch {
            Write-Log -Message "Scheduler error: $($_.Exception.Message)" -Level 'ERROR' -Source 'Scheduler'
            Start-Sleep -Seconds 60
        }
    }
}

function Invoke-DaemonMode {
    <#
    .SYNOPSIS
        Runs in daemon mode with health server
    #>
    param(
        [int]$HealthPort
    )
    
    Import-Module -Name '/modules/LoggingEngine' -Force
    Start-LoggingSession -SessionName 'DaemonMode' -LogLevel 'INFO'
    
    Write-Log -Message "Starting daemon mode" -Level 'INFO' -Source 'Entrypoint'
    
    # Start health server
    Import-Module -Name '/modules/HealthCheck' -Force
    Start-HealthServer -Port $HealthPort
    
    Write-Log -Message "Health server started on port $HealthPort" -Level 'SUCCESS' -Source 'Entrypoint'
    Write-Log -Message "Daemon running. Press Ctrl+C to stop." -Level 'INFO' -Source 'Entrypoint'
    
    # Keep running
    try {
        while ($true) {
            Start-Sleep -Seconds 60
            $health = Invoke-HealthCheck
            Write-Log -Message "Health check: $($health.Status)" -Level 'DEBUG' -Source 'Daemon'
        }
    }
    finally {
        Stop-HealthServer
        Stop-LoggingSession
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    # Display banner
    Write-Banner
    
    # Initialize
    Initialize-Directories
    Initialize-Modules
    
    # Load configuration
    Import-Module -Name '/modules/ConfigManager' -Force
    $config = Initialize-Configuration
    
    # Parse parameters
    $params = Get-ExecutorParameters -Arguments $args
    
    Write-Host "`n[INIT] Configuration:" -ForegroundColor Cyan
    Write-Host "  Mode: $($params.Mode)" -ForegroundColor Gray
    Write-Host "  Script: $($params.ScriptPath)" -ForegroundColor Gray
    Write-Host "  Health Server: $($params.HealthServer)" -ForegroundColor Gray
    Write-Host ""
    
    # Execute based on mode
    switch ($params.Mode) {
        'help' {
            Show-Help
            exit 0
        }
        
        'single' {
            if (-not $params.ScriptPath) {
                Write-Error "No script path specified. Use --script or SCRIPT_PATH environment variable."
                Show-Help
                exit 1
            }
            
            Invoke-SingleExecution -ScriptPath $params.ScriptPath -Parameters $params.Parameters -Validate $params.Validate
        }
        
        'scheduled' {
            if (-not $params.ScriptPath) {
                Write-Error "No script path specified for scheduled mode."
                exit 1
            }
            
            Invoke-ScheduledExecution -ScriptPath $params.ScriptPath -Parameters $params.Parameters -Schedule $params.Schedule
        }
        
        'daemon' {
            Invoke-DaemonMode -HealthPort $params.HealthPort
        }
        
        default {
            Write-Error "Unknown mode: $($params.Mode)"
            Show-Help
            exit 1
        }
    }
}
catch {
    Write-Host "`n[CRITICAL ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    exit 1
}
