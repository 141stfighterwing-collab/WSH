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

Connect and update:

```powershell
ssh Shootre@10.30.1.15
cd C:\Users\Shootre\wsh
powershell -ExecutionPolicy Bypass -File .\update.ps1
```

Force a clean app rebuild if Docker cache looks stale:

```powershell
powershell -ExecutionPolicy Bypass -File .\update.ps1 -NoCache
```

Health check only:

```powershell
powershell -ExecutionPolicy Bypass -File .\update.ps1 -HealthCheck
Invoke-RestMethod -Uri "http://localhost:8883/api/health" -TimeoutSec 20
```

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
