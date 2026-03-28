# Changelog

All notable changes to WSH (Weavenote Self Hosted) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.1.1] - 2026-03-28

### Added

#### In-App Update System
- **Update Button in Settings**: Click ⚙️ gear icon → Update Application section
  - Check for updates button to see if new version is available
  - Pull & Restart button to update the application in one click
  - Shows changed files after update
  - Automatic dependency installation when package.json changes
  - Supports pm2, systemctl, and Docker restart methods

#### New API Endpoints
- **GET /api/update**: Check for available updates
  - Returns behind/ahead commit counts
  - Shows current version and branch
  - Indicates if update is available
- **POST /api/update**: Perform the update
  - Runs git pull to get latest changes
  - Installs npm/bun dependencies if needed
  - Restarts the application automatically

### Changed
- Updated Settings modal with Update Application section
- Enhanced SettingsPanel for admins with version management
- Improved patch documentation in README

### Fixed
- **BUILD FIX**: Added `examples` folder to tsconfig.json exclude list
- **BUILD FIX**: Added `examples` folder to .dockerignore
- **BUILD FIX**: Updated next.config.js webpack to ignore examples/benchmarks
- Prevents "Cannot find module 'socket.io-client'" error during build

---

## [3.1.0] - 2026-03-28

### Added

#### Mind Map View
- **Interactive Mind Map**: Visualize notes as connected nodes on a zoomable canvas
  - Notes displayed as color-coded nodes by type (Quick=amber, Deep=blue, Project=green, Notebook=purple)
  - Edges connect notes that share tags or are in the same folder
  - Zoom in/out with mouse wheel
  - Pan by dragging the canvas
  - Click nodes to open note details
  - Fullscreen mode support
  - Filter by folder, tag, or note type
  - Cluster nodes by folder, tag, or type
  - Legend showing node colors and edge types
  - Statistics panel with counts

#### Right Sidebar Enhancements
- **TODAY'S THINGS Section**: Shows notes created today with quick access
  - Displays up to 5 notes from today
  - Click to open note details
  - Empty state message when no notes for today

- **ONGOING PROJECTS Section**: Displays active projects with progress tracking
  - Progress bars with color coding (green/blue/yellow based on completion)
  - Projects sorted by progress percentage
  - Excludes completed projects
  - Click to open project details

#### Settings Modal
- **Gear Icon** in header for quick access
- User profile display with role badge
- Dark mode toggle
- View mode switcher (Grid/List/Mind Map)
- Quick links to Database Viewer and Health API
- Logout button

#### Database Viewer Password Management
- **Change User Password**: Admins can now change any user's password
- Password change via bcrypt hashing
- Secure password update through web UI
- Available at http://localhost:5682

#### User Management Improvements
- Enhanced user management interface
- Quick action buttons for role management
- Ban/activate user functionality
- Password reset capability

### Backend
- **Graph API Endpoint** (`/api/graph`): Returns notes as node/edge format
  - Filter by userId, folder, tag, and note type
  - Automatic edge generation from shared tags and folders
  - Statistics calculation
- **NoteLink Model**: Explicit note-to-note relationships in database
  - Link types: related, depends_on, references, custom
  - Weight for connection strength
  - Unique constraint on note pairs

### Changed

- Updated main page layout to include RightSidebar
- Added MindMap toggle button in header
- Improved project progress calculation
- Enhanced database viewer with password management
- Updated README with v3.1.0 features

### Fixed

- Fixed progress bar display colors for ongoing projects
- Improved sidebar section styling
- Better empty state handling
- **BUILD FIX**: Renamed benchmark files to exclude from Next.js compilation
- **BUILD FIX**: Updated next.config.js to ignore ESLint during builds

### Patch Notes

### Patch 3.1.0-p4 (2026-03-28)
- **NEW**: In-App Update Button in Settings modal (⚙️)
  - Check for updates button to see if new version available
  - Pull & Restart button to update the application
  - Shows changed files after update
  - Automatic dependency installation when package.json changes
- **NEW**: `/api/update` endpoint for programmatic updates
  - GET: Check for available updates (git fetch + status)
  - POST: Pull changes and restart application
  - Supports pm2, systemctl, and Docker restart methods
- **NEW**: Update section in SettingsPanel for admins
  - Version checking with behind/ahead commit counts
  - One-click update with confirmation
  - Change log display after successful update

### Patch 3.1.0-p3 (2026-03-28)
- BUILD FIX: Completely removed benchmarks directory
- BUILD FIX: Added .dockerignore to exclude unnecessary files
- BUILD FIX: Prevents "@testing-library/react not found" error

