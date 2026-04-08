# WSH Documentation

> WeaveNote Self-Hosted v3.9.3 — Complete reference documentation

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Docker Deployment Guide](#docker-deployment-guide)
   - [Quick Install](#quick-install)
   - [Custom Configuration](#custom-configuration)
   - [Including pgAdmin](#including-pgadmin)
   - [Manual Docker Commands](#manual-docker-commands)
3. [Docker Safety — Critical Information](#docker-safety-critical-information)
   - [Why This Matters](#why-this-matters)
   - [What Gets Removed](#what-gets-removed)
   - [What Does NOT Get Touched](#what-does-not-get-touched)
   - [How It Works (Technical Details)](#how-it-works-technical-details)
   - [Old vs. New Behavior Comparison](#old-vs-new-behavior-comparison)
4. [Updating WSH](#updating-wsh)
5. [Uninstalling / Clean Removal](#uninstalling-clean-removal)
6. [Troubleshooting](#troubleshooting)
7. [Architecture Overview](#architecture-overview)
8. [API Reference](#api-reference)
9. [Environment Variables Reference](#environment-variables-reference)
10. [Security Considerations](#security-considerations)

---

## Getting Started

### Prerequisites

Before deploying WSH, ensure your system meets the following requirements:

| Requirement | Minimum Version | Recommended |
|-------------|----------------|-------------|
| Docker | 24.0+ | Latest stable |
| Docker Compose | 2.20+ (V2 plugin) | Latest stable |
| Git | 2.30+ | Latest stable |
| RAM | 2 GB minimum | 4 GB+ recommended |
| Disk Space | 5 GB free | 10 GB+ for production use |
| Ports | 8883, 5432, 5682 available | Also 5050 if using pgAdmin |

### For Development (Non-Docker)

| Requirement | Minimum Version |
|-------------|----------------|
| Node.js | 20+ |
| Bun | 1.0+ |
| PostgreSQL | 16+ |

### Quick Start (Docker)

The fastest way to get WSH running is using the automated install script. This will download the code, build the Docker image, start all services, and validate everything is working:

```bash
# Linux / macOS
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH
chmod +x install.sh && ./install.sh
```

```powershell
# Windows (PowerShell)
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH
.\install.ps1
```

After the script completes, open these URLs:

- **Main App:** http://localhost:8883
- **DB Viewer:** http://localhost:5682
- **Default Admin Login:** `admin` / `admin123`

---

## Docker Deployment Guide

### Quick Install

The install script handles everything automatically:

**Linux / macOS:**
```bash
./install.sh              # Standard install
./install.sh 8080         # Custom port
./install.sh --with-pgadmin   # Include pgAdmin
./install.sh --clean-only     # Remove WSH only, don't reinstall
```

**Windows (PowerShell):**
```powershell
.\install.ps1                  # Standard install
.\install.ps1 -Port 8080       # Custom port
.\install.ps1 -WithPgAdmin     # Include pgAdmin
.\install.ps1 -CleanOnly       # Remove WSH only, don't reinstall
```

### Custom Configuration

All WSH configuration is done through environment variables. You can set them in a `.env` file in the project root, or pass them directly via the `docker-compose.yml`.

To create a custom `.env` file:

```bash
cp .env.example .env
# Edit .env with your preferred editor
nano .env
```

The install scripts will pick up variables from your `.env` file automatically through Docker Compose's built-in environment variable interpolation (`${VAR_NAME:-default}`).

### Including pgAdmin

pgAdmin provides a full-featured PostgreSQL administration UI. It is disabled by default to save resources, but can be enabled with a flag:

```bash
# Linux / macOS
./install.sh --with-pgadmin
```

```powershell
# Windows
.\install.ps1 -WithPgAdmin
```

pgAdmin will be available at http://localhost:5050 with the credentials configured by `PGADMIN_EMAIL` and `PGADMIN_PASSWORD` environment variables (defaults: `admin@example.com` / `admin123`).

### Manual Docker Commands

If you prefer to manage WSH manually rather than using the install scripts:

```bash
# Stop and remove all WSH containers and volumes
docker compose down -v

# Rebuild from scratch (no cache)
docker compose build --no-cache

# Start all services
docker compose up -d

# View live logs
docker compose logs -f weavenote

# Check container status
docker compose ps

# Restart a specific service
docker compose restart weavenote
```

For pgAdmin:

```bash
# Start with pgAdmin profile
docker compose --profile admin up -d

# Stop with pgAdmin profile
docker compose --profile admin down -v
```

---

## Docker Safety — Critical Information

### Why This Matters

WSH's install scripts clean up Docker resources before rebuilding. Starting with v3.9.2, this cleanup is **strictly scoped** to only affect WSH's own containers, images, volumes, and networks. This is critically important because:

1. **Multi-application hosts** are common — many servers run multiple Docker-based applications (Nextcloud, WordPress, Home Assistant, databases, etc.). A destructive prune operation could take down all of them simultaneously.
2. **Data loss is irreversible** — Volumes contain persistent database data. Deleting the wrong volume could destroy hours, days, or years of work with no recovery path.
3. **Shared base images** — Images like `postgres:16-alpine` and `adminer:latest` are used by many applications. Removing them forces every affected application to re-download hundreds of megabytes on next startup.
4. **Build cache is expensive** — Docker build cache can take significant disk space and time to regenerate. System-wide pruning wastes both.

### What Gets Removed

The install and cleanup scripts (`install.sh`, `install.ps1`) only remove the following resources, matched by **exact name or exact tag**:

| Resource Type | Exact Names/Tags Removed | Method |
|---------------|--------------------------|--------|
| **Containers** | `wsh-postgres`, `weavenote-app`, `wsh-dbviewer`, `wsh-pgadmin` | Exact name match via `docker compose down` + explicit `docker rm -f` for orphans |
| **Images** | `weavenote:3.9.3`, `weavenote:latest`, `weavenote-app` | Exact tag match |
| **Volumes** | `postgres-data`, `weavenote-data`, `pgadmin-data` (with Docker Compose project prefix like `WSH_`) | Exact name match |
| **Networks** | `wsh-net` (with Docker Compose project prefix) | Exact name match |
| **Build Cache** | Only cache entries labeled with WSH's project name | `--filter "label=com.docker.compose.project=<name>"` |

### What Does NOT Get Touched

The following resources are **never** affected by WSH's install scripts:

- ❌ Any container not named `wsh-postgres`, `weavenote-app`, `wsh-dbviewer`, or `wsh-pgadmin`
- ❌ Any image not tagged `weavenote:*` — this specifically protects:
  - `postgres:16-alpine` and all other PostgreSQL images
  - `adminer:latest` and all Adminer images
  - `dpage/pgadmin4:latest` and all pgAdmin images
  - Any other images on your system from any source
- ❌ Any volume not created by WSH's docker-compose.yml
- ❌ Any Docker network not created by WSH's docker-compose.yml
- ❌ System-wide Docker resources of any kind
- ❌ Containers, images, volumes, or networks from other Docker Compose projects
- ❌ Standalone Docker containers running on the same host
- ❌ Kubernetes resources, Podman resources, or any other container runtime

### How It Works (Technical Details)

The scripts use a two-layer approach to ensure safety:

**Layer 1: Docker Compose Project Scoping**

```bash
docker compose down -v --remove-orphans
docker compose --profile admin down -v --remove-orphans
```

These commands are inherently project-scoped. Docker Compose tracks which resources belong to which project (based on the directory name). Running `docker compose down -v` from the WSH directory will only stop containers, remove volumes, and remove networks that were created by WSH's `docker-compose.yml`. Resources from other projects are completely invisible to this command.

**Layer 2: Exact Name Matching**

As a safety net, the scripts also explicitly check for orphaned containers by their exact `container_name` values as defined in `docker-compose.yml`:

```bash
for c in wsh-postgres weavenote-app wsh-dbviewer wsh-pgadmin; do
    if docker ps -a --format "{{.Names}}" | grep -qx "$c"; then
        docker rm -f "$c"
    fi
done
```

The key here is `grep -qx` (exact match, not partial match). This means:
- ✅ Matches `wsh-postgres` (exact)
- ❌ Does NOT match `my-project-postgres` (different prefix)
- ❌ Does NOT match `wsh-postgres-backup` (different suffix)
- ❌ Does NOT match `postgres` (different name entirely)

**Layer 3: No System-Wide Prune**

The previous version of the scripts ran `docker system prune -af` and `docker builder prune -af`, which are system-wide nuclear options. These have been completely removed. The only pruning that occurs is:

```bash
docker builder prune -f --filter "label=com.docker.compose.project=<name>"
```

This uses Docker's label-based filtering to only remove build cache entries that were created as part of WSH's build process. Build cache from other projects is preserved.

### Old vs. New Behavior Comparison

| Cleanup Action | Old Behavior (v3.9.1 and earlier) | New Behavior (v3.9.2+) |
|---------------|-----------------------------------|------------------------|
| Stop containers | `grep -iE "wsh\|weavenote\|pgadmin"` (broad match) | `docker compose down` + exact name match for 4 specific containers |
| Remove images | `grep -iE "wsh\|weavenote\|adminer\|pgadmin\|postgres"` (removes ALL postgres/adminer/pgadmin images) | Exact tag match for `weavenote:*` only |
| Remove volumes | `grep -iE "wsh\|weavenote\|postgres\|pgadmin"` (could destroy other databases) | `docker compose down -v` + exact name match for WSH volumes |
| Remove networks | `grep -iE "wsh\|weavenote"` | `docker compose down` + exact name match |
| Build cache | `docker builder prune -af` (system-wide) | `docker builder prune -f --filter "label=..."` (project-scoped) |
| System prune | `docker system prune -af` (destroys ALL unused Docker resources on host) | **REMOVED entirely** |

---

## Updating WSH

WSH provides non-destructive update scripts that preserve your data while pulling the latest code and rebuilding:

```bash
# Linux / macOS
./update.sh              # Standard update (layer-cached rebuild)
./update.sh --no-cache   # Force full rebuild (slower but thorough)
```

```powershell
# Windows
.\update.ps1              # Standard update
.\update.ps1 -NoCache     # Force full rebuild
```

The update process:
1. Runs `git pull origin main` to fetch the latest code
2. Rebuilds the Docker image using layer caching (only changed layers are rebuilt)
3. Restarts containers with `--force-recreate`
4. Waits 15 seconds for services to start
5. Validates all containers are running and health check passes

**Your data is never destroyed during updates.** The update scripts use `docker compose up -d --force-recreate` which recreates containers but preserves volumes.

---

## Uninstalling / Clean Removal

To completely remove WSH from your system without reinstalling:

```bash
# Linux / macOS
./install.sh --clean-only
```

```powershell
# Windows
.\install.ps1 -CleanOnly
```

This will:
- Stop and remove all WSH containers (`wsh-postgres`, `weavenote-app`, `wsh-dbviewer`, `wsh-pgadmin`)
- Remove WSH Docker volumes (your note data will be permanently deleted)
- Remove WSH Docker images
- Remove WSH Docker networks
- Clean WSH's build cache

**Other Docker projects on your system will not be affected.**

To also remove the source code:

```bash
cd ..
rm -rf WSH
```

---

## Troubleshooting

### Common Issues

#### Container fails to start

```bash
# Check container logs

docker compose logs weavenote
docker compose logs postgres

# Check container status
docker compose ps

# Check if ports are in use
sudo lsof -i :8883
sudo lsof -i :5682
sudo lsof -i :5432
```

#### Health check fails

The health check endpoint (`/api/health`) may not be ready immediately after container startup. The app has a `start_period` of 120 seconds. Wait up to 2 minutes and try again:

```bash
curl http://localhost:8883/api/health
```

If health check consistently fails:
1. Check application logs: `docker compose logs -f weavenote`
2. Verify PostgreSQL is healthy: `docker compose logs postgres`
3. Check environment variables in `.env`

#### Database connection errors

Verify the PostgreSQL container is running and healthy:

```bash
docker compose ps postgres
docker compose logs postgres | tail -20
```

If PostgreSQL failed to start:
1. Check if port 5432 is already in use by another service
2. Check disk space: `df -h`
3. Try a clean reinstall: `./install.sh`

#### Port already in use

If port 8883 is occupied by another application:

```bash
# Install WSH on a different port
./install.sh 8080

# Or change the port in .env
echo "WSH_PORT=8080" >> .env
docker compose up -d
```

#### Cannot access DB Viewer on port 5682

1. Verify the `wsh-dbviewer` container is running: `docker compose ps`
2. Check Adminer logs: `docker compose logs db-viewer`
3. Verify no firewall is blocking port 5682
4. Try accessing directly: http://localhost:5682

#### Build fails with out of memory error

Docker builds can consume significant memory. If you see OOM errors:

```bash
# Increase Docker memory limit (Docker Desktop → Settings → Resources)
# Or use a swap file:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Old version won't update

If `git pull` fails due to local changes:

```bash
# Stash local changes and pull
git stash
git pull origin main
git stash pop

# Or force overwrite (WARNING: loses local changes)
git reset --hard origin/main
```

### Manual Recovery

If the install scripts are not working and you need to manually clean up:

```bash
# Stop WSH containers (exact names only)
docker rm -f wsh-postgres weavenote-app wsh-dbviewer wsh-pgadmin 2>/dev/null

# Remove WSH image
docker rmi -f weavenote:3.9.3 2>/dev/null

# Remove WSH volumes
docker volume rm WSH_postgres-data WSH_weavenote-data WSH_pgadmin-data 2>/dev/null

# Remove WSH network
docker network rm WSH_wsh-net 2>/dev/null

# Rebuild
docker compose build --no-cache
docker compose up -d
```

---

## Architecture Overview

### Service Architecture

```
                    ┌─────────────────────┐
                    │   Docker Host       │
                    │                     │
  Port 8883 ──────►│  ┌───────────────┐  │
                    │  │ weavenote-app │  │
                    │  │  (Next.js 16) │  │
                    │  └───────┬───────┘  │
                    │          │          │
                    │          │ wsh-net   │
                    │          │ (bridge)  │
                    │          │          │
  Port 5682 ───────►│  ┌──────┴──────┐   │
                    │  │ wsh-dbviewer │   │
                    │  │  (Adminer)   │   │
                    │  └──────┬──────┘   │
                    │         │           │
  Port 5432 ◄──────│  ┌──────┴──────┐   │  (internal only)
                    │  │ wsh-postgres │   │
                    │  │ (PostgreSQL) │   │
                    │  └──────────────┘   │
                    │                     │
  Port 5050 ───────►│  ┌──────────────┐  │  (optional, --profile admin)
                    │  │ wsh-pgadmin   │  │
                    │  │  (pgAdmin 4)  │  │
                    │  └──────────────┘  │
                    └─────────────────────┘
```

### Container Details

| Container | Image | Purpose | Ports |
|-----------|-------|---------|-------|
| `weavenote-app` | `weavenote:3.9.3` (built locally) | Main Next.js application | 8883 |
| `wsh-postgres` | `postgres:16-alpine` | PostgreSQL 16 database | 5432 (internal) |
| `wsh-dbviewer` | `adminer:latest` | Web database browser | 5682 |
| `wsh-pgadmin` | `dpage/pgadmin4:latest` | Full PostgreSQL admin UI | 5050 (optional) |

### Volume Details

| Volume | Container Mount | Purpose |
|--------|----------------|---------|
| `postgres-data` | `/var/lib/postgresql/data` | PostgreSQL data files |
| `weavenote-data` | `/app/tmp` | Application temp/upload storage |
| `pgadmin-data` | `/var/lib/pgadmin` | pgAdmin settings and sessions |

### Network Details

| Network | Type | Members |
|---------|------|---------|
| `wsh-net` | bridge | All WSH containers |

---

## API Reference

### Health Check

```
GET /api/health
```

Returns application health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "3.9.3",
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

### AI Synthesis

```
POST /api/synthesis
```

Process note content through AI modes.

**Request Body:**
```json
{
  "content": "Your note text...",
  "action": "summarize"
}
```

**Valid Actions:** `summarize`, `expand`, `improve`, `tags`, `outline`

**Response:**
```json
{
  "result": "AI-generated result...",
  "tokensUsed": 245,
  "usageCount": 1
}
```

**Error (Rate Limit):** HTTP 429 when daily limit is exceeded.

### Mind Map Graph

```
GET /api/graph?notes=[encoded JSON array]
```

Returns nodes and edges for the mind map visualization.

**Response:**
```json
{
  "nodes": [
    { "id": "abc", "title": "Note Title", "type": "quick", "tags": ["dev", "idea"] }
  ],
  "edges": [
    { "source": "abc", "target": "def", "weight": 2 }
  ]
}
```

### Admin API

All admin endpoints require authentication with `admin` or `super-admin` role.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/env` | GET, POST | Read/write environment variables |
| `/api/admin/system` | GET | System info (version, uptime, resources) |
| `/api/admin/users` | GET, POST | User management (CRUD, roles, status) |
| `/api/admin/logs` | GET | Application logs (filterable) |

---

## Environment Variables Reference

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8883` | HTTP listening port |
| `HOSTNAME` | `0.0.0.0` | Bind address |
| `APP_NAME` | `WSH` | Display name |
| `LOG_LEVEL` | `info` | Log verbosity: `debug`, `info`, `warn`, `error` |
| `MAX_UPLOAD_SIZE` | `10mb` | Maximum file upload size |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (auto-set by docker-compose) | PostgreSQL connection string |
| `POSTGRES_USER` | `wsh` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `wsh-secret-pw` | PostgreSQL password (**change in production!**) |
| `POSTGRES_DB` | `weavenote` | PostgreSQL database name |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-in-production` | JWT signing key (**must change!**) |
| `ADMIN_DEFAULT_USERNAME` | `admin` | Initial admin username |
| `ADMIN_DEFAULT_EMAIL` | `admin@example.com` | Initial admin email |
| `ADMIN_DEFAULT_PASSWORD` | `admin123` | Initial admin password (**change immediately!**) |

### AI Synthesis

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SYNTHESIS_MODEL` | `glm-4-flash` | AI model for synthesis |
| `AI_SYNTHESIS_TEMPERATURE` | `0.7` | Creativity level (0.0–1.0) |
| `AI_SYNTHESIS_MAX_TOKENS` | `4096` | Max tokens per response |
| `AI_DAILY_LIMIT` | `800` | Max synthesis requests per day |

### Docker Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `WSH_PORT` | `8883` | Main app port mapping |
| `DB_VIEWER_PORT` | `5682` | Adminer DB viewer port |
| `PGADMIN_PORT` | `5050` | pgAdmin port |
| `PGADMIN_EMAIL` | `admin@example.com` | pgAdmin login email |
| `PGADMIN_PASSWORD` | `admin123` | pgAdmin login password |

---

## Security Considerations

### Production Checklist

Before deploying WSH to a production environment, review and update these security-critical settings:

- [ ] **Change `JWT_SECRET`** to a strong, random string (minimum 32 characters)
- [ ] **Change `POSTGRES_PASSWORD`** to a strong, unique password
- [ ] **Change `ADMIN_DEFAULT_PASSWORD`** immediately after first login
- [ ] **Change `PGADMIN_PASSWORD`** if using pgAdmin
- [ ] **Restrict port access** — do not expose port 5432 (PostgreSQL) publicly
- [ ] **Consider restricting port 5682** (DB Viewer) to internal networks only
- [ ] **Set up HTTPS** — use the provided `Caddyfile` or a reverse proxy with TLS
- [ ] **Review AI_DAILY_LIMIT** — prevent abuse of the synthesis endpoint
- [ ] **Set `LOG_LEVEL` to `warn` or `error`** in production to reduce log verbosity
- [ ] **Never commit `.env` files** to version control
- [ ] **Regular backups** — ensure `postgres-data` volume is included in your backup strategy

### Docker Security

- WSH containers run as non-root users inside the container
- PostgreSQL data is stored in a named Docker volume, not a bind mount
- All inter-container communication occurs over the isolated `wsh-net` bridge network
- Only necessary ports are exposed to the host (8883, 5682, optionally 5050)
- PostgreSQL port 5432 is only accessible within the Docker network, not from the host
