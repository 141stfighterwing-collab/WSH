# Changelog

All notable changes to WSH (Weavenote Self Hosted) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.1.0] - 2026-03-28

### MINOR RELEASE - WeaveMap Visualization

This release adds an interactive note connection visualization feature that shows how notes relate to each other through shared tags.

### Added

#### WeaveMap Visualization (All Users)
- **NEW**: Interactive graph visualization accessible via 🕸️ icon in header
- Notes displayed as colored nodes on a canvas
- Node size determined by content depth (word count + access frequency)
- Connection lines between notes that share tags
- Line thickness indicates connection strength (number of shared tags)
- Color-coded nodes by note type:
  - 🟡 Yellow = Quick Notes
  - 🔵 Blue = Deep Work
  - 🟢 Green = Projects
  - 🟣 Purple = Notebooks
- Click nodes to see note details and open for editing
- Hover highlighting shows connected notes
- Stats panel showing total notes, connections, and connected nodes
- Legend explaining node types

#### WeaveMap Features
- Force-directed-like layout with connected nodes closer to center
- Animated pulse ring on nodes with connections
- Connection count badges on each node
- SVG-based rendering for smooth performance
- Responsive design with scroll/zoom capability

### Technical Details

- WeaveMapModal component with SVG rendering
- `useMemo` optimization for connection calculations
- O(n²) tag intersection algorithm for connection detection
- Dynamic node sizing based on strength formula
- Type-based color mapping for visual distinction

---

## [3.0.0] - 2026-03-28

### MAJOR RELEASE - Settings & Admin Overhaul

This is a MAJOR version upgrade with comprehensive admin features, user settings, and system management capabilities.

### Added

#### Settings Panel with Gear Icon (All Users)
- **NEW**: Settings accessible via ⚙️ gear icon in header
- Available to all authenticated users
- Tabbed interface for easy navigation

#### Themes & Appearance (All Users)
- **NEW**: Expanded theme selection with 15+ themes
- Added themes: yellow, orange, red, green, hyperblue
- Existing themes: default, ocean, forest, sunset, rose, midnight, coffee, neon, cyberpunk, nord, dracula, lavender, earth
- Dark mode toggle

#### My Security (All Users)
- **NEW**: Password change functionality for logged-in users
- Minimum 8 character password requirement
- Secure bcrypt hashing
- Immediate password update

#### Versioning Menu (Admin Only)
- **NEW**: System version display
- Version history with patch notes
- Breaking change indicators
- Applied date tracking

#### User Base Management (Admin Only)
- **NEW**: View all registered users
- User role management (user/admin/super-admin)
- User status management (active/banned/suspended)
- Password reset trigger for users
- Last login tracking

#### ENV Settings for AI (Admin Only)
- **NEW**: Environment variable management UI
- Category-based organization (api, database, firebase, security, general)
- Import/Export .env files
- Quick-add templates for common keys
- **NOTE**: AI functionality placeholder - not yet implemented

#### System Logs (Admin Only)
- **NEW**: Audit trail viewer
- User action logging
- System event tracking
- Timestamp-based filtering

#### Diagnostics (All Users)
- **NEW**: System health check
- Database connectivity test
- API health endpoint check
- Latency measurement
- DNS resolution test

### Changed

- Updated version from 2.5.0 to 3.0.0 across all files
- Enhanced SettingsModal with comprehensive tab system
- Improved admin role detection for feature gating
- Better error handling in settings operations

### Fixed

- All fixes from v2.5.1 included
- Docker deployment stability
- Health check reliability
- Database viewer startup

### Security

- Password change requires current session
- Admin features properly gated by role check
- ENV variables stored securely

---

## [2.5.1] - 2026-03-28

### Fixed

- **CRITICAL**: Healthcheck now returns proper exit codes based on actual health status
- **CRITICAL**: Database viewer starts in degraded mode when DB unavailable
- **CRITICAL**: Startup script has retry logic for Prisma operations
- **CRITICAL**: Installer builds locally instead of pulling from non-existent registry
- **HIGH**: Admin password default matches seed script (123456)
- **HIGH**: TypeScript build excludes skills and WSH examples directories
- **HIGH**: Services directory included in Docker build

### Added

- Password reset feature in Database Viewer (port 5682)
- Comprehensive issues and fixes documentation
- Test report documentation

---

## [2.5.0] - 2026-03-28

### Added

#### Docker Infrastructure
- **HOST environment variable** - Added `HOST=0.0.0.0` to Dockerfile, docker-compose.yml, and installer for proper container networking
- **Prisma-based database setup** - Replaced psql commands with `prisma generate` and `prisma db push` for reliable schema creation
- **Automatic admin user creation** - Uses pre-hashed bcrypt password via Prisma client on startup

#### Configuration
- **Unified database credentials** - Consistent `wsh_secure_password` across all configuration files
- **Environment variable parsing** - DATABASE_URL parsing with regex for credential extraction

### Changed

