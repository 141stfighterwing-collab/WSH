@{
    RootModule = 'HealthCheck.psm1'
    ModuleVersion = '1.0.0'
    Author = 'PowerShell Executor'
    Description = 'Health check and system status monitoring'
    PowerShellVersion = '7.0'
    FunctionsToExport = @(
        'Invoke-HealthCheck'
        'Test-SystemReadiness'
        'Get-SystemStatus'
        'Start-HealthServer'
        'Stop-HealthServer'
    )
}
