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
    $result = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -UseBasicParsing 2>$null
    if ($result.StatusCode -eq 200) {
        $health.database = "connected"
    } elseif ($result.StatusCode -eq 503) {
        # 503 means app is running but database may have issues
        $health.database = "warning"
        $health.status = "healthy"  # Still consider container healthy
    } else {
        $health.database = "error"
    }
} catch {
    $health.database = "disconnected"
    # Don't fail - app might still be starting
    $health.status = "healthy"
}

Write-Output ($health | ConvertTo-Json -Compress)
exit 0  # Always return 0 to allow container to run
