<#
.SYNOPSIS
    WSH (Weavenote Self Hosted) - One-Click Docker Installer for Windows
.DESCRIPTION
    This script fully automates the deployment of WSH (Weavenote Self Hosted)
    application using Docker and Docker Compose on Windows.
    
    Features:
    - Prerequisites verification (Docker, Docker Compose, ports, permissions)
    - Environment preparation and configuration
    - PostgreSQL database deployment and initialization
    - Application deployment with health checks
    - Complete validation and verification
    - Real-time progress tracking with percentage display
    - Comprehensive logging
    - Rollback capability on failure
    
.NOTES
    File Name      : Install-WSH.ps1
    Author         : WSH Installer
    Prerequisite   : Docker Desktop must be installed
    Copyright 2025 - WSH Project
    
.EXAMPLE
    .\Install-WSH.ps1
    Runs the installer with default settings
    
.EXAMPLE
    .\Install-WSH.ps1 -InstallPath "D:\WSH" -EnablePgAdmin
    Installs to custom path with pgAdmin enabled
    
.EXAMPLE
    .\Install-WSH.ps1 -Uninstall
    Removes WSH installation
#>

#Requires -Version 5.1

[CmdletBinding(DefaultParameterSetName = 'Install')]
param (
    [Parameter(ParameterSetName = 'Install')]
    [string]$InstallPath = "$env:USERPROFILE\WSH",
    
    [Parameter(ParameterSetName = 'Install')]
    [string]$AppName = "WSH - Weavenote Self Hosted",
    
    [Parameter(ParameterSetName = 'Install')]
    [int]$AppPort = 3000,
    
    [Parameter(ParameterSetName = 'Install')]
    [int]$DatabasePort = 5432,
    
    [Parameter(ParameterSetName = 'Install')]
    [int]$PgAdminPort = 5050,
    
    [Parameter(ParameterSetName = 'Install')]
    [switch]$EnablePgAdmin,
    
    [Parameter(ParameterSetName = 'Install')]
    [switch]$SkipPortCheck,
    
    [Parameter(ParameterSetName = 'Install')]
    [switch]$Force,
    
    [Parameter(ParameterSetName = 'Install')]
    [string]$GeminiApiKey = "",
    
    [Parameter(ParameterSetName = 'Uninstall')]
    [switch]$Uninstall,
    
    [Parameter(ParameterSetName = 'Uninstall')]
    [switch]$RemoveData
)

# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

# Application Configuration
$script:Config = @{
    AppName           = "WSH"
    AppDisplayName    = "Weavenote Self Hosted"
    AppVersion        = "1.0.0"
    GitHubRepo        = "https://github.com/141stfighterwing-collab/WSH"
    DockerNetworkName = "wsh-network"
    
    # Container Names
    PostgresContainer = "wsh-postgres"
    AppContainer      = "wsh-app"
    PgAdminContainer  = "wsh-pgadmin"
    
    # Image Configuration
    PostgresImage     = "postgres:16-alpine"
    PgAdminImage      = "dpage/pgadmin4:latest"
    
    # Database Configuration (placeholder values - to be changed in production)
    DbName            = "wsh_db"
    DbUser            = "wsh"
    DbPassword        = "wsh_secure_password_CHANGE_ME"
    
    # Default Admin Credentials (CHANGE THESE!)
    AdminEmail        = "admin@wsh.local"
    AdminPassword     = "admin123"
    AdminUsername     = "Admin"
    
    # JWT Configuration (CHANGE IN PRODUCTION!)
    JwtSecret         = "your-super-secret-jwt-key-change-in-production"
    JwtExpiresIn      = "7d"
    
    # Health Check Settings
    MaxRetries        = 30
    RetryDelaySeconds = 5
    
    # Logging
    LogFile           = "wsh-install.log"
}

# Progress Tracking
$script:Progress = @{
    TotalSteps    = 7
    CurrentStep   = 0
    StepNames     = @(
        "Prerequisites Check",
        "Environment Preparation",
        "Configuration Generation",
        "Database Deployment",
        "Application Deployment",
        "Health Validation",
        "Finalization"
    )
}

# ============================================================================
# LOGGING AND PROGRESS FUNCTIONS
# ============================================================================

function Write-LogHeader {
    <#
    .SYNOPSIS
        Displays the installation header banner
    #>
    $header = @"
================================================================================
                           WSH INSTALLER v$($script:Config.AppVersion)
                    Weavenote Self Hosted - Docker Deployment
================================================================================
"@ 
    Write-Host $header -ForegroundColor Cyan
    Write-Host ""
}

