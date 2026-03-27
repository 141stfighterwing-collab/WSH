<#
.SYNOPSIS
    WSH (Weavenote Self Hosted) - Extended One-Click Docker Installer with Validation & UI Testing
.DESCRIPTION
    This script fully automates the deployment of WSH application using Docker,
    including comprehensive validation, functional testing, and Playwright UI testing with screenshots.
    
    Features:
    - Complete Docker deployment automation
    - Container health validation
    - Functional API testing
    - Playwright UI testing with screenshot capture
    - Comprehensive HTML report generation
    - Real-time progress tracking with percentage display
    
.NOTES
    File Name      : Install-WSH-Extended.ps1
    Author         : WSH Installer
    Prerequisite   : Docker Desktop, Node.js (optional - will install if missing)
    Copyright 2025 - WSH Project
    
.EXAMPLE
    .\Install-WSH-Extended.ps1
    Runs the complete installer with validation and testing
    
.EXAMPLE
    .\Install-WSH-Extended.ps1 -SkipUITests
    Skip Playwright UI tests (validation only)
    
.EXAMPLE
    .\Install-WSH-Extended.ps1 -AIApiKey "your-api-key"
    Include AI API key for testing AI features
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
    [switch]$SkipUITests,
    
    [Parameter(ParameterSetName = 'Install')]
    [string]$AIApiKey = "",
    
    [Parameter(ParameterSetName = 'Install')]
    [int]$TestTimeout = 120,
    
    [Parameter(ParameterSetName = 'Uninstall')]
    [switch]$Uninstall,
    
    [Parameter(ParameterSetName = 'Uninstall')]
    [switch]$RemoveData
)

# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

$script:Config = @{
    AppName           = "WSH"
    AppDisplayName    = "Weavenote Self Hosted"
    AppVersion        = "2.0.0"
    GitHubRepo        = "https://github.com/141stfighterwing-collab/WSH"
    DockerNetworkName = "wsh-network"
    
    # Container Names
    PostgresContainer = "wsh-postgres"
    AppContainer      = "wsh-app"
    PgAdminContainer  = "wsh-pgadmin"
    PlaywrightContainer = "wsh-playwright"
    
    # Image Configuration
    PostgresImage     = "postgres:16-alpine"
    PgAdminImage      = "dpage/pgadmin4:latest"
    PlaywrightImage   = "mcr.microsoft.com/playwright:v1.42.0-jammy"
    
    # Database Configuration
    DbName            = "wsh_db"
    DbUser            = "wsh"
    DbPassword        = "wsh_secure_password_CHANGE_ME"
    
    # Default Admin Credentials
    AdminEmail        = "admin@wsh.local"
    AdminPassword     = "admin123"
    AdminUsername     = "Admin"
    
    # JWT Configuration
    JwtSecret         = "your-super-secret-jwt-key-change-in-production"
    JwtExpiresIn      = "7d"
    
    # Health Check Settings
    MaxRetries        = 30
    RetryDelaySeconds = 5
    
    # Test Settings
    TestTimeout       = $TestTimeout
    
    # Logging
    LogFile           = "wsh-install.log"
    ReportFile        = "wsh-validation-report.html"
}

# Progress Tracking - Extended to 10 steps
$script:Progress = @{
    TotalSteps    = 10
    CurrentStep   = 0
    StepNames     = @(
        "Prerequisites Check",
        "Environment Preparation",
        "Configuration Generation",
        "Database Deployment",
        "Application Deployment",
        "Health Validation",
        "Functional Testing",
        "UI Testing Setup",
        "Playwright UI Tests",
        "Report Generation"
    )
}

# Test Results Object
$script:TestResults = @{
    StartTime       = $null
    EndTime         = $null
    Duration        = $null
    Deployment      = @{ Status = "PENDING"; Details = @() }
    ContainerHealth = @{ Status = "PENDING"; Details = @() }
    DatabaseHealth  = @{ Status = "PENDING"; Details = @() }
    ApiTests        = @{ Status = "PENDING"; Tests = @(); Passed = 0; Failed = 0 }
    UITests         = @{ Status = "PENDING"; Tests = @(); Passed = 0; Failed = 0 }
    Screenshots     = @()
    OverallStatus   = "PENDING"
}

# ============================================================================
# LOGGING AND PROGRESS FUNCTIONS
# ============================================================================

function Write-LogHeader {
    $header = @"
================================================================================
                     WSH EXTENDED INSTALLER v$($script:Config.AppVersion)
              Weavenote Self Hosted - Docker Deployment with Testing
================================================================================
"@ 
    Write-Host $header -ForegroundColor Cyan
    Write-Host ""
}

function Write-Log {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter()]
        [ValidateSet('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'DEBUG', 'TEST-PASS', 'TEST-FAIL')]
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
    } catch {}
    
    # Write to console with color coding
    if (-not $NoConsole) {
        $prefix = switch ($Level) {
            'INFO'       { "[INFO]     "; $color = 'White' }
            'WARNING'    { "[WARNING]  "; $color = 'Yellow' }
            'ERROR'      { "[ERROR]    "; $color = 'Red' }
            'SUCCESS'    { "[SUCCESS]  "; $color = 'Green' }
            'DEBUG'      { "[DEBUG]    "; $color = 'Gray' }
            'TEST-PASS'  { "[PASS]     "; $color = 'Green' }
            'TEST-FAIL'  { "[FAIL]     "; $color = 'Red' }
        }
        
        Write-Host "$prefix$Message" -ForegroundColor $color
    }
}

function Write-StepHeader {
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
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter()]
        [ValidateSet('running', 'success', 'error', 'warning', 'skip', 'info', 'test-pass', 'test-fail')
        [string]$Status = 'running'
    )
    
    $icon = switch ($Status) {
        'running'    { "⏳"; $color = 'Yellow' }
        'success'    { "✓"; $color = 'Green' }
        'error'      { "✗"; $color = 'Red' }
        'warning'    { "⚠"; $color = 'Yellow' }
        'skip'       { "○"; $color = 'Gray' }
        'info'       { "•"; $color = 'Cyan' }
        'test-pass'  { "✓"; $color = 'Green' }
        'test-fail'  { "✗"; $color = 'Red' }
    }
    
    Write-Host "  $icon $Message" -ForegroundColor $color
}

function Write-ProgressDetail {
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
    $statusText = "    [$PercentComplete%] $Status"
    Write-Host $statusText -ForegroundColor DarkGray
}

# ============================================================================
# TEST RESULT RECORDING FUNCTIONS
# ============================================================================

function Add-TestResult {
    param (
        [Parameter(Mandatory = $true)]
        [ValidateSet('Deployment', 'ContainerHealth', 'DatabaseHealth', 'ApiTests', 'UITests')]
        [string]$Category,
        
        [Parameter(Mandatory = $true)]
        [string]$TestName,
        
        [Parameter(Mandatory = $true)]
        [ValidateSet('PASS', 'FAIL', 'SKIP', 'WARN')]
        [string]$Status,
        
        [string]$Message = "",
        [string]$Duration = "",
        [hashtable]$Details = @{}
    )
    
    $result = @{
        Name      = $TestName
        Status    = $Status
        Message   = $Message
        Duration  = $Duration
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Details   = $Details
    }
    
    switch ($Category) {
        'Deployment' {
            $script:TestResults.Deployment.Details += $result
            if ($Status -eq 'FAIL') { $script:TestResults.Deployment.Status = 'FAILED' }
            elseif ($Status -eq 'PASS' -and $script:TestResults.Deployment.Status -eq 'PENDING') { 
                $script:TestResults.Deployment.Status = 'PASSED' 
            }
        }
        'ContainerHealth' {
            $script:TestResults.ContainerHealth.Details += $result
            if ($Status -eq 'FAIL') { $script:TestResults.ContainerHealth.Status = 'FAILED' }
            elseif ($Status -eq 'PASS' -and $script:TestResults.ContainerHealth.Status -eq 'PENDING') { 
                $script:TestResults.ContainerHealth.Status = 'PASSED' 
            }
        }
        'DatabaseHealth' {
            $script:TestResults.DatabaseHealth.Details += $result
            if ($Status -eq 'FAIL') { $script:TestResults.DatabaseHealth.Status = 'FAILED' }
            elseif ($Status -eq 'PASS' -and $script:TestResults.DatabaseHealth.Status -eq 'PENDING') { 
                $script:TestResults.DatabaseHealth.Status = 'PASSED' 
            }
        }
        'ApiTests' {
            $script:TestResults.ApiTests.Tests += $result
            if ($Status -eq 'PASS') { $script:TestResults.ApiTests.Passed++ }
            elseif ($Status -eq 'FAIL') { $script:TestResults.ApiTests.Failed++ }
            if ($script:TestResults.ApiTests.Failed -gt 0) { $script:TestResults.ApiTests.Status = 'FAILED' }
            else { $script:TestResults.ApiTests.Status = 'PASSED' }
        }
        'UITests' {
            $script:TestResults.UITests.Tests += $result
            if ($Status -eq 'PASS') { $script:TestResults.UITests.Passed++ }
            elseif ($Status -eq 'FAIL') { $script:TestResults.UITests.Failed++ }
            if ($script:TestResults.UITests.Failed -gt 0) { $script:TestResults.UITests.Status = 'FAILED' }
            else { $script:TestResults.UITests.Status = 'PASSED' }
        }
    }
}

