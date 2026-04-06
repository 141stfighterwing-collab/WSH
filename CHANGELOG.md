# Changelog

All notable changes to WSH (WeaveNote Self-Hosted) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.5] - 2026-04-06

### Fixed
- **CRITICAL**: Fixed `Cannot find module 'empathic/package'` crash during `prisma db push` at container startup. This is the continuation of the Prisma transitive dependency chain that has been the source of repeated crash-loops across v3.5.0 through v3.5.4. The full dependency chain is: `@prisma/config` → `effect` → `empathic`. Previous versions fixed `effect`, `fast-check`, and `pure-rand` by cherry-picking individual packages into the Docker runner stage, but this approach is fundamentally fragile because `@prisma/config` has a deep, unstable transitive dependency tree that changes between minor versions. Each Prisma update could introduce new missing dependencies, causing another crash-loop
- **CRITICAL**: Eliminated the Prisma transitive dependency problem permanently by replacing the cherry-pick approach with a full `node_modules` copy. The Dockerfile now copies the ENTIRE production `node_modules` directory from the builder stage to the runner stage, instead of selectively copying individual packages (`prisma`, `@prisma`, `effect`, `fast-check`, `pure-rand`). This guarantees that ALL transitive dependencies of Prisma (including `empathic` and any future additions) are available at runtime. To mitigate the image size increase, `npm prune --production` is now run after the build stage to remove development dependencies (eslint, typescript, etc.) before copying to the runner. The trade-off is approximately 100-200MB larger image in exchange for zero `MODULE_NOT_FOUND` crashes from Prisma's dependency tree

### Changed
- Dockerfile builder stage now runs `npm prune --production` after `npm run build` to strip devDependencies before the runner stage copy. This removes eslint, typescript, bun-types, tailwindcss, tw-animate-css, and other build-only packages that were previously leaked into the production image through the selective COPY approach. The standalone Next.js output already excludes these, but the full node_modules copy would have included them without pruning
- Dockerfile runner stage: replaced 7 individual `COPY --from=builder` directives (prisma, .prisma, @prisma, effect, fast-check, pure-rand, plus the prisma schema directory) with a single `COPY --from=builder /app/node_modules ./node_modules` and a separate `COPY --from=builder /app/prisma ./prisma` for the schema files. This dramatically simplifies the Dockerfile and makes it resilient to Prisma dependency changes
- Added `empathic` (^2.3.1) as an explicit dependency in `package.json` — this is a transitive dependency of `@prisma/config` via `effect`. While the full node_modules copy makes this unnecessary for Docker, having it explicit ensures `npm install` from scratch works correctly for non-Docker environments
- Version bumped to 3.5.5 across all files: `package.json`, `Dockerfile` (BUILD_VERSION), `docker-compose.yml` (image tag + build arg), `install.ps1`, `install.sh`, `docker-entrypoint.sh`, API routes (`health/route.ts`, `admin/system/route.ts`), `VersioningSection.tsx`, `README.md`

## [3.5.4] - 2026-04-06

### Fixed
- **CRITICAL**: Fixed `docker-entrypoint.sh` crash-loop caused by a broken `sed` regex that could never parse a valid PostgreSQL `DATABASE_URL`. The v3.5.3 sed patterns used `/@` as the separator between credentials and hostname (e.g., `s|.*/@\([^:]*\):.*|`), but standard PostgreSQL connection strings use the format `postgresql://user:pass@host:port/db` where the `@` symbol is preceded by the password (not `/`). The sequence `/@` does not exist anywhere in a standard PostgreSQL URL — the `//` appears in the protocol prefix `postgresql://` and the `@` appears after the password. This caused the sed substitution to never match, leaving both `DB_HOST` and `DB_PORT` as empty strings on every invocation. The entrypoint immediately exited with "Could not parse DATABASE_URL" and printed the perfectly valid URL alongside `Extracted: host='', port=''`. The fix removes the erroneous `/` prefix from both sed patterns, changing them to `s|.*@\([^:]*\):.*|` for host extraction and `s|.*@[^:]*:\([0-9]*\)/.*|` for port extraction. These patterns now correctly handle the standard PostgreSQL URL format by matching any characters up to `@`, then capturing the hostname before `:` and the port number before `/`

