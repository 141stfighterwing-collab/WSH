#Requires -Version 7.0
<#
.SYNOPSIS
    Safe Executor - Secure script execution with validation and error handling
.DESCRIPTION
    Provides safe execution wrappers for PowerShell scripts with comprehensive
    validation, retry logic, error handling, and result tracking.
#>

# Module-level tracking
$script:ExecutionContext = $null
$script:ExecutionHistory = [System.Collections.Concurrent.ConcurrentQueue[object]]::new()

# Default configuration
$script:ExecutorConfig = @{
    MaxRetries = 3
    RetryDelaySeconds = 5
    RetryBackoffMultiplier = 2
    MaxRetryDelaySeconds = 60
    DefaultTimeoutSeconds = 3600
    StrictMode = $true
    ErrorAction = 'Stop'
    ValidateBeforeExecution = $true
    CaptureOutput = $true
    ContinueOnError = $false
}

function New-ExecutionContext {
    <#
    .SYNOPSIS
        Creates a new execution context for tracking script runs
    .DESCRIPTION
        Initializes an execution context with configuration, tracking IDs,
        and runtime parameters
    .PARAMETER ScriptPath
        Path to the script to execute
    .PARAMETER Parameters
        Parameters to pass to the script
    .PARAMETER RetryCount
        Number of retry attempts for transient failures
    .PARAMETER TimeoutSeconds
        Maximum execution time
    .EXAMPLE
        $context = New-ExecutionContext -ScriptPath '/scripts/task.ps1' -RetryCount 3
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [Parameter()]
        [hashtable]$Parameters = @{},
        
        [Parameter()]
        [int]$RetryCount = $script:ExecutorConfig.MaxRetries,
        
        [Parameter()]
        [int]$TimeoutSeconds = $script:ExecutorConfig.DefaultTimeoutSeconds,
        
        [Parameter()]
        [string]$StepName = 'Script Execution',
        
        [Parameter()]
        [string[]]$RequiredModules = @(),
        
        [Parameter()]
        [string[]]$RequiredPaths = @()
    )
    
    $context = @{
        ExecutionId = [Guid]::NewGuid().ToString()
        ScriptPath = $ScriptPath
        Parameters = $Parameters
        RetryCount = $RetryCount
        TimeoutSeconds = $TimeoutSeconds
        StepName = $StepName
        RequiredModules = $RequiredModules
        RequiredPaths = $RequiredPaths
        StartTime = $null
        EndTime = $null
        Status = 'Pending'
        Attempts = 0
        LastError = $null
        Output = @()
        ValidationResult = $null
    }
    
    $script:ExecutionContext = $context
    return $context
}

function Test-ScriptPath {
    <#
    .SYNOPSIS
        Validates that a script file exists and is accessible
    .DESCRIPTION
        Checks for script existence, readability, and valid extension
    .PARAMETER Path
        Path to the script file
    .EXAMPLE
        Test-ScriptPath -Path '/scripts/task.ps1'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    
    $result = @{
        Valid = $true
        Path = $Path
        Exists = $false
        IsReadable = $false
        Extension = $null
        Errors = @()
    }
    
    # Check if path exists
    if (-not (Test-Path -Path $Path -PathType Leaf)) {
        $result.Valid = $false
        $result.Errors += "Script file not found: $Path"
        return $result
    }
    $result.Exists = $true
    
    # Check extension
    $extension = [System.IO.Path]::GetExtension($Path)
    $result.Extension = $extension
    if ($extension -notin @('.ps1', '.psm1', '.psd1')) {
        $result.Valid = $false
        $result.Errors += "Invalid script extension: $extension. Expected .ps1, .psm1, or .psd1"
    }
    
    # Check readability
    try {
        $null = Get-Content -Path $Path -TotalCount 1 -ErrorAction Stop
        $result.IsReadable = $true
    }
    catch {
        $result.Valid = $false
        $result.IsReadable = $false
        $result.Errors += "Script file is not readable: $($_.Exception.Message)"
    }
    
    return $result
}