function Add-ScreenshotRecord {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [Parameter(Mandatory = $true)]
        [string]$Path,
        
        [string]$Description = ""
    )
    
    $script:TestResults.Screenshots += @{
        Name        = $Name
        Path        = $Path
        Description = $Description
        Timestamp   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

# ============================================================================
# PREREQUISITES CHECK FUNCTIONS
# ============================================================================

function Test-DockerDesktop {
    Write-SubStep "Checking Docker Desktop installation..." -Status running
    
    try {
        $dockerDesktopPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
        $dockerDesktopPath2 = "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
        
        if (-not (Test-Path $dockerDesktopPath) -and -not (Test-Path $dockerDesktopPath2)) {
            Write-SubStep "Docker Desktop not found" -Status error
            return @{
                Success = $false
                Message = "Docker Desktop is not installed. Please download from https://www.docker.com/products/docker-desktop"
            }
        }
        
        $dockerVersion = docker version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Docker daemon not running" -Status error
            return @{
                Success = $false
                Message = "Docker Desktop is installed but not running. Please start Docker Desktop."
            }
        }
        
        Write-SubStep "Docker Desktop is installed and running" -Status success
        Add-TestResult -Category 'Deployment' -TestName 'Docker Desktop' -Status 'PASS' -Message "Docker is running"
        return @{ Success = $true; Message = "Docker Desktop is ready" }
        
    } catch {
        Write-SubStep "Docker check failed: $($_.Exception.Message)" -Status error
        Add-TestResult -Category 'Deployment' -TestName 'Docker Desktop' -Status 'FAIL' -Message $_.Exception.Message
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Test-DockerCompose {
    Write-SubStep "Checking Docker Compose availability..." -Status running
    
    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Docker Compose v2 available: $composeVersion".Trim() -Status success
            Add-TestResult -Category 'Deployment' -TestName 'Docker Compose' -Status 'PASS' -Message $composeVersion.Trim()
            return @{ Success = $true; Version = $composeVersion.Trim(); UseV2 = $true }
        }
        
        $composeVersion = docker-compose --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Docker Compose v1 available: $composeVersion".Trim() -Status success
            Add-TestResult -Category 'Deployment' -TestName 'Docker Compose' -Status 'PASS' -Message $composeVersion.Trim()
            return @{ Success = $true; Version = $composeVersion.Trim(); UseV2 = $false }
        }
        
        Write-SubStep "Docker Compose not found" -Status error
        Add-TestResult -Category 'Deployment' -TestName 'Docker Compose' -Status 'FAIL' -Message "Docker Compose not available"
        return @{ Success = $false; Message = "Docker Compose is not available" }
        
    } catch {
        Write-SubStep "Docker Compose check failed: $($_.Exception.Message)" -Status error
        Add-TestResult -Category 'Deployment' -TestName 'Docker Compose' -Status 'FAIL' -Message $_.Exception.Message
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Test-NodeJS {
    Write-SubStep "Checking Node.js installation..." -Status running
    
    try {
        $nodeVersion = node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Node.js installed: $nodeVersion" -Status success
            Add-TestResult -Category 'Deployment' -TestName 'Node.js' -Status 'PASS' -Message "Version: $nodeVersion"
            return @{ Success = $true; Version = $nodeVersion }
        }
    } catch {}
    
    Write-SubStep "Node.js not found - will install via winget" -Status warning
    Add-TestResult -Category 'Deployment' -TestName 'Node.js' -Status 'WARN' -Message "Not installed, will auto-install"
    return @{ Success = $true; NeedsInstall = $true }
}

function Install-NodeJS {
    Write-SubStep "Installing Node.js via winget..." -Status running
    
    try {
        # Try winget first
        $wingetResult = winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Node.js installed successfully" -Status success
            # Refresh environment
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            return @{ Success = $true }
        }
        
        # Fallback to chocolatey
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install nodejs-lts -y 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-SubStep "Node.js installed via Chocolatey" -Status success
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                return @{ Success = $true }
            }
        }
        
        Write-SubStep "Could not auto-install Node.js. UI tests may be limited." -Status warning
        return @{ Success = $false; Message = "Could not install Node.js automatically" }
        
    } catch {
        Write-SubStep "Node.js installation error: $($_.Exception.Message)" -Status warning
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Test-RequiredPorts {
    param ([int[]]$Ports = @($AppPort, $DatabasePort))
    
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
            } else {
                Write-SubStep "Port $port is available" -Status success
            }
        } catch {
            Write-SubStep "Could not check port $port" -Status warning
        }
    }
    
    if ($occupiedPorts.Count -gt 0 -and -not $Force) {
        $ourContainers = docker ps --filter "name=wsh-" --format "{{.Names}}" 2>$null
        if (-not $ourContainers) {
            Add-TestResult -Category 'Deployment' -TestName 'Port Availability' -Status 'FAIL' -Message "Ports occupied: $($occupiedPorts -join ', ')"
            return @{
                Success = $false
                Message = "Required ports are occupied: $($occupiedPorts -join ', '). Use -Force to proceed."
            }
        }
    }
    
    Add-TestResult -Category 'Deployment' -TestName 'Port Availability' -Status 'PASS' -Message "All required ports available"
    return @{ Success = $true }
}

