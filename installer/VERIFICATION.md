# WSH Installation Verification Checklist

## Quick Verification Commands

Run these commands to verify your WSH installation:

### 1. Check Container Status
```powershell
docker ps --filter "name=wsh-"
```

Expected output: Two running containers (wsh-postgres, wsh-app)

### 2. Check Container Health
```powershell
docker inspect --format='{{.State.Health.Status}}' wsh-postgres
docker inspect --format='{{.State.Health.Status}}' wsh-app
```

Expected output: `healthy` for both containers

### 3. Check HTTP Endpoint
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

Expected output: HTTP 200 OK

### 4. Check Database Connection
```powershell
docker exec wsh-postgres pg_isready -U wsh -d wsh_db
```

Expected output: "accepting connections"

### 5. View Application Logs
```powershell
docker logs wsh-app --tail 50
```

---

## Full Verification Checklist

### Pre-Installation Verification

- [ ] Docker Desktop is installed and running
- [ ] Docker Compose is available (v2 preferred)
- [ ] PowerShell execution policy allows scripts
- [ ] Ports 3000, 5432 are available
- [ ] Installation directory has write permissions

### Post-Installation Verification

#### Container Status
- [ ] `wsh-postgres` container is running
- [ ] `wsh-app` container is running
- [ ] No containers are in "exited" or "error" state
- [ ] Containers have "healthy" status

#### Network Connectivity
- [ ] Application accessible at http://localhost:3000
- [ ] Health endpoint responds: http://localhost:3000/api/health
- [ ] Database accepts connections on port 5432

#### Database Verification
- [ ] Database `wsh_db` exists
- [ ] User `wsh` can connect
- [ ] Tables are created (check with Prisma Studio or pgAdmin)
- [ ] Audit logs table exists

#### Application Verification
- [ ] Login page loads at http://localhost:3000
- [ ] Can login with default credentials
- [ ] Dashboard loads after login
- [ ] Can create a test note
- [ ] Can create a test folder

#### File System Verification
- [ ] Installation directory exists
- [ ] `uploads` directory is writable
- [ ] `logs` directory is writable
- [ ] `backups` directory exists
- [ ] `.env` file is present
- [ ] `docker-compose.yml` is present

---

## Troubleshooting Guide

### Container Won't Start

**Symptoms**: Container exits immediately or fails health checks

**Solutions**:
1. Check logs: `docker logs wsh-app`
2. Verify .env file exists and has correct values
3. Ensure database is healthy: `docker logs wsh-postgres`
4. Restart containers: `docker-compose restart`

### Database Connection Failed

**Symptoms**: App shows database errors, connection refused

**Solutions**:
1. Check database is running: `docker ps | findstr postgres`
2. Verify credentials in .env file
3. Check database health: `docker exec wsh-postgres pg_isready`
4. Check network: `docker network inspect wsh-network`

### Port Already in Use

**Symptoms**: "port is already allocated" error

**Solutions**:
1. Find process using port: `netstat -ano | findstr :3000`
2. Stop conflicting service or change port in .env
3. Kill process: `taskkill /PID <pid> /F`

### Permission Denied

**Symptoms**: Cannot write to uploads, logs, or other directories

**Solutions**:
1. Run PowerShell as Administrator
2. Check directory permissions
3. Verify Docker Desktop has file sharing enabled for the drive

### Application Shows Errors

**Symptoms**: Web UI shows error messages

**Solutions**:
1. Check application logs: `docker logs wsh-app --tail 100`
2. Verify environment variables: `docker exec wsh-app env`
3. Check database connectivity
4. Restart application: `docker-compose restart app`

---

## Performance Verification

### Response Time Check
```powershell
Measure-Command { Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing }
```

Expected: < 500ms for local deployment

### Container Resource Usage
```powershell
docker stats --no-stream wsh-postgres wsh-app
```

Expected:
- Postgres: < 200MB RAM, < 5% CPU
- App: < 500MB RAM, < 10% CPU

### Database Size Check
```powershell
docker exec wsh-postgres psql -U wsh -d wsh_db -c "SELECT pg_size_pretty(pg_database_size('wsh_db'));"
```

---

## Security Verification

### Check for Default Credentials
- [ ] Changed default admin password
- [ ] Changed database password
- [ ] Generated unique JWT secret
- [ ] No sensitive data in logs

### Check Network Security
```powershell
# Verify only expected ports are exposed
docker port wsh-app
docker port wsh-postgres
```

### Verify Secrets Management
- [ ] .env file has restricted permissions
- [ ] No secrets in docker-compose.yml
- [ ] JWT secret is 32+ characters

---

## Backup Verification

### Create Database Backup
```powershell
docker exec wsh-postgres pg_dump -U wsh wsh_db > backup_$(Get-Date -Format 'yyyyMMdd').sql
```

### Verify Backup Integrity
```powershell
# Check backup file size
(Get-Item backup_*.sql).Length

# Check backup content
Get-Content backup_*.sql | Select-Object -First 50
```

---

## Common Operations

### Restart All Services
```powershell
docker-compose restart
```

### Stop All Services
```powershell
docker-compose down
```

### Start All Services
```powershell
docker-compose up -d
```

### View Real-Time Logs
```powershell
docker-compose logs -f
```

### Update Application
```powershell
docker-compose pull app
docker-compose up -d app
```

### Access Database Shell
```powershell
docker exec -it wsh-postgres psql -U wsh -d wsh_db
```

---

## Uninstallation

### Remove Containers (Keep Data)
```powershell
.\Install-WSH.ps1 -Uninstall
```

### Remove Everything Including Data
```powershell
.\Install-WSH.ps1 -Uninstall -RemoveData
```

### Manual Cleanup
```powershell
# Stop and remove containers
docker-compose down

# Remove volumes
docker volume rm wsh_postgres_data

# Remove network
docker network rm wsh-network

# Remove installation directory
Remove-Item -Recurse -Force "C:\Users\YourUser\WSH"
```

---

## Support Resources

- **GitHub Repository**: https://github.com/141stfighterwing-collab/WSH
- **Documentation**: Check README.md in the repository
- **Issues**: Report bugs on GitHub Issues
- **Docker Logs**: `docker logs wsh-app` or `docker logs wsh-postgres`
- **Installation Log**: Check `wsh-install.log` in the installation directory