function Test-ScriptSyntax {
    <#
    .SYNOPSIS
        Validates PowerShell script syntax without execution
    .DESCRIPTION
        Parses the script to check for syntax errors
    .PARAMETER Path
        Path to the script file
    .EXAMPLE
        Test-ScriptSyntax -Path '/scripts/task.ps1'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    
    $result = @{
        Valid = $true
        Path = $Path
        Errors = @()
        Warnings = @()
    }
    
    try {
        $errors = $null
        $null = [System.Management.Automation.PSParser]::Tokenize(
            (Get-Content -Path $Path -Raw),
            [ref]$errors
        )
        
        if ($errors) {
            $result.Valid = $false
            foreach ($error in $errors) {
                $result.Errors += "Syntax error at line $($error.Extent.StartLineNumber): $($error.Message)"
            }
        }
    }
    catch {
        $result.Valid = $false
        $result.Errors += "Failed to parse script: $($_.Exception.Message)"
    }
    
    return $result
}

function Test-RequiredModules {
    <#
    .SYNOPSIS
        Validates that required modules are available
    .DESCRIPTION
        Checks if specified modules are installed and can be imported
    .PARAMETER Modules
        Array of module names to check
    .EXAMPLE
        Test-RequiredModules -Modules @('LoggingEngine', 'SafeExecutor')
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Modules
    )
    
    $result = @{
        Valid = $true
        Modules = @()
        MissingModules = @()
        Errors = @()
    }
    
    foreach ($moduleName in $Modules) {
        $moduleInfo = @{
            Name = $moduleName
            Available = $false
            Version = $null
        }
        
        try {
            $module = Get-Module -Name $moduleName -ListAvailable -ErrorAction Stop | Select-Object -First 1
            if ($module) {
                $moduleInfo.Available = $true
                $moduleInfo.Version = $module.Version.ToString()
            }
            else {
                $result.Valid = $false
                $result.MissingModules += $moduleName
                $result.Errors += "Required module not found: $moduleName"
            }
        }
        catch {
            $result.Valid = $false
            $result.MissingModules += $moduleName
            $result.Errors += "Error checking module '$moduleName': $($_.Exception.Message)"
        }
        
        $result.Modules += $moduleInfo
    }
    
    return $result
}

function Test-FilePermissions {
    <#
    .SYNOPSIS
        Validates file and directory permissions
    .DESCRIPTION
        Checks read/write/execute permissions on specified paths
    .PARAMETER Paths
        Array of paths to check
    .PARAMETER RequiredAccess
        Required access level (Read, Write, Execute)
    .EXAMPLE
        Test-FilePermissions -Paths @('/scripts', '/logs') -RequiredAccess 'Write'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Paths,
        
        [Parameter()]
        [ValidateSet('Read', 'Write', 'Execute')]
        [string]$RequiredAccess = 'Read'
    )
    
    $result = @{
        Valid = $true
        Paths = @()
        AccessiblePaths = @()
        InaccessiblePaths = @()
        Errors = @()
    }
    
    foreach ($path in $Paths) {
        $pathInfo = @{
            Path = $path
            Exists = $false
            HasAccess = $false
            AccessType = $RequiredAccess
        }
        
        if (-not (Test-Path -Path $path)) {
            $result.Valid = $false
            $result.InaccessiblePaths += $path
            $result.Errors += "Path does not exist: $path"
            $result.Paths += $pathInfo
            continue
        }
        
        $pathInfo.Exists = $true
        
        try {
            switch ($RequiredAccess) {
                'Read' {
                    $null = Get-Item -Path $path -ErrorAction Stop
                    $pathInfo.HasAccess = $true
                }
                'Write' {
                    $testFile = Join-Path $path ".permission_test_$(Get-Random)"
                    $null = New-Item -Path $testFile -ItemType File -Force -ErrorAction Stop
                    Remove-Item -Path $testFile -Force -ErrorAction SilentlyContinue
                    $pathInfo.HasAccess = $true
                }
                'Execute' {
                    if (Test-Path -Path $path -PathType Leaf) {
                        # For files, check if executable
                        $pathInfo.HasAccess = $true
                    }
                    else {
                        # For directories, check if we can list contents
                        $null = Get-ChildItem -Path $path -ErrorAction Stop | Select-Object -First 1
                        $pathInfo.HasAccess = $true
                    }
                }
            }
            
            $result.AccessiblePaths += $path
        }
        catch {
            $result.Valid = $false
            $pathInfo.HasAccess = $false
            $result.InaccessiblePaths += $path
            $result.Errors += "No $RequiredAccess access to path: $path - $($_.Exception.Message)"
        }
        
        $result.Paths += $pathInfo
    }
    
    return $result
}