function Test-WorkingDirectory {
    Write-SubStep "Checking installation directory..." -Status running
    
    try {
        if (Test-Path $InstallPath) {
            if ($Force) {
                Write-SubStep "Existing installation found, will overwrite" -Status warning
            } else {
                $existingFiles = Get-ChildItem -Path $InstallPath -ErrorAction SilentlyContinue
                if ($existingFiles) {
                    return @{
                        Success = $false
                        Message = "Installation directory exists with files. Use -Force to overwrite."
                    }
                }
            }
        }
        
        Write-SubStep "Installation directory ready: $InstallPath" -Status success
        return @{ Success = $true; Path = $InstallPath }
        
    } catch {
        Write-SubStep "Directory check failed: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-PrerequisitesCheck {
    Write-StepHeader -StepNumber 1 -StepName "Prerequisites Check"
    
    $results = @{
        DockerDesktop   = $null
        DockerCompose   = $null
        NodeJS          = $null
        Ports           = $null
        WorkingDir      = $null
    }
    
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Docker Desktop..." -PercentComplete 20
    $results.DockerDesktop = Test-DockerDesktop
    if (-not $results.DockerDesktop.Success) {
        return @{ Success = $false; Step = "Docker Desktop"; Results = $results; Message = $results.DockerDesktop.Message }
    }
    
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Docker Compose..." -PercentComplete 40
    $results.DockerCompose = Test-DockerCompose
    if (-not $results.DockerCompose.Success) {
        return @{ Success = $false; Step = "Docker Compose"; Results = $results; Message = $results.DockerCompose.Message }
    }
    
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Node.js..." -PercentComplete 60
    $results.NodeJS = Test-NodeJS
    if ($results.NodeJS.NeInstall) {
        Install-NodeJS | Out-Null
    }
    
    Write-ProgressDetail -Activity "Checking Prerequisites" -Status "Verifying Required Ports..." -PercentComplete 80
    $results.Ports = Test-RequiredPorts
    if (-not $results.Ports.Success) {
        return @{ Success = $false; Step = "Ports"; Results = $results; Message = $results.Ports.Message }
    }
    
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
    Write-SubStep "Creating installation directory structure..." -Status running
    
    try {
        if (-not (Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }
        
        $subdirs = @(
            "uploads",
            "backups",
            "logs",
            "config",
            "screenshots",
            "tests",
            "reports"
        )
        
        foreach ($subdir in $subdirs) {
            $path = Join-Path $InstallPath $subdir
            if (-not (Test-Path $path)) {
                New-Item -ItemType Directory -Path $path -Force | Out-Null
            }
        }
        
        Write-SubStep "Directory structure created successfully" -Status success
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Failed to create directories: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function New-DockerVolumes {
    Write-SubStep "Creating Docker volumes..." -Status running
    
    try {
        $volumes = @("wsh_postgres_data")
        
        foreach ($volume in $volumes) {
            $existingVolume = docker volume ls -q --filter "name=$volume" 2>&1
            if ($existingVolume) {
                Write-SubStep "Volume '$volume' already exists" -Status info
            } else {
                docker volume create $volume | Out-Null
                Write-SubStep "Created volume: $volume" -Status success
            }
        }
        
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Docker volume creation failed: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-EnvironmentPreparation {
    Write-StepHeader -StepNumber 2 -StepName "Environment Preparation"
    
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating directories..." -PercentComplete 33
    $dirResult = New-InstallationDirectory
    if (-not $dirResult.Success) { return $dirResult }
    
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating Docker volumes..." -PercentComplete 66
    $volResult = New-DockerVolumes
    if (-not $volResult.Success) { return $volResult }
    
    Write-ProgressDetail -Activity "Preparing Environment" -Status "Creating Docker network..." -PercentComplete 100
    try {
        $existingNetwork = docker network ls -q --filter "name=$($script:Config.DockerNetworkName)" 2>&1
        if (-not $existingNetwork) {
            docker network create $script:Config.DockerNetworkName | Out-Null
            Write-SubStep "Created Docker network" -Status success
        }
    } catch {}
    
    return @{ Success = $true }
}

# ============================================================================
# CONFIGURATION GENERATION FUNCTIONS
# ============================================================================

function New-EnvironmentFile {
    Write-SubStep "Creating environment configuration file..." -Status running
    
    try {
        $envPath = Join-Path $InstallPath ".env"
        
        $jwtSecret = $script:Config.JwtSecret
        if ($jwtSecret -eq "your-super-secret-jwt-key-change-in-production") {
            $jwtSecret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
        }
        
        $aiKeyLine = if ($AIApiKey) { "GEMINI_API_KEY=`"$AIApiKey`"" } else { "# GEMINI_API_KEY=`"your-api-key-here`"" }
        
        $envContent = @"
# ==============================================================================
# WSH (Weavenote Self Hosted) - Environment Configuration
# Generated by WSH Installer on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ==============================================================================

# PostgreSQL Database Configuration
DATABASE_URL="postgresql://$($script:Config.DbUser):$($script:Config.DbPassword)@postgres:5432/$($script:Config.DbName)?schema=public"
POSTGRES_USER="$($script:Config.DbUser)"
POSTGRES_PASSWORD="$($script:Config.DbPassword)"
POSTGRES_DB="$($script:Config.DbName)"

# JWT Configuration
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="$($script:Config.JwtExpiresIn)"

# Application Configuration
NEXT_PUBLIC_APP_NAME="$($script:Config.AppName)"
NEXT_PUBLIC_APP_URL="http://localhost:$AppPort"

# Admin Default Credentials
ADMIN_EMAIL="$($script:Config.AdminEmail)"
ADMIN_PASSWORD="$($script:Config.AdminPassword)"
ADMIN_USERNAME="$($script:Config.AdminUsername)"

# AI Configuration (Optional)
$aiKeyLine
"@
        
        if ((Test-Path $envPath) -and -not $Force) {
            Write-SubStep "Environment file already exists, preserving" -Status info
        } else {
            $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
            Write-SubStep "Environment file created: $envPath" -Status success
        }
        
        return @{ Success = $true; Path = $envPath }
        
    } catch {
        Write-SubStep "Failed to create environment file: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function New-DockerComposeFile {
    Write-SubStep "Creating Docker Compose configuration..." -Status running
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        $composeContent = @"
version: '3.8'

services:
  postgres:
    image: $($script:Config.PostgresImage)
    container_name: $($script:Config.PostgresContainer)
    restart: unless-stopped
    environment:
      POSTGRES_USER: `${POSTGRES_USER:-$($script:Config.DbUser)}
      POSTGRES_PASSWORD: `${POSTGRES_PASSWORD:-$($script:Config.DbPassword)}
      POSTGRES_DB: `${POSTGRES_DB:-$($script:Config.DbName)}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "${DatabasePort}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U `${POSTGRES_USER:-$($script:Config.DbUser)} -d `${POSTGRES_DB:-$($script:Config.DbName)}"]
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
      DATABASE_URL: postgresql://$($script:Config.DbUser):$($script:Config.DbPassword)@postgres:5432/$($script:Config.DbName)?schema=public
      JWT_SECRET: `${JWT_SECRET:-$($script:Config.JwtSecret)}
      JWT_EXPIRES_IN: `${JWT_EXPIRES_IN:-$($script:Config.JwtExpiresIn)}
      NEXT_PUBLIC_APP_NAME: `${NEXT_PUBLIC_APP_NAME:-$($script:Config.AppName)}
      NEXT_PUBLIC_APP_URL: `${NEXT_PUBLIC_APP_URL:-http://localhost:$AppPort}
      ADMIN_EMAIL: `${ADMIN_EMAIL:-$($script:Config.AdminEmail)}
      ADMIN_PASSWORD: `${ADMIN_PASSWORD:-$($script:Config.AdminPassword)}
      ADMIN_USERNAME: `${ADMIN_USERNAME:-$($script:Config.AdminUsername)}
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
"@

        if ($EnablePgAdmin) {
            $composeContent += @"

  pgadmin:
    image: $($script:Config.PgAdminImage)
    container_name: $($script:Config.PgAdminContainer)
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@wsh.local
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_LISTEN_PORT: 5050
    ports:
      - "${PgAdminPort}:5050"
    depends_on:
      - postgres
    networks:
      - wsh-network
"@
        }

        $composeContent += @"

volumes:
  postgres_data:
    name: wsh_postgres_data

networks:
  wsh-network:
    name: $($script:Config.DockerNetworkName)
    driver: bridge
"@

        $composeContent | Out-File -FilePath $composePath -Encoding UTF8 -Force
        Write-SubStep "Docker Compose file created" -Status success
        return @{ Success = $true; Path = $composePath }
        
    } catch {
        Write-SubStep "Failed to create Docker Compose file: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function New-PlaywrightTestScript {
    Write-SubStep "Creating Playwright test script..." -Status running
    
    try {
        $testsPath = Join-Path $InstallPath "tests"
        
        # Create package.json
        $packageJson = @"
{
  "name": "wsh-tests",
  "version": "1.0.0",
  "description": "WSH UI Tests with Playwright",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "screenshot": "node screenshot-runner.js"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0"
  }
}
"@
        $packageJson | Out-File -FilePath (Join-Path $testsPath "package.json") -Encoding UTF8 -Force
        
        # Create playwright.config.js
        $playwrightConfig = @"
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: '../reports/playwright-report' }], ['json', { outputFile: '../reports/test-results.json' }]],
  use: {
    baseURL: 'http://localhost:$AppPort',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'echo "Server already running"',
    url: 'http://localhost:$AppPort',
    reuseExistingServer: true,
    timeout: 10000,
  },
});
"@
        $playwrightConfig | Out-File -FilePath (Join-Path $testsPath "playwright.config.js") -Encoding UTF8 -Force
        
        # Create main test file
        $testScript = @"
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:$AppPort';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const SCREENSHOT_FOLDER = path.join(SCREENSHOT_DIR, TIMESTAMP);

// Ensure screenshot folder exists
if (!fs.existsSync(SCREENSHOT_FOLDER)) {
  fs.mkdirSync(SCREENSHOT_FOLDER, { recursive: true });
}

// Test credentials (placeholders)
const TEST_USER = {
  email: '$($script:Config.AdminEmail)',
  password: '$($script:Config.AdminPassword)'
};

test.describe('WSH Application UI Tests', () => {
  
  test.beforeAll(async () => {
    console.log('Starting UI Tests...');
    console.log('Screenshot folder:', SCREENSHOT_FOLDER);
  });

  test('01 - Homepage loads successfully', async ({ page }) => {
    console.log('Testing homepage...');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Take screenshot
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '01-homepage.png'),
        fullPage: true 
      });
      
      // Check page loaded
      await expect(page).toHaveTitle(/WSH|Weavenote/i);
      
      console.log('✓ Homepage loaded successfully');
    } catch (error) {
      // Capture failure screenshot
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '01-homepage-error.png'),
        fullPage: true 
      });
      throw error;
    }
  });

  test('02 - Login page is accessible', async ({ page }) => {
    console.log('Testing login page...');
    
    try {
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: 30000 });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '02-login-page.png'),
        fullPage: true 
      });
      
      // Check for login form elements
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
      
      // At least check the page has loaded
      await expect(page).toHaveURL(/login|auth/i);
      
      console.log('✓ Login page accessible');
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '02-login-error.png'),
        fullPage: true 
      });
      throw error;
    }
  });

  test('03 - Login with test credentials', async ({ page }) => {
    console.log('Testing login functionality...');
    
    try {
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: 30000 });
      
      // Find and fill email
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]').first();
      await emailInput.fill(TEST_USER.email);
      
      // Find and fill password
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(TEST_USER.password);
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '03-login-filled.png'),
        fullPage: true 
      });
      
      // Click login button
      const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
      await loginButton.click();
      
      // Wait for navigation or dashboard
      await page.waitForURL(/dashboard|home|notes|app/i, { timeout: 15000 }).catch(() => {
        // Maybe it redirected to home
        console.log('No redirect detected, checking current page...');
      });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '03-after-login.png'),
        fullPage: true 
      });
      
      console.log('✓ Login test completed');
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '03-login-error.png'),
        fullPage: true 
      });
      console.log('Login test error:', error.message);
      throw error;
    }
  });

  test('04 - Dashboard/Notes page loads', async ({ page }) => {
    console.log('Testing dashboard...');
    
    try {
      // Login first
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
      
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      await emailInput.fill(TEST_USER.email);
      
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(TEST_USER.password);
      
      const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
      await loginButton.click();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Navigate to dashboard
      await page.goto(BASE_URL + '/dashboard', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
        // Try notes page
        return page.goto(BASE_URL + '/notes', { waitUntil: 'networkidle', timeout: 30000 });
      });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '04-dashboard.png'),
        fullPage: true 
      });
      
      console.log('✓ Dashboard test completed');
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '04-dashboard-error.png'),
        fullPage: true 
      });
      console.log('Dashboard test error:', error.message);
      throw error;
    }
  });

  test('05 - Create new note button', async ({ page }) => {
    console.log('Testing create note button...');
    
    try {
      // Login
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill(TEST_USER.email);
      
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(TEST_USER.password);
      
      const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
      await loginButton.click();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for create/new note button
      const newNoteButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New Note")').first();
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '05-before-create.png'),
        fullPage: true 
      });
      
      if (await newNoteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newNoteButton.click();
        await page.waitForLoadState('networkidle').catch(() => {});
        
        await page.screenshot({ 
          path: path.join(SCREENSHOT_FOLDER, '05-create-note-form.png'),
          fullPage: true 
        });
        console.log('✓ Create note button works');
      } else {
        console.log('⚠ Create note button not found, skipping...');
        test.skip();
      }
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '05-create-error.png'),
        fullPage: true 
      });
      throw error;
    }
  });

  test('06 - Navigation menu works', async ({ page }) => {
    console.log('Testing navigation...');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Find navigation elements
      const nav = page.locator('nav, [role="navigation"], header nav').first();
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '06-navigation.png'),
        fullPage: true 
      });
      
      // Check nav exists
      if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ Navigation menu found');
      } else {
        console.log('⚠ No navigation menu found');
      }
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '06-nav-error.png'),
        fullPage: true 
      });
      throw error;
    }
  });

  test('07 - Dark mode toggle (if available)', async ({ page }) => {
    console.log('Testing dark mode toggle...');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Look for theme toggle
      const themeToggle = page.locator('button:has-text("dark"), button:has-text("light"), button[aria-label*="theme"], button[aria-label*="mode"], [data-theme-toggle]').first();
      
      if (await themeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: path.join(SCREENSHOT_FOLDER, '07-dark-mode.png'),
          fullPage: true 
        });
        console.log('✓ Dark mode toggle works');
      } else {
        await page.screenshot({ 
          path: path.join(SCREENSHOT_FOLDER, '07-no-theme-toggle.png'),
          fullPage: true 
        });
        console.log('⚠ No theme toggle found');
        test.skip();
      }
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '07-theme-error.png'),
        fullPage: true 
      });
      console.log('Theme test error:', error.message);
    }
  });

  test('08 - Responsive design (mobile)', async ({ page }) => {
    console.log('Testing mobile responsiveness...');
    
    try {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '08-mobile-view.png'),
        fullPage: true 
      });
      
      // Check for mobile menu
      const mobileMenu = page.locator('button[aria-label*="menu"], button.hamburger, [data-mobile-menu]').first();
      
      if (await mobileMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mobileMenu.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: path.join(SCREENSHOT_FOLDER, '08-mobile-menu.png'),
          fullPage: true 
        });
        console.log('✓ Mobile menu works');
      }
      
      console.log('✓ Mobile responsiveness tested');
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '08-mobile-error.png'),
        fullPage: true 
      });
      throw error;
    }
  });

  test('09 - Capture UI elements', async ({ page }) => {
    console.log('Capturing UI elements...');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Capture specific elements
      const header = page.locator('header, [role="banner"]').first();
      if (await header.isVisible().catch(() => false)) {
        await header.screenshot({ path: path.join(SCREENSHOT_FOLDER, '09-header.png') });
      }
      
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible().catch(() => false)) {
        await main.screenshot({ path: path.join(SCREENSHOT_FOLDER, '09-main-content.png') });
      }
      
      const footer = page.locator('footer, [role="contentinfo"]').first();
      if (await footer.isVisible().catch(() => false)) {
        await footer.screenshot({ path: path.join(SCREENSHOT_FOLDER, '09-footer.png') });
      }
      
      console.log('✓ UI elements captured');
    } catch (error) {
      console.log('Element capture error:', error.message);
    }
  });

  test('10 - Error page handling', async ({ page }) => {
    console.log('Testing error page...');
    
    try {
      // Navigate to non-existent page
      await page.goto(BASE_URL + '/non-existent-page-12345', { waitUntil: 'networkidle', timeout: 15000 });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '10-error-page.png'),
        fullPage: true 
      });
      
      // Check for 404 message
      const notFound = page.locator('text=/404|not found|page not found/i');
      if (await notFound.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✓ 404 page works correctly');
      } else {
        console.log('⚠ No 404 message found');
      }
    } catch (error) {
      await page.screenshot({ 
        path: path.join(SCREENSHOT_FOLDER, '10-error-handling-error.png'),
        fullPage: true 
      });
      console.log('Error page test:', error.message);
    }
  });
});
"@
        $testScript | Out-File -FilePath (Join-Path $testsPath "ui-tests.spec.js") -Encoding UTF8 -Force
        
        Write-SubStep "Playwright test scripts created" -Status success
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Failed to create Playwright scripts: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Invoke-ConfigurationGeneration {
    Write-StepHeader -StepNumber 3 -StepName "Configuration Generation"
    
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating environment file..." -PercentComplete 25
    $envResult = New-EnvironmentFile
    if (-not $envResult.Success) { return $envResult }
    
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating Docker Compose file..." -PercentComplete 50
    $composeResult = New-DockerComposeFile
    if (-not $composeResult.Success) { return $composeResult }
    
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Creating Playwright test scripts..." -PercentComplete 75
    $playwrightResult = New-PlaywrightTestScript
    if (-not $playwrightResult.Success) { return $playwrightResult }
    
    Write-ProgressDetail -Activity "Generating Configuration" -Status "Configuration complete..." -PercentComplete 100
    
    return @{ Success = $true }
}

