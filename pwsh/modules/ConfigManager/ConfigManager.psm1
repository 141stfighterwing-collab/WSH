#Requires -Version 7.0
<#
.SYNOPSIS
    Configuration Manager - Environment and config file handling
.DESCRIPTION
    Provides centralized configuration management with environment variable
    support, file-based configuration, and validation.
#>

# Module-level configuration cache
$script:ConfigCache = @{}
$script:ConfigPath = '/config'

# Default configuration schema
$script:DefaultConfig = @{
    # Execution settings
    EXECUTOR_MODE = 'single'  # single, scheduled, daemon
    SCRIPT_PATH = '/scripts/main.ps1'
    DEFAULT_TIMEOUT = 3600
    MAX_RETRIES = 3
    RETRY_DELAY = 5
    ERROR_ACTION = 'Stop'
    STRICT_MODE = 'true'
    
    # Logging settings
    LOG_PATH = '/logs'
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = 'text'
    LOG_MAX_SIZE_MB = 100
    LOG_MAX_FILES = 30
    LOG_TO_CONSOLE = 'true'
    LOG_TO_FILE = 'true'
    
    # Schedule settings (for scheduled mode)
    SCHEDULE_CRON = ''
    SCHEDULE_TIMEZONE = 'UTC'
    SCHEDULE_RUN_ON_START = 'false'
    
    # Security settings
    ALLOW_INSECURE = 'false'
    REQUIRE_SIGNATURE = 'false'
    SANDBOX_MODE = 'false'
    
    # Output settings
    OUTPUT_PATH = '/output'
    OUTPUT_FORMAT = 'json'
    COMPRESS_OUTPUT = 'false'
    
    # Health check settings
    HEALTH_CHECK_ENABLED = 'true'
    HEALTH_CHECK_PORT = 8080
    HEALTH_CHECK_PATH = '/health'
}

function Initialize-Configuration {
    <#
    .SYNOPSIS
        Initializes configuration from all sources
    .DESCRIPTION
        Loads configuration from default values, config file, and environment
        variables with proper precedence
    .PARAMETER ConfigPath
        Path to configuration file or directory
    .EXAMPLE
        Initialize-Configuration -ConfigPath '/config'
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$ConfigPath = '/config'
    )
    
    $script:ConfigPath = $ConfigPath
    
    Write-Host "[CONFIG] Initializing configuration..." -ForegroundColor Cyan
    
    # Start with defaults
    $config = $script:DefaultConfig.Clone()
    
    # Load from config file if exists
    $configFile = Join-Path $ConfigPath 'executor.json'
    if (Test-Path $configFile) {
        Write-Host "[CONFIG] Loading configuration from: $configFile" -ForegroundColor Cyan
        $fileConfig = Import-ConfigFile -Path $configFile
        foreach ($key in $fileConfig.Keys) {
            $config[$key] = $fileConfig[$key]
        }
    }
    
    # Load from environment variables (highest priority)
    $envConfig = Get-EnvironmentConfig
    foreach ($key in $envConfig.Keys) {
        $config[$key] = $envConfig[$key]
    }
    
    # Validate configuration
    $validation = Test-Configuration -Config $config
    if (-not $validation.Valid) {
        throw "Configuration validation failed: $($validation.Errors -join ', ')"
    }
    
    # Cache the configuration
    $script:ConfigCache = $config
    
    Write-Host "[CONFIG] Configuration loaded successfully" -ForegroundColor Green
    Write-Host "[CONFIG] Mode: $($config.EXECUTOR_MODE)" -ForegroundColor Gray
    Write-Host "[CONFIG] Script: $($config.SCRIPT_PATH)" -ForegroundColor Gray
    Write-Host "[CONFIG] Log Level: $($config.LOG_LEVEL)" -ForegroundColor Gray
    
    return $config
}

