# WSH Update Runbook

Use this runbook for future WSH/WeaveNote Docker updates.

## Branch Policy

- Do update work on `TST-DEV`.
- Do not push update work straight to `main`.
- Use `main` only after the update has been tested and intentionally promoted.

```powershell
git fetch origin
git switch TST-DEV
git pull origin TST-DEV
```

If `TST-DEV` does not exist yet:

```powershell
git switch -c TST-DEV
git push -u origin TST-DEV
```

## Windows Docker Host Update

Standard host:

- Host: `10.30.1.15`
- User: `Shootre`
- WSH path: `C:\Users\Shootre\wsh`

### Preflight checklist

Run these before any update to confirm the repo is clean enough to pull and the current deployment is healthy.

Connect:

```powershell
ssh Shootre@10.30.1.15
cd C:\Users\Shootre\wsh
```

Preflight checks:

```powershell
# 1) Confirm current branch and local changes
git branch --show-current
git status --short

# 2) Confirm current app version/health before update
Invoke-RestMethod -Uri "http://localhost:8883/api/health" -TimeoutSec 20

# 3) Confirm Docker services are present and running
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# 4) Confirm Docker named volumes exist (data should persist across update)
docker volume ls | findstr /I "postgres-data upload-data weavenote-data wsh-env"
```

Expected preflight results:

- branch should be `TST-DEV` for the Docker test/deployment host
- `git status --short` should ideally be empty
- health endpoint should return HTTP 200 and show the currently deployed version
- Docker should show `weavenote-app`, `wsh-postgres`, and `wsh-dbviewer`
- named volumes should still exist before the update

### Update

Standard non-destructive update:

```powershell
powershell -ExecutionPolicy Bypass -File .\update.ps1
```

Force a clean app rebuild if Docker cache looks stale:

```powershell
powershell -ExecutionPolicy Bypass -File .\update.ps1 -NoCache
```

### Verify after update

Run these immediately after `update.ps1` completes:

```powershell
# 1) Confirm containers restarted cleanly
docker ps --filter "name=weavenote-app" --filter "name=wsh-postgres" --filter "name=wsh-dbviewer" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# 2) Confirm new version is live and app is healthy
Invoke-RestMethod -Uri "http://localhost:8883/api/health" -TimeoutSec 20

# 3) If health is slow, inspect recent app logs
docker compose logs --tail=100 weavenote
```

Expected verify results:

- `weavenote-app` should be running again
- `/api/health` should return HTTP 200
- `/api/health` should report version `4.4.18`
- reported version should change from the old release to the new one (for this update: `4.4.10` -> `4.4.11`)
- database detail/user counts should still be present, indicating DB connectivity survived the update

### Safety notes

- `update.ps1` uses `docker compose down` without `-v`, so named volumes are preserved
- do not use `install.ps1` for routine updates
- do not use `docker compose down -v` unless a deliberate reset was requested
- prefer `update.ps1` over full directory replacement when the goal is to update app code without disturbing data

## Manual Patch Deploy

If deploying local changes before they are merged:

```powershell
Set-Location C:\Users\Shootre\wsh
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\Users\Shootre\wsh-update-backups\$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
git status --short | Out-File -Encoding utf8 "$backupDir\git-status-before.txt"
git diff | Out-File -Encoding utf8 "$backupDir\remote-diff-before.patch"

docker compose build weavenote
docker compose up -d --no-deps --force-recreate weavenote
```

Verify:

```powershell
docker ps --filter "name=weavenote-app" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
Invoke-RestMethod -Uri "http://localhost:8883/api/health" -TimeoutSec 20
```

## Safety Rules

- Do not use `install.ps1` for normal updates.
- Do not run `docker compose down -v` unless a deliberate reset was requested.
- Preserve Postgres, upload, and env volumes.
- Update `README.md`, `CHANGELOG.md`, `CODING_CHANGES.md`, `FILE_TRACKER.md`, and `worklog.md` for every release.
