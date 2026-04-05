# Changelog

All notable changes to WSH (WeaveNote Self-Hosted) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
