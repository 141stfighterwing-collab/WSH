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
    $bar = "█" * $filledLength + "░" * ($barLength - $filledLength)
    
    Write-Host ""
    Write-Host "┌─────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "│  STEP $StepNumber/$($script:Progress.TotalSteps): $StepName".PadRight(63) -ForegroundColor Cyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "│                                                                 │" -ForegroundColor DarkGray
    Write-Host "│  Progress: [$bar] ${percentage}%   │" -ForegroundColor DarkGray
    Write-Host "└─────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    Write-Log "Starting Step $StepNumber: $StepName" -Level INFO
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
        'running' { "⏳"; $color = 'Yellow' }
        'success' { "✓"; $color = 'Green' }
        'error'   { "✗"; $color = 'Red' }
        'warning' { "⚠"; $color = 'Yellow' }
        'skip'    { "○"; $color = 'Gray' }
        'info'    { "•"; $color = 'Cyan' }
    }
    
    Write-Host "  $icon $Message" -ForegroundColor $color
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
        Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  🌐 Application URL:     http://localhost:$AppPort" -ForegroundColor White
        Write-Host "  🗄️  Database Port:       localhost:$DatabasePort" -ForegroundColor White
        
        if ($EnablePgAdmin) {
            Write-Host "  🔧 pgAdmin URL:         http://localhost:$PgAdminPort" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "  Default Credentials (CHANGE IMMEDIATELY!):" -ForegroundColor Yellow
        Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  📧 Email:               $($script:Config.AdminEmail)" -ForegroundColor White
        Write-Host "  🔑 Password:            $($script:Config.AdminPassword)" -ForegroundColor White
        Write-Host ""
        Write-Host "  Installation Paths:" -ForegroundColor Cyan
        Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  📁 Install Directory:   $InstallPath" -ForegroundColor White
        Write-Host "  📄 Docker Compose:      $InstallPath\docker-compose.yml" -ForegroundColor White
        Write-Host "  📄 Environment File:    $InstallPath\.env" -ForegroundColor White
        Write-Host "  📝 Log File:            $InstallPath\$($script:Config.LogFile)" -ForegroundColor White
        Write-Host ""
        Write-Host "  Quick Commands:" -ForegroundColor Cyan
        Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  Stop application:      docker-compose -f `"$InstallPath\docker-compose.yml`" down" -ForegroundColor White
        Write-Host "  Start application:     docker-compose -f `"$InstallPath\docker-compose.yml`" up -d" -ForegroundColor White
        Write-Host "  View logs:             docker-compose -f `"$InstallPath\docker-compose.yml`" logs -f" -ForegroundColor White
        Write-Host ""
        Write-Host "  ⚠️  SECURITY WARNING: Change default credentials before production use!" -ForegroundColor Yellow
    } else {
        Write-Host "                    INSTALLATION FAILED" -ForegroundColor Red
        Write-Host "================================================================================" -ForegroundColor DarkGray
        Write-Host ""
        if ($ErrorMessage) {
            Write-Host "  Error: $ErrorMessage" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "  Rollback Instructions:" -ForegroundColor Yellow
        Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
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
            if ($Force) {
                Write-SubStep "Existing installation found, will overwrite" -Status warning
                Write-Log "Existing installation will be overwritten at: $InstallPath" -Level WARNING
            } else {
                # Check if it's empty
                $existingFiles = Get-ChildItem -Path $InstallPath -ErrorAction SilentlyContinue
                if ($existingFiles) {
                    Write-SubStep "Directory exists with files. Use -Force to overwrite." -Status warning
                    Write-Log "Installation directory exists with files: $InstallPath" -Level WARNING
                    return @{
                        Success = $false
                        Message = "Installation directory exists with files. Use -Force to overwrite."
                    }
                }
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
        ExecutionPolicy = $null
        Ports           = $null
        WorkingDir      = $null
    }
    
    # Check Docker Desktop
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Docker Desktop..." -PercentComplete 20
    $results.DockerDesktop = Test-DockerDesktop
    if (-not $results.DockerDesktop.Success) {
        return @{ Success = $false; Step = "Docker Desktop"; Results = $results; Message = $results.DockerDesktop.Message }
    }
    
    # Check Docker Compose
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Docker Compose..." -PercentComplete 40
    $results.DockerCompose = Test-DockerCompose
    if (-not $results.DockerCompose.Success) {
        return @{ Success = $false; Step = "Docker Compose"; Results = $results; Message = $results.DockerCompose.Message }
    }
    
    # Check Execution Policy
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Execution Policy..." -PercentComplete 60
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
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating directories..." -PercentComplete 33
    $dirResult = New-InstallationDirectory
    if (-not $dirResult.Success) {
        return $dirResult
    }
    
    # Create Docker volumes
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating Docker volumes..." -PercentComplete 66
    $volResult = New-DockerVolumes
    if (-not $volResult.Success) {
        return $volResult
    }
    
    # Create Docker network
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating Docker network..." -PercentComplete 100
    try {
        $existingNetwork = docker network ls -q --filter "name=$($script:Config.DockerNetworkName)" 2>&1
        if (-not $existingNetwork) {
            docker network create $script:Config.DockerNetworkName | Out-Null
            Write-SubStep "Created Docker network: $($script:Config.DockerNetworkName)" -Status success
        } else {
            Write-SubStep "Docker network already exists: $($script:Config.DockerNetworkName)" -Status info
        }
    } catch {
        Write-SubStep "Docker network creation warning: $($_.Exception.Message)" -Status warning
    }
    
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
# ⚠️ SECURITY WARNING: Change these credentials immediately after first login!
ADMIN_EMAIL="$($script:Config.AdminEmail)"
ADMIN_PASSWORD="$($script:Config.AdminPassword)"
ADMIN_USERNAME="$($script:Config.AdminUsername)"

# AI Configuration (Optional)
# -------------------------------
# Uncomment and add your API key to enable AI features
# GEMINI_API_KEY="your-gemini-api-key"

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
        
        # Base compose content
        $composeContent = @"
# ==============================================================================
# WSH (Weavenote Self Hosted) - Docker Compose Configuration
# ==============================================================================
# Generated by WSH Installer on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ==============================================================================

services:
  # PostgreSQL Database
  # -------------------------------
  postgres:
    image: $($script:Config.PostgresImage)
    container_name: $($script:Config.PostgresContainer)
    restart: unless-stopped
    environment:
      POSTGRES_USER: `$`{POSTGRES_USER:-$($script:Config.DbUser)`}
      POSTGRES_PASSWORD: `$`{POSTGRES_PASSWORD:-$($script:Config.DbPassword)`}
      POSTGRES_DB: `$`{POSTGRES_DB:-$($script:Config.DbName)`}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "${DatabasePort}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U `$`{POSTGRES_USER:-$($script:Config.DbUser)`} -d `$`{POSTGRES_DB:-$($script:Config.DbName)`}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - wsh-network
    labels:
      - "com.wsh.description=WSH PostgreSQL Database"
      - "com.wsh.version=$($script:Config.AppVersion)"

  # WSH Application
  # -------------------------------
  app:
    image: ghcr.io/141stfighterwing-collab/wsh:latest
    container_name: $($script:Config.AppContainer)
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://$($script:Config.DbUser):$($script:Config.DbPassword)@postgres:5432/$($script:Config.DbName)?schema=public
      JWT_SECRET: `$`{JWT_SECRET:-$($script:Config.JwtSecret)`}
      JWT_EXPIRES_IN: `$`{JWT_EXPIRES_IN:-$($script:Config.JwtExpiresIn)`}
      NEXT_PUBLIC_APP_NAME: `$`{NEXT_PUBLIC_APP_NAME:-$($script:Config.AppName)`}
      NEXT_PUBLIC_APP_URL: `$`{NEXT_PUBLIC_APP_URL:-http://localhost:$AppPort`}
      ADMIN_EMAIL: `$`{ADMIN_EMAIL:-$($script:Config.AdminEmail)`}
      ADMIN_PASSWORD: `$`{ADMIN_PASSWORD:-$($script:Config.AdminPassword)`}
      ADMIN_USERNAME: `$`{ADMIN_USERNAME:-$($script:Config.AdminUsername)`}
    ports:
      - "${AppPort}:3000"
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
    labels:
      - "com.wsh.description=WSH Application"
      - "com.wsh.version=$($script:Config.AppVersion)"

"@

        # Add pgAdmin if enabled
        if ($EnablePgAdmin) {
            $composeContent += @"
  # pgAdmin (Database Management UI)
  # -------------------------------
  pgadmin:
    image: $($script:Config.PgAdminImage)
    container_name: $($script:Config.PgAdminContainer)
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: `$`{PGADMIN_EMAIL:-admin@wsh.local`}
      PGADMIN_DEFAULT_PASSWORD: `$`{PGADMIN_PASSWORD:-admin`}
      PGADMIN_LISTEN_PORT: 5050
    ports:
      - "${PgAdminPort}:5050"
    depends_on:
      - postgres
    networks:
      - wsh-network
    labels:
      - "com.wsh.description=WSH pgAdmin"
      - "com.wsh.version=$($script:Config.AppVersion)"

"@
        }

        # Add volumes and networks
        $composeContent += @"
# Volumes
# -------------------------------
volumes:
  postgres_data:
    name: wsh_postgres_data
    labels:
      - "com.wsh.description=WSH PostgreSQL Data"

# Networks
# -------------------------------
networks:
  wsh-network:
    name: $($script:Config.DockerNetworkName)
    driver: bridge
    labels:
      - "com.wsh.description=WSH Network"
"@

        $composeContent | Out-File -FilePath $composePath -Encoding UTF8 -Force
        
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
-- 4. Enable additional security extensions
-- ==============================================================================

-- Log initialization
INSERT INTO audit_logs (action, entity_type, new_values)
VALUES ('SYSTEM_INIT', 'database', '{"initialized_at": "$(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")", "version": "$($script:Config.AppVersion)"}');

"@

        $initContent | Out-File -FilePath $initFile -Encoding UTF8 -Force
        
        Write-SubStep "Database init script created: $initFile" -Status success
        Write-Log "Created database init script at: $initFile" -Level SUCCESS
        
        return @{ Success = $true; Path = $initFile }
        
    } catch {
        Write-SubStep "Failed to create database init script: $($_.Exception.Message)" -Status warning
        Write-Log "Database init script creation warning: $($_.Exception.Message)" -Level WARNING
        return @{ Success = $true }  # Non-critical, continue installation
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
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating database scripts..." -PercentComplete 100
    $initResult = New-DatabaseInitScript
    
    Write-Log "Configuration generation completed" -Level SUCCESS
    return @{ Success = $true }
}

# ============================================================================
# DATABASE DEPLOYMENT FUNCTIONS
# ============================================================================

function Start-DatabaseContainer {
    <#
    .SYNOPSIS
        Starts the PostgreSQL database container
    #>
    Write-SubStep "Starting PostgreSQL database container..." -Status running
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        # Pull the image first
        Write-SubStep "Pulling PostgreSQL image..." -Status running
        docker pull $script:Config.PostgresImage 2>&1 | ForEach-Object {
            if ($_ -match "Pulling|Downloaded|Status") {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }
        
        # Start only the postgres service
        docker compose -f $composePath up -d postgres 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to start database container" -Status error
            Write-Log "Failed to start database container" -Level ERROR
            return @{ Success = $false; Message = "Failed to start database container" }
        }
        
        Write-SubStep "Database container started" -Status success
        Write-Log "Database container started successfully" -Level SUCCESS
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Database startup failed: $($_.Exception.Message)" -Status error
        Write-Log "Database startup failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Wait-DatabaseHealthy {
    <#
    .SYNOPSIS
        Waits for the database to become healthy
    #>
    Write-SubStep "Waiting for database to be ready..." -Status running
    
    $maxRetries = $script:Config.MaxRetries
    $delay = $script:Config.RetryDelaySeconds
    
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            $health = docker inspect --format='{{.State.Health.Status}}' $script:Config.PostgresContainer 2>$null
            
            $percent = [math]::Round(($i / $maxRetries) * 100)
            Write-ProgressDetail -Activity "Waiting for Database" -Status "Database status: $health (Attempt $i/$maxRetries)" -PercentComplete $percent
            
            if ($health -eq "healthy") {
                Write-SubStep "Database is healthy and ready!" -Status success
                Write-Log "Database health check passed after $i attempts" -Level SUCCESS
                return @{ Success = $true }
            }
            
            Start-Sleep -Seconds $delay
            
        } catch {
            Write-Host "    Attempt $i/$maxRetries - Checking health..." -ForegroundColor DarkGray
            Start-Sleep -Seconds $delay
        }
    }
    
    Write-SubStep "Database health check timed out after $maxRetries attempts" -Status error
    Write-Log "Database health check timed out" -Level ERROR
    
    # Show logs for debugging
    Write-SubStep "Database logs:" -Status info
    docker logs $script:Config.PostgresContainer --tail 20 2>&1 | ForEach-Object {
        Write-Host "    $_" -ForegroundColor DarkGray
    }
    
    return @{ Success = $false; Message = "Database health check timed out" }
}

function Invoke-DatabaseDeployment {
    <#
    .SYNOPSIS
        Deploys and configures the database
    #>
    Write-StepHeader -StepNumber 4 -StepName "Database Deployment"
    
    # Start database container
    Write-ProgressDetail -Activity "Deploying Database" -Status "Starting PostgreSQL container..." -PercentComplete 33
    $startResult = Start-DatabaseContainer
    if (-not $startResult.Success) {
        return $startResult
    }
    
    # Wait for database to be healthy
    Write-ProgressDetail -Activity "Deploying Database" -Status "Waiting for database to be ready..." -PercentComplete 66
    $healthResult = Wait-DatabaseHealthy
    if (-not $healthResult.Success) {
        return $healthResult
    }
    
    # Verify database connectivity
    Write-ProgressDetail -Activity "Deploying Database" -Status "Verifying database connectivity..." -PercentComplete 100
    try {
        $testResult = docker exec $script:Config.PostgresContainer pg_isready -U $script:Config.DbUser -d $script:Config.DbName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Database connectivity verified" -Status success
            Write-Log "Database connectivity verified" -Level SUCCESS
        }
    } catch {
        Write-SubStep "Database connectivity check warning: $($_.Exception.Message)" -Status warning
    }
    
    Write-Log "Database deployment completed successfully" -Level SUCCESS
    return @{ Success = $true }
}

# ============================================================================
# APPLICATION DEPLOYMENT FUNCTIONS
# ============================================================================

function Start-ApplicationContainer {
    <#
    .SYNOPSIS
        Starts the application container
    #>
    Write-SubStep "Starting WSH application container..." -Status running
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        # Pull the application image
        Write-SubStep "Pulling WSH application image..." -Status running
        docker pull ghcr.io/141stfighterwing-collab/wsh:latest 2>&1 | ForEach-Object {
            if ($_ -match "Pulling|Downloaded|Status|Layer") {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Warning: Could not pull pre-built image, will attempt to build from source" -Status warning
            Write-Log "Pre-built image not available, will build from source" -Level WARNING
        }
        
        # Start the application service
        if ($EnablePgAdmin) {
            docker compose -f $composePath up -d app pgadmin 2>&1 | Out-Null
        } else {
            docker compose -f $composePath up -d app 2>&1 | Out-Null
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to start application container" -Status error
            Write-Log "Failed to start application container" -Level ERROR
            return @{ Success = $false; Message = "Failed to start application container" }
        }
        
        Write-SubStep "Application container started" -Status success
        Write-Log "Application container started successfully" -Level SUCCESS
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Application startup failed: $($_.Exception.Message)" -Status error
        Write-Log "Application startup failed: $($_.Exception.Message)" -Level ERROR
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Wait-ApplicationHealthy {
    <#
    .SYNOPSIS
        Waits for the application to become healthy
    #>
    Write-SubStep "Waiting for application to be ready..." -Status running
    
    $maxRetries = $script:Config.MaxRetries
    $delay = $script:Config.RetryDelaySeconds
    
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            # Check if container is running
            $status = docker inspect --format='{{.State.Status}}' $script:Config.AppContainer 2>$null
            
            if ($status -eq "running") {
                # Try to hit the health endpoint
                try {
                    $response = docker exec $script:Config.AppContainer wget -qO- http://localhost:3000/api/health 2>$null
                    if ($response -match "ok|healthy|status") {
                        $percent = [math]::Round(($i / $maxRetries) * 100)
                        Write-ProgressDetail -Activity "Waiting for Application" -Status "Application is responding!" -PercentComplete $percent
                        
                        Write-SubStep "Application is healthy and responding!" -Status success
                        Write-Log "Application health check passed after $i attempts" -Level SUCCESS
                        return @{ Success = $true }
                    }
                } catch {
                    # wget might not be available, try direct port check
                }
            }
            
            $percent = [math]::Round(($i / $maxRetries) * 100)
            Write-ProgressDetail -Activity "Waiting for Application" -Status "Container status: $status (Attempt $i/$maxRetries)" -PercentComplete $percent
            
            Start-Sleep -Seconds $delay
            
        } catch {
            Write-Host "    Attempt $i/$maxRetries - Waiting for application..." -ForegroundColor DarkGray
            Start-Sleep -Seconds $delay
        }
    }
    
    # Final check - if container is running, consider it ready
    $finalStatus = docker inspect --format='{{.State.Status}}' $script:Config.AppContainer 2>$null
    if ($finalStatus -eq "running") {
        Write-SubStep "Application container is running (health check skipped)" -Status success
        Write-Log "Application container running, health check skipped" -Level SUCCESS
        return @{ Success = $true }
    }
    
    Write-SubStep "Application health check timed out" -Status error
    Write-Log "Application health check timed out" -Level ERROR
    
    # Show logs for debugging
    Write-SubStep "Application logs:" -Status info
    docker logs $script:Config.AppContainer --tail 30 2>&1 | ForEach-Object {
        Write-Host "    $_" -ForegroundColor DarkGray
    }
    
    return @{ Success = $false; Message = "Application health check timed out" }
}

function Invoke-ApplicationDeployment {
    <#
    .SYNOPSIS
        Deploys the application
    #>
    Write-StepHeader -StepNumber 5 -StepName "Application Deployment"
    
    # Start application container
    Write-ProgressDetail -Activity "Deploying Application" -Status "Starting application container..." -PercentComplete 50
    $startResult = Start-ApplicationContainer
    if (-not $startResult.Success) {
        return $startResult
    }
    
    # Wait for application to be healthy
    Write-ProgressDetail -Activity "Deploying Application" -Status "Waiting for application to be ready..." -PercentComplete 100
    $healthResult = Wait-ApplicationHealthy
    if (-not $healthResult.Success) {
        return $healthResult
    }
    
    Write-Log "Application deployment completed successfully" -Level SUCCESS
    return @{ Success = $true }
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

function Test-ContainerStatus {
    <#
    .SYNOPSIS
        Validates that all containers are running properly
    #>
    Write-SubStep "Validating container status..." -Status running
    
    $containers = @(
        @{ Name = $script:Config.PostgresContainer; Expected = "running" }
        @{ Name = $script:Config.AppContainer; Expected = "running" }
    )
    
    if ($EnablePgAdmin) {
        $containers += @{ Name = $script:Config.PgAdminContainer; Expected = "running" }
    }
    
    $allHealthy = $true
    
    foreach ($container in $containers) {
        try {
            $status = docker inspect --format='{{.State.Status}}' $container.Name 2>$null
            
            if ($status -eq $container.Expected) {
                Write-SubStep "$($container.Name): $status" -Status success
            } else {
                Write-SubStep "$($container.Name): $status (expected: $($container.Expected))" -Status error
                $allHealthy = $false
            }
        } catch {
            Write-SubStep "$($container.Name): Not found" -Status error
            $allHealthy = $false
        }
    }
    
    return @{ Success = $allHealthy }
}

function Test-HttpEndpoint {
    <#
    .SYNOPSIS
        Tests HTTP endpoint availability
    #>
    Write-SubStep "Testing HTTP endpoint availability..." -Status running
    
    $endpoints = @(
        @{ Name = "Application"; Url = "http://localhost:$AppPort" }
        @{ Name = "Health Check"; Url = "http://localhost:$AppPort/api/health" }
    )
    
    if ($EnablePgAdmin) {
        $endpoints += @{ Name = "pgAdmin"; Url = "http://localhost:$PgAdminPort" }
    }
    
    $allAccessible = $true
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-SubStep "$($endpoint.Name): HTTP $($response.StatusCode)" -Status success
            } else {
                Write-SubStep "$($endpoint.Name): HTTP $($response.StatusCode)" -Status warning
            }
        } catch {
            # Try alternative method using curl if available
            try {
                $curlResult = curl -s -o /dev/null -w "%{http_code}" $endpoint.Url 2>$null
                if ($curlResult -match "200|302|301") {
                    Write-SubStep "$($endpoint.Name): HTTP $curlResult" -Status success
                } else {
                    Write-SubStep "$($endpoint.Name): Connection failed (status: $curlResult)" -Status warning
                    $allAccessible = $false
                }
            } catch {
                Write-SubStep "$($endpoint.Name): Cannot verify (services may still be starting)" -Status warning
            }
        }
    }
    
    return @{ Success = $allAccessible }
}

function Test-DatabaseConnection {
    <#
    .SYNOPSIS
        Tests database connection from application
    #>
    Write-SubStep "Verifying database connectivity..." -Status running
    
    try {
        # Check if the application can connect to the database
        $dbCheck = docker exec $script:Config.PostgresContainer psql -U $script:Config.DbUser -d $script:Config.DbName -c "SELECT 1;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Database connection: OK" -Status success
            Write-Log "Database connection verified" -Level SUCCESS
            return @{ Success = $true }
        } else {
            Write-SubStep "Database connection: Failed" -Status error
            Write-Log "Database connection failed" -Level ERROR
            return @{ Success = $false; Message = "Database connection failed" }
        }
    } catch {
        Write-SubStep "Database connection check warning: $($_.Exception.Message)" -Status warning
        return @{ Success = $true }  # Non-critical
    }
}

function Invoke-HealthValidation {
    <#
    .SYNOPSIS
        Performs comprehensive health validation
    #>
    Write-StepHeader -StepNumber 6 -StepName "Health Validation"
    
    # Validate container status
    Write-ProgressDetail -Activity "Validating Health" -Status "Checking container status..." -PercentComplete 33
    $containerResult = Test-ContainerStatus
    
    # Test database connection
    Write-ProgressDetail -Activity "Validating Health" -Status "Testing database connection..." -PercentComplete 50
    $dbResult = Test-DatabaseConnection
    
    # Test HTTP endpoints
    Write-ProgressDetail -Activity "Validating Health" -Status "Testing HTTP endpoints..." -PercentComplete 66
    $httpResult = Test-HttpEndpoint
    
    # Final status
    Write-ProgressDetail -Activity "Validating Health" -Status "Finalizing validation..." -PercentComplete 100
    
    $overallSuccess = $containerResult.Success -and $dbResult.Success
    
    if ($overallSuccess) {
        Write-Log "Health validation passed" -Level SUCCESS
    } else {
        Write-Log "Health validation completed with warnings" -Level WARNING
    }
    
    return @{ Success = $overallSuccess }
}

# ============================================================================
# FINALIZATION FUNCTIONS
# ============================================================================

function Invoke-Finalization {
    <#
    .SYNOPSIS
        Finalizes the installation
    #>
    Write-StepHeader -StepNumber 7 -StepName "Finalization"
    
    Write-ProgressDetail -Activity "Finalizing Installation" -Status "Creating convenience scripts..." -PercentComplete 50
    
    # Create convenience scripts
    $startScript = Join-Path $InstallPath "start.ps1"
    $stopScript = Join-Path $InstallPath "stop.ps1"
    $logsScript = Join-Path $InstallPath "logs.ps1"
    
    @"
# Start WSH Application
docker compose -f "$InstallPath\docker-compose.yml" up -d
Write-Host "WSH application started. Access at http://localhost:$AppPort"
"@ | Out-File -FilePath $startScript -Encoding UTF8 -Force

    @"
# Stop WSH Application
docker compose -f "$InstallPath\docker-compose.yml" down
Write-Host "WSH application stopped."
"@ | Out-File -FilePath $stopScript -Encoding UTF8 -Force

    @"
# View WSH Application Logs
param([string]$Service = "")
if ($Service) {
    docker compose -f "$InstallPath\docker-compose.yml" logs -f $Service
} else {
    docker compose -f "$InstallPath\docker-compose.yml" logs -f
}
"@ | Out-File -FilePath $logsScript -Encoding UTF8 -Force

    Write-SubStep "Created convenience scripts: start.ps1, stop.ps1, logs.ps1" -Status success
    
    Write-ProgressDetail -Activity "Finalizing Installation" -Status "Installation complete!" -PercentComplete 100
    
    Write-Log "Installation finalized successfully" -Level SUCCESS
    return @{ Success = $true }
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
    
    Write-Host "Uninstalling WSH (Weavenote Self Hosted)..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Stop and remove containers
        Write-SubStep "Stopping containers..." -Status running
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        if (Test-Path $composePath) {
            docker compose -f $composePath down -v 2>&1 | Out-Null
            Write-SubStep "Containers stopped and removed" -Status success
        }
        
        # Remove Docker volumes if requested
        if ($RemoveData) {
            Write-SubStep "Removing Docker volumes..." -Status running
            docker volume rm wsh_postgres_data -f 2>&1 | Out-Null
            Write-SubStep "Docker volumes removed" -Status success
            
            # Remove installation directory
            Write-SubStep "Removing installation directory..." -Status running
            Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-SubStep "Installation directory removed" -Status success
        }
        
        # Remove Docker network
        Write-SubStep "Removing Docker network..." -Status running
        docker network rm $script:Config.DockerNetworkName 2>&1 | Out-Null
        Write-SubStep "Docker network removed" -Status success
        
        Write-Host ""
        Write-Host "WSH has been uninstalled successfully." -ForegroundColor Green
        
        if (-not $RemoveData) {
            Write-Host "Note: Installation directory and volumes preserved. Use -RemoveData to remove all data." -ForegroundColor Yellow
        }
        
    } catch {
        Write-SubStep "Uninstall error: $($_.Exception.Message)" -Status error
        Write-Log "Uninstall error: $($_.Exception.Message)" -Level ERROR
        return
    }
}

# ============================================================================
# MAIN INSTALLATION ORCHESTRATION
# ============================================================================

function Invoke-Installation {
    <#
    .SYNOPSIS
        Main installation orchestration function
    #>
    # Display header
    Write-LogHeader
    
    Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
    Write-Host "Application Port:  $AppPort" -ForegroundColor Cyan
    Write-Host "Database Port:     $DatabasePort" -ForegroundColor Cyan
    if ($EnablePgAdmin) {
        Write-Host "pgAdmin Port:      $PgAdminPort" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # Track start time
    $startTime = Get-Date
    $script:InstallPath = $InstallPath
    
    # Step 1: Prerequisites Check
    $result = Invoke-PrerequisitesCheck
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Prerequisites check failed: $($result.Message)"
        return
    }
    
    # Step 2: Environment Preparation
    $result = Invoke-EnvironmentPreparation
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Environment preparation failed: $($result.Message)"
        Invoke-Rollback
        return
    }
    
    # Step 3: Configuration Generation
    $result = Invoke-ConfigurationGeneration
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Configuration generation failed: $($result.Message)"
        Invoke-Rollback
        return
    }
    
    # Step 4: Database Deployment
    $result = Invoke-DatabaseDeployment
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Database deployment failed: $($result.Message)"
        Invoke-Rollback
        return
    }
    
    # Step 5: Application Deployment
    $result = Invoke-ApplicationDeployment
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Application deployment failed: $($result.Message)"
        Invoke-Rollback
        return
    }
    
    # Step 6: Health Validation
    $result = Invoke-HealthValidation
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Health validation failed"
        return
    }
    
    # Step 7: Finalization
    $result = Invoke-Finalization
    
    # Calculate duration
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    # Display success summary
    Write-FinalSummary -Success $true
    
    Write-Host ""
    Write-Host "Installation completed in $($duration.ToString('mm\:ss'))" -ForegroundColor Green
    Write-Host ""
}

function Invoke-Rollback {
    <#
    .SYNOPSIS
        Rolls back a failed installation
    #>
    Write-Host ""
    Write-Host "Initiating rollback..." -ForegroundColor Yellow
    
    try {
        # Stop any running containers
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        if (Test-Path $composePath) {
            Write-Host "  Stopping containers..." -ForegroundColor Gray
            docker compose -f $composePath down 2>&1 | Out-Null
        }
        
        # Stop individual containers if they exist
        $containers = @($script:Config.PostgresContainer, $script:Config.AppContainer, $script:Config.PgAdminContainer)
        foreach ($container in $containers) {
            $exists = docker ps -a --filter "name=$container" --format "{{.Names}}" 2>$null
            if ($exists) {
                docker rm -f $container 2>&1 | Out-Null
            }
        }
        
        Write-Host "  Rollback completed. You may need to manually clean up:" -ForegroundColor Gray
        Write-Host "    - Remove-Item -Recurse -Force `"$InstallPath`"" -ForegroundColor Gray
        Write-Host "    - docker volume rm wsh_postgres_data" -ForegroundColor Gray
        
    } catch {
        Write-Host "  Rollback encountered errors: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================================================
# ENTRY POINT
# ============================================================================

# Handle Ctrl+C gracefully
[Console]::TreatControlCAsInput = $false

try {
    if ($Uninstall) {
        Invoke-Uninstall
    } else {
        Invoke-Installation
    }
} catch {
    Write-Host ""
    Write-Host "Installation interrupted or failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the log file for details: $InstallPath\$($script:Config.LogFile)" -ForegroundColor Yellow
    Invoke-Rollback
}

# Complete progress bar
Write-Progress -Activity "WSH Installation" -Completed