- **start.ps1** - Completely rewritten to use Prisma instead of psql for database initialization
- **Dockerfile** - Added bcryptjs to npm install for password hashing support
- **docker-compose.yml** - Added HOST environment variable for Next.js standalone server

### Fixed

- **CRITICAL: Next.js server binding** - Fixed server binding to 0.0.0.0 instead of localhost (container accessibility)
- **CRITICAL: HOST vs HOSTNAME** - Corrected environment variable name for Next.js standalone (uses HOST, not HOSTNAME)
- **CRITICAL: Database password mismatch** - Unified password across PostgreSQL, docker-compose, and start.ps1
- **CRITICAL: Prisma connection** - Fixed Prisma client availability in standalone build
- **Database schema creation** - Now uses Prisma db push instead of unreliable psql commands
- **Admin user creation** - Pre-hashed password ensures immediate login capability

---

## [2.4.0] - 2026-03-27

### Added

#### New Sidebar Sections
- **TODAY'S THINGS**: Shows notes created today with quick access links
- **ONGOING PROJECTS**: Displays active projects with progress bars
  - Color-coded progress indicators (green > 75%, blue > 50%, yellow > 25%)
  - Click to open project details
  - Sorted by progress percentage

#### User Role Display
- Added `userRole` prop to Sidebar component
- Support for displaying user role (super-admin, admin, user)
- SUPER ADMIN role now available for elevated permissions

#### User Management Updates
- New script: `update-users.ps1` for quick user updates
- Admin password can be changed via command line
- Users can be promoted to SUPER ADMIN role

### Changed

- Updated Sidebar component with new sections at the top
- Improved project progress calculation logic
- Enhanced UI with better visual hierarchy

### Fixed

- Fixed user role hierarchy to support SUPER ADMIN
- Fixed project progress bar display colors

---

## [2.3.0] - 2026-03-27 (HOTFIX)

### Added

#### Database Viewer Web UI (Port 5682)
- **NEW**: Web-based database viewer accessible at `http://localhost:5682`
- View all database tables with pagination
- View table schemas and column definitions
- Run SQL SELECT queries in browser
- Dark theme UI matching application design
- No authentication required for read-only access

#### Interactive Database Fix Tool
- **NEW**: `db-fix-tool.ps1` - Menu-driven database management tool
- Option 1: List all tables in database
- Option 2: Show table schema (users, notes, folders, etc.)
- Option 3: CREATE ALL TABLES - Manual schema creation when Prisma fails
- Option 4: Open PSQL shell for direct database access
- Option 5: Restart database container
- Option 6: Show container status

#### Improved Schema Push Mechanism
- Automatic fallback to inline SQL when `prisma db push` fails
- Detailed Prisma output logging for debugging
- Table existence verification after creation
- Multiple retry attempts with exponential backoff

### Changed

- Updated `start.ps1` to start database viewer in background
- Updated Dockerfile to COPY scripts instead of inline echo creation
- Added port 5682 to docker-compose.yml for database viewer
- Improved error messages during schema creation

### Fixed

- Fixed issue where `npx prisma db push` was failing silently
- Fixed Dockerfile script creation using `RUN echo` (now uses `COPY`)
- Fixed startup script to show actual Prisma output for debugging
- Fixed table creation to handle "already exists" gracefully
- **HOTFIX**: Fixed weird characters in db-viewer.js by removing emojis
- **HOTFIX**: Fixed database credentials mismatch by removing old volume
- **HOTFIX**: Fixed `pg` module missing error by moving install after standalone copy
- **HOTFIX**: Fixed Prisma `--skip-generate` deprecated flag issue

---

## [2.2.0] - 2026-03-26

### Added

#### Database Diagnostic Tools
- `db-diagnostic.ps1` - Comprehensive database health checking
  - Network connectivity test (TCP port check)
  - PostgreSQL connection test
  - Prisma connection test
  - Table existence verification
  - Application health endpoint check

- `db-inject-schema.ps1` - Manual schema injection script
  - Creates all required tables (users, notes, folders, etc.)
  - Creates database indexes
  - Shows creation summary

### Changed

- Improved Dockerfile with proper script file copying
- Updated startup script with better error handling
- Added more detailed logging during schema creation

---

## [2.1.0] - 2026-03-26

### Added

#### Testing & Benchmarking
- Comprehensive testing report (`docs/WSH_Testing_Report.docx`)
- Performance benchmarks for Docker on Windows
- Memory and CPU usage metrics
- Container startup time measurements

#### Error Handling
- Multi-layer error handling architecture
- Retry logic with exponential backoff
- Transient error detection
- Structured error logging

### Changed

- Improved Docker health check configuration
- Better resource limits in docker-compose.yml
- Updated environment variable configuration

---

## [2.0.0] - 2026-03-25

### Added

#### PowerShell Executor Integration
- Full PowerShell 7 support in Docker containers
- Structured logging module (`LoggingEngine`)
- Safe script execution module (`SafeExecutor`)
- Health monitoring module (`HealthCheck`)
- Configuration management module (`ConfigManager`)

