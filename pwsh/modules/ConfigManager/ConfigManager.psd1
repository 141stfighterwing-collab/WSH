@{
    RootModule = 'ConfigManager.psm1'
    ModuleVersion = '1.0.0'
    GUID = 'c3d4e5f6-a7b8-9012-cdef-234567890123'
    Author = 'PowerShell Executor'
    Description = 'Configuration management with environment variables and file support'
    PowerShellVersion = '7.0'
    FunctionsToExport = @(
        'Get-ExecutorConfig'
        'Set-ExecutorConfig'
        'Initialize-Configuration'
        'Test-Configuration'
        'Import-ConfigFile'
        'Export-ConfigFile'
        'Get-EnvironmentVariable'
        'Set-EnvironmentVariable'
    )
}