function Invoke-PreFlightCheck {
    <#
    .SYNOPSIS
        Performs all validation checks before script execution
    .DESCRIPTION
        Runs comprehensive pre-flight checks including script path,
        syntax, modules, and permissions
    .PARAMETER Context
        Execution context containing script details
    .EXAMPLE
        $result = Invoke-PreFlightCheck -Context $context
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Context
    )
    
    $result = @{
        Valid = $true
        Checks = @{}
        Errors = @()
        Warnings = @()
        Duration = $null
    }
    
    $startTime = Get-Date
    
    Write-Log -Message "Starting pre-flight checks for: $($Context.ScriptPath)" -Level 'INFO' -Source 'PreFlight'
    
    # 1. Check script path
    Write-Log -Message "Checking script path..." -Level 'DEBUG' -Source 'PreFlight'
    $pathCheck = Test-ScriptPath -Path $Context.ScriptPath
    $result.Checks.PathCheck = $pathCheck
    if (-not $pathCheck.Valid) {
        $result.Valid = $false
        $result.Errors += $pathCheck.Errors
    }
    
    # 2. Check script syntax
    if ($pathCheck.Valid) {
        Write-Log -Message "Validating script syntax..." -Level 'DEBUG' -Source 'PreFlight'
        $syntaxCheck = Test-ScriptSyntax -Path $Context.ScriptPath
        $result.Checks.SyntaxCheck = $syntaxCheck
        if (-not $syntaxCheck.Valid) {
            $result.Valid = $false
            $result.Errors += $syntaxCheck.Errors
        }
        if ($syntaxCheck.Warnings) {
            $result.Warnings += $syntaxCheck.Warnings
        }
    }
    
    # 3. Check required modules
    if ($Context.RequiredModules -and $Context.RequiredModules.Count -gt 0) {
        Write-Log -Message "Checking required modules..." -Level 'DEBUG' -Source 'PreFlight'
        $moduleCheck = Test-RequiredModules -Modules $Context.RequiredModules
        $result.Checks.ModuleCheck = $moduleCheck
        if (-not $moduleCheck.Valid) {
            $result.Valid = $false
            $result.Errors += $moduleCheck.Errors
        }
    }
    
    # 4. Check required paths
    if ($Context.RequiredPaths -and $Context.RequiredPaths.Count -gt 0) {
        Write-Log -Message "Checking required paths..." -Level 'DEBUG' -Source 'PreFlight'
        $permissionCheck = Test-FilePermissions -Paths $Context.RequiredPaths -RequiredAccess 'Write'
        $result.Checks.PermissionCheck = $permissionCheck
        if (-not $permissionCheck.Valid) {
            $result.Valid = $false
            $result.Errors += $permissionCheck.Errors
        }
    }
    
    $result.Duration = (Get-Date) - $startTime
    
    if ($result.Valid) {
        Write-Log -Message "Pre-flight checks completed successfully" -Level 'SUCCESS' -Source 'PreFlight'
    }
    else {
        Write-Log -Message "Pre-flight checks failed with $($result.Errors.Count) error(s)" -Level 'ERROR' -Source 'PreFlight'
    }
    
    return $result
}

