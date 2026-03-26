# Changelog

All notable changes to WSH (Weavenote Self Hosted) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-03-27

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

| Version | Date | Key Features |
|---------|------|--------------|
| 2.3.0 | 2026-03-27 | Database Viewer UI, Interactive Fix Tool |
| 2.2.0 | 2026-03-26 | Database Diagnostic Tools, Schema Injection |
| 2.1.0 | 2026-03-26 | Testing Report, Benchmarks, Error Handling |
| 2.0.0 | 2026-03-25 | PowerShell Executor, Full API |
| 1.0.0 | 2026-03-20 | Initial Release |

---

## Upgrading

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

### Planned for v2.4.0

- [ ] Database backup/restore functionality
- [ ] User management UI in database viewer
- [ ] API rate limiting
- [ ] WebSocket support for real-time updates

### Planned for v3.0.0

- [ ] Multi-tenant support
- [ ] Plugin system
- [ ] Mobile responsive design
- [ ] Offline mode with sync