### Changed
- Version bumped to 3.5.4 across all files: `package.json`, `Dockerfile` (BUILD_VERSION), `docker-compose.yml` (image tag + build arg), `install.ps1`, `install.sh`, `docker-entrypoint.sh`, API routes (`health/route.ts`, `admin/system/route.ts`), `VersioningSection.tsx`, `README.md`

## [3.5.3] - 2026-04-06

### Fixed
- **CRITICAL**: Fixed PostgreSQL connectivity check silently failing with zero diagnostics. The entrypoint's `nc -z` (netcat) check fails when Docker's internal DNS resolution fails — a known issue on Docker Desktop for Windows and macOS. Netcat gives no error output when DNS fails, printing only "PostgreSQL not ready yet..." 30 times before exiting, making it impossible to diagnose the root cause. Replaced the entire connectivity check with a Node.js-based approach using `dns.resolve4()` and `net.createConnection()` that provides explicit, actionable diagnostics on every failure: DNS failure (with error code like `ENOTFOUND`), TCP connection failure (with error code like `ECONNREFUSED`), or timeout. The first failed attempt prints a full diagnostic block explaining the likely cause and remediation steps. The final failure message includes 5 concrete troubleshooting commands the user can run
- **CRITICAL**: Fixed entrypoint not validating that `DB_HOST` and `DB_PORT` were successfully extracted from `DATABASE_URL`. If the sed regex failed (e.g., malformed URL), both variables would be empty and the `nc -z` check would silently skip without ever testing connectivity. Now exits immediately with a clear error showing the raw `DATABASE_URL` and what was extracted

### Changed
- Dockerfile runner stage replaced `netcat-openbsd` with `bind-tools` — netcat is no longer used for connectivity checks (Node.js handles it), but `bind-tools` provides `nslookup` and `dig` for manual DNS debugging inside the container if needed. The Node.js connectivity check does not depend on any external packages — it uses only built-in `dns` and `net` modules
- Entrypoint now prints the parsed `DB_HOST:DB_PORT` target on startup so users can immediately verify the connection parameters are correct
- Entrypoint failure message now includes 5 specific troubleshooting commands: check postgres logs, inspect health status, test DNS from inside the app container, restart Docker Desktop, and clean rebuild instructions
- Version bumped to 3.5.3 across all files: `package.json`, `Dockerfile` (BUILD_VERSION), `docker-compose.yml` (image tag + build arg), `install.ps1`, `install.sh`, `docker-entrypoint.sh`, API routes (`health/route.ts`, `admin/system/route.ts`), `VersioningSection.tsx`, `README.md`

## [3.5.2] - 2026-04-05

### Fixed
- **CRITICAL**: Fixed `Cannot find module 'fast-check'` crash during `prisma db push` at container startup. This is the continuation of the Prisma transitive dependency chain first identified in v3.5.0 with `effect`. The full runtime dependency chain is: `@prisma/config` → `effect` → `fast-check` → `pure-rand`. While `effect` was copied to the runner stage in v3.5.0, its transitive dependencies `fast-check` and `pure-rand` were not, causing `MODULE_NOT_FOUND` errors. Added `fast-check` (`^3.23.2`) and `pure-rand` (`^6.1.0`) as explicit dependencies in `package.json` and added `COPY --from=builder` directives for both in the Dockerfile runner stage