function Invoke-Safely {
    <#
    .SYNOPSIS
        Safely executes a script block with comprehensive error handling
    .DESCRIPTION
        Main execution wrapper that provides validation, logging, error handling,
        and result tracking for script execution
    .PARAMETER StepName
        Name for this execution step
    .PARAMETER Action
        Script block to execute
    .PARAMETER RetryCount
        Number of retry attempts for transient failures
    .PARAMETER RetryDelaySeconds
        Initial delay between retries
    .PARAMETER TimeoutSeconds
        Maximum execution time
    .PARAMETER ValidateBefore
        Run pre-flight validation
    .PARAMETER ContinueOnError
        Continue execution even if this step fails
    .EXAMPLE
        Invoke-Safely -StepName "Run User Script" -Action {
            & /scripts/task.ps1
        }
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$StepName,
        
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,
        
        [Parameter()]
        [int]$RetryCount = $script:ExecutorConfig.MaxRetries,
        
        [Parameter()]
        [int]$RetryDelaySeconds = $script:ExecutorConfig.RetryDelaySeconds,
        
        [Parameter()]
        [int]$TimeoutSeconds = $script:ExecutorConfig.DefaultTimeoutSeconds,
        
        [Parameter()]
        [switch]$ValidateBefore,
        
        [Parameter()]
        [switch]$ContinueOnError
    )
    
    $executionId = [Guid]::NewGuid().ToString()
    $startTime = Get-Date
    
    $result = @{
        ExecutionId = $executionId
        StepName = $StepName
        StartTime = $startTime
        EndTime = $null
        Duration = $null
        Status = 'Pending'
        Attempts = 0
        Output = @()
        Error = $null
        Success = $false
    }
    
    Write-Log -Message "Starting execution: $StepName" -Level 'INFO' -Source 'SafeExecutor'
    
    $currentDelay = $RetryDelaySeconds
    
    for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
        $result.Attempts = $attempt
        
        Write-Log -Message "Attempt $attempt of $RetryCount" -Level 'DEBUG' -Source 'SafeExecutor'
        
        try {
            # Set strict mode and error action
            if ($script:ExecutorConfig.StrictMode) {
                Set-StrictMode -Version Latest
            }
            $ErrorActionPreference = $script:ExecutorConfig.ErrorAction
            
            # Create a PowerShell instance for timeout support
            $ps = [powershell]::Create()
            $ps.AddScript($Action) | Out-Null
            
            # Execute with timeout
            $asyncResult = $ps.BeginInvoke()
            $waitResult = $asyncResult.AsyncWaitHandle.WaitOne($TimeoutSeconds * 1000)
            
            if (-not $waitResult) {
                $ps.Stop()
                throw "Execution timed out after $TimeoutSeconds seconds"
            }
            
            # Get results
            $output = $ps.EndInvoke($asyncResult)
            $errors = $ps.Streams.Error.ReadAll()
            
            $ps.Dispose()
            
            if ($errors -and $errors.Count -gt 0) {
                throw $errors[0]
            }
            
            # Success
            $result.Output = $output
            $result.Status = 'Success'
            $result.Success = $true
            $result.EndTime = Get-Date
            $result.Duration = $result.EndTime - $startTime
            
            Write-Log -Message "Execution completed successfully: $StepName (Attempt: $attempt, Duration: $($result.Duration.TotalSeconds.ToString('F2'))s)" -Level 'SUCCESS' -Source 'SafeExecutor'
            
            break
        }
        catch {
            $result.Error = $_
            $result.Status = 'Failed'
            $result.EndTime = Get-Date
            $result.Duration = $result.EndTime - $startTime
            
            $errorMessage = $_.Exception.Message
            $errorType = $_.Exception.GetType().Name
            
            Write-Log -Message "Attempt $attempt failed: $errorMessage" -Level 'WARNING' -Source 'SafeExecutor'
            
            # Check if this is a transient error that should be retried
            $isTransient = Test-TransientError -ErrorRecord $_
            
            if ($isTransient -and $attempt -lt $RetryCount) {
                Write-Log -Message "Transient error detected. Waiting $currentDelay seconds before retry..." -Level 'WARNING' -Source 'SafeExecutor'
                Start-Sleep -Seconds $currentDelay
                
                # Calculate backoff
                $currentDelay = [Math]::Min(
                    $currentDelay * $script:ExecutorConfig.RetryBackoffMultiplier,
                    $script:ExecutorConfig.MaxRetryDelaySeconds
                )
            }
            elseif ($attempt -ge $RetryCount) {
                Write-Log -Message "All retry attempts exhausted for: $StepName" -Level 'ERROR' -Source 'SafeExecutor'
                
                if (-not $ContinueOnError) {
                    throw
                }
            }
            else {
                Write-Log -Message "Non-transient error. Aborting retries for: $StepName" -Level 'ERROR' -Source 'SafeExecutor'
                
                if (-not $ContinueOnError) {
                    throw
                }
            }
        }
    }
    
    # Add to history
    $script:ExecutionHistory.Enqueue($result)
    
    return $result
}

