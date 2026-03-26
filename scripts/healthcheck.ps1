#!/usr/bin/env pwsh
param()

$health = @{
    status = "healthy"
    timestamp = (Get-Date -Format "o")
    version = $env:POWERSHELL_EXECUTOR_VERSION
    nodejs = "unknown"
    database = "checking"
}

try {
    $nodeVersion = node --version 2>$null
    $health.nodejs = $nodeVersion
} catch {
    $health.nodejs = "error"
}

try {
    $result = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -UseBasicParsing 2>$null
    if ($result.StatusCode -eq 200) {
        $health.database = "connected"
    } else {
        $health.database = "error"
    }
} catch {
    $health.database = "disconnected"
    $health.status = "degraded"
}

Write-Output ($health | ConvertTo-Json -Compress)
exit $(if ($health.status -eq "healthy") { 0 } else { 1 })