### Changed
- Dockerfile updated comment block for Prisma transitive dependencies to document the full chain: `@prisma/config → effect → fast-check → pure-rand`
- Version bumped to 3.5.2 across all files: `package.json`, `Dockerfile` (BUILD_VERSION), `docker-compose.yml` (image tag + build arg), `install.ps1`, `install.sh`, API routes (`health/route.ts`, `admin/system/route.ts`), `README.md`
- Removed `next-auth` from production dependencies — WSH uses JWT-based auth, not NextAuth. This was a dead dependency (~5MB wasted in Docker image) never imported anywhere in the codebase
- Removed `playwright` from production dependencies — browser automation library (~200MB+ of Chromium binaries) never imported in the codebase. Was incorrectly placed in production dependencies instead of devDependencies
- Replaced stale `NEXTAUTH_SECRET` and `NEXTAUTH_URL` default env vars in `EnvSettingsSection.tsx` with `ADMIN_DEFAULT_USERNAME` and `ADMIN_DEFAULT_PASSWORD` to match the actual JWT-based authentication system

## [3.5.1] - 2026-04-05

### Fixed
- **CRITICAL**: Fixed `docker-entrypoint.sh` first-run detection still using SQLite file check (`custom.db`). With PostgreSQL migration, this file never exists, causing `prisma db push` to execute on every container start — adding unnecessary delay and potential race conditions. Replaced with a marker file approach (`/app/tmp/.db-initialized`) that persists across restarts. First run creates the marker after successful schema push; subsequent starts skip it
- **CRITICAL**: Fixed `docker-entrypoint.sh` not waiting for PostgreSQL to be reachable before running Prisma commands. Added a 60-second connectivity check using `netcat` that extracts host and port from `DATABASE_URL` and polls until PostgreSQL responds. Without this, the entrypoint could attempt `prisma db push` before the database accepts connections, causing initialization failures
- **CRITICAL**: Fixed Dockerfile still hardcoding `ENV DATABASE_URL="file:/app/db/custom.db"` as default — this SQLite connection string would leak through if the container is run outside docker-compose. Removed the hardcoded default; `DATABASE_URL` is now exclusively set via docker-compose environment variables
- Fixed Dockerfile `ARG BUILD_VERSION=3.4.4` not updated to `3.5.0` — this controls Docker layer cache busting and build version stamps
- Fixed `package.json` version still `"3.4.4"` instead of `"3.5.0"` — the npm package version must match the release version
- Fixed 7 stale SQLite references throughout `README.md`: architecture description (line 66), Docker volume description (line 315), prerequisites (line 348), Prisma schema comment (line 529), project structure `db/custom.db` entry (line 531), DATABASE_URL default in environment table (line 617), and tech stack table (line 643). All now correctly reference PostgreSQL
- Removed obsolete `install-wsh.ps1` (v3.4.0 PowerShell installer with SQLite `DATABASE_URL="file:./db/wsh.db"` and `NEXTAUTH_*` references). This script has been superseded by `install.ps1` (v3.5.0) which handles PostgreSQL, DB Viewer, pgAdmin, and automatic Docker cleanup

### Changed
- Dockerfile runner stage now installs `netcat-openbsd` package — required by the entrypoint for PostgreSQL connectivity checks
- Dockerfile replaced `/app/db` directory creation with `/app/tmp` for runtime marker files
- README Prerequisites updated: SQLite removed, PostgreSQL 16+ listed as requirement (auto-started via Docker Compose)
- README Docker Support section: added PostgreSQL backend bullet, updated volume persistence description to reference `postgres-data` volume
- README project structure: removed `db/custom.db` entry, updated `docker-compose.yml` description to mention all 4 services
- README API health endpoint example: version updated from `3.4.4` to `3.5.0`
- README environment variables table: `DATABASE_URL` default changed from SQLite file path to PostgreSQL connection string

## [3.5.0] - 2026-04-05