### Patch 3.1.0-p2 (2026-03-28)
- DOCS: Added Mind Map documentation to README
- DOCS: Added Patching Guide section to README
- DOCS: Added Git merge troubleshooting
- FIX: Added RightSidebar integration to main page
- FIX: Added Settings modal with gear icon

### Patch 3.1.0-p1 (2026-03-28)
- BUILD FIX: Renamed benchmark files from .ts/.tsx to .ts.txt/.tsx.txt
- BUILD FIX: Prevents "Cannot find module @testing-library/react" error during build
- Benchmark files preserved for reference in benchmarks/ folder
- Updated next.config.js with ESLint ignore during builds

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
| 3.1.1 | 2026-03-28 | FEATURE | In-App Update Button, /api/update endpoint |
| 3.1.0 | 2026-03-28 | FEATURE | Mind Map View, Right Sidebar, Settings Modal |
| 2.4.0 | 2026-03-27 | FEATURE | Today's Things, Ongoing Projects Sidebar, SUPER ADMIN |
| 2.3.0 | 2026-03-27 | HOTFIX | Database Viewer UI, Interactive Fix Tool, Multiple Hotfixes |
| 2.2.0 | 2026-03-26 | FEATURE | Database Diagnostic Tools, Schema Injection |
| 2.1.0 | 2026-03-26 | FEATURE | Testing Report, Benchmarks, Error Handling |
| 2.0.0 | 2026-03-25 | MAJOR | PowerShell Executor, Full API |
| 1.0.0 | 2026-03-20 | RELEASE | Initial Release |

---

## Patch Notes

### Patch 2.4.0-p1 (2026-03-27)
- Added `update-users.ps1` script for quick user management
- Admin password update: `admin@wsh.local` password changed to `123456`
- User promotion: Shootre promoted to SUPER ADMIN role
- Added userRole prop to Sidebar component

### Patch 2.3.0-p3 (2026-03-27)
- HOTFIX: Removed emojis from db-viewer.js to fix encoding issues
- HOTFIX: Added direct SQL table creation fallback
- HOTFIX: Added admin user creation via SQL with bcrypt hash

### Patch 2.3.0-p2 (2026-03-27)
- HOTFIX: Fixed `pg` module missing error
- HOTFIX: Moved npm install pg after standalone copy in Dockerfile
- HOTFIX: Removed deprecated `--skip-generate` flag from Prisma

### Patch 2.3.0-p1 (2026-03-27)
- HOTFIX: Fixed database credentials mismatch
- HOTFIX: Removed old Docker volume to reset database
- Added direct SQL table creation via psql

---

## Upgrading

### From 3.0.0 to 3.1.0

```powershell
# Pull latest changes
git pull origin main

# If git errors with "unrelated histories"
git fetch origin
git reset --hard origin/main

# Rebuild containers (preserves database)
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f app
```

### New Features in 3.1.0

1. **Mind Map View** - Click 🗺️ icon to visualize notes as graph
2. **Right Sidebar** - Today's Things and Ongoing Projects now visible
3. **Settings Modal** - Click ⚙️ icon for settings and preferences
4. **Password Management** - Change user passwords in Database Viewer

### Database Schema Changes

v3.1.0 adds the `note_links` table for explicit note relationships:

```sql
-- New table created automatically
CREATE TABLE note_links (
    id UUID PRIMARY KEY,
    "fromNoteId" UUID REFERENCES notes(id),
    "toNoteId" UUID REFERENCES notes(id),
    "linkType" VARCHAR(50) DEFAULT 'related',
    weight INT DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "createdBy" VARCHAR(255)
);
```

### From 2.2.0 to 2.3.0

```powershell
# Pull latest changes
git pull

# Rebuild containers
docker-compose down -v
docker-compose build --no-cache app
docker-compose up -d
```

### Database Migration

Version 2.3.0 includes automatic database schema creation. If tables are missing after upgrade:

```powershell
# Run the fix tool
docker exec -it wsh-app pwsh /scripts/db-fix-tool.ps1

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

- Prisma `db push` may fail silently on fresh database
- Use the database fix tool if tables are not created automatically
- PSQL shell access available for manual schema creation

---

## Future Roadmap

### Planned for v2.5.0

- [ ] Hashtags support for notes
- [ ] All themes from Weavenote main app
- [ ] Calendar integration improvements
- [ ] Analytics Dashboard for users
- [ ] User persona analytics

### Planned for v2.6.0

- [ ] Database backup/restore functionality
- [ ] User management UI in database viewer
- [ ] API rate limiting
- [ ] WebSocket support for real-time updates

### Planned for v3.0.0

- [ ] Multi-tenant support
- [ ] Plugin system
- [ ] Mobile responsive design
- [ ] Offline mode with sync
