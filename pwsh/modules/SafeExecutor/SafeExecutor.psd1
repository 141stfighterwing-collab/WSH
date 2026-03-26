@{
    RootModule = 'SafeExecutor.psm1'
    ModuleVersion = '1.0.0'
    GUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    Author = 'PowerShell Executor'
    CompanyName = 'PowerShell Executor'
    Description = 'Safe script execution engine with validation, retry logic, and comprehensive error handling'
    PowerShellVersion = '7.0'
    FunctionsToExport = @(
        'Invoke-Safely'
        'Invoke-ScriptWithRetry'
        'Test-ScriptPath'
        'Test-ScriptSyntax'
        'Test-RequiredModules'
        'Test-FilePermissions'
        'Invoke-PreFlightCheck'
        'Get-ExecutionResult'
        'New-ExecutionContext'
    )
    VariablesToExport = @()
    AliasesToExport = @()
}
