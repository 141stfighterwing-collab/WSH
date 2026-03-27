#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick user update script for WSH
.DESCRIPTION
    Updates admin password to 123456 and sets Shootre to SUPER ADMIN
#>

# Database connection info
$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$DbPassword = "wsh_secure_password"
$PsqlConn = "postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSH User Update Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# New admin password hash (123456)
$AdminPasswordHash = '$2a$10$OWGz9bmMQaFSv5AqB5UihuRmlzpH6xiPr1WxnPdzVyomRAF3kV6AS'

# Update admin password
Write-Host ""
Write-Host "[1/2] Updating admin password to '123456'..." -ForegroundColor Yellow
$updateAdmin = "UPDATE users SET password = '$AdminPasswordHash', ""updatedAt"" = NOW() WHERE email = 'admin@wsh.local';"
$result1 = & psql $PsqlConn -c $updateAdmin 2>&1
if ($result1 -match "UPDATE 1") {
    Write-Host "[OK] Admin password updated successfully!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Admin update result: $result1" -ForegroundColor Yellow
}

# Set Shootre to SUPER ADMIN
Write-Host ""
Write-Host "[2/2] Setting Shootre to SUPER ADMIN..." -ForegroundColor Yellow
$updateShootre = "UPDATE users SET role = 'super-admin', ""updatedAt"" = NOW() WHERE username = 'Shootre' OR email LIKE '%shootre%';"
$result2 = & psql $PsqlConn -c $updateShootre 2>&1
if ($result2 -match "UPDATE 1") {
    Write-Host "[OK] Shootre promoted to SUPER ADMIN!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Shootre update result: $result2" -ForegroundColor Yellow
}

# Verify changes
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
& psql $PsqlConn -c "SELECT email, username, role, status FROM users ORDER BY role DESC;" 2>&1

Write-Host ""
Write-Host "[DONE] User updates complete!" -ForegroundColor Green