function Get-EnvironmentConfig {
    <#
    .SYNOPSIS
        Retrieves configuration from environment variables
    .DESCRIPTION
        Scans environment variables with EXECUTOR_ prefix and maps them
        to configuration values
    #>
    [CmdletBinding()]
    param()
    
    $config = @{}
    
    # Get all environment variables
    $envVars = Get-ChildItem Env: | Where-Object { $_.Name -like 'EXECUTOR_*' }
    
    foreach ($var in $envVars) {
        # Remove EXECUTOR_ prefix and convert to proper key
        $key = $var.Name -replace '^EXECUTOR_', ''
        $value = $var.Value
        
        # Convert string values to appropriate types
        $config[$key] = Convert-ConfigValue -Value $value
    }
    
    # Also check for common non-prefixed variables
    $commonVars = @(
        'SCRIPT_PATH',
        'LOG_LEVEL',
        'LOG_PATH',
        'OUTPUT_PATH'
    )
    
    foreach ($varName in $commonVars) {
        $envValue = [Environment]::GetEnvironmentVariable($varName)
        if ($envValue) {
            $config[$varName] = Convert-ConfigValue -Value $envValue
        }
    }
    
    return $config
}

function Convert-ConfigValue {
    <#
    .SYNOPSIS
        Converts string configuration values to appropriate types
    #>
    param([string]$Value)
    
    # Boolean conversion
    if ($Value -in @('true', 'false', 'yes', 'no', '1', '0')) {
        return $Value -in @('true', 'yes', '1')
    }
    
    # Integer conversion
    if ($Value -match '^\d+$') {
        return [int]$Value
    }
    
    # Keep as string
    return $Value
}

function Get-ExecutorConfig {
    <#
    .SYNOPSIS
        Retrieves a configuration value by key
    .DESCRIPTION
        Returns cached configuration value or default if not found
    .PARAMETER Key
        Configuration key to retrieve
    .PARAMETER Default
        Default value if key not found
    .EXAMPLE
        $logPath = Get-ExecutorConfig -Key 'LOG_PATH' -Default '/logs'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Key,
        
        [Parameter()]
        $Default = $null
    )
    
    if ($script:ConfigCache.ContainsKey($Key)) {
        return $script:ConfigCache[$Key]
    }
    
    if ($script:DefaultConfig.ContainsKey($Key)) {
        return $script:DefaultConfig[$Key]
    }
    
    return $Default
}

function Set-ExecutorConfig {
    <#
    .SYNOPSIS
        Sets a configuration value at runtime
    .PARAMETER Key
        Configuration key to set
    .PARAMETER Value
        Value to set
    .EXAMPLE
        Set-ExecutorConfig -Key 'LOG_LEVEL' -Value 'DEBUG'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Key,
        
        [Parameter(Mandatory = $true)]
        $Value
    )
    
    $script:ConfigCache[$Key] = $Value
    Write-Host "[CONFIG] Updated: $Key = $Value" -ForegroundColor Gray
}

function Test-Configuration {
    <#
    .SYNOPSIS
        Validates configuration values
    .DESCRIPTION
        Checks for required values, valid paths, and correct types
    .PARAMETER Config
        Configuration hashtable to validate
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [hashtable]$Config = $script:ConfigCache
    )
    
    $result = @{
        Valid = $true
        Errors = @()
        Warnings = @()
    }
    
    # Validate required keys
    $requiredKeys = @('SCRIPT_PATH', 'LOG_PATH')
    foreach ($key in $requiredKeys) {
        if (-not $Config.ContainsKey($key) -or [string]::IsNullOrEmpty($Config[$key])) {
            $result.Valid = $false
            $result.Errors += "Required configuration missing: $key"
        }
    }
    
    # Validate LOG_LEVEL
    $validLogLevels = @('DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL')
    if ($Config.LOG_LEVEL -and $Config.LOG_LEVEL -notin $validLogLevels) {
        $result.Warnings += "Invalid LOG_LEVEL '$($Config.LOG_LEVEL)'. Using default: INFO"
    }
    
    # Validate EXECUTOR_MODE
    $validModes = @('single', 'scheduled', 'daemon')
    if ($Config.EXECUTOR_MODE -and $Config.EXECUTOR_MODE -notin $validModes) {
        $result.Valid = $false
        $result.Errors += "Invalid EXECUTOR_MODE '$($Config.EXECUTOR_MODE)'. Must be one of: $($validModes -join ', ')"
    }
    
    # Validate numeric ranges
    if ($Config.MAX_RETRIES -and ($Config.MAX_RETRIES -lt 0 -or $Config.MAX_RETRIES -gt 10)) {
        $result.Warnings += "MAX_RETRIES should be between 0 and 10"
    }
    
    if ($Config.DEFAULT_TIMEOUT -and $Config.DEFAULT_TIMEOUT -lt 60) {
        $result.Warnings += "DEFAULT_TIMEOUT should be at least 60 seconds"
    }
    
    return $result
}

