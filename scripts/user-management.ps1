#!/usr/bin/env pwsh
<#
.SYNOPSIS
    WSH User Management Tool - Manage users, passwords, and roles
.DESCRIPTION
    This script provides an interactive menu for user management:
    - Change admin password
    - Promote/Demote users
    - Ban/Unban users
    - User audit
.EXAMPLE
    docker exec -it wsh-app pwsh /scripts/user-management.ps1
#>

param(
    [string]$Action,
    [string]$TargetUser,
    [string]$NewPassword,
    [string]$NewRole
)

# Database connection info
$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$DbPassword = "wsh_secure_password"
$PsqlConn = "postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}"

# Colors for output
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "[OK] $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "[ERROR] $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "[INFO] $Text" -ForegroundColor Yellow
}

# Get all users
function Get-AllUsers {
    Write-Header "ALL USERS"
    
    $query = @"
SELECT 
    email, 
    username, 
    role, 
    permission, 
    status, 
    "lastLogin",
    "aiUsageCount",
    "createdAt"
FROM users 
ORDER BY "createdAt" DESC;
"@
    
    $result = & psql $PsqlConn -c $query 2>&1
    Write-Host $result
}

# Change password for a user
function Set-UserPassword {
    param(
        [string]$Email,
        [string]$Password
    )
    
    Write-Header "CHANGE USER PASSWORD"
    
    if (-not $Email) {
        Write-Info "Enter user email: "
        $Email = Read-Host
    }
    
    # Check if user exists
    $exists = & psql $PsqlConn -t -c "SELECT COUNT(*) FROM users WHERE email = '$Email';" 2>$null
    $count = ($exists | Where-Object { $_ -match '^\d' } | ForEach-Object { $_.Trim() }) -as [int]
    
    if ($count -eq 0) {
        Write-Error "User '$Email' not found!"
        return
    }
    
    if (-not $Password) {
        Write-Info "Enter new password: "
        $Password = Read-Host -AsSecureString
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    }
    
    # Generate bcrypt hash using Node.js
    $hashScript = @"
const bcrypt = require('bcryptjs');
const password = process.argv[2];
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
"@
    
    $hashScript | Out-File -FilePath "/tmp/hash-password.js" -Encoding utf8 -Force
    Push-Location /app
    $hashedPassword = & node /tmp/hash-password.js "$Password" 2>&1
    Pop-Location
    
    if (-not $hashedPassword -or $hashedPassword -match "Error") {
        Write-Error "Failed to hash password"
        return
    }
    
    # Update password
    $updateQuery = "UPDATE users SET password = '$hashedPassword', \"updatedAt\" = NOW() WHERE email = '$Email';"
    $result = & psql $PsqlConn -c $updateQuery 2>&1
    
    if ($result -match "UPDATE 1") {
        Write-Success "Password updated successfully for '$Email'"
    } else {
        Write-Error "Failed to update password: $result"
    }
}

# Change admin password specifically
function Set-AdminPassword {
    param([string]$Password)
    
    Write-Header "CHANGE ADMIN PASSWORD"
    
    Write-Info "This will change the password for admin@wsh.local"
    
    if (-not $Password) {
        Write-Host ""
        Write-Info "Enter new admin password: " -NoNewline
        $Password = Read-Host -AsSecureString
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
        
        Write-Info "Confirm new password: " -NoNewline
        $Confirm = Read-Host -AsSecureString
        $Confirm = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Confirm))
        
        if ($Password -ne $Confirm) {
            Write-Error "Passwords do not match!"
            return
        }
    }
    
    Set-UserPassword -Email "admin@wsh.local" -Password $Password
}

