# Changelog

All notable changes to the WSH (WeaveNote Self-Hosted) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.9.3] - 2026-04-09

### 🐛 Fixed

- **pgAdmin email validation failure** — Changed the default `PGADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_EMAIL` from `admin@wsh.local` to `admin@example.com`. The `.local` TLD is a reserved special-use domain (RFC 2606) that is rejected by newer versions of pgAdmin4's email validator, causing a startup crash loop with the error: "The part after the @-sign is a special-use or reserved name that cannot be used with email." This affected both the `docker-compose.yml` defaults and the `.env.example` template.
- **Prisma CLI crash — `Cannot find module 'empathic/package'`** — The Dockerfile previously used manual `COPY` instructions for individual Prisma transitive dependencies (`effect`, `fast-check`, `pure-rand`). Prisma 6.11.1+ introduced new transitive deps (`empathic`, `c12`, `deepmerge-ts`, plus 12+ sub-dependencies of `c12`) that were not included, causing `prisma db push` and `prisma generate` to fail at container startup with `MODULE_NOT_FOUND`. The Dockerfile now uses `npm install --omit=dev` in the runner stage, which automatically resolves the full dependency tree — this is future-proof against further Prisma dependency changes.
- **Removed all remaining `wsh.local` references from application code** — Replaced `@wsh.local` fallback emails in 4 server routes (`db-test`, `admin/db-test`, `admin/users/register`) and 1 UI component (`UsersSection.tsx`) with `@example.com` (RFC 2606 sanctioned example domain). This ensures consistency with the pgAdmin email fix and prevents any future email validation issues with reserved TLDs.
- **UsersSection.tsx fake success on network error** — The `handleCreateUser` catch block previously added a fake user record to local state when the API call failed, misleading admins into thinking the user was created. Now correctly logs an error message without creating phantom records.

### 🐳 Docker

- **Rewrote Dockerfile Prisma dependency installation** — Replaced the fragile per-package `COPY` block (which required manually adding every new transitive dependency) with `npm install --omit=dev` in the runner stage. This installs all production dependencies including `prisma` and its complete transitive dependency tree in one step, with proper file ownership for the non-root `nextjs` user.
- Reordered runner stage: npm install now runs before the standalone Next.js copy, so the Prisma client can be properly regenerated after install
- Removed the manual `prisma` CLI wrapper symlinks (no longer needed — npm install creates them automatically)

### 📝 Documentation

- Updated all references to pgAdmin login credentials across README, DOCS, and CHANGELOG to reflect the new `admin@example.com` default
- Updated environment variable tables to show the new default email addresses
- Updated Docker Safety tables and version references to 3.9.3

### 🔧 Changed

- Changed default port from 3000 to 8883 across all files: `docker-compose.yml`, `install.sh`, `install.ps1`, `.env.example`, `README.md`, `DOCS.md`
- Bumped version from 3.9.2 to 3.9.3 across all files: `package.json`, `docker-compose.yml`, `Dockerfile`, `docker-entrypoint.sh`, `install.ps1`, `install.sh`, `update.ps1`, `update.sh`, health check endpoint, system info endpoint, VersioningSection component, and all documentation files

---

## [3.9.2] - 2026-04-08

### 🔒 Security

- **CRITICAL FIX — Docker cleanup now scoped to WSH only.** The install and update scripts (`install.sh`, `install.ps1`) previously used broad pattern matching (`grep -iE "postgres|pgadmin|adminer"`) and `docker system prune -af` which could destroy containers, images, volumes, and build cache belonging to other Docker Compose projects or standalone containers on the same host. This has been completely rewritten to use exact name matching and project-scoped cleanup.

### 🐳 Docker

#### What Changed

The cleanup logic in both install scripts was rewritten from the ground up. Here is a detailed comparison of the old and new behavior:

**Old behavior (DANGEROUS):**

| Phase | Old Command | Risk |
|-------|-------------|------|
| Container removal | `grep -iE "wsh\|weavenote\|pgadmin"` | Could match containers from other projects named with "pgadmin" |
| Image removal | `grep -iE "wsh\|weavenote\|adminer\|pgadmin\|postgres"` | Would delete ALL postgres, adminer, and pgadmin images on the system, including those used by other applications |
| Volume removal | `grep -iE "wsh\|weavenote\|postgres\|pgadmin"` | Would destroy database volumes from other projects that contain "postgres" in their name |
| Network removal | `grep -iE "wsh\|weavenote"` | Relatively safe but could match unintended networks |
| Build cache | `docker builder prune -af` | Wiped ALL build cache system-wide, not just WSH's |
| System prune | `docker system prune -af` | **Most dangerous** — removed ALL unused containers, images, networks, and volumes on the entire host |