function Write-Log {
    <#
    .SYNOPSIS
        Writes a log message with timestamp and level
    
    .PARAMETER Message
        The message to log
    
    .PARAMETER Level
        The log level (INFO, WARNING, ERROR, SUCCESS)
    
    .PARAMETER NoConsole
        If specified, only writes to log file
    #>
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter()]
        [ValidateSet('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'DEBUG')]
        [string]$Level = 'INFO',
        
        [switch]$NoConsole
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to log file
    $logPath = Join-Path $script:InstallPath $script:Config.LogFile
    try {
        if (-not (Test-Path (Split-Path $logPath -Parent))) {
            New-Item -ItemType Directory -Path (Split-Path $logPath -Parent) -Force | Out-Null
        }
        Add-Content -Path $logPath -Value $logEntry -ErrorAction SilentlyContinue
    } catch {
        # Silently continue if log file cannot be written
    }
    
    # Write to console with color coding
    if (-not $NoConsole) {
        $prefix = switch ($Level) {
            'INFO'    { "[INFO]    "; $color = 'White' }
            'WARNING' { "[WARNING] "; $color = 'Yellow' }
            'ERROR'   { "[ERROR]   "; $color = 'Red' }
            'SUCCESS' { "[SUCCESS] "; $color = 'Green' }
            'DEBUG'   { "[DEBUG]   "; $color = 'Gray' }
        }
        
        Write-Host "$prefix$Message" -ForegroundColor $color
    }
}

function Write-StepHeader {
    <#
    .SYNOPSIS
        Displays a step header with progress percentage
    
    .PARAMETER StepNumber
        The current step number
    
    .PARAMETER StepName
        The name of the current step
    #>
    param (
        [Parameter(Mandatory = $true)]
        [int]$StepNumber,
        
        [Parameter(Mandatory = $true)]
        [string]$StepName
    )
    
    $percentage = [math]::Round((($StepNumber - 1) / $script:Progress.TotalSteps) * 100)
    $barLength = 50
    $filledLength = [math]::Round($barLength * ($percentage / 100))
    $bar = "=" * $filledLength + "-" * ($barLength - $filledLength)
    
    Write-Host ""
    Write-Host "+-----------------------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "|  STEP $StepNumber/$($script:Progress.TotalSteps): $StepName".PadRight(64) -ForegroundColor Cyan -NoNewline
    Write-Host "+" -ForegroundColor DarkGray
    Write-Host "|                                                                 |" -ForegroundColor DarkGray
    Write-Host "|  Progress: [$bar] ${percentage}%   |" -ForegroundColor DarkGray
    Write-Host "+-----------------------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host ""
    
    Write-Log "Starting Step $StepNumber`: $StepName" -Level INFO
}

function Write-SubStep {
    <#
    .SYNOPSIS
        Displays a sub-step with status icon
    
    .PARAMETER Message
        The sub-step message
    
    .PARAMETER Status
        The status (running, success, error, warning, skip)
    #>
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter()]
        [ValidateSet('running', 'success', 'error', 'warning', 'skip', 'info')]
        [string]$Status = 'running'
    )
    
    $icon = switch ($Status) {
        'running' { "[...] "; $color = 'Yellow' }
        'success' { "[OK]  "; $color = 'Green' }
        'error'   { "[X]   "; $color = 'Red' }
        'warning' { "[!]   "; $color = 'Yellow' }
        'skip'    { "[--]  "; $color = 'Gray' }
        'info'    { "[*]   "; $color = 'Cyan' }
    }
    
    Write-Host "  $icon$Message" -ForegroundColor $color
}

function Write-ProgressDetail {
    <#
    .SYNOPSIS
        Shows detailed progress with percentage for a sub-operation
    
    .PARAMETER Activity
        The activity being performed
    
    .PARAMETER Status
        Current status message
    
    .PARAMETER PercentComplete
        Percentage complete (0-100)
    #>
    param (
        [Parameter(Mandatory = $true)]
        [string]$Activity,
        
        [Parameter(Mandatory = $true)]
        [string]$Status,
        
        [Parameter(Mandatory = $true)]
        [ValidateRange(0, 100)]
        [int]$PercentComplete
    )
    
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $PercentComplete
    
    # Also write to console for visibility
    $statusText = "    [$PercentComplete%] $Status"
    Write-Host $statusText -ForegroundColor DarkGray
}