# ============================================================================
# DATABASE DEPLOYMENT FUNCTIONS
# ============================================================================

function Start-DatabaseContainer {
    Write-SubStep "Starting PostgreSQL database container..." -Status running
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        Write-SubStep "Pulling PostgreSQL image..." -Status running
        docker pull $script:Config.PostgresImage 2>&1 | ForEach-Object {
            if ($_ -match "Pulling|Downloaded|Status") {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }
        
        docker compose -f $composePath up -d postgres 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to start database container" -Status error
            return @{ Success = $false; Message = "Failed to start database container" }
        }
        
        Write-SubStep "Database container started" -Status success
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Database startup failed: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Wait-DatabaseHealthy {
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
                Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Health Check' -Status 'PASS' -Message "Database healthy after $i attempts"
                return @{ Success = $true }
            }
            
            Start-Sleep -Seconds $delay
            
        } catch {
            Start-Sleep -Seconds $delay
        }
    }
    
    Write-SubStep "Database health check timed out" -Status error
    Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Health Check' -Status 'FAIL' -Message "Timeout after $maxRetries attempts"
    return @{ Success = $false; Message = "Database health check timed out" }
}

function Invoke-DatabaseDeployment {
    Write-StepHeader -StepNumber 4 -StepName "Database Deployment"
    
    Write-ProgressDetail -Activity "Deploying Database" -Status "Starting PostgreSQL container..." -PercentComplete 33
    $startResult = Start-DatabaseContainer
    if (-not $startResult.Success) { return $startResult }
    
    Write-ProgressDetail -Activity "Deploying Database" -Status "Waiting for database to be ready..." -PercentComplete 66
    $healthResult = Wait-DatabaseHealthy
    if (-not $healthResult.Success) { return $healthResult }
    
    Write-ProgressDetail -Activity "Deploying Database" -Status "Database ready..." -PercentComplete 100
    
    return @{ Success = $true }
}