### Changed
- **Migrated from SQLite to PostgreSQL** for production database backend. The `docker-compose.yml` now includes a PostgreSQL 16 service with persistent volume storage, health checks, and automatic initialization. Prisma schema updated from `provider = "sqlite"` to `provider = "postgresql"`. All existing SQLite data must be re-created on first run with the new database
- Docker Compose stack expanded from 1 service to 4 services: PostgreSQL (internal), WSH App (port 3000), Adminer DB Viewer (port 5682), and pgAdmin (port 5050, optional via `--profile admin`)
- Added dedicated `wsh-net` bridge network for inter-container communication
- PostgreSQL credentials now configurable via `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` environment variables
- pgAdmin credentials configurable via `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` environment variables
- Install scripts (`install.ps1`, `install.sh`) now include a validation phase that checks all 3 required containers are running after installation, plus optional pgAdmin when `--WithPgAdmin` / `--with-pgadmin` flag is used
- Install scripts now match and remove `pgadmin`, `postgres`, and `adminer` images/volumes in addition to `wsh`/`weavenote`
- Build version bumped to 3.5.0 across Dockerfile, docker-compose, and entrypoint

### Added
- **PostgreSQL 16 service** — Production-grade database with health checks, persistent volume, and automatic readiness detection via `pg_isready`
- **Adminer DB Viewer** (port 5682) — Lightweight, full-featured web database browser for inspecting tables, running queries, and managing data directly in the browser. Uses the `pepa-linhac` design theme
- **pgAdmin service** (port 5050) — Full PostgreSQL administration UI, enabled via `docker compose --profile admin up -d` or `.\install.ps1 -WithPgAdmin`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` environment variables in `.env.example`
- `DB_VIEWER_PORT` and `PGADMIN_PORT` environment variables for configurable port mapping
- Container health dependency — WSH app waits for PostgreSQL to be healthy before starting

### Fixed
- **CRITICAL**: Fixed `Cannot find module 'effect'` crash during `prisma db push` at container startup. Added `effect` as an explicit dependency in `package.json` and added `COPY --from=builder ... /app/node_modules/effect` directive in the Dockerfile runner stage. The `@prisma/config` package (used by Prisma CLI internally) requires the `effect` module at runtime, but it was neither declared in dependencies nor copied to the production image
- **CRITICAL**: Install scripts now properly remove ALL stale Docker artifacts (containers, images, volumes, networks) including any leftover from previous versions with different naming schemes

## [3.4.4] - 2026-04-05

### Fixed
- **CRITICAL**: Fixed Docker container crash loop with `sh: prisma: not found` (exit code 127). The entrypoint used `npx prisma` which requires `node_modules/.bin/prisma` symlink to resolve the binary. This symlink was not copied to the production runner image (Docker `COPY` does not preserve symlinks), and even when `node_modules/prisma` was present, `npx` could not locate the binary. Replaced all `npx prisma` calls with direct `node /app/node_modules/prisma/build/index.js` invocations, completely bypassing `npx` binary resolution. This is guaranteed to use the pinned Prisma v6.x CLI that was installed during `npm install` in the build stage, with zero possibility of downloading a different version from npm
- Added pre-flight check in entrypoint that verifies `node_modules/prisma/build/index.js` exists before attempting database operations, with a helpful error message suggesting `docker compose build --no-cache` if the file is missing
- Added `--schema=./prisma/schema.prisma` flag to all prisma CLI calls in entrypoint for explicit schema resolution (prevents ambiguous schema lookup)
- Dockerfile now creates `node_modules/.bin/prisma` symlink manually (as secondary fallback) since Docker COPY doesn't preserve symlinks from the builder stage
- Fixed stale fallback version in `VersioningSection.tsx` catch block (3.2.0 → 3.4.4, nextjs 15.x → 16.x)

## [3.4.3] - 2026-04-05

### Fixed
- **CRITICAL**: Fixed Docker container crash loop caused by Prisma CLI version mismatch. The production runner image was missing `node_modules/prisma` (the CLI package), causing `npx prisma` to download Prisma v7.6.0 from npm at runtime. Prisma 7 is a major breaking change that removes the `url` property from `schema.prisma` datasources, causing `P1012` validation errors on every container start. The project uses Prisma v6.x (pinned as `^6.11.1` in package.json). Fix: Dockerfile now copies `node_modules/prisma` to the runner stage so `npx` resolves the local v6.x CLI instead of downloading v7.x from the internet
- Removed `--skip-generate` flag from `docker-entrypoint.sh` `prisma db push` call for cleaner compatibility across Prisma 6.x minor versions
- Aligned all version references to 3.4.3

### Changed
- Dockerfile now explicitly documents why `node_modules/prisma` must be copied to the runner stage (prevents npx from fetching incompatible major version from npm registry)

## [3.4.2] - 2026-04-05

### Fixed
- **CRITICAL**: Fixed Docker container crash loop caused by Windows-style CRLF line endings in `docker-entrypoint.sh`. The file was authored/committed on Windows and contained `\r\n` line terminators that Linux `sh` cannot parse, producing `: not found` and `illegal option -` errors on every line. File is now strictly LF-only with a `sed` safety net in the Dockerfile
- **CRITICAL**: Fixed Docker production image missing Prisma CLI — `npx prisma db push` and `npx prisma generate` in the entrypoint script would fail because `@prisma/cli` was not copied to the runner stage. Now copies `node_modules/.prisma/`, `node_modules/@prisma/`, and `package.json` so `npx` can resolve and execute the Prisma CLI at runtime
- Removed obsolete `version: '3.8'` attribute from `docker-compose.yml` (Docker warning: "the attribute `version` is obsolete, it will be ignored")
- Aligned all version references to 3.4.2 across `package.json`, `admin/system/route.ts`, `README.md`, and API documentation

### Changed
- Dockerfile now runs `sed -i 's/\r$//'` on the copied entrypoint script as a build-time safety measure against future CRLF contamination

## [3.4.1] - 2026-04-04

### Fixed
- **CRITICAL**: Fixed Docker build failure — Dockerfile was missing `prisma generate` step before `next build`, causing Prisma Client initialization errors at runtime. Added `npx prisma generate` and `npx prisma db push` to the builder stage
- **CRITICAL**: Fixed Docker container crash on first run — no database initialization logic existed. Added `docker-entrypoint.sh` script that automatically creates the SQLite database and runs `prisma db push` on container startup if no database file exists
- **CRITICAL**: Fixed Dockerfile not copying `.next/static` assets and `public/` directory into the standalone output, causing missing logo and static file 404s
- **CRITICAL**: Fixed Dockerfile `COPY --from=builder /app/db ./db` failing when `db/` directory doesn't exist in a fresh clone. Replaced with `mkdir -p /app/db` in the runner stage
- **CRITICAL**: Fixed README.md containing placeholder git clone URL `https://github.com/your-org/wsh.git` — replaced with actual repo URL `https://github.com/141stfighterwing-collab/WSH.git` in both Quick Start and Docker Deployment sections
- **CRITICAL**: Created missing `.env.example` file that was referenced in README and CHANGELOG but never committed to the repository. Contains all 16 documented environment variables with defaults
- Fixed `/api/admin/system` endpoint returning stale version `3.2.0` and `nextjs: '15.x'` — now correctly returns `3.4.0` and `16.x`
- Fixed `/api/admin/users` POST endpoint not including a `password` field when creating users, causing Prisma NOT NULL constraint violations
- Fixed Docker health check `start_period` too short (40s → 60s) to account for database initialization on first run
- Fixed docker-compose.yml not exposing `WSH_PORT` variable for configurable port mapping