# Promote or demote user
function Set-UserRole {
    param(
        [string]$Email,
        [string]$Role
    )
    
    Write-Header "CHANGE USER ROLE"
    
    if (-not $Email) {
        Write-Info "Enter user email: "
        $Email = Read-Host
    }
    
    # Show available roles
    Write-Host "Available roles:" -ForegroundColor White
    Write-Host "  1. user        - Regular user"
    Write-Host "  2. admin       - Administrator"
    Write-Host "  3. super-admin - Super Administrator (full access)"
    Write-Host ""
    
    if (-not $Role) {
        Write-Info "Select new role (1-3): "
        $choice = Read-Host
        switch ($choice) {
            "1" { $Role = "user" }
            "2" { $Role = "admin" }
            "3" { $Role = "super-admin" }
            default {
                Write-Error "Invalid choice"
                return
            }
        }
    }
    
    # Update role
    $updateQuery = "UPDATE users SET role = '$Role', \"updatedAt\" = NOW() WHERE email = '$Email';"
    $result = & psql $PsqlConn -c $updateQuery 2>&1
    
    if ($result -match "UPDATE 1") {
        Write-Success "Role updated to '$Role' for '$Email'"
        
        # Log the action
        $logQuery = "INSERT INTO audit_logs (action, actor, target, details, timestamp, \"userId\") VALUES ('ROLE_CHANGE', 'admin', '$Email', 'Role changed to $Role', NOW(), (SELECT id FROM users WHERE email = 'admin@wsh.local'));"
        & psql $PsqlConn -c $logQuery 2>$null
    } else {
        Write-Error "Failed to update role: $result"
    }
}

# Ban or unban user
function Set-UserStatus {
    param(
        [string]$Email,
        [string]$Status
    )
    
    Write-Header "BAN/UNBAN USER"
    
    if (-not $Email) {
        Write-Info "Enter user email: "
        $Email = Read-Host
    }
    
    # Show current status
    $currentStatus = & psql $PsqlConn -t -c "SELECT status FROM users WHERE email = '$Email';" 2>$null
    $currentStatus = ($currentStatus | ForEach-Object { $_.Trim() }) -join ""
    
    Write-Host "Current status: $currentStatus" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  1. active   - User can login"
    Write-Host "  2. banned   - User cannot login"
    Write-Host "  3. suspended - Temporarily suspended"
    Write-Host ""
    
    if (-not $Status) {
        Write-Info "Select new status (1-3): "
        $choice = Read-Host
        switch ($choice) {
            "1" { $Status = "active" }
            "2" { $Status = "banned" }
            "3" { $Status = "suspended" }
            default {
                Write-Error "Invalid choice"
                return
            }
        }
    }
    
    # Update status
    $updateQuery = "UPDATE users SET status = '$Status', \"updatedAt\" = NOW() WHERE email = '$Email';"
    $result = & psql $PsqlConn -c $updateQuery 2>&1
    
    if ($result -match "UPDATE 1") {
        Write-Success "Status updated to '$Status' for '$Email'"
        
        # Log the action
        $logQuery = "INSERT INTO audit_logs (action, actor, target, details, timestamp, \"userId\") VALUES ('STATUS_CHANGE', 'admin', '$Email', 'Status changed to $Status', NOW(), (SELECT id FROM users WHERE email = 'admin@wsh.local'));"
        & psql $PsqlConn -c $logQuery 2>$null
    } else {
        Write-Error "Failed to update status: $result"
    }
}

# User audit
function Get-UserAudit {
    param([string]$Email)
    
    Write-Header "USER AUDIT"
    
    if (-not $Email) {
        Write-Info "Enter user email to audit: "
        $Email = Read-Host
    }
    
    # Get user details
    Write-Host "USER DETAILS:" -ForegroundColor White
    Write-Host "--------------------------------------------" -ForegroundColor DarkGray
    
    $userQuery = @"
SELECT 
    id,
    email,
    username,
    role,
    permission,
    status,
    "lastLogin",
    "aiUsageCount",
    "createdAt",
    "updatedAt"
FROM users 
WHERE email = '$Email';
"@
    
    & psql $PsqlConn -c $userQuery 2>&1
    
    # Get user's notes count
    Write-Host ""
    Write-Host "NOTES STATISTICS:" -ForegroundColor White
    Write-Host "--------------------------------------------" -ForegroundColor DarkGray
    
    $notesQuery = @"
SELECT 
    COUNT(*) as total_notes,
    COUNT(*) FILTER (WHERE "isDeleted" = true) as deleted_notes,
    COUNT(*) FILTER (WHERE "isSynthesized" = true) as synthesized_notes,
    SUM("accessCount") as total_views,
    SUM("wordCount") as total_words
FROM notes 
WHERE "userId" = (SELECT id FROM users WHERE email = '$Email');
"@
    
    & psql $PsqlConn -c $notesQuery 2>&1
    
    # Get user's folders count
    Write-Host ""
    Write-Host "FOLDERS:" -ForegroundColor White
    Write-Host "--------------------------------------------" -ForegroundColor DarkGray
    
    $foldersQuery = "SELECT COUNT(*) as folder_count FROM folders WHERE \"userId\" = (SELECT id FROM users WHERE email = '$Email');"
    & psql $PsqlConn -c $foldersQuery 2>&1
    
    # Get audit logs for this user
    Write-Host ""
    Write-Host "AUDIT LOGS (last 20 entries):" -ForegroundColor White
    Write-Host "--------------------------------------------" -ForegroundColor DarkGray
    
    $auditQuery = @"
SELECT 
    action,
    actor,
    target,
    details,
    timestamp
FROM audit_logs 
WHERE "userId" = (SELECT id FROM users WHERE email = '$Email')
   OR target = '$Email'
ORDER BY timestamp DESC
LIMIT 20;
"@
    
    & psql $PsqlConn -c $auditQuery 2>&1
    
    # Get script executions
    Write-Host ""
    Write-Host "SCRIPT EXECUTIONS:" -ForegroundColor White
    Write-Host "--------------------------------------------" -ForegroundColor DarkGray
    
    $scriptsQuery = @"
SELECT 
    "scriptName",
    status,
    "startTime",
    "endTime",
    "exitCode"
FROM script_executions 
WHERE "userId" = (SELECT id FROM users WHERE email = '$Email')
ORDER BY "startTime" DESC
LIMIT 10;
"@
    
    & psql $PsqlConn -c $scriptsQuery 2>&1
}

