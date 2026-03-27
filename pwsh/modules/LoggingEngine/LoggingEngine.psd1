@{
    RootModule = 'LoggingEngine.psm1'
    ModuleVersion = '1.0.0'
    GUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    Author = 'PowerShell Executor'
    CompanyName = 'PowerShell Executor'
    Description = 'Structured logging engine with timestamps, severity levels, and persistent storage'
    PowerShellVersion = '7.0'
    FunctionsToExport = @(
        'Write-Log'
        'Write-LogInfo'
        'Write-LogWarning'
        'Write-LogError'
        'Write-LogSuccess'
        'Write-LogDebug'
        'Start-LoggingSession'
        'Stop-LoggingSession'
        'Get-LogHistory'
        'Export-LogReport'
    )
    VariablesToExport = @()
    AliasesToExport = @()
}