### Added
- `docker-entrypoint.sh` — Container startup script that handles first-run database initialization, Prisma client verification, and graceful server startup
- `.env.example` — Complete environment variable template with all 16 settings and documentation comments

### Changed
- Dockerfile now installs `openssl` and `wget` in all stages (required by Prisma and health checks)
- Dockerfile uses `ENTRYPOINT` + `CMD` pattern instead of bare `CMD` for proper init lifecycle
- docker-compose.yml port mapping now uses `${WSH_PORT:-3000}` for configurable external port
- README Docker Deployment section updated — `.env.example` copy step is now optional since docker-compose provides all defaults

## [3.4.0] - 2026-04-04

### Fixed
- **CRITICAL**: Fixed completely broken 3-column layout — Tailwind v4 responsive variant classes (`hidden lg:flex`, `lg:block`, `lg:w-*`) were not being generated by the PostCSS plugin, causing all elements to stack vertically as block-level elements. Replaced with custom CSS classes (`wsh-left-sidebar`, `wsh-right-sidebar`) and explicit `@media` queries in `globals.css`
- **CRITICAL**: RightSidebar was rendered full-width on non-lg screens due to `w-full lg:w-60` class, pushing main content off-screen. Now properly hidden below 1024px viewport width
- **CRITICAL**: Fixed excessive wasted space (HUGE GAP) between note editor and sidebars — removed `max-w-4xl mx-auto` constraint on the main content area that limited the editor to 896px and centered it, creating large empty spaces between the editor and both sidebars. Editor now properly fills the full available width
- Fixed `min-h-0` on the middle flex row to prevent content overflow from expanding the container beyond viewport height
- Changed outer container from `min-h-screen` to `h-screen` with `overflow-hidden` for proper full-viewport layout
- Fixed API health endpoint returning stale version `3.2.0` — now correctly returns `3.4.0`