# Delete user
function Remove-User {
    param([string]$Email)
    
    Write-Header "DELETE USER"
    
    if (-not $Email) {
        Write-Info "Enter user email to delete: "
        $Email = Read-Host
    }
    
    # Prevent deleting admin
    if ($Email -eq "admin@wsh.local") {
        Write-Error "Cannot delete the default admin user!"
        return
    }
    
    # Show user details first
    Write-Host "User to delete:" -ForegroundColor Yellow
    & psql $PsqlConn -c "SELECT email, username, role, status FROM users WHERE email = '$Email';" 2>&1
    
    Write-Host ""
    Write-Warning "Are you sure you want to delete this user? (yes/no)"
    $confirm = Read-Host
    
    if ($confirm -ne "yes") {
        Write-Info "Deletion cancelled"
        return
    }
    
    # Delete user
    $deleteQuery = "DELETE FROM users WHERE email = '$Email';"
    $result = & psql $PsqlConn -c $deleteQuery 2>&1
    
    if ($result -match "DELETE 1") {
        Write-Success "User '$Email' has been deleted"
    } else {
        Write-Error "Failed to delete user: $result"
    }
}

# Main menu
function Show-MainMenu {
    Clear-Host
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "     WSH USER MANAGEMENT TOOL" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. List all users" -ForegroundColor White
    Write-Host "  2. Change admin password" -ForegroundColor White
    Write-Host "  3. Change user password" -ForegroundColor White
    Write-Host "  4. Promote/Demote user" -ForegroundColor White
    Write-Host "  5. Ban/Unban user" -ForegroundColor White
    Write-Host "  6. User audit" -ForegroundColor White
    Write-Host "  7. Delete user" -ForegroundColor White
    Write-Host "  8. Exit" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $choice = Read-Host "Select option (1-8)"
    
    switch ($choice) {
        "1" { Get-AllUsers; Pause }
        "2" { Set-AdminPassword; Pause }
        "3" { Set-UserPassword; Pause }
        "4" { Set-UserRole; Pause }
        "5" { Set-UserStatus; Pause }
        "6" { Get-UserAudit; Pause }
        "7" { Remove-User; Pause }
        "8" { 
            Write-Host "Goodbye!" -ForegroundColor Green
            exit 0 
        }
        default { 
            Write-Error "Invalid option. Press any key to continue..."
            Pause
        }
    }
}

# Run based on parameters or show menu
if ($Action) {
    switch ($Action.ToLower()) {
        "list" { Get-AllUsers }
        "changepassword" { Set-UserPassword -Email $TargetUser -Password $NewPassword }
        "changeadmin" { Set-AdminPassword -Password $NewPassword }
        "role" { Set-UserRole -Email $TargetUser -Role $NewRole }
        "ban" { Set-UserStatus -Email $TargetUser -Status "banned" }
        "unban" { Set-UserStatus -Email $TargetUser -Status "active" }
        "audit" { Get-UserAudit -Email $TargetUser }
        "delete" { Remove-User -Email $TargetUser }
        default { Write-Error "Unknown action: $Action" }
    }
} else {
    # Interactive mode
    while ($true) {
        Show-MainMenu
    }
}
