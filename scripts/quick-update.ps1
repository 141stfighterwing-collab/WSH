#!/usr/bin/env pwsh
# Quick update script - runs directly in container
# Updates: admin password to 123456, Shootre to SUPER ADMIN

$DbHost = "postgres"
$DbPort = 5432
$DbName = "wsh_db"
$DbUser = "wsh"
$DbPassword = "wsh_secure_password"
$env:PGPASSWORD = $DbPassword

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSH Quick User Update" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# New admin password hash (123456)
$AdminPasswordHash = '$2a$10$OWGz9bmMQaFSv5AqB5UihuRmlzpH6xiPr1WxnPdzVyomRAF3kV6AS'

# Update admin password
Write-Host ""
Write-Host "[1/2] Updating admin password..." -ForegroundColor Yellow
$result1 = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -c "UPDATE users SET password = '$AdminPasswordHash', \"updatedAt\" = NOW() WHERE email = 'admin@wsh.local';" 2>&1
Write-Host $result1

# Set Shootre to SUPER ADMIN
Write-Host ""
Write-Host "[2/2] Setting Shootre to SUPER ADMIN..." -ForegroundColor Yellow
$result2 = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -c "UPDATE users SET role = 'super-admin', \"updatedAt\" = NOW() WHERE username = 'Shootre' OR email LIKE '%shootre%';" 2>&1
Write-Host $result2

# Verify
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Current Users:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
& psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -c "SELECT email, username, role, status FROM users;" 2>&1

Write-Host ""
Write-Host "[DONE]" -ForegroundColor Green