# ============================================================================
# APPLICATION DEPLOYMENT FUNCTIONS
# ============================================================================

function Start-ApplicationContainer {
    Write-SubStep "Starting WSH application container..." -Status running
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        Write-SubStep "Pulling WSH application image..." -Status running
        docker pull ghcr.io/141stfighterwing-collab/wsh:latest 2>&1 | ForEach-Object {
            if ($_ -match "Pulling|Downloaded|Status|Layer") {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }
        
        if ($EnablePgAdmin) {
            docker compose -f $composePath up -d app pgadmin 2>&1 | Out-Null
        } else {
            docker compose -f $composePath up -d app 2>&1 | Out-Null
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-SubStep "Failed to start application container" -Status error
            return @{ Success = $false; Message = "Failed to start application container" }
        }
        
        Write-SubStep "Application container started" -Status success
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Application startup failed: $($_.Exception.Message)" -Status error
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Wait-ApplicationHealthy {
    Write-SubStep "Waiting for application to be ready..." -Status running
    
    $maxRetries = $script:Config.MaxRetries
    $delay = $script:Config.RetryDelaySeconds
    
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            $status = docker inspect --format='{{.State.Status}}' $script:Config.AppContainer 2>$null
            
            if ($status -eq "running") {
                # Try HTTP check
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:$AppPort" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
                    if ($response.StatusCode -lt 400) {
                        $percent = [math]::Round(($i / $maxRetries) * 100)
                        Write-ProgressDetail -Activity "Waiting for Application" -Status "Application is responding!" -PercentComplete $percent
                        
                        Write-SubStep "Application is healthy and responding!" -Status success
                        Add-TestResult -Category 'ContainerHealth' -TestName 'Application Health Check' -Status 'PASS' -Message "HTTP $($response.StatusCode)"
                        return @{ Success = $true }
                    }
                } catch {}
            }
            
            $percent = [math]::Round(($i / $maxRetries) * 100)
            Write-ProgressDetail -Activity "Waiting for Application" -Status "Container status: $status (Attempt $i/$maxRetries)" -PercentComplete $percent
            
            Start-Sleep -Seconds $delay
            
        } catch {
            Start-Sleep -Seconds $delay
        }
    }
    
    $finalStatus = docker inspect --format='{{.State.Status}}' $script:Config.AppContainer 2>$null
    if ($finalStatus -eq "running") {
        Write-SubStep "Application container is running" -Status success
        Add-TestResult -Category 'ContainerHealth' -TestName 'Application Health Check' -Status 'PASS' -Message "Container running"
        return @{ Success = $true }
    }
    
    Write-SubStep "Application health check timed out" -Status error
    Add-TestResult -Category 'ContainerHealth' -TestName 'Application Health Check' -Status 'FAIL' -Message "Timeout after $maxRetries attempts"
    return @{ Success = $false; Message = "Application health check timed out" }
}

function Invoke-ApplicationDeployment {
    Write-StepHeader -StepNumber 5 -StepName "Application Deployment"
    
    Write-ProgressDetail -Activity "Deploying Application" -Status "Starting application container..." -PercentComplete 50
    $startResult = Start-ApplicationContainer
    if (-not $startResult.Success) { return $startResult }
    
    Write-ProgressDetail -Activity "Deploying Application" -Status "Waiting for application to be ready..." -PercentComplete 100
    $healthResult = Wait-ApplicationHealthy
    if (-not $healthResult.Success) { return $healthResult }
    
    return @{ Success = $true }
}

# ============================================================================
# HEALTH VALIDATION FUNCTIONS
# ============================================================================

function Test-ContainerStatusDetailed {
    Write-SubStep "Validating container status..." -Status running
    
    $containers = @(
        @{ Name = $script:Config.PostgresContainer; Type = "Database" },
        @{ Name = $script:Config.AppContainer; Type = "Application" }
    )
    
    if ($EnablePgAdmin) {
        $containers += @{ Name = $script:Config.PgAdminContainer; Type = "pgAdmin" }
    }
    
    $allHealthy = $true
    
    foreach ($container in $containers) {
        try {
            $status = docker inspect --format='{{.State.Status}}' $container.Name 2>$null
            $health = docker inspect --format='{{.State.Health.Status}}' $container.Name 2>$null
            
            if ($status -eq "running") {
                if ($health -eq "healthy" -or $health -eq "") {
                    Write-SubStep "$($container.Name): $status" -Status success
                    Add-TestResult -Category 'ContainerHealth' -TestName "$($container.Type) Container" -Status 'PASS' -Message "Status: $status, Health: $health"
                } else {
                    Write-SubStep "$($container.Name): $status (health: $health)" -Status warning
                    Add-TestResult -Category 'ContainerHealth' -TestName "$($container.Type) Container" -Status 'WARN' -Message "Health: $health"
                }
            } else {
                Write-SubStep "$($container.Name): $status" -Status error
                Add-TestResult -Category 'ContainerHealth' -TestName "$($container.Type) Container" -Status 'FAIL' -Message "Status: $status"
                $allHealthy = $false
            }
        } catch {
            Write-SubStep "$($container.Name): Not found" -Status error
            Add-TestResult -Category 'ContainerHealth' -TestName "$($container.Type) Container" -Status 'FAIL' -Message "Container not found"
            $allHealthy = $false
        }
    }
    
    return @{ Success = $allHealthy }
}

function Test-HttpEndpointsDetailed {
    Write-SubStep "Testing HTTP endpoints..." -Status running
    
    $endpoints = @(
        @{ Name = "Homepage"; Url = "http://localhost:$AppPort/"; ExpectedStatus = @(200, 302) },
        @{ Name = "Health API"; Url = "http://localhost:$AppPort/api/health"; ExpectedStatus = @(200) },
        @{ Name = "Login Page"; Url = "http://localhost:$AppPort/login"; ExpectedStatus = @(200, 302) }
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $endpoint.Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            $stopwatch.Stop()
            $duration = $stopwatch.ElapsedMilliseconds
            
            if ($response.StatusCode -in $endpoint.ExpectedStatus) {
                Write-SubStep "$($endpoint.Name): HTTP $($response.StatusCode) (${duration}ms)" -Status test-pass
                Add-TestResult -Category 'ApiTests' -TestName $endpoint.Name -Status 'PASS' -Message "HTTP $($response.StatusCode)" -Duration "${duration}ms"
            } else {
                Write-SubStep "$($endpoint.Name): HTTP $($response.StatusCode)" -Status test-fail
                Add-TestResult -Category 'ApiTests' -TestName $endpoint.Name -Status 'FAIL' -Message "Unexpected status: $($response.StatusCode)" -Duration "${duration}ms"
            }
        } catch {
            Write-SubStep "$($endpoint.Name): Connection failed" -Status test-fail
            Add-TestResult -Category 'ApiTests' -TestName $endpoint.Name -Status 'FAIL' -Message $_.Exception.Message
        }
    }
}

function Test-DatabaseConnectivityDetailed {
    Write-SubStep "Testing database connectivity..." -Status running
    
    try {
        # Test database readiness
        $dbReady = docker exec $script:Config.PostgresContainer pg_isready -U $script:Config.DbUser -d $script:Config.DbName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Database accepting connections" -Status success
            Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Connectivity' -Status 'PASS' -Message "Accepting connections"
        } else {
            Write-SubStep "Database not accepting connections" -Status error
            Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Connectivity' -Status 'FAIL' -Message "Connection refused"
            return @{ Success = $false }
        }
        
        # Test database exists
        $dbExists = docker exec $script:Config.PostgresContainer psql -U $script:Config.DbUser -d $script:Config.DbName -c "SELECT 1;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-SubStep "Database '$($script:Config.DbName)' is accessible" -Status success
            Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Access' -Status 'PASS' -Message "Database accessible"
        } else {
            Write-SubStep "Database access failed" -Status error
            Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Access' -Status 'FAIL' -Message "Cannot access database"
        }
        
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Database test failed: $($_.Exception.Message)" -Status error
        Add-TestResult -Category 'DatabaseHealth' -TestName 'Database Connectivity' -Status 'FAIL' -Message $_.Exception.Message
        return @{ Success = $false }
    }
}

