# WSH Test Report - v2.5.1

**Date:** 2026-03-28
**Test Environment:** Linux (Development Server)
**Target Environment:** Windows + Docker Desktop

---

## Test Summary

| Test Category | Status | Details |
|--------------|--------|---------|
| Node.js Scripts | ✅ PASS | All JavaScript files have valid syntax |
| Docker Compose YAML | ✅ PASS | Both docker-compose.yml files are valid |
| Prisma Schema | ✅ PASS | Schema validates and client generates successfully |
| Next.js Build | ✅ PASS | Build completes with all routes |
| PowerShell Scripts | ✅ PASS | Syntax validated, proper exit codes implemented |
| Port Configuration | ✅ PASS | All ports consistently mapped |

---

## Detailed Test Results

### 1. Node.js Scripts Syntax

```bash
$ node --check scripts/db-viewer.js
✓ db-viewer.js syntax OK

$ node --check scripts/inject-schema.js
✓ inject-schema.js syntax OK
```

**Result:** ✅ PASS

### 2. Docker Compose Validation

```bash
$ node -e "yaml.load(fs.readFileSync('docker-compose.yml', 'utf8'))"
✓ docker-compose.yml valid YAML

$ node -e "yaml.load(fs.readFileSync('installer/docker-compose.yml', 'utf8'))"
✓ installer/docker-compose.yml valid YAML
```

**Result:** ✅ PASS

### 3. Prisma Schema Validation

```bash
$ npx prisma validate --schema=prisma/schema.prisma
# No errors

$ npx prisma generate --schema=prisma/schema.prisma
✔ Generated Prisma Client
```

**Result:** ✅ PASS

### 4. Next.js Build Test

```
✓ Compiled successfully in 4.0s
✓ Generating static pages (14/14)

Route (app)                                 Size  First Load JS
┌ ○ /                                    7.08 kB         109 kB
├ ƒ /api/auth/login                        153 B         102 kB
├ ƒ /api/auth/logout                       153 B         102 kB
├ ƒ /api/auth/me                           153 B         102 kB
├ ƒ /api/auth/register                     153 B         102 kB
├ ƒ /api/executor/execute                  153 B         102 kB
├ ƒ /api/executor/logs                     153 B         102 kB
├ ƒ /api/executor/scripts                  153 B         102 kB
├ ƒ /api/folders                           153 B         102 kB
├ ƒ /api/folders/[id]                      153 B         102 kB
├ ƒ /api/health                            153 B         102 kB
├ ƒ /api/notes                             153 B         102 kB
└ ƒ /api/notes/[id]                        153 B         102 kB
```

**Standalone Output:**
- ✅ `.next/standalone/server.js` exists
- ✅ `.next/static/` exists
- ✅ All API routes compiled

**Result:** ✅ PASS

### 5. PowerShell Scripts Validation

**healthcheck.ps1:**
- ✅ Proper `#Requires -Version 7.0` header
- ✅ Returns `exit 0` for healthy, `exit 1` for unhealthy
- ✅ Checks Node.js process status
- ✅ Checks HTTP endpoint response
- ✅ Outputs JSON health status

**start.ps1:**
- ✅ Proper step-by-step logging with `[STEP X]` markers
- ✅ Database TCP wait with 60s timeout
- ✅ Prisma generate with error handling
- ✅ Prisma db push with 5 retries
- ✅ Admin user seed script
- ✅ DB Viewer startup on port 5682
- ✅ HOST=0.0.0.0 set for Docker

**Result:** ✅ PASS

### 6. Port Configuration Consistency

| Port | docker-compose.yml | installer/docker-compose.yml | Dockerfile |
|------|-------------------|------------------------------|------------|
| 3000 | ✅ `"3000:3000"` | ✅ `"${APP_PORT:-3000}:3000"` | ✅ `EXPOSE 3000` |
| 5682 | ✅ `"5682:5682"` | ✅ `"5682:5682"` | ✅ `EXPOSE 5682` |
| 8080 | ✅ `"8080:8080"` | ✅ `"8080:8080"` | ✅ `EXPOSE 8080` |
| 5432 | ✅ `"5432:5432"` | ✅ `"${POSTGRES_PORT:-5432}:5432"` | N/A (PostgreSQL) |