### Changed
- LeftSidebar now uses custom `wsh-left-sidebar` class (256px wide, flex column, border-right)
- RightSidebar now uses custom `wsh-right-sidebar` class (288px wide, flex column, border-left)
- Main content area fills full available width between sidebars (no max-width constraint)
- Both sidebars hidden below 1024px viewport for mobile-first responsive behavior
- Header height is 64px (h-16), Footer is 48px (h-12), sidebar max-height calculated as `calc(100vh - 7rem)`
- Added `@source` directives in globals.css to help Tailwind v4 discover component class names
- Updated all documentation, README, CHANGELOG, PowerShell installer, and API version to consistent v3.4.0
- Created `.env.example` file for first-run environment configuration

## [3.3.0] - 2026-04-04

### Changed
- **RightSidebar completely redesigned**: Now shows Live Clock → Today's Things → Projects (was identical to LeftSidebar before)
- **Layout simplified from 4-column to 3-column**: LeftSidebar (Calendar/Refs/Folders/Tags) | Main Content | RightSidebar (Clock/Today/Projects)
- Removed FarRightSidebar component (its content merged into the new RightSidebar)
- Tags in the Popular Tags section are now clickable — clicking a tag triggers search filtering, clicking again clears the search
- Today's Things section now intelligently matches notes by: creation date matching today, today's date string in content/title, or tags like #today, weekday names (#monday, etc.), and #daily/#todo

### Added
- Live Clock widget in the right sidebar showing real-time hours, minutes, seconds with full date display (weekday, month, day, year)
- Projects section in right sidebar listing all project-type notes sorted by recency, with clickable cards that load the project into the editor
- Today's Things section in right sidebar showing notes relevant to today — created today, containing today's date, or tagged with today-related hashtags
- Active search indicator on tags with ring highlight and "Clear search" button
- Project and Today's item count badges

### Fixed
- **CRITICAL**: LeftSidebar and RightSidebar were rendering identical content (Calendar, QuickReferences, Folders, Tags) — now each sidebar has a distinct, non-overlapping purpose
- Tags were previously non-interactive display-only badges — now they properly trigger search filtering
- FarRightSidebar was only visible on xl+ screens (hidden most of the time) — its content is now in the always-visible RightSidebar

## [3.2.1] - 2026-04-04