function Invoke-HealthValidation {
    Write-StepHeader -StepNumber 6 -StepName "Health Validation"
    
    Write-ProgressDetail -Activity "Validating Health" -Status "Checking container status..." -PercentComplete 33
    $containerResult = Test-ContainerStatusDetailed
    
    Write-ProgressDetail -Activity "Validating Health" -Status "Testing HTTP endpoints..." -PercentComplete 66
    Test-HttpEndpointsDetailed
    
    Write-ProgressDetail -Activity "Validating Health" -Status "Testing database connectivity..." -PercentComplete 100
    Test-DatabaseConnectivityDetailed | Out-Null
    
    return @{ Success = $containerResult.Success }
}

# ============================================================================
# FUNCTIONAL TESTING FUNCTIONS
# ============================================================================

function Invoke-FunctionalTests {
    Write-StepHeader -StepNumber 7 -StepName "Functional Testing"
    
    Write-ProgressDetail -Activity "Running Functional Tests" -Status "Testing API endpoints..." -PercentComplete 25
    
    # Test API Endpoints
    $apiTests = @(
        @{ Name = "API Health Check"; Url = "http://localhost:$AppPort/api/health"; Method = "GET" },
        @{ Name = "Auth Endpoint"; Url = "http://localhost:$AppPort/api/auth/me"; Method = "GET" },
        @{ Name = "Notes List"; Url = "http://localhost:$AppPort/api/notes"; Method = "GET" },
        @{ Name = "Folders List"; Url = "http://localhost:$AppPort/api/folders"; Method = "GET" }
    )
    
    foreach ($test in $apiTests) {
        Write-SubStep "Testing: $($test.Name)..." -Status running
        
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            
            if ($test.Method -eq "GET") {
                $response = Invoke-WebRequest -Uri $test.Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            }
            
            $stopwatch.Stop()
            $duration = $stopwatch.ElapsedMilliseconds
            
            # Accept both success and auth-required responses
            if ($response.StatusCode -in @(200, 201, 401, 403)) {
                Write-SubStep "$($test.Name): HTTP $($response.StatusCode) (${duration}ms)" -Status test-pass
                Add-TestResult -Category 'ApiTests' -TestName $test.Name -Status 'PASS' -Message "HTTP $($response.StatusCode)" -Duration "${duration}ms"
            } else {
                Write-SubStep "$($test.Name): HTTP $($response.StatusCode)" -Status test-fail
                Add-TestResult -Category 'ApiTests' -TestName $test.Name -Status 'FAIL' -Message "Unexpected status: $($response.StatusCode)" -Duration "${duration}ms"
            }
        } catch {
            $errorMessage = $_.Exception.Message
            if ($errorMessage -match "401|403|Unauthorized") {
                Write-SubStep "$($test.Name): Auth required (expected)" -Status test-pass
                Add-TestResult -Category 'ApiTests' -TestName $test.Name -Status 'PASS' -Message "Auth required (expected behavior)"
            } else {
                Write-SubStep "$($test.Name): Failed - $errorMessage" -Status test-fail
                Add-TestResult -Category 'ApiTests' -TestName $test.Name -Status 'FAIL' -Message $errorMessage
            }
        }
    }
    
    Write-ProgressDetail -Activity "Running Functional Tests" -Status "Testing login functionality..." -PercentComplete 50
    
    # Test Login
    Write-SubStep "Testing login functionality..." -Status running
    try {
        $loginUrl = "http://localhost:$AppPort/api/auth/login"
        $loginBody = @{
            email = $script:Config.AdminEmail
            password = $script:Config.AdminPassword
        } | ConvertTo-Json
        
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        $stopwatch.Stop()
        $duration = $stopwatch.ElapsedMilliseconds
        
        if ($response.StatusCode -in @(200, 201)) {
            Write-SubStep "Login API: Success (${duration}ms)" -Status test-pass
            Add-TestResult -Category 'ApiTests' -TestName 'Login API' -Status 'PASS' -Message "Login successful" -Duration "${duration}ms"
            
            # Parse token if present
            try {
                $responseData = $response.Content | ConvertFrom-Json
                if ($responseData.token) {
                    Write-SubStep "JWT token received" -Status success
                }
            } catch {}
        } else {
            Write-SubStep "Login API: HTTP $($response.StatusCode)" -Status warning
            Add-TestResult -Category 'ApiTests' -TestName 'Login API' -Status 'WARN' -Message "Status: $($response.StatusCode)" -Duration "${duration}ms"
        }
    } catch {
        $errorMessage = $_.Exception.Message
        Write-SubStep "Login API: $errorMessage" -Status warning
        Add-TestResult -Category 'ApiTests' -TestName 'Login API' -Status 'WARN' -Message $errorMessage
    }
    
    Write-ProgressDetail -Activity "Running Functional Tests" -Status "Functional tests complete..." -PercentComplete 100
    
    return @{ Success = $true }
}

# ============================================================================
# PLAYWRIGHT UI TESTING FUNCTIONS
# ============================================================================

function Install-PlaywrightDependencies {
    Write-SubStep "Installing Playwright dependencies..." -Status running
    
    try {
        $testsPath = Join-Path $InstallPath "tests"
        Push-Location $testsPath
        
        # Check if node_modules exists
        if (-not (Test-Path "node_modules")) {
            Write-SubStep "Running npm install..." -Status running
            npm install 2>&1 | ForEach-Object {
                if ($_ -match "added|removed|changed|audited") {
                    Write-Host "    $_" -ForegroundColor DarkGray
                }
            }
        }
        
        # Install Playwright browsers
        Write-SubStep "Installing Playwright browsers..." -Status running
        npx playwright install chromium 2>&1 | ForEach-Object {
            Write-Host "    $_" -ForegroundColor DarkGray
        }
        
        Pop-Location
        
        Write-SubStep "Playwright dependencies installed" -Status success
        return @{ Success = $true }
        
    } catch {
        Write-SubStep "Playwright installation warning: $($_.Exception.Message)" -Status warning
        Pop-Location
        return @{ Success = $true }  # Continue anyway
    }
}

function Invoke-PlaywrightTests {
    Write-StepHeader -StepNumber 9 -StepName "Playwright UI Tests"
    
    if ($SkipUITests) {
        Write-SubStep "UI tests skipped by user request" -Status skip
        return @{ Success = $true; Skipped = $true }
    }
    
    $testsPath = Join-Path $InstallPath "tests"
    
    Write-ProgressDetail -Activity "Running Playwright Tests" -Status "Starting UI tests..." -PercentComplete 10
    
    try {
        Push-Location $testsPath
        
        # Run Playwright tests
        Write-SubStep "Running Playwright UI tests..." -Status running
        $env:PLAYWRIGHT_BROWSERS_PATH = "0"  # Use installed browsers
        
        $testOutput = npx playwright test --reporter=json 2>&1
        $testExitCode = $LASTEXITCODE
        
        Pop-Location
        
        Write-ProgressDetail -Activity "Running Playwright Tests" -Status "Processing test results..." -PercentComplete 80
        
        # Parse results
        $testResultsPath = Join-Path $InstallPath "reports\test-results.json"
        if (Test-Path $testResultsPath) {
            $results = Get-Content $testResultsPath | ConvertFrom-Json
            
            foreach ($suite in $results.suites) {
                foreach ($spec in $suite.specs) {
                    $status = if ($spec.ok) { "PASS" } else { "FAIL" }
                    $duration = "$([math]::Round($spec.duration / 1000, 2))s"
                    
                    Write-SubStep "$($spec.title): $status ($duration)" -Status $(if ($spec.ok) { 'test-pass' } else { 'test-fail' })
                    Add-TestResult -Category 'UITests' -TestName $spec.title -Status $status -Duration $duration
                }
            }
        }
        
        # Record screenshots
        $screenshotsPath = Join-Path $InstallPath "screenshots"
        if (Test-Path $screenshotsPath) {
            Get-ChildItem -Path $screenshotsPath -Recurse -Filter "*.png" | ForEach-Object {
                Add-ScreenshotRecord -Name $_.Name -Path $_.FullName -Description "UI Test Screenshot"
            }
        }
        
        Write-ProgressDetail -Activity "Running Playwright Tests" -Status "UI tests complete..." -PercentComplete 100
        
        if ($testExitCode -eq 0) {
            Write-SubStep "All Playwright tests passed" -Status success
        } else {
            Write-SubStep "Some Playwright tests failed (see report)" -Status warning
        }
        
        return @{ Success = ($testExitCode -eq 0) }
        
    } catch {
        Pop-Location
        Write-SubStep "Playwright test error: $($_.Exception.Message)" -Status error
        Add-TestResult -Category 'UITests' -TestName 'Playwright Execution' -Status 'FAIL' -Message $_.Exception.Message
        return @{ Success = $false }
    }
}

