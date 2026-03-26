#Requires -Version 7.0
<#
.SYNOPSIS
    Container Health Check Script
.DESCRIPTION
    Performs a quick health check for Docker health monitoring
#>

$health = @{
    status = "healthy"
    timestamp = (Get-Date -Format "o")
    version = $env:POWERSHELL_EXECUTOR_VERSION
    uptime = $null
}

try {
    # Check essential paths
    $paths = @('/scripts', '/logs', '/config', '/output')
    foreach ($path in $paths) {
        if (-not (Test-Path $path)) {
            $health.status = "unhealthy"
            $health.error = "Required path missing: $path"
            Write-Output ($health | ConvertTo-Json -Compress)
            exit 1
        }
    }
    
    # Check memory
    $process = Get-Process -Id $PID
    $health.memoryMB = [Math]::Round($process.WorkingSet64 / 1MB, 2)
    
    # Calculate uptime if available
    if ($env:CONTAINER_START_TIME) {
        try {
            $startTime = [DateTime]::Parse($env:CONTAINER_START_TIME)
            $health.uptime = ((Get-Date) - $startTime).ToString('hh\:mm\:ss')
        } catch {}
    }
    
    Write-Output ($health | ConvertTo-Json -Compress)
    exit 0
}
catch {
    $health.status = "unhealthy"
    $health.error = $_.Exception.Message
    Write-Output ($health | ConvertTo-Json -Compress)
    exit 1
}
