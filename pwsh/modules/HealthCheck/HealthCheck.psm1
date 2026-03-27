#Requires -Version 7.0
<#
.SYNOPSIS
    Health Check - System health monitoring and HTTP endpoint
.DESCRIPTION
    Provides health check endpoints and system status monitoring for
    Docker health checks and external monitoring systems.
#>

# Module-level variables
$script:HealthStatus = @{
    Status = 'unknown'
    LastCheck = $null
    Uptime = $null
    StartTime = $null
    Checks = @{}
}

$script:HealthServer = $null
$script:HealthListener = $null

function Initialize-HealthStatus {
    <#
    .SYNOPSIS
        Initializes the health status tracking
    #>
    $script:HealthStatus.StartTime = Get-Date
    $script:HealthStatus.Status = 'starting'
}

function Invoke-HealthCheck {
    <#
    .SYNOPSIS
        Performs a comprehensive health check
    .DESCRIPTION
        Runs all registered health checks and returns overall status
    .EXAMPLE
        $health = Invoke-HealthCheck
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [string[]]$CheckNames = @()
    )
    
    $startTime = Get-Date
    
    $result = @{
        Status = 'healthy'
        Timestamp = $startTime.ToString('o')
        Uptime = if ($script:HealthStatus.StartTime) {
            (Get-Date) - $script:HealthStatus.StartTime
        } else { [TimeSpan]::Zero }
        Checks = @{}
        Summary = @{
            Total = 0
            Healthy = 0
            Unhealthy = 0
            Warning = 0
        }
    }
    
    # Define health checks
    $checks = @{
        'filesystem' = {
            $check = @{ Name = 'Filesystem'; Status = 'healthy'; Details = @{} }
            
            # Check required directories
            $dirs = @('/scripts', '/logs', '/config', '/output')
            foreach ($dir in $dirs) {
                $exists = Test-Path $dir
                $check.Details[$dir] = @{
                    Exists = $exists
                    Writable = if ($exists) { 
                        try {
                            $testFile = Join-Path $dir ".health_test_$(Get-Random)"
                            $null = New-Item -Path $testFile -ItemType File -Force -ErrorAction Stop
                            Remove-Item $testFile -Force -ErrorAction SilentlyContinue
                            $true
                        } catch { $false }
                    } else { $false }
                }
                if (-not $exists -or -not $check.Details[$dir].Writable) {
                    $check.Status = 'warning'
                }
            }
            return $check
        }
        
        'memory' = {
            $check = @{ Name = 'Memory'; Status = 'healthy'; Details = @{} }
            
            $mem = Get-Process -Id $PID
            $check.Details.WorkingSetMB = [Math]::Round($mem.WorkingSet64 / 1MB, 2)
            $check.Details.VirtualMemGB = [Math]::Round($mem.VirtualMemorySize64 / 1GB, 2)
            
            # Warn if using more than 1GB
            if ($check.Details.WorkingSetMB -gt 1024) {
                $check.Status = 'warning'
            }
            
            return $check
        }
        
        'configuration' = {
            $check = @{ Name = 'Configuration'; Status = 'healthy'; Details = @{} }
            
            try {
                Import-Module -Name '/modules/ConfigManager' -Force
                $config = Get-ExecutorConfig
                
                if (-not $config) {
                    $check.Status = 'unhealthy'
                    $check.Details.Error = 'Configuration not loaded'
                } else {
                    $check.Details.Loaded = $true
                    $check.Details.Keys = $config.Keys.Count
                }
            }
            catch {
                $check.Status = 'unhealthy'
                $check.Details.Error = $_.Exception.Message
            }
            
            return $check
        }
        
        'modules' = {
            $check = @{ Name = 'Modules'; Status = 'healthy'; Details = @{} }
            
            $requiredModules = @('LoggingEngine', 'SafeExecutor', 'ConfigManager')
            foreach ($module in $requiredModules) {
                $loaded = Get-Module -Name $module -ErrorAction SilentlyContinue
                $check.Details[$module] = @{
                    Loaded = ($null -ne $loaded)
                    Version = if ($loaded) { $loaded.Version.ToString() } else { 'N/A' }
                }
                if (-not $loaded) {
                    $check.Status = 'warning'
                }
            }
            
            return $check
        }
        
        'disk' = {
            $check = @{ Name = 'Disk Space'; Status = 'healthy'; Details = @{} }
            
            try {
                # Check disk space on relevant mounts
                $dfOutput = df -h 2>$null | ConvertFrom-Csv -Delimiter ' '
                foreach ($mount in $dfOutput) {
                    if ($mount.Filesystem -and $mount.Mounted) {
                        $check.Details[$mount.Mounted] = @{
                            Available = $mount.Available
                            Used = $mount.Used
                            UsePercent = $mount.'Use%'
                        }
                    }
                }
            }
            catch {
                $check.Details.Error = 'Unable to check disk space'
                $check.Status = 'warning'
            }
            
            return $check
        }
    }
    
    # Run requested checks or all
    $checksToRun = if ($CheckNames -and $CheckNames.Count -gt 0) {
        $checks.GetEnumerator() | Where-Object { $_.Key -in $CheckNames }
    } else {
        $checks.GetEnumerator()
    }
    
    foreach ($checkEntry in $checksToRun) {
        $checkName = $checkEntry.Key
        $checkScript = $checkEntry.Value
        
        try {
            $checkResult = & $checkScript
            $result.Checks[$checkName] = $checkResult
            
            $result.Summary.Total++
            switch ($checkResult.Status) {
                'healthy' { $result.Summary.Healthy++ }
                'warning' { $result.Summary.Warning++; if ($result.Status -eq 'healthy') { $result.Status = 'warning' } }
                'unhealthy' { $result.Summary.Unhealthy++; $result.Status = 'unhealthy' }
            }
        }
        catch {
            $result.Checks[$checkName] = @{
                Name = $checkName
                Status = 'unhealthy'
                Error = $_.Exception.Message
            }
            $result.Summary.Total++
            $result.Summary.Unhealthy++
            $result.Status = 'unhealthy'
        }
    }
    
    $script:HealthStatus.LastCheck = Get-Date
    $script:HealthStatus.Status = $result.Status
    $script:HealthStatus.Checks = $result.Checks
    $script:HealthStatus.Uptime = $result.Uptime
    
    return $result
}