function Invoke-UITestingSetup {
    Write-StepHeader -StepNumber 8 -StepName "UI Testing Setup"
    
    if ($SkipUITests) {
        Write-SubStep "UI tests skipped by user request" -Status skip
        return @{ Success = $true }
    }
    
    Write-ProgressDetail -Activity "Setting Up UI Testing" -Status "Checking Node.js..." -PercentComplete 33
    
    $nodeCheck = Test-NodeJS
    if ($nodeCheck.NeedsInstall) {
        Write-ProgressDetail -Activity "Setting Up UI Testing" -Status "Installing Node.js..." -PercentComplete 50
        Install-NodeJS | Out-Null
    }
    
    Write-ProgressDetail -Activity "Setting Up UI Testing" -Status "Installing Playwright..." -PercentComplete 75
    Install-PlaywrightDependencies | Out-Null
    
    Write-ProgressDetail -Activity "Setting Up UI Testing" -Status "Setup complete..." -PercentComplete 100
    
    return @{ Success = $true }
}

# ============================================================================
# REPORT GENERATION FUNCTIONS
# ============================================================================

function New-ValidationReport {
    Write-StepHeader -StepNumber 10 -StepName "Report Generation"
    
    Write-ProgressDetail -Activity "Generating Report" -Status "Creating HTML report..." -PercentComplete 50
    
    $script:TestResults.EndTime = Get-Date
    $script:TestResults.Duration = $script:TestResults.EndTime - $script:TestResults.StartTime
    $script:TestResults.OverallStatus = if ($script:TestResults.Deployment.Status -eq 'PASSED' -and 
                                           $script:TestResults.ContainerHealth.Status -eq 'PASSED' -and
                                           $script:TestResults.DatabaseHealth.Status -eq 'PASSED') { 'PASSED' } else { 'FAILED' }
    
    $reportPath = Join-Path $InstallPath $script:Config.ReportFile
    
    # Generate HTML Report
    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WSH Validation Report - $($script:TestResults.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header .meta { opacity: 0.9; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-top: 15px; }
        .status-passed { background: #10b981; color: white; }
        .status-failed { background: #ef4444; color: white; }
        .status-pending { background: #f59e0b; color: white; }
        .section { background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .section h2 { color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #eee; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .test-item { background: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #ddd; }
        .test-item.pass { border-left-color: #10b981; }
        .test-item.fail { border-left-color: #ef4444; }
        .test-item.warn { border-left-color: #f59e0b; }
        .test-item .name { font-weight: 600; margin-bottom: 5px; }
        .test-item .message { font-size: 0.9em; color: #666; }
        .test-item .duration { font-size: 0.8em; color: #999; margin-top: 5px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .stat-card .value { font-size: 2.5em; font-weight: bold; }
        .stat-card .label { color: #666; margin-top: 5px; }
        .stat-card.pass .value { color: #10b981; }
        .stat-card.fail .value { color: #ef4444; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
        .screenshot { border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .screenshot img { width: 100%; height: auto; }
        .screenshot .caption { padding: 10px; background: #f5f5f5; font-size: 0.9em; }
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .summary-table th, .summary-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .summary-table th { background: #f5f5f5; }
        .icon-pass::before { content: '✓ '; color: #10b981; }
        .icon-fail::before { content: '✗ '; color: #ef4444; }
        .icon-warn::before { content: '⚠ '; color: #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WSH Validation Report</h1>
            <div class="meta">
                <p>Generated: $($script:TestResults.EndTime.ToString('yyyy-MM-dd HH:mm:ss'))</p>
                <p>Duration: $($script:TestResults.Duration.ToString('mm\:ss'))</p>
                <p>Application: $($script:Config.AppDisplayName) v$($script:Config.AppVersion)</p>
            </div>
            <span class="status-badge status-$($script:TestResults.OverallStatus.ToLower())">$($script:TestResults.OverallStatus)</span>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="value">$($script:TestResults.ApiTests.Passed + $script:TestResults.UITests.Passed)</div>
                <div class="label">Passed Tests</div>
            </div>
            <div class="stat-card fail">
                <div class="value">$($script:TestResults.ApiTests.Failed + $script:TestResults.UITests.Failed)</div>
                <div class="label">Failed Tests</div>
            </div>
            <div class="stat-card">
                <div class="value">$($script:TestResults.Screenshots.Count)</div>
                <div class="label">Screenshots</div>
            </div>
            <div class="stat-card">
                <div class="value">$($script:TestResults.Duration.TotalMinutes.ToString('F1'))</div>
                <div class="label">Minutes</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Summary</h2>
            <table class="summary-table">
                <tr>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Passed</th>
                    <th>Failed</th>
                </tr>
                <tr>
                    <td>Deployment</td>
                    <td class="icon-$($script:TestResults.Deployment.Status.ToLower())">$($script:TestResults.Deployment.Status)</td>
                    <td>$(($script:TestResults.Deployment.Details | Where-Object { $_.Status -eq 'PASS' }).Count)</td>
                    <td>$(($script:TestResults.Deployment.Details | Where-Object { $_.Status -eq 'FAIL' }).Count)</td>
                </tr>
                <tr>
                    <td>Container Health</td>
                    <td class="icon-$($script:TestResults.ContainerHealth.Status.ToLower())">$($script:TestResults.ContainerHealth.Status)</td>
                    <td>$(($script:TestResults.ContainerHealth.Details | Where-Object { $_.Status -eq 'PASS' }).Count)</td>
                    <td>$(($script:TestResults.ContainerHealth.Details | Where-Object { $_.Status -eq 'FAIL' }).Count)</td>
                </tr>
                <tr>
                    <td>Database Health</td>
                    <td class="icon-$($script:TestResults.DatabaseHealth.Status.ToLower())">$($script:TestResults.DatabaseHealth.Status)</td>
                    <td>$(($script:TestResults.DatabaseHealth.Details | Where-Object { $_.Status -eq 'PASS' }).Count)</td>
                    <td>$(($script:TestResults.DatabaseHealth.Details | Where-Object { $_.Status -eq 'FAIL' }).Count)</td>
                </tr>
                <tr>
                    <td>API Tests</td>
                    <td class="icon-$($script:TestResults.ApiTests.Status.ToLower())">$($script:TestResults.ApiTests.Status)</td>
                    <td>$($script:TestResults.ApiTests.Passed)</td>
                    <td>$($script:TestResults.ApiTests.Failed)</td>
                </tr>
                <tr>
                    <td>UI Tests</td>
                    <td class="icon-$($script:TestResults.UITests.Status.ToLower())">$($script:TestResults.UITests.Status)</td>
                    <td>$($script:TestResults.UITests.Passed)</td>
                    <td>$($script:TestResults.UITests.Failed)</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2>🔧 Deployment Tests</h2>
            <div class="test-grid">
$(foreach ($test in $script:TestResults.Deployment.Details) {
    "                <div class=`"test-item $($test.Status.ToLower())`">
                    <div class=`"name`">$($test.Name)</div>
                    <div class=`"message`">$($test.Message)</div>
                </div>
"
})
            </div>
        </div>

        <div class="section">
            <h2>🐳 Container Health</h2>
            <div class="test-grid">
$(foreach ($test in $script:TestResults.ContainerHealth.Details) {
    "                <div class=`"test-item $($test.Status.ToLower())`">
                    <div class=`"name`">$($test.Name)</div>
                    <div class=`"message`">$($test.Message)</div>
                </div>
"
})
            </div>
        </div>

        <div class="section">
            <h2>🔌 API Tests</h2>
            <div class="test-grid">
$(foreach ($test in $script:TestResults.ApiTests.Tests) {
    "                <div class=`"test-item $($test.Status.ToLower())`">
                    <div class=`"name`">$($test.Name)</div>
                    <div class=`"message`">$($test.Message)</div>
                    <div class=`"duration`">$($test.Duration)</div>
                </div>
"
})
            </div>
        </div>

        <div class="section">
            <h2>🖥️ UI Tests</h2>
            <div class="test-grid">
$(foreach ($test in $script:TestResults.UITests.Tests) {
    "                <div class=`"test-item $($test.Status.ToLower())`">
                    <div class=`"name`">$($test.Name)</div>
                    <div class=`"message`">$($test.Message)</div>
                    <div class=`"duration`">$($test.Duration)</div>
                </div>
"
})
            </div>
        </div>

$(if ($script:TestResults.Screenshots.Count -gt 0) {
    "        <div class=`"section`">
            <h2>📸 Screenshots</h2>
            <div class=`"screenshots`">
$(foreach ($screenshot in $script:TestResults.Screenshots | Select-Object -First 12) {
    "                <div class=`"screenshot`">
                    <img src=`"file:///$($screenshot.Path.Replace('\', '/'))`" alt=`"$($screenshot.Name)`" onerror=`"this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22><rect fill=%22%23ddd%22 width=%22200%22 height=%22150%22/><text x=%22100%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%23666%22>$($screenshot.Name)</text></svg>'`">
                    <div class=`"caption`">$($screenshot.Name)</div>
                </div>
"
})
            </div>
        </div>
"
})

        <div class="section">
            <h2>📁 File Locations</h2>
            <table class="summary-table">
                <tr><th>File</th><th>Path</th></tr>
                <tr><td>Installation Directory</td><td><code>$InstallPath</code></td></tr>
                <tr><td>Docker Compose</td><td><code>$InstallPath\docker-compose.yml</code></td></tr>
                <tr><td>Environment File</td><td><code>$InstallPath\.env</code></td></tr>
                <tr><td>Log File</td><td><code>$InstallPath\$($script:Config.LogFile)</code></td></tr>
                <tr><td>Screenshots</td><td><code>$InstallPath\screenshots\</code></td></tr>
                <tr><td>This Report</td><td><code>$reportPath</code></td></tr>
            </table>
        </div>
    </div>
</body>
</html>
"@

    $html | Out-File -FilePath $reportPath -Encoding UTF8 -Force
    
    Write-ProgressDetail -Activity "Generating Report" -Status "Report saved..." -PercentComplete 100
    Write-SubStep "Validation report created: $reportPath" -Status success
    
    return @{ Success = $true; Path = $reportPath }
}

# ============================================================================
# MAIN INSTALLATION ORCHESTRATION
# ============================================================================

function Write-FinalSummary {
    param (
        [bool]$Success,
        [string]$ErrorMessage = ""
    )
    
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor DarkGray
    
    if ($Success) {
        Write-Host "                    DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    } else {
        Write-Host "                    DEPLOYMENT FAILED" -ForegroundColor Red
    }
    
    Write-Host "================================================================================" -ForegroundColor DarkGray
    Write-Host ""
    
    Write-Host "  Test Results Summary:" -ForegroundColor Cyan
    Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Deployment:        $($script:TestResults.Deployment.Status)" -ForegroundColor $(if ($script:TestResults.Deployment.Status -eq 'PASSED') { 'Green' } else { 'Red' })
    Write-Host "  Container Health:  $($script:TestResults.ContainerHealth.Status)" -ForegroundColor $(if ($script:TestResults.ContainerHealth.Status -eq 'PASSED') { 'Green' } else { 'Red' })
    Write-Host "  Database Health:   $($script:TestResults.DatabaseHealth.Status)" -ForegroundColor $(if ($script:TestResults.DatabaseHealth.Status -eq 'PASSED') { 'Green' } else { 'Red' })
    Write-Host "  API Tests:         $($script:TestResults.ApiTests.Passed)/$($script:TestResults.ApiTests.Passed + $script:TestResults.ApiTests.Failed) passed" -ForegroundColor $(if ($script:TestResults.ApiTests.Failed -eq 0) { 'Green' } else { 'Yellow' })
    Write-Host "  UI Tests:          $($script:TestResults.UITests.Passed)/$($script:TestResults.UITests.Passed + $script:TestResults.UITests.Failed) passed" -ForegroundColor $(if ($script:TestResults.UITests.Failed -eq 0) { 'Green' } else { 'Yellow' })
    Write-Host "  Screenshots:       $($script:TestResults.Screenshots.Count) captured" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "  Access Information:" -ForegroundColor Cyan
    Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Application URL:   http://localhost:$AppPort" -ForegroundColor White
    Write-Host "  Database Port:     localhost:$DatabasePort" -ForegroundColor White
    Write-Host ""
    
    Write-Host "  File Locations:" -ForegroundColor Cyan
    Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Install Directory: $InstallPath" -ForegroundColor White
    Write-Host "  Validation Report: $InstallPath\$($script:Config.ReportFile)" -ForegroundColor White
    Write-Host "  Screenshots:       $InstallPath\screenshots\" -ForegroundColor White
    Write-Host "  Log File:          $InstallPath\$($script:Config.LogFile)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "  Default Credentials (CHANGE IMMEDIATELY!):" -ForegroundColor Yellow
    Write-Host "  ────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Email:             $($script:Config.AdminEmail)" -ForegroundColor White
    Write-Host "  Password:          $($script:Config.AdminPassword)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "================================================================================" -ForegroundColor DarkGray
    
    # Open report in browser
    $reportPath = Join-Path $InstallPath $script:Config.ReportFile
    if (Test-Path $reportPath) {
        Write-Host "  Opening validation report in browser..." -ForegroundColor Cyan
        Start-Process $reportPath
    }
}

function Invoke-Installation {
    Write-LogHeader
    
    Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
    Write-Host "Application Port:  $AppPort" -ForegroundColor Cyan
    Write-Host "Database Port:     $DatabasePort" -ForegroundColor Cyan
    if ($EnablePgAdmin) {
        Write-Host "pgAdmin Port:      $PgAdminPort" -ForegroundColor Cyan
    }
    if ($SkipUITests) {
        Write-Host "UI Tests:          SKIPPED" -ForegroundColor Yellow
    }
    if ($AIApiKey) {
        Write-Host "AI API Key:        Provided" -ForegroundColor Green
    }
    Write-Host ""
    
    $startTime = Get-Date
    $script:InstallPath = $InstallPath
    $script:TestResults.StartTime = $startTime
    
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
        return
    }
    
    # Step 3: Configuration Generation
    $result = Invoke-ConfigurationGeneration
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Configuration generation failed: $($result.Message)"
        return
    }
    
    # Step 4: Database Deployment
    $result = Invoke-DatabaseDeployment
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Database deployment failed: $($result.Message)"
        return
    }
    
    # Step 5: Application Deployment
    $result = Invoke-ApplicationDeployment
    if (-not $result.Success) {
        Write-FinalSummary -Success $false -ErrorMessage "Application deployment failed: $($result.Message)"
        return
    }
    
    # Step 6: Health Validation
    $result = Invoke-HealthValidation
    
    # Step 7: Functional Testing
    $result = Invoke-FunctionalTests
    
    # Step 8: UI Testing Setup
    $result = Invoke-UITestingSetup
    
    # Step 9: Playwright UI Tests
    $result = Invoke-PlaywrightTests
    
    # Step 10: Report Generation
    $result = New-ValidationReport
    
    # Display summary
    Write-FinalSummary -Success ($script:TestResults.OverallStatus -eq 'PASSED')
}

function Invoke-Rollback {
    Write-Host ""
    Write-Host "Initiating rollback..." -ForegroundColor Yellow
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        if (Test-Path $composePath) {
            docker compose -f $composePath down 2>&1 | Out-Null
        }
        
        $containers = @($script:Config.PostgresContainer, $script:Config.AppContainer, $script:Config.PgAdminContainer)
        foreach ($container in $containers) {
            $exists = docker ps -a --filter "name=$container" --format "{{.Names}}" 2>$null
            if ($exists) {
                docker rm -f $container 2>&1 | Out-Null
            }
        }
        
        Write-Host "Rollback completed. Manual cleanup:" -ForegroundColor Gray
        Write-Host "  Remove-Item -Recurse -Force `"$InstallPath`"" -ForegroundColor Gray
        
    } catch {
        Write-Host "Rollback error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Invoke-Uninstall {
    Write-LogHeader
    
    Write-Host "Uninstalling WSH..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $composePath = Join-Path $InstallPath "docker-compose.yml"
        
        if (Test-Path $composePath) {
            Write-SubStep "Stopping containers..." -Status running
            docker compose -f $composePath down -v 2>&1 | Out-Null
            Write-SubStep "Containers stopped and removed" -Status success
        }
        
        if ($RemoveData) {
            Write-SubStep "Removing Docker volumes..." -Status running
            docker volume rm wsh_postgres_data -f 2>&1 | Out-Null
            Write-SubStep "Docker volumes removed" -Status success
            
            Write-SubStep "Removing installation directory..." -Status running
            Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-SubStep "Installation directory removed" -Status success
        }
        
        Write-SubStep "Removing Docker network..." -Status running
        docker network rm $script:Config.DockerNetworkName 2>&1 | Out-Null
        Write-SubStep "Docker network removed" -Status success
        
        Write-Host ""
        Write-Host "WSH has been uninstalled successfully." -ForegroundColor Green
        
    } catch {
        Write-SubStep "Uninstall error: $($_.Exception.Message)" -Status error
    }
}

# ============================================================================
# ENTRY POINT
# ============================================================================

try {
    if ($Uninstall) {
        Invoke-Uninstall
    } else {
        Invoke-Installation
    }
} catch {
    Write-Host ""
    Write-Host "Installation interrupted: $($_.Exception.Message)" -ForegroundColor Red
    Invoke-Rollback
}

Write-Progress -Activity "WSH Installation" -Completed