function Import-ConfigFile {
    <#
    .SYNOPSIS
        Imports configuration from a file
    .DESCRIPTION
        Supports JSON, YAML (if available), and PowerShell data files
    .PARAMETER Path
        Path to configuration file
    .EXAMPLE
        $config = Import-ConfigFile -Path '/config/executor.json'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    
    if (-not (Test-Path $Path)) {
        throw "Configuration file not found: $Path"
    }
    
    $extension = [System.IO.Path]::GetExtension($Path).ToLower()
    
    switch ($extension) {
        '.json' {
            $content = Get-Content -Path $Path -Raw
            return $content | ConvertFrom-Json -AsHashtable
        }
        '.psd1' {
            $data = Import-PowerShellDataFile -Path $Path
            return $data
        }
        '.yaml' {
            if (Get-Command 'ConvertFrom-Yaml' -ErrorAction SilentlyContinue) {
                $content = Get-Content -Path $Path -Raw
                return ConvertFrom-Yaml -Yaml $content
            }
            throw "YAML support requires the PowerShell-Yaml module"
        }
        default {
            throw "Unsupported configuration file format: $extension"
        }
    }
}

function Export-ConfigFile {
    <#
    .SYNOPSIS
        Exports current configuration to a file
    .PARAMETER Path
        Output file path
    .PARAMETER Format
        Output format (json, psd1)
    .EXAMPLE
        Export-ConfigFile -Path '/config/export.json' -Format 'json'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        
        [Parameter()]
        [ValidateSet('json', 'psd1')]
        [string]$Format = 'json'
    )
    
    $config = $script:ConfigCache
    
    switch ($Format) {
        'json' {
            $config | ConvertTo-Json -Depth 10 | Out-File -FilePath $Path -Encoding UTF8
        }
        'psd1' {
            $content = '@{'
            foreach ($key in $config.Keys) {
                $value = $config[$key]
                if ($value -is [string]) {
                    $content += "`n    $key = '$value'"
                }
                elseif ($value -is [bool]) {
                    $content += "`n    $key = `$$value"
                }
                else {
                    $content += "`n    $key = $value"
                }
            }
            $content += "`n}"
            $content | Out-File -FilePath $Path -Encoding UTF8
        }
    }
    
    Write-Host "[CONFIG] Configuration exported to: $Path" -ForegroundColor Green
}

function Get-EnvironmentVariable {
    <#
    .SYNOPSIS
        Gets an environment variable with fallback
    .PARAMETER Name
        Environment variable name
    .PARAMETER Default
        Default value if not set
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [Parameter()]
        $Default = $null
    )
    
    $value = [Environment]::GetEnvironmentVariable($Name)
    
    if ([string]::IsNullOrEmpty($value)) {
        return $Default
    }
    
    return Convert-ConfigValue -Value $value
}

function Set-EnvironmentVariable {
    <#
    .SYNOPSIS
        Sets an environment variable
    .PARAMETER Name
        Environment variable name
    .PARAMETER Value
        Value to set
    .PARAMETER Scope
        Scope (Process, User, Machine)
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [Parameter(Mandatory = $true)]
        $Value,
        
        [Parameter()]
        [ValidateSet('Process', 'User', 'Machine')]
        [string]$Scope = 'Process'
    )
    
    [Environment]::SetEnvironmentVariable($Name, $Value.ToString(), $Scope)
    Write-Host "[ENV] Set $Name = $Value ($Scope)" -ForegroundColor Gray
}

# Export module members
Export-ModuleMember -Function @(
    'Get-ExecutorConfig'
    'Set-ExecutorConfig'
    'Initialize-Configuration'
    'Test-Configuration'
    'Import-ConfigFile'
    'Export-ConfigFile'
    'Get-EnvironmentVariable'
    'Set-EnvironmentVariable'
)