function Test-TransientError {
    <#
    .SYNOPSIS
        Determines if an error is transient and should be retried
    .DESCRIPTION
        Analyzes error type and message to determine if retry is appropriate
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )
    
    $transientPatterns = @(
        'network',
        'timeout',
        'connection',
        'unavailable',
        'temporarily',
        'throttl',
        'rate limit',
        'service unavailable',
        'gateway',
        'socket',
        'dns',
        'reset',
        'aborted',
        'deadlock',
        'lock'
    )
    
    $errorMessage = $ErrorRecord.Exception.Message.ToLower()
    $errorType = $ErrorRecord.Exception.GetType().Name.ToLower()
    
    # Check for known transient exception types
    $transientTypes = @(
        'timeoutexception',
        'socketexception',
        'webexception',
        'httprequestexception',
        'taskcanceledexception',
        'operationcanceledexception'
    )
    
    if ($errorType -in $transientTypes) {
        return $true
    }
    
    # Check message patterns
    foreach ($pattern in $transientPatterns) {
        if ($errorMessage -match $pattern) {
            return $true
        }
    }
    
    return $false
}

function Invoke-ScriptWithRetry {
    <#
    .SYNOPSIS
        Executes a script file with retry logic and full error handling
    .DESCRIPTION
        High-level wrapper for script file execution with all safety features
    .PARAMETER ScriptPath
        Path to the PowerShell script to execute
    .PARAMETER Parameters
        Hashtable of parameters to pass to the script
    .PARAMETER MaxRetries
        Maximum number of retry attempts
    .PARAMETER RetryDelay
        Initial delay between retries in seconds
    .PARAMETER Timeout
        Maximum execution time in seconds
    .EXAMPLE
        Invoke-ScriptWithRetry -ScriptPath '/scripts/task.ps1' -MaxRetries 3 -Timeout 600
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [Parameter()]
        [hashtable]$Parameters = @{},
        
        [Parameter()]
        [int]$MaxRetries = 3,
        
        [Parameter()]
        [int]$RetryDelay = 5,
        
        [Parameter()]
        [int]$Timeout = 3600
    )
    
    # Create execution context
    $context = New-ExecutionContext -ScriptPath $ScriptPath -Parameters $Parameters -RetryCount $MaxRetries -TimeoutSeconds $Timeout
    
    # Run pre-flight checks
    $preFlight = Invoke-PreFlightCheck -Context $context
    $context.ValidationResult = $preFlight
    
    if (-not $preFlight.Valid) {
        Write-Log -Message "Pre-flight validation failed. Aborting execution." -Level 'ERROR' -Source 'SafeExecutor'
        return @{
            Success = $false
            Error = 'Pre-flight validation failed'
            ValidationErrors = $preFlight.Errors
        }
    }
    
    # Build parameter string
    $paramString = if ($Parameters.Count -gt 0) {
        $params = $Parameters.GetEnumerator() | ForEach-Object {
            "-$($_.Key) '$($_.Value)'"
        }
        $params -join ' '
    }
    else {
        ''
    }
    
    # Build and execute script block
    $scriptBlock = [scriptblock]::Create("& '$ScriptPath' $paramString")
    
    $result = Invoke-Safely -StepName "Execute: $ScriptPath" -Action $scriptBlock -RetryCount $MaxRetries -RetryDelaySeconds $RetryDelay -TimeoutSeconds $Timeout
    
    return $result
}

function Get-ExecutionResult {
    <#
    .SYNOPSIS
        Retrieves the result of the last execution
    .DESCRIPTION
        Returns detailed information about the most recent script execution
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$ExecutionId
    )
    
    if ($ExecutionId) {
        return $script:ExecutionHistory.ToArray() | Where-Object { $_.ExecutionId -eq $ExecutionId }
    }
    
    return $script:ExecutionContext
}

function Get-ExecutionHistory {
    <#
    .SYNOPSIS
        Retrieves all execution history
    #>
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$Last = 100
    )
    
    return $script:ExecutionHistory.ToArray() | Select-Object -Last $Last
}

# Export module members
Export-ModuleMember -Function @(
    'Invoke-Safely'
    'Invoke-ScriptWithRetry'
    'Test-ScriptPath'
    'Test-ScriptSyntax'
    'Test-RequiredModules'
    'Test-FilePermissions'
    'Invoke-PreFlightCheck'
    'Get-ExecutionResult'
    'New-ExecutionContext'
    'Get-ExecutionHistory'
)