### Changed
- Refactored AdminPanel from 1,105-line monolith into 7 focused sub-components (AdminPanel, EnvSettingsSection, VersioningSection, UsersSection, CloudSetupSection, LogsSection, DBViewerSection)
- Calendar redesigned to compact layout (6px day cells, 9px font) to fix oversized calendar in right sidebar
- Right sidebar now matches WeaveNote layout: Calendar → Quick References → Folders → Popular Tags
- Added FarRightSidebar component with Today's Things, Ongoing Projects, Quick Stats (visible on xl+ screens)
- Page layout is now 4-column: LeftSidebar | RightSidebar | Main Content | FarRightSidebar

### Added
- Neon tag color system with 10 vibrant colors (cyan, fuchsia, lime, yellow, rose, violet, emerald, orange, sky, pink)
- Tag glow effect using box-shadow for bright neon appearance
- Deterministic tag color assignment based on name hash
- HTML sanitization for user-generated content (strips script/iframe/event handlers)

### Fixed
- **CRITICAL**: Fixed broken import paths in 4 admin sub-components (`'../types'` → `'./types'`)
- **CRITICAL**: Fixed render-phase side effects in UsersSection and VersioningSection (moved fetch calls from render body into useEffect)
- **CRITICAL**: Fixed XSS vulnerability via dangerouslySetInnerHTML in NoteDetailModal and NotebookView (added HTML sanitizer)
- **CRITICAL**: Fixed modal overlay states persisting to localStorage (adminPanelOpen, trashOpen, mindMapOpen, notebookOpen, dbViewerOpen now excluded from persistence)
- Removed unused `process.version` client-side reference in VersioningSection
- Removed unused imports (CheckCircle2, Plus, Minus) in FarRightSidebar
- Fixed redundant ternary in EnvSettingsSection new-key input
- Fixed stale `today` dependency breaking useMemo in FarRightSidebar
- Fixed `React.useState` inconsistency in NotebookView (now uses `useState` from imports)

## [3.2.0] - 2026-04-04

### Added
- Mind Map visualization with SVG force-directed graph (physics simulation, pan/zoom, node drag, tag-based connections)
- Trash Modal with soft-delete, restore, permanent delete, and empty trash functionality
- Notebook View as linear document reader with sidebar navigation and scroll tracking
- Note Detail Modal for viewing individual notes with full metadata
- Web DB Viewer for browsing notes/folders/users tables with inline editing
- Mind Map API endpoint (`/api/graph`) returning nodes and edges data
- AlertTriangle warning banner in Admin Panel ENV Settings
- ENV Import/Export buttons (upload/download `.env` files)
- Quick Add Common Keys buttons for one-click ENV variable addition
- AI Synthesis Engine with 5 modes (Summarize, Expand, Improve, Tags, Outline)
- Admin Panel with 6 sections (ENV Settings, Versioning, User Base, Cloud Setup, DB Viewer, System Logs)
- 15 switchable color themes
- 6 distinct note types (Quick, Notebook, Deep, Code, Project, Document)
- Docker support with multi-stage Dockerfile and docker-compose
- PowerShell installer script (`install-wsh.ps1`)
- User authentication with role-based access control (user, admin, super-admin)
- API routes: `/api/health`, `/api/synthesis`, `/api/graph`, `/api/admin/*`
- Rich text editor with formatting toolbar (bold, italic, underline, lists, alignment)
- Folder organization and tag management
- Analytics panel with note statistics
- Settings panel with dark/light mode toggle
- localStorage persistence for all application state

### Changed
- Project and Document note types now have distinct visual indicators (colored left borders, descriptions)
- Mind Map uses custom SVG force graph instead of D3.js for zero-dependency implementation

### Fixed
- Resolved double-render of TrashModal component (was rendered in both Footer and page root)
- Fixed React import ordering in NotebookView component

## [3.1.0] - 2025-01-15

### Added
- Initial WSH application build
- WeaveNote-inspired dark mode design
- 3-column responsive layout
- Note editor with contenteditable
- Notes grid with type badges
- Zustand state management with localStorage persistence