**New behavior (SAFE):**

| Phase | New Command | Safety |
|-------|-------------|--------|
| Container removal | `docker compose down -v --remove-orphans` + exact name match for `wsh-postgres`, `weavenote-app`, `wsh-dbviewer`, `wsh-pgadmin` | Only touches containers defined in WSH's docker-compose.yml or by exact container_name |
| Image removal | Exact tag match for `weavenote:3.9.2` and `weavenote:latest` | Shared images (`postgres:16-alpine`, `adminer:latest`, `dpage/pgadmin4:latest`) are never touched |
| Volume removal | Exact name match for `postgres-data`, `weavenote-data`, `pgadmin-data` (with project prefix) | Only removes volumes that Docker Compose created for WSH |
| Network removal | Exact name match for `wsh-net` (with project prefix) | Only removes WSH's dedicated bridge network |
| Build cache | `docker builder prune -f --filter "label=com.docker.compose.project=<name>"` | Only prunes build cache tagged with WSH's project label |
| System prune | **REMOVED** | No longer runs. WSH no longer touches system-wide Docker resources |

#### Migration Notes

If you are upgrading from a previous version of WSH (3.9.1 or earlier), the new install scripts are fully backward compatible. Your existing WSH containers, volumes, and data will be cleaned up correctly by the new scripts. The only difference is that the new scripts will no longer destroy other projects' resources.

If you previously relied on the old scripts' aggressive cleanup behavior (e.g., you used `./install.sh` as a general Docker cleanup tool), you should switch to using `docker system prune` manually for that purpose instead.

### 📝 Documentation

- Added comprehensive **Docker Safety** section to README explaining exactly what resources are and are not removed
- Added detailed comparison table of old vs. new cleanup behavior in this CHANGELOG
- Created `DOCS.md` with detailed Docker management documentation, troubleshooting guide, and safety explanation
- Updated README Docker Deployment section to emphasize scoped cleanup behavior
- Clarified that `--clean-only` / `-CleanOnly` flags only affect WSH resources

---

## [3.9.1] - 2026-04-07

### ✨ Added

- Mind Map API endpoint (`GET /api/graph`) for external graph data consumption
- Notebook View — full-screen linear document reader for immersive reading
- Note Detail Modal — full metadata and content viewer for individual notes
- ENV Import/Export buttons in Admin Panel
- Quick Add Common Keys — one-click presets for popular environment variables
- Analytics Panel with Recharts-powered visual statistics
- Settings Panel with dark/light mode toggle and 15 color themes

### 🐛 Fixed

- Improved health check reliability with configurable start_period
- Fixed tag filtering to properly clear when clicking an active tag
- Resolved sidebar scroll tracking in Notebook View
- Fixed inline editing persistence in Web DB Viewer

### 🐳 Docker

- Added `docker-entrypoint.sh` for automated database initialization on first run
- Improved container dependency ordering with `condition: service_healthy`
- Added `start_period` to all health checks for proper initialization delays
- Version-tagged image as `weavenote:3.9.1`

---

## [3.9.0] - 2026-03-30

### ✨ Added

- Initial release of WSH (WeaveNote Self-Hosted)
- AI Synthesis Engine with 5 modes (Summarize, Expand, Improve, Generate Tags, Create Outline)
- Interactive SVG force-directed Mind Map visualization (no D3.js dependency)
- 6 note types: Quick, Notebook, Deep, Code, Project, Document
- Folders & Tags organizational system with drag-and-drop reordering
- Trash Modal with soft-delete and restore functionality
- Admin Panel with 6 sections (ENV, Versioning, Users, Cloud, DB, Logs)
- User Authentication with JWT tokens and role-based access control
- Web DB Viewer (Adminer) on port 5682
- Optional pgAdmin on port 5050 via Docker Compose profiles
- 15 hand-crafted color themes with instant switching
- Multi-stage Docker build (deps → builder → runner)
- Install scripts for Linux/macOS (`install.sh`) and Windows (`install.ps1`)
- Non-destructive update scripts (`update.sh`, `update.ps1`)
- Caddy reverse proxy configuration
- AlertTriangle ENV warning banner in Admin Panel

### 🏗️ Architecture

- Next.js 16 with App Router
- TypeScript 5 with strict mode
- Tailwind CSS 4 with custom theme system
- shadcn/ui + Radix UI component library
- Zustand 5 for global state management
- Prisma ORM with PostgreSQL 16
- Framer Motion for animations
- Lucide React for iconography
- @dnd-kit for drag-and-drop interactions