function Test-SystemReadiness {
    <#
    .SYNOPSIS
        Tests if the system is ready to accept work
    .DESCRIPTION
        Quick readiness check for container orchestration
    .EXAMPLE
        if (Test-SystemReadiness) { Start-Processing }
    #>
    [CmdletBinding()]
    param()
    
    # Quick checks only
    $requiredPaths = @('/scripts', '/logs')
    
    foreach ($path in $requiredPaths) {
        if (-not (Test-Path $path)) {
            Write-Warning "Required path not found: $path"
            return $false
        }
    }
    
    # Check if modules are loaded
    $modules = Get-Module -Name 'LoggingEngine', 'SafeExecutor', 'ConfigManager' -ErrorAction SilentlyContinue
    if ($modules.Count -lt 3) {
        Write-Warning "Not all required modules are loaded"
        return $false
    }
    
    return $true
}

function Get-SystemStatus {
    <#
    .SYNOPSIS
        Returns current system status
    .DESCRIPTION
        Provides detailed status information including uptime, memory, and recent activity
    .EXAMPLE
        Get-SystemStatus | Format-Json
    #>
    [CmdletBinding()]
    param()
    
    $process = Get-Process -Id $PID
    
    $status = @{
        Process = @{
            Id = $PID
            StartTime = $process.StartTime
            Uptime = (Get-Date) - $process.StartTime
            WorkingSetMB = [Math]::Round($process.WorkingSet64 / 1MB, 2)
            Threads = $process.Threads.Count
            Handles = $process.HandleCount
        }
        System = @{
            MachineName = $env:COMPUTERNAME
            OS = $PSVersionTable.OS
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
            HostName = hostname
        }
        Health = $script:HealthStatus
        Timestamp = Get-Date -Format 'o'
    }
    
    return $status
}

function Start-HealthServer {
    <#
    .SYNOPSIS
        Starts an HTTP listener for health checks
    .DESCRIPTION
        Creates a simple HTTP server for Docker health checks and monitoring
    .PARAMETER Port
        Port to listen on (default: 8080)
    .PARAMETER Path
        Health check path (default: /health)
    .EXAMPLE
        Start-HealthServer -Port 8080
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$Port = 8080,
        
        [Parameter()]
        [string]$Path = '/health'
    )
    
    if ($script:HealthListener) {
        Write-Warning "Health server already running"
        return
    }
    
    try {
        $url = "http://+:$Port$Path"
        $script:HealthListener = New-Object System.Net.HttpListener
        $script:HealthListener.Prefixes.Add($url)
        $script:HealthListener.Start()
        
        Write-Host "[HEALTH] Server started on port $Port at $Path" -ForegroundColor Green
        
        # Start listener loop in background
        $script:HealthServer = Start-ThreadJob -ScriptBlock {
            param($Listener, $CheckPath)
            
            while ($Listener.IsListening) {
                try {
                    $context = $Listener.GetContext()
                    $response = $context.Response
                    
                    # Perform health check
                    Import-Module -Name '/modules/HealthCheck' -Force
                    $health = Invoke-HealthCheck
                    
                    # Determine HTTP status code
                    $statusCode = switch ($health.Status) {
                        'healthy' { 200 }
                        'warning' { 200 }
                        'unhealthy' { 503 }
                        default { 503 }
                    }
                    
                    $response.StatusCode = $statusCode
                    $response.ContentType = 'application/json'
                    
                    $json = $health | ConvertTo-Json -Depth 10 -Compress
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
                    
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.OutputStream.Close()
                }
                catch {
                    # Listener likely stopped
                    break
                }
            }
        } -ArgumentList $script:HealthListener, $Path
        
        return @{
            Status = 'started'
            Port = $Port
            Path = $Path
            Url = "http://localhost:$Port$Path"
        }
    }
    catch {
        Write-Error "Failed to start health server: $($_.Exception.Message)"
        throw
    }
}

function Stop-HealthServer {
    <#
    .SYNOPSIS
        Stops the health check HTTP server
    .EXAMPLE
        Stop-HealthServer
    #>
    [CmdletBinding()]
    param()
    
    if ($script:HealthListener) {
        $script:HealthListener.Stop()
        $script:HealthListener.Close()
        $script:HealthListener = $null
        Write-Host "[HEALTH] Server stopped" -ForegroundColor Yellow
    }
    
    if ($script:HealthServer) {
        $script:HealthServer | Stop-Job -PassThru | Remove-Job
        $script:HealthServer = $null
    }
}

# Initialize on module load
Initialize-HealthStatus

# Export module members
Export-ModuleMember -Function @(
    'Invoke-HealthCheck'
    'Test-SystemReadiness'
    'Get-SystemStatus'
    'Start-HealthServer'
    'Stop-HealthServer'
)