#### API Endpoints
- `/api/auth/login` - User authentication
- `/api/auth/register` - User registration
- `/api/auth/me` - Current user info
- `/api/auth/logout` - User logout
- `/api/notes` - Notes CRUD operations
- `/api/folders` - Folders CRUD operations
- `/api/health` - Application health check
- `/api/executor/execute` - PowerShell script execution
- `/api/executor/logs` - Execution logs
- `/api/executor/scripts` - Available scripts

#### Database Schema
- `users` - User accounts
- `notes` - User notes
- `folders` - Note organization
- `audit_logs` - Audit trail
- `system_config` - System configuration
- `script_executions` - PowerShell execution history
- `scheduled_tasks` - Scheduled task definitions

### Infrastructure

- Multi-stage Dockerfile with Node.js 20 + PowerShell 7
- PostgreSQL 16 Alpine database
- Docker Compose orchestration
- pgAdmin optional service
- Health checks for all services

---

## [1.0.0] - 2026-03-20

### Added

- Initial release of WSH (Weavenote Self Hosted)
- Next.js 15 App Router application
- PostgreSQL database backend
- Prisma ORM integration
- User authentication with JWT
- Notes management (CRUD)
- Folder organization
- Basic Docker support
- Windows installer script

---

## Version History Summary

| Version | Date | Type | Key Features |
|---------|------|------|--------------|
| 3.1.0 | 2026-03-28 | MINOR | WeaveMap visualization, note connections, interactive graph |
| 3.0.0 | 2026-03-28 | MAJOR | Settings Panel, Themes, My Security, User Base, ENV Settings, System Logs, Diagnostics |
| 2.5.1 | 2026-03-28 | PATCH | Healthcheck fix, DB viewer retry, Start.ps1 retry logic |
| 2.5.0 | 2026-03-28 | MINOR | Docker fixes, Prisma setup, HOST binding |
| 2.4.0 | 2026-03-27 | FEATURE | Today's Things, Ongoing Projects Sidebar, SUPER ADMIN |
| 2.3.0 | 2026-03-27 | HOTFIX | Database Viewer UI, Interactive Fix Tool, Multiple Hotfixes |
| 2.2.0 | 2026-03-26 | FEATURE | Database Diagnostic Tools, Schema Injection |
| 2.1.0 | 2026-03-26 | FEATURE | Testing Report, Benchmarks, Error Handling |
| 2.0.0 | 2026-03-25 | MAJOR | PowerShell Executor, Full API |
| 1.0.0 | 2026-03-20 | RELEASE | Initial Release |

---

## Patch Notes

### Patch 2.5.0-p1 (2026-03-28)
- CRITICAL: Fixed Next.js standalone server binding (HOST=0.0.0.0)
- CRITICAL: Fixed database password consistency
- Replaced psql commands with Prisma db push
- Added automatic admin user creation via Prisma

### Patch 2.4.0-p1 (2026-03-27)
- Added `update-users.ps1` script for quick user management
- Admin password update: `admin@wsh.local` password changed to `123456`
- User promotion: Shootre promoted to SUPER ADMIN role
- Added userRole prop to Sidebar component

### Patch 2.3.0-p3 (2026-03-27)
- HOTFIX: Removed emojis from db-viewer.js to fix encoding issues
- HOTFIX: Added direct SQL table creation fallback
- HOTFIX: Added admin user creation via SQL with bcrypt hash

---

## Upgrading

### From 2.4.0 to 2.5.0

```powershell
# Stop and clean
docker stop wsh-app wsh-postgres
docker rm wsh-app wsh-postgres
docker volume rm wsh_postgres_data

# Pull and rebuild
git pull
cd WSH\installer
.\install-WSH.ps1 -force
```

**IMPORTANT**: Version 2.5.0 includes critical fixes. You MUST remove the old PostgreSQL volume to avoid password mismatch issues.

### Database Migration

Version 2.5.0 uses Prisma for automatic database schema creation. If tables are missing after upgrade:

```powershell
# Run Prisma push manually
docker exec -it wsh-app npx prisma db push

# Or open the database viewer
start http://localhost:5682
```

---

## Known Issues

### Windows Docker Desktop

- First container startup may take 2-3 minutes
- WSL2 backend required for best performance
- File watching may have slight delay

### Database Schema

- Old PostgreSQL volumes may have password mismatch - remove with `docker volume rm wsh_postgres_data`

---

## Future Roadmap

### Planned for v3.2.0

- [ ] AI Integration (Gemini API)
- [ ] Hashtags support for notes
- [ ] Calendar integration improvements
- [ ] Analytics Dashboard for users
- [ ] WeaveMap force-directed physics simulation

### Planned for v3.3.0

- [ ] Database backup/restore functionality
- [ ] Enhanced user management UI
- [ ] API rate limiting
- [ ] WebSocket support for real-time updates

### Planned for v4.0.0

- [ ] Multi-tenant support
- [ ] Plugin system
- [ ] Mobile responsive design
- [ ] Offline mode with sync