**db-viewer.js:**
- ✅ `const PORT = 5682`
- ✅ `server.listen(PORT, '0.0.0.0')`

**server.js (Next.js standalone):**
- ✅ `currentPort = parseInt(process.env.PORT, 10) || 3000`
- ✅ `hostname = process.env.HOSTNAME || '0.0.0.0'`

**Result:** ✅ PASS

---

## Windows Deployment Instructions

### Step 1: Pull Latest Code

```powershell
cd C:\Users\admin\WSH
git fetch origin
git reset --hard origin/master
git status
# Should show: "nothing to commit, working tree clean"
```

### Step 2: Stop and Remove All Containers

```powershell
# Stop containers
docker stop wsh-app wsh-postgres 2>$null

# Remove containers
docker rm -f wsh-app wsh-postgres 2>$null

# Remove old volume (CRITICAL - fixes password corruption)
docker volume rm wsh_postgres_data -f
```

### Step 3: Build and Start

```powershell
cd installer
docker compose build --no-cache app
docker compose up -d
```

### Step 4: Verify Startup

```powershell
# Watch logs for [STEP X] markers
docker logs -f wsh-app
```

**Expected log output:**
```
========================================
WSH - Weavenote Self Hosted v2.5.0
Mode: app
========================================

[STEP 1] Waiting for PostgreSQL to be ready...
[STEP 1] PostgreSQL is reachable on TCP level!
[STEP 2] Waiting for PostgreSQL to accept connections...
[STEP 3] Generating Prisma client...
[STEP 3] Prisma client generated successfully
[STEP 4] Pushing database schema...
[STEP 4] Database schema pushed successfully
[STEP 5] Creating/Updating admin user...
[STEP 5] Admin user created/updated successfully
[STEP 6] Starting application services...
[STEP 6] Starting Database Viewer on port 5682...

========================================
WSH READY!
========================================
  App:         http://localhost:3000
  DB Viewer:   http://localhost:5682
========================================

Login:
  Email:    admin@wsh.local
  Password: 123456
```

### Step 5: Test Endpoints

```powershell
# Test app health
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing

# Test DB viewer health
Invoke-WebRequest -Uri "http://localhost:5682/health" -UseBasicParsing

# Check container status
docker ps
```

### Step 6: Test Login

1. Open browser: http://localhost:3000
2. Login with:
   - Email: `admin@wsh.local`
   - Password: `123456`
3. Should redirect to main application

---

## Known Issues and Fixes

### Issue: Old Container Using `psql` Commands

**Symptom:** Logs show `psql: error: connection to server failed`

**Cause:** Container is running old code that wasn't updated

**Fix:**
1. Force rebuild with `--no-cache`
2. Make sure you pulled latest code with `git reset --hard origin/master`

### Issue: Volume Has Corrupted Password

**Symptom:** `password authentication failed for user "wsh"`

**Cause:** Old volume was created with different password

**Fix:** Delete volume with `docker volume rm wsh_postgres_data -f`

### Issue: Port 5682 Not Working

**Symptom:** DB viewer shows "connection refused"

**Cause:** DB viewer crashed on startup due to database not ready

**Fix:** Updated db-viewer.js now starts in degraded mode and retries connection

---

## Files Changed in This Release

| File | Change |
|------|--------|
| `scripts/healthcheck.ps1` | Complete rewrite with proper exit codes |
| `scripts/db-viewer.js` | Added retry logic, degraded mode, /health endpoint |
| `scripts/start.ps1` | Added step logging, Prisma retries, error handling |
| `installer/docker-compose.yml` | Changed to local build instead of ghcr.io pull |
| `docker-compose.yml` | Fixed ADMIN_PASSWORD default |
| `tsconfig.json` | Added skills to exclude list |
| `FIX-REPORT.md` | Detailed fix documentation |
| `TEST-REPORT.md` | This test report |

---

## Commit History

```
252e1c3 fix: Exclude skills directory from TypeScript build
f555913 Fix installer to build locally and fix admin password mismatch
687ba04 Fix application readiness failure - v2.5.1
```