function Write-FinalSummary {
    <#
    .SYNOPSIS
        Displays the final installation summary
    #>
    param (
        [Parameter(Mandatory = $true)]
        [bool]$Success,
        
        [Parameter()]
        [string]$ErrorMessage = ""
    )
    
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor DarkGray
    
    if ($Success) {
        Write-Host "                    INSTALLATION COMPLETED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "================================================================================" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  Application Access:" -ForegroundColor Cyan
        Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  [*] Application URL:     http://localhost:$AppPort" -ForegroundColor White
        Write-Host "  [*] Database Port:       localhost:$DatabasePort" -ForegroundColor White
        
        if ($EnablePgAdmin) {
            Write-Host "  [*] pgAdmin URL:         http://localhost:$PgAdminPort" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "  Default Credentials (CHANGE IMMEDIATELY!):" -ForegroundColor Yellow
        Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  [*] Email:               $($script:Config.AdminEmail)" -ForegroundColor White
        Write-Host "  [*] Password:            $($script:Config.AdminPassword)" -ForegroundColor White
        Write-Host ""
        Write-Host "  Installation Paths:" -ForegroundColor Cyan
        Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  [*] Install Directory:   $InstallPath" -ForegroundColor White
        Write-Host "  [*] Docker Compose:      $InstallPath\docker-compose.yml" -ForegroundColor White
        Write-Host "  [*] Environment File:    $InstallPath\.env" -ForegroundColor White
        Write-Host "  [*] Log File:            $InstallPath\$($script:Config.LogFile)" -ForegroundColor White
        Write-Host ""
        Write-Host "  Quick Commands:" -ForegroundColor Cyan
        Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  Stop application:      docker-compose -f `"$InstallPath\docker-compose.yml`" down" -ForegroundColor White
        Write-Host "  Start application:     docker-compose -f `"$InstallPath\docker-compose.yml`" up -d" -ForegroundColor White
        Write-Host "  View logs:             docker-compose -f `"$InstallPath\docker-compose.yml`" logs -f" -ForegroundColor White
        Write-Host ""
        Write-Host "  [!] SECURITY WARNING: Change default credentials before production use!" -ForegroundColor Yellow
    } else {
        Write-Host "                    INSTALLATION FAILED" -ForegroundColor Red
        Write-Host "================================================================================" -ForegroundColor DarkGray
        Write-Host ""
        if ($ErrorMessage) {
            Write-Host "  Error: $ErrorMessage" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "  Rollback Instructions:" -ForegroundColor Yellow
        Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  1. Stop containers:     docker-compose -f `"$InstallPath\docker-compose.yml`" down" -ForegroundColor White
        Write-Host "  2. Remove volumes:      docker volume rm wsh_postgres_data" -ForegroundColor White
        Write-Host "  3. Clean install:       Remove-Item -Recurse -Force `"$InstallPath`"" -ForegroundColor White
        Write-Host "  4. Check logs:          Get-Content `"$InstallPath\$($script:Config.LogFile)`"" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor DarkGray
}

# ============================================================================
# PREREQUISITES CHECK FUNCTIONS
# ============================================================================

function Test-DockerDesktop {
    <#
    .SYNOPSIS
        Verifies Docker Desktop is installed and running
    #>
    Write-SubStep "Checking Docker Desktop installation..." -Status running
    
    try {
        # Check if Docker Desktop is installed
        $dockerDesktopPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
        $dockerDesktopPath2 = "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
        
        if (-not (Test-Path $dockerDesktopPath) -and -not (Test-Path $dockerDesktopPath2)) {
            Write-SubStep "Docker Desktop not found" -Status error
            Write-Log "Docker Desktop is not installed" -Level ERROR
            return @{
                Success = $false
                Message = "Docker Desktop is not installed. Please download from https://www.docker.com/products/docker-desktop"
            }
        }
        
        # Check if Docker daemon is running
        $dockerVersion = docker version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Docker daemon not running" -Status error
            Write-Log "Docker daemon is not running" -Level ERROR
            return @{
                Success = $false
                Message = "Docker Desktop is installed but not running. Please start Docker Desktop and try again."
            }
        }
        
        Write-SubStep "Docker Desktop is installed and running" -Status success
        Write-Log "Docker Desktop verified successfully" -Level SUCCESS
        return @{ Success = $true; Message = "Docker Desktop is ready" }
        
    } catch {
        Write-SubStep "Docker check failed: $($_.Exception.Message)" -Status error
        Write-Log "Docker check failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Test-DockerCompose {
    <#
    .SYNOPSIS
        Verifies Docker Compose is available
    #>
    Write-SubStep "Checking Docker Compose availability..." -Status running
    
    try {
        # Try docker compose (v2) first
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Docker Compose v2 available: $composeVersion".Trim() -Status success
            Write-Log "Docker Compose v2 verified: $composeVersion".Trim() -Level SUCCESS
            return @{ Success = $true; Version = $composeVersion.Trim(); UseV2 = $true }
        }
        
        # Try docker-compose (v1)
        $composeVersion = docker-compose --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Docker Compose v1 available: $composeVersion".Trim() -Status success
            Write-Log "Docker Compose v1 verified: $composeVersion".Trim() -Level SUCCESS
            return @{ Success = $true; Version = $composeVersion.Trim(); UseV2 = $false }
        }
        
        Write-SubStep "Docker Compose not found" -Status error
        Write-Log "Docker Compose is not available" -Level ERROR
        return @{ Success = $false; Message = "Docker Compose is not available. Please ensure Docker Desktop is properly installed." }
        
    } catch {
        Write-SubStep "Docker Compose check failed: $($_.Exception.Message)" -Status error
        Write-Log "Docker Compose check failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Test-Git {
    <#
    .SYNOPSIS
        Verifies Git is installed for cloning repository
    #>
    Write-SubStep "Checking Git installation..." -Status running
    
    try {
        $gitVersion = git --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Git is available: $gitVersion".Trim() -Status success
            Write-Log "Git verified: $gitVersion".Trim() -Level SUCCESS
            return @{ Success = $true; Version = $gitVersion.Trim() }
        }
        
        Write-SubStep "Git not found" -Status error
        Write-Log "Git is not installed" -Level ERROR
        return @{ Success = $false; Message = "Git is not installed. Please install Git from https://git-scm.com/downloads" }
        
    } catch {
        Write-SubStep "Git check failed: $($_.Exception.Message)" -Status error
        Write-Log "Git check failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Test-ExecutionPolicy {
    <#
    .SYNOPSIS
        Verifies PowerShell execution policy allows script execution
    #>
    Write-SubStep "Checking PowerShell execution policy..." -Status running
    
    try {
        $currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
        $allowedPolicies = @('Unrestricted', 'RemoteSigned', 'Bypass')
        
        if ($currentPolicy -in $allowedPolicies) {
            Write-SubStep "Execution policy: $currentPolicy (Allowed)" -Status success
            Write-Log "Execution policy is acceptable: $currentPolicy" -Level SUCCESS
            return @{ Success = $true; Policy = $currentPolicy }
        }
        
        # Try to set execution policy
        Write-SubStep "Setting execution policy to RemoteSigned..." -Status running
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        $newPolicy = Get-ExecutionPolicy -Scope CurrentUser
        
        Write-SubStep "Execution policy updated to: $newPolicy" -Status success
        Write-Log "Execution policy updated to: $newPolicy" -Level SUCCESS
        return @{ Success = $true; Policy = $newPolicy }
        
    } catch {
        Write-SubStep "Execution policy check failed: $($_.Exception.Message)" -Status warning
        Write-Log "Execution policy warning: $($_.Exception.Message)" -Level WARNING
        return @{ Success = $true; Policy = $currentPolicy; Warning = $_.Exception.Message }
    }
}

function Test-RequiredPorts {
    <#
    .SYNOPSIS
        Verifies required ports are available
    #>
    param (
        [int[]]$Ports = @($AppPort, $DatabasePort)
    )
    
    if ($SkipPortCheck) {
        Write-SubStep "Port check skipped by user request" -Status skip
        return @{ Success = $true }
    }
    
    Write-SubStep "Checking required ports: $($Ports -join ', ')..." -Status running
    
    $occupiedPorts = @()
    
    foreach ($port in $Ports) {
        try {
            $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
            $portInUse = $listener | Where-Object { $_.Port -eq $port }
            
            if ($portInUse) {
                $occupiedPorts += $port
                Write-SubStep "Port $port is in use" -Status warning
                Write-Log "Port $port is already in use" -Level WARNING
            } else {
                Write-SubStep "Port $port is available" -Status success
            }
        } catch {
            Write-SubStep "Could not check port $port : $($_.Exception.Message)" -Status warning
            Write-Log "Port check warning for $port : $($_.Exception.Message)" -Level WARNING
        }
    }
    
    if ($occupiedPorts.Count -gt 0) {
        # Check if it's our own containers
        $ourContainers = docker ps --filter "name=wsh-" --format "{{.Names}}" 2>$null
        $usingOurPorts = $false
        
        if ($ourContainers) {
            Write-SubStep "Found existing WSH containers, will reuse ports" -Status info
            $usingOurPorts = $true
        }
        
        if (-not $usingOurPorts -and -not $Force) {
            Write-SubStep "Ports $($occupiedPorts -join ', ') are occupied. Use -Force to proceed anyway." -Status error
            Write-Log "Required ports are occupied: $($occupiedPorts -join ', ')" -Level ERROR
            return @{
                Success = $false
                Message = "Required ports are occupied: $($occupiedPorts -join ', '). Use -Force to proceed or stop conflicting services."
            }
        }
    }
    
    Write-Log "Port verification completed" -Level SUCCESS
    return @{ Success = $true }
}

function Test-WorkingDirectory {
    <#
    .SYNOPSIS
        Verifies or creates the working directory
    #>
    Write-SubStep "Checking installation directory..." -Status running
    
    try {
        if (Test-Path $InstallPath) {
            # Check if it has files
            $existingFiles = Get-ChildItem -Path $InstallPath -ErrorAction SilentlyContinue
            if ($existingFiles) {
                if (-not $Force) {
                    Write-SubStep "Directory exists with files: $InstallPath" -Status warning
                    Write-Host ""
                    Write-Host "  Existing installation found at: $InstallPath" -ForegroundColor Yellow
                    Write-Host "  Do you want to overwrite it? (Y/N): " -NoNewline -ForegroundColor Cyan
                    $response = Read-Host
                    
                    if ($response -ne 'Y' -and $response -ne 'y') {
                        Write-SubStep "Installation cancelled by user" -Status error
                        return @{
                            Success = $false
                            Message = "Installation cancelled by user. Use -Force to overwrite automatically."
                        }
                    }
                }
                Write-SubStep "Existing installation will be overwritten" -Status warning
                Write-Log "Existing installation will be overwritten at: $InstallPath" -Level WARNING
            }
        }
        
        Write-SubStep "Installation directory ready: $InstallPath" -Status success
        Write-Log "Installation directory verified: $InstallPath" -Level SUCCESS
        return @{ Success = $true; Path = $InstallPath }
        
    } catch {
        Write-SubStep "Directory check failed: $($_.Exception.Message)" -Status error
        Write-Log "Directory check failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-PrerequisitesCheck {
    <#
    .SYNOPSIS
        Runs all prerequisite checks
    #>
    Write-StepHeader -StepNumber 1 -StepName "Prerequisites Check"
    
    $results = @{
        DockerDesktop   = $null
        DockerCompose   = $null
        Git             = $null
        ExecutionPolicy = $null
        Ports           = $null
        WorkingDir      = $null
    }
    
    # Check Docker Desktop
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Docker Desktop..." -PercentComplete 16
    $results.DockerDesktop = Test-DockerDesktop
    if (-not $results.DockerDesktop.Success) {
        return @{ Success = $false; Step = "Docker Desktop"; Results = $results; Message = $results.DockerDesktop.Message }
    }
    
    # Check Docker Compose
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Docker Compose..." -PercentComplete 32
    $results.DockerCompose = Test-DockerCompose
    if (-not $results.DockerCompose.Success) {
        return @{ Success = $false; Step = "Docker Compose"; Results = $results; Message = $results.DockerCompose.Message }
    }
    
    # Check Git
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Git..." -PercentComplete 48
    $results.Git = Test-Git
    if (-not $results.Git.Success) {
        return @{ Success = $false; Step = "Git"; Results = $results; Message = $results.Git.Message }
    }
    
    # Check Execution Policy
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Execution Policy..." -PercentComplete 64
    $results.ExecutionPolicy = Test-ExecutionPolicy
    
    # Check Ports
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Required Ports..." -PercentComplete 80
    $results.Ports = Test-RequiredPorts
    if (-not $results.Ports.Success) {
        return @{ Success = $false; Step = "Ports"; Results = $results; Message = $results.Ports.Message }
    }
    
    # Check Working Directory
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Installation Directory..." -PercentComplete 100
    $results.WorkingDir = Test-WorkingDirectory
    if (-not $results.WorkingDir.Success) {
        return @{ Success = $false; Step = "Working Directory"; Results = $results; Message = $results.WorkingDir.Message }
    }
    
    Write-Log "All prerequisites passed" -Level SUCCESS
    return @{ Success = $true; Results = $results }
}

# ============================================================================
# ENVIRONMENT PREPARATION FUNCTIONS
# ============================================================================

function New-InstallationDirectory {
    <#
    .SYNOPSIS
        Creates the installation directory structure
    #>
    Write-SubStep "Creating installation directory structure..." -Status running
    
    try {
        # Create main directory
        if (-not (Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }
        
        # Create subdirectories
        $subdirs = @(
            "uploads",
            "backups",
            "logs",
            "config"
        )
        
        foreach ($subdir in $subdirs) {
            $path = Join-Path $InstallPath $subdir
            if (-not (Test-Path $path)) {
                New-Item -ItemType Directory -Path $path -Force | Out-Null
            }
        }
        
        Write-SubStep "Directory structure created successfully" -Status success
        Write-Log "Created installation directory structure at: $InstallPath" -Level SUCCESS
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Failed to create directories: $($_.Exception.Message)" -Status error
        Write-Log "Failed to create directories: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function New-DockerVolumes {
    <#
    .SYNOPSIS
        Creates Docker volumes for persistent storage
    #>
    Write-SubStep "Creating Docker volumes..." -Status running
    
    try {
        $volumes = @(
            "wsh_postgres_data"
        )
        
        foreach ($volume in $volumes) {
            $existingVolume = docker volume ls -q --filter "name=$volume" 2>&1
            if ($existingVolume) {
                Write-SubStep "Volume '$volume' already exists" -Status info
            } else {
                docker volume create $volume | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-SubStep "Created volume: $volume" -Status success
                } else {
                    Write-SubStep "Failed to create volume: $volume" -Status warning
                }
            }
        }
        
        Write-Log "Docker volumes configured" -Level SUCCESS
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Docker volume creation failed: $($_.Exception.Message)" -Status error
        Write-Log "Docker volume creation failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-EnvironmentPreparation {
    <#
    .SYNOPSIS
        Prepares the environment for installation
    #>
    Write-StepHeader -StepNumber 2 -StepName "Environment Preparation"
    
    # Create directory structure
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating directories..." -PercentComplete 50
    $dirResult = New-InstallationDirectory
    if (-not $dirResult.Success) {
        return $dirResult
    }
    
    # Create Docker volumes
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating Docker volumes..." -PercentComplete 100
    $volResult = New-DockerVolumes
    if (-not $volResult.Success) {
        return $volResult
    }
    
    # NOTE: Don't create network - let Docker Compose manage it entirely
    # This avoids conflicts with network labels
    
    Write-Log "Environment preparation completed" -Level SUCCESS
    return @{ Success = $true }
}

# ============================================================================
# CONFIGURATION GENERATION FUNCTIONS
# ============================================================================

function New-EnvironmentFile {
    <#
    .SYNOPSIS
        Creates the environment configuration file
    #>
    Write-SubStep "Creating environment configuration file..." -Status running
    
    try {
        $envPath = Join-Path $InstallPath ".env"
        
        # Generate a secure JWT secret if not already set
        $jwtSecret = $script:Config.JwtSecret
        if ($jwtSecret -eq "your-super-secret-jwt-key-change-in-production") {
            $jwtSecret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
        }
        
        # Build Gemini API key line if provided
        $geminiLine = "# GEMINI_API_KEY=`"your-gemini-api-key`""
        if ($GeminiApiKey -ne "") {
            $geminiLine = "GEMINI_API_KEY=`"$GeminiApiKey`""
        }
        
        $envContent = @"
# ==============================================================================
# WSH (Weavenote Self Hosted) - Environment Configuration
# ==============================================================================
# Generated by WSH Installer on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ==============================================================================

# PostgreSQL Database Configuration
# -------------------------------
# IMPORTANT: Change these values for production!
DATABASE_URL="postgresql://$($script:Config.DbUser):$($script:Config.DbPassword)@postgres:5432/$($script:Config.DbName)?schema=public"
POSTGRES_USER="$($script:Config.DbUser)"
POSTGRES_PASSWORD="$($script:Config.DbPassword)"
POSTGRES_DB="$($script:Config.DbName)"

# JWT Configuration
# -------------------------------
# IMPORTANT: The JWT secret should be a strong, unique value!
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="$($script:Config.JwtExpiresIn)"

# Application Configuration
# -------------------------------
NEXT_PUBLIC_APP_NAME="$($script:Config.AppName)"
NEXT_PUBLIC_APP_URL="http://localhost:$AppPort"

# Admin Default Credentials
# -------------------------------
# [!] SECURITY WARNING: Change these credentials immediately after first login!
ADMIN_EMAIL="$($script:Config.AdminEmail)"
ADMIN_PASSWORD="$($script:Config.AdminPassword)"
ADMIN_USERNAME="$($script:Config.AdminUsername)"

# AI Configuration (Optional)
# -------------------------------
# Uncomment and add your API key to enable AI features
$geminiLine

# ==============================================================================
# PRODUCTION DEPLOYMENT NOTES:
# ==============================================================================
# 1. Change all passwords and secrets before deploying to production
# 2. Use a strong, unique JWT_SECRET (minimum 32 characters)
# 3. Change the default admin credentials immediately after first login
# 4. Consider using a reverse proxy (nginx, traefik) with HTTPS
# 5. Review and adjust the database credentials
# ==============================================================================
"@
        
        # Check if file exists and Force is specified
        if ((Test-Path $envPath) -and -not $Force) {
            Write-SubStep "Environment file already exists, preserving existing configuration" -Status info
            Write-Log "Existing .env file preserved" -Level INFO
        } else {
            $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
            Write-SubStep "Environment file created: $envPath" -Status success
            Write-Log "Created environment file at: $envPath" -Level SUCCESS
        }
        
        return @{ Success = $true; Path = $envPath }
        
    } catch {
        Write-SubStep "Failed to create environment file: $($_.Exception.Message)" -Status error
        Write-Log "Failed to create environment file: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function New-DockerComposeFile {
    <#
    .SYNOPSIS
        Creates the Docker Compose configuration file
    #>
    Write-SubStep "Creating Docker Compose configuration..." -Status running
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        # Build environment entries for app service
        $appEnvEntries = @(
            "      DATABASE_URL: ""postgresql://$($script:Config.DbUser):$($script:Config.DbPassword)@postgres:5432/$($script:Config.DbName)?schema=public""",
            "      JWT_SECRET: ""$($script:Config.JwtSecret)""",
            "      JWT_EXPIRES_IN: ""$($script:Config.JwtExpiresIn)""",
            "      NEXT_PUBLIC_APP_NAME: ""$($script:Config.AppName)""",
            "      NEXT_PUBLIC_APP_URL: ""http://localhost:$AppPort""",
            "      ADMIN_EMAIL: ""$($script:Config.AdminEmail)""",
            "      ADMIN_PASSWORD: ""$($script:Config.AdminPassword)""",
            "      ADMIN_USERNAME: ""$($script:Config.AdminUsername)"""
        )
        
        if ($GeminiApiKey -ne "") {
            $appEnvEntries += "      GEMINI_API_KEY: ""$GeminiApiKey"""
        }
        
        $appEnvBlock = $appEnvEntries -join "`n"
        
        # Base compose content with properly quoted values
        $composeContent = @"
# WSH Docker Compose Configuration
# Generated by WSH Installer

services:
  postgres:
    image: $($script:Config.PostgresImage)
    container_name: $($script:Config.PostgresContainer)
    restart: unless-stopped
    environment:
      POSTGRES_USER: "$($script:Config.DbUser)"
      POSTGRES_PASSWORD: "$($script:Config.DbPassword)"
      POSTGRES_DB: "$($script:Config.DbName)"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "$DatabasePort`:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $($script:Config.DbUser) -d $($script:Config.DbName)"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - wsh-network

  app:
    image: ghcr.io/141stfighterwing-collab/wsh:latest
    container_name: $($script:Config.AppContainer)
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
$appEnvBlock
    ports:
      - "$AppPort`:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - wsh-network
"@

        # Add pgAdmin if enabled
        if ($EnablePgAdmin) {
            $composeContent += @"

  pgadmin:
    image: $($script:Config.PgAdminImage)
    container_name: $($script:Config.PgAdminContainer)
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: "admin@wsh.local"
      PGADMIN_DEFAULT_PASSWORD: "admin"
      PGADMIN_LISTEN_PORT: "5050"
    ports:
      - "$PgAdminPort`:5050"
    depends_on:
      - postgres
    networks:
      - wsh-network
"@
        }

        # Add volumes and networks
        $composeContent += @"

volumes:
  postgres_data:
    name: wsh_postgres_data

networks:
  wsh-network:
    driver: bridge
"@

        # Write with ASCII encoding to avoid encoding issues
        [System.IO.File]::WriteAllText($composePath, $composeContent, [System.Text.Encoding]::UTF8)
        
        Write-SubStep "Docker Compose file created: $composePath" -Status success
        Write-Log "Created Docker Compose file at: $composePath" -Level SUCCESS
        
        return @{ Success = $true; Path = $composePath }
        
    } catch {
        Write-SubStep "Failed to create Docker Compose file: $($_.Exception.Message)" -Status error
        Write-Log "Failed to create Docker Compose file: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function New-DatabaseInitScript {
    <#
    .SYNOPSIS
        Creates database initialization scripts
    #>
    Write-SubStep "Creating database initialization scripts..." -Status running
    
    try {
        $initPath = Join-Path $InstallPath "config"
        $initFile = Join-Path $initPath "init-db.sql"
        
        $initContent = @"
-- ==============================================================================
-- WSH Database Initialization Script
-- ==============================================================================
-- This script creates the initial database structure and default data
-- Generated by WSH Installer on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- ==============================================================================

-- Note: The application will automatically create required tables via Prisma
-- This script can be used for additional initialization tasks

-- Set timezone
SET TIME ZONE 'UTC';

-- Create extensions (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE $($script:Config.DbName) TO $($script:Config.DbUser);
GRANT ALL PRIVILEGES ON SCHEMA public TO $($script:Config.DbUser);

-- Create audit log table (application will manage other tables)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Grant table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $($script:Config.DbUser);
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $($script:Config.DbUser);

-- ==============================================================================
-- Placeholder for production initialization
-- ==============================================================================
-- In production, you may want to:
-- 1. Create additional users with restricted permissions
-- 2. Set up read replicas
-- 3. Configure connection pooling
-- 4. Set up backup schedules
-- ==============================================================================
"@
        
        $initContent | Out-File -FilePath $initFile -Encoding UTF8 -Force
        
        Write-SubStep "Database init script created: $initFile" -Status success
        Write-Log "Created database init script at: $initFile" -Level SUCCESS
        
        return @{ Success = $true; Path = $initFile }
        
    } catch {
        Write-SubStep "Failed to create database init script: $($_.Exception.Message)" -Status error
        Write-Log "Failed to create database init script: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-ConfigurationGeneration {
    <#
    .SYNOPSIS
        Generates all configuration files
    #>
    Write-StepHeader -StepNumber 3 -StepName "Configuration Generation"
    
    # Create environment file
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating environment file..." -PercentComplete 33
    $envResult = New-EnvironmentFile
    if (-not $envResult.Success) {
        return $envResult
    }
    
    # Create Docker Compose file
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating Docker Compose file..." -PercentComplete 66
    $composeResult = New-DockerComposeFile
    if (-not $composeResult.Success) {
        return $composeResult
    }
    
    # Create database init script
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating database init script..." -PercentComplete 100
    $initResult = New-DatabaseInitScript
    if (-not $initResult.Success) {
        return $initResult
    }
    
    Write-Log "Configuration generation completed" -Level SUCCESS
    return @{ Success = $true }
}

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

function Start-DatabaseDeployment {
    <#
    .SYNOPSIS
        Deploys the PostgreSQL database
    #>
    Write-StepHeader -StepNumber 4 -StepName "Database Deployment"
    
    $composePath = Join-Path $InstallPath "docker-compose.yml"
    
    try {
        # Clean up old network before starting (fixes label conflict)
        Write-ProgressDetail -Activity "Deploying Database" -Status "Cleaning up old network..." -PercentComplete 10
        Write-SubStep "Cleaning up old Docker network..." -Status running
        
        # Stop any existing containers first
        docker compose -f "$composePath" down --remove-orphans 2>&1 | Out-Null
        
        # Force remove the network if it exists
        $existingNetwork = docker network ls -q --filter "name=wsh-network" 2>&1
        if ($existingNetwork) {
            docker network rm wsh-network 2>&1 | Out-Null
            Write-SubStep "Removed old network for fresh creation" -Status success
        } else {
            Write-SubStep "No existing network to clean up" -Status info
        }
        
        # Pull PostgreSQL image
        Write-ProgressDetail -Activity "Deploying Database" -Status "Pulling PostgreSQL image..." -PercentComplete 25
        Write-SubStep "Pulling PostgreSQL image: $($script:Config.PostgresImage)" -Status running
        docker pull $script:Config.PostgresImage 2>&1 | Out-Null
        Write-SubStep "PostgreSQL image pulled successfully" -Status success
        
        # Start PostgreSQL container
        Write-ProgressDetail -Activity "Deploying Database" -Status "Starting PostgreSQL container..." -PercentComplete 50
        Write-SubStep "Starting PostgreSQL container..." -Status running
        
        $composeCmd = "docker compose -f `"$composePath`" up -d postgres"
        Invoke-Expression $composeCmd
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to start PostgreSQL container" -Status error
            Write-Log "Failed to start PostgreSQL container" -Level ERROR
            return @{ Success = $false; Message = "Failed to start PostgreSQL container" }
        }
        
        Write-SubStep "PostgreSQL container started" -Status success
        
        # Wait for PostgreSQL to be ready
        Write-ProgressDetail -Activity "Deploying Database" -Status "Waiting for PostgreSQL to be ready..." -PercentComplete 75
        Write-SubStep "Waiting for PostgreSQL to be ready..." -Status running
        
        $retries = 0
        $maxRetries = $script:Config.MaxRetries
        $ready = $false
        
        while ($retries -lt $maxRetries) {
            $healthCheck = docker exec $script:Config.PostgresContainer pg_isready -U $script:Config.DbUser -d $script:Config.DbName 2>&1
            if ($LASTEXITCODE -eq 0) {
                $ready = $true
                break
            }
            
            $retries++
            Write-ProgressDetail -Activity "Deploying Database" -Status "Waiting for PostgreSQL... ($retries/$maxRetries)" -PercentComplete (75 + ($retries / $maxRetries * 20))
            Start-Sleep -Seconds $script:Config.RetryDelaySeconds
        }
        
        if (-not $ready) {
            Write-SubStep "PostgreSQL failed to become ready after $maxRetries attempts" -Status error
            Write-Log "PostgreSQL failed to become ready after $maxRetries attempts" -Level ERROR
            return @{ Success = $false; Message = "PostgreSQL failed to become ready" }
        }
        
        Write-SubStep "PostgreSQL is ready and accepting connections" -Status success
        Write-Log "PostgreSQL database deployed successfully" -Level SUCCESS
        
        Write-ProgressDetail -Activity "Deploying Database" -Status "PostgreSQL ready!" -PercentComplete 100
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Database deployment failed: $($_.Exception.Message)" -Status error
        Write-Log "Database deployment failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Start-ApplicationDeployment {
    <#
    .SYNOPSIS
        Deploys the WSH application
    #>
    Write-StepHeader -StepNumber 5 -StepName "Application Deployment"
    
    $composePath = Join-Path $InstallPath "docker-compose.yml"
    
    try {
        # Clone repository and build locally (registry image may not be available)
        Write-ProgressDetail -Activity "Deploying Application" -Status "Cloning WSH repository..." -PercentComplete 10
        Write-SubStep "Cloning WSH repository for local build..." -Status running
        
        $repoPath = Join-Path $InstallPath "wsh-source"
        if (Test-Path $repoPath) {
            Remove-Item -Path $repoPath -Recurse -Force
        }
        
        git clone https://github.com/141stfighterwing-collab/WSH.git $repoPath 2>&1 | Out-Null
        
        if (-not (Test-Path $repoPath)) {
            Write-SubStep "Failed to clone repository" -Status error
            Write-Log "Failed to clone WSH repository" -Level ERROR
            return @{ Success = $false; Message = "Failed to clone WSH repository" }
        }
        
        Write-SubStep "Repository cloned successfully" -Status success
        
        # Build Docker image locally
        Write-ProgressDetail -Activity "Deploying Application" -Status "Building WSH Docker image (this may take a few minutes)..." -PercentComplete 30
        Write-SubStep "Building WSH Docker image locally..." -Status running
        
        Push-Location $repoPath
        docker build -t wsh-app:latest . 2>&1 | Out-Null
        Pop-Location
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to build Docker image" -Status error
            Write-Log "Failed to build WSH Docker image" -Level ERROR
            return @{ Success = $false; Message = "Failed to build WSH Docker image" }
        }
        
        Write-SubStep "WSH Docker image built successfully" -Status success
        
        # Update docker-compose to use local image
        Write-ProgressDetail -Activity "Deploying Application" -Status "Updating configuration..." -PercentComplete 40
        $composeContent = Get-Content $composePath -Raw
        $composeContent = $composeContent -replace 'image: ghcr\.io/141stfighterwing-collab/wsh:latest', 'image: wsh-app:latest'
        [System.IO.File]::WriteAllText($composePath, $composeContent)
        
        # Start application container
        Write-ProgressDetail -Activity "Deploying Application" -Status "Starting WSH application..." -PercentComplete 50
        Write-SubStep "Starting WSH application container..." -Status running
        
        $composeCmd = "docker compose -f `"$composePath`" up -d app"
        Invoke-Expression $composeCmd
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to start WSH application container" -Status error
            Write-Log "Failed to start WSH application container" -Level ERROR
            return @{ Success = $false; Message = "Failed to start WSH application container" }
        }
        
        Write-SubStep "WSH application container started" -Status success
        
        # Wait for application to be ready
        Write-ProgressDetail -Activity "Deploying Application" -Status "Waiting for application to start..." -PercentComplete 75
        Write-SubStep "Waiting for application to start..." -Status running
        
        $retries = 0
        $maxRetries = $script:Config.MaxRetries
        $ready = $false
        
        while ($retries -lt $maxRetries) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$AppPort/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $ready = $true
                    break
                }
            } catch {
                # Continue waiting
            }
            
            $retries++
            Write-ProgressDetail -Activity "Deploying Application" -Status "Waiting for application... ($retries/$maxRetries)" -PercentComplete (75 + ($retries / $maxRetries * 20))
            Start-Sleep -Seconds $script:Config.RetryDelaySeconds
        }
        
        if (-not $ready) {
            Write-SubStep "Application failed to become ready after $maxRetries attempts" -Status error
            Write-Log "Application failed to become ready after $maxRetries attempts" -Level ERROR
            return @{ Success = $false; Message = "Application failed to become ready" }
        }
        
        Write-SubStep "WSH application is ready!" -Status success
        Write-Log "WSH application deployed successfully" -Level SUCCESS
        
        Write-ProgressDetail -Activity "Deploying Application" -Status "Application ready!" -PercentComplete 100
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Application deployment failed: $($_.Exception.Message)" -Status error
        Write-Log "Application deployment failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

function Invoke-HealthValidation {
    <#
    .SYNOPSIS
        Validates the health of all services
    #>
    Write-StepHeader -StepNumber 6 -StepName "Health Validation"
    
    try {
        # Check database connectivity
        Write-ProgressDetail -Activity "Validating Health" -Status "Checking database connectivity..." -PercentComplete 25
        Write-SubStep "Checking database connectivity..." -Status running
        
        $dbCheck = docker exec $script:Config.PostgresContainer pg_isready -U $script:Config.DbUser -d $script:Config.DbName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Database connectivity: OK" -Status success
        } else {
            Write-SubStep "Database connectivity: FAILED" -Status error
            return @{ Success = $false; Message = "Database connectivity check failed" }
        }
        
        # Check application health endpoint
        Write-ProgressDetail -Activity "Validating Health" -Status "Checking application health endpoint..." -PercentComplete 50
        Write-SubStep "Checking application health endpoint..." -Status running
        
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:$AppPort/api/health" -TimeoutSec 10
            if ($healthResponse.StatusCode -eq 200) {
                Write-SubStep "Application health endpoint: OK" -Status success
            } else {
                Write-SubStep "Application health endpoint returned: $($healthResponse.StatusCode)" -Status warning
            }
        } catch {
            Write-SubStep "Application health endpoint check warning: $($_.Exception.Message)" -Status warning
        }
        
        # Check application is responding
        Write-ProgressDetail -Activity "Validating Health" -Status "Checking application response..." -PercentComplete 75
        Write-SubStep "Checking application is responding..." -Status running
        
        try {
            $appResponse = Invoke-WebRequest -Uri "http://localhost:$AppPort" -TimeoutSec 10
            if ($appResponse.StatusCode -eq 200) {
                Write-SubStep "Application is responding: OK" -Status success
            } else {
                Write-SubStep "Application returned status: $($appResponse.StatusCode)" -Status warning
            }
        } catch {
            Write-SubStep "Application response check warning: $($_.Exception.Message)" -Status warning
        }
        
        # Check container status
        Write-ProgressDetail -Activity "Validating Health" -Status "Verifying container status..." -PercentComplete 100
        Write-SubStep "Checking container status..." -Status running
        
        $containers = docker ps --filter "name=wsh-" --format "{{.Names}}: {{.Status}}"
        foreach ($container in $containers) {
            Write-SubStep "Container: $container" -Status info
        }
        
        Write-Log "Health validation completed" -Level SUCCESS
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Health validation failed: $($_.Exception.Message)" -Status error
        Write-Log "Health validation failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-Finalization {
    <#
    .SYNOPSIS
        Finalizes the installation
    #>
    Write-StepHeader -StepNumber 7 -StepName "Finalization"
    
    try {
        # Create desktop shortcut (optional)
        Write-ProgressDetail -Activity "Finalizing" -Status "Creating shortcuts..." -PercentComplete 33
        Write-SubStep "Creating desktop shortcut..." -Status running
        
        $shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "WSH.url"
        $shortcutContent = @"
[InternetShortcut]
URL=http://localhost:$AppPort
IconFile=C:\Windows\System32\SHELL32.dll
IconIndex=14
"@
        $shortcutContent | Out-File -FilePath $shortcutPath -Encoding ASCII -Force
        Write-SubStep "Desktop shortcut created" -Status success
        
        # Save installation info
        Write-ProgressDetail -Activity "Finalizing" -Status "Saving installation info..." -PercentComplete 66
        Write-SubStep "Saving installation information..." -Status running
        
        $installInfo = @{
            InstallDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            InstallPath = $InstallPath
            AppPort = $AppPort
            DatabasePort = $DatabasePort
            Version = $script:Config.AppVersion
            EnablePgAdmin = $EnablePgAdmin
            PgAdminPort = $PgAdminPort
        }
        
        $installInfoPath = Join-Path $InstallPath "install-info.json"
        $installInfo | ConvertTo-Json | Out-File -FilePath $installInfoPath -Encoding UTF8 -Force
        Write-SubStep "Installation info saved to: $installInfoPath" -Status success
        
        # Display final summary
        Write-ProgressDetail -Activity "Finalizing" -Status "Installation complete!" -PercentComplete 100
        Write-Log "Installation finalized" -Level SUCCESS
        
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Finalization warning: $($_.Exception.Message)" -Status warning
        Write-Log "Finalization warning: $($_.Exception.Message)" -Level WARNING
        return @{ Success = $true }  # Continue even if finalization has minor issues
    }
}

# ============================================================================
# UNINSTALL FUNCTIONS
# ============================================================================

function Invoke-Uninstall {
    <#
    .SYNOPSIS
        Uninstalls WSH
    #>
    Write-LogHeader
    
    Write-Host "                    WSH UNINSTALLER" -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor DarkGray
    Write-Host ""
    
    $composePath = Join-Path $InstallPath "docker-compose.yml"
    
    # Check if installation exists
    if (-not (Test-Path $composePath)) {
        Write-Host "[!] No installation found at: $InstallPath" -ForegroundColor Yellow
        return
    }
    
    # Stop and remove containers
    Write-Host "[...] Stopping containers..." -ForegroundColor Yellow
    docker compose -f $composePath down 2>&1 | Out-Null
    
    # Remove volumes if requested
    if ($RemoveData) {
        Write-Host "[...] Removing Docker volumes..." -ForegroundColor Yellow
        docker volume rm wsh_postgres_data 2>&1 | Out-Null
    }
    
    # Remove installation directory
    Write-Host "[...] Removing installation files..." -ForegroundColor Yellow
    Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
    
    # Remove desktop shortcut
    $shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "WSH.url"
    if (Test-Path $shortcutPath) {
        Remove-Item -Path $shortcutPath -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host ""
    Write-Host "[OK] WSH has been uninstalled successfully!" -ForegroundColor Green
    
    if (-not $RemoveData) {
        Write-Host "[!] Note: Database volume was preserved. Use -RemoveData to remove all data." -ForegroundColor Yellow
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Main {
    # Display header
    Write-LogHeader
    
    # Handle uninstall mode
    if ($Uninstall) {
        Invoke-Uninstall
        return
    }
    
    # Store install path for logging
    $script:InstallPath = $InstallPath
    
    Write-Log "Starting WSH installation" -Level INFO
    Write-Log "Install path: $InstallPath" -Level INFO
    Write-Log "App port: $AppPort" -Level INFO
    Write-Log "Database port: $DatabasePort" -Level INFO
    
    # Execute installation phases
    $prereqResult = Invoke-PrerequisitesCheck
    if (-not $prereqResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Prerequisites check failed: $($prereqResult.Message)"
        exit 1
    }
    
    $envResult = Invoke-EnvironmentPreparation
    if (-not $envResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Environment preparation failed: $($envResult.Message)"
        exit 1
    }
    
    $configResult = Invoke-ConfigurationGeneration
    if (-not $configResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Configuration generation failed: $($configResult.Message)"
        exit 1
    }
    
    $dbResult = Start-DatabaseDeployment
    if (-not $dbResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Database deployment failed: $($dbResult.Message)"
        exit 1
    }
    
    $appResult = Start-ApplicationDeployment
    if (-not $appResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Application deployment failed: $($appResult.Message)"
        exit 1
    }
    
    $healthResult = Invoke-HealthValidation
    if (-not $healthResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Health validation failed: $($healthResult.Message)"
        exit 1
    }
    
    $finalResult = Invoke-Finalization
    if (-not $finalResult.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Finalization failed: $($finalResult.Message)"
        exit 1
    }
    
    # Success!
    Write-FinalSummary -Success $true
    Write-Log "Installation completed successfully" -Level SUCCESS
    
    # Open browser
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:$AppPort"
}

# Run main function
Main
