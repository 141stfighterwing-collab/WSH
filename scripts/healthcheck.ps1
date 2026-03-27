#!/usr/bin/env pwsh
#Requires -Version 7.0
<#
.SYNOPSIS
    WSH Container Health Check Script
.DESCRIPTION
    Performs a health check for Docker health monitoring.
    Returns proper exit codes based on actual health status.
    
    Exit Codes:
    - 0: Healthy (app running, database connected)
    - 1: Unhealthy (app not responding or database disconnected)
#>

param()

$ErrorActionPreference = 'Stop'

$health = @{
    status = "healthy"
    timestamp = (Get-Date -Format "o")
    version = $env:POWERSHELL_EXECUTOR_VERSION
    nodejs = "unknown"
    database = "unknown"
    app = "unknown"
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    $health.nodejs = if ($nodeVersion) { $nodeVersion.Trim() } else { "error" }
} catch {
    $health.nodejs = "error: $($_.Exception.Message)"
}

# Check if server.js is running (the main Next.js app)
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $health.app = "running"
        $health.processCount = $nodeProcesses.Count
    } else {
        $health.app = "not_running"
        $health.status = "unhealthy"
    }
} catch {
    $health.app = "error: $($_.Exception.Message)"
    $health.status = "unhealthy"
}

# Check the API health endpoint
try {
    $response = $null
    
    # Try curl first (more reliable in containers)
    if (Get-Command curl -ErrorAction SilentlyContinue) {
        $httpCode = curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>$null
        if ($httpCode -eq "200") {
            $health.database = "connected"
            $health.app = "healthy"
        } elseif ($httpCode -eq "503") {
            $health.database = "disconnected"
            $health.app = "degraded"
            $health.status = "unhealthy"
        } elseif ($httpCode) {
            $health.database = "unknown"
            $health.app = "responding_$httpCode"
            # Still consider 401, 403, etc. as "app is running"
        } else {
            $health.database = "no_response"
            $health.app = "not_responding"
            $health.status = "unhealthy"
        }
    } else {
        # Fallback to PowerShell method
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                $health.database = "connected"
                $health.app = "healthy"
            } else {
                $health.database = "warning"
                $health.status = "warning"
            }
        } catch {
            # Check if it's just a connection error (app not started) vs other errors
            $errorMsg = $_.Exception.Message
            if ($errorMsg -match "Unable to connect|connection refused|timeout") {
                $health.database = "no_response"
                $health.app = "not_responding"
                $health.status = "unhealthy"
            } else {
                # App might be starting up
                $health.database = "starting"
                $health.app = "starting"
            }
        }
    }
} catch {
    $health.database = "error"
    $health.app = "error"
    $health.status = "unhealthy"
    $health.error = $_.Exception.Message
}

# Output health status as JSON
Write-Output ($health | ConvertTo-Json -Compress)

# Return proper exit code based on health status
if ($health.status -eq "healthy") {
    exit 0
} elseif ($health.status -eq "warning") {
    # Warning is still considered healthy for container purposes
    exit 0
} else {
    # Unhealthy
    exit 1
}
