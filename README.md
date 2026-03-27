# WSH - Weavenote Self Hosted

> **Version 3.1.0** | Self-hosted notes application with PostgreSQL and robust PowerShell execution engine

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![PowerShell](https://img.shields.io/badge/PowerShell-7+-blue)](https://github.com/PowerShell/PowerShell)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![Tested](https://img.shields.io/badge/Tested-Windows-blueviolet)](./docs/WSH_Testing_Report.docx)

> 📋 **[Testing Report Available](./docs/WSH_Testing_Report.docx)** - Comprehensive testing documentation including what was tried, what passed, what failed, root cause analysis, and resolution details.

---

## 🆕 What's New in v3.1.0

### Mind Map View
- **Interactive Visual Graph**: Visualize notes as connected nodes on a zoomable canvas
  - Notes displayed as color-coded nodes by type (Quick=amber, Deep=blue, Project=green, Notebook=purple)
  - Edges connect notes that share tags or are in the same folder
  - Zoom in/out with mouse wheel, pan by dragging
  - Click nodes to open note details
  - Fullscreen mode support
  - Filter by folder, tag, or note type
  - Cluster nodes by folder, tag, or type
  - Legend showing node colors and edge types

### Today's Things & Ongoing Projects Sidebar
- **TODAY'S THINGS**: Shows notes created today with quick access links
- **ONGOING PROJECTS**: Displays active projects with progress bars
  - Color-coded progress indicators (green > 75%, blue > 50%, yellow > 25%)
  - Click to open project details
  - Sorted by progress percentage

### Settings Modal
- **Gear Icon (⚙️)**: Quick access to settings from header
- User profile display with role badge
- Dark mode toggle
- View mode switcher (Grid/List/Mind Map)
- Quick links to Database Viewer and Health API

### Database Viewer Enhancements (Port 5682)
- **Password Change**: Admins can now change any user's password directly
- **Enhanced User Management**: Full user management with role promotion/demotion
- **Security Actions**: Ban/activate users, reset passwords

### User Role System
- **SUPER ADMIN**: Full system access with elevated permissions
- **ADMIN**: Administrative access to manage users
- **USER**: Standard user access
- Role badges displayed in UI with color coding

---

## 🚀 Quick Start (Windows)

### Prerequisites

- **Docker Desktop** for Windows (with WSL2 backend)
- **PowerShell 5.1+** (for local scripts)
- **8GB+ RAM** recommended
- **10GB+ free disk space**

### One-Command Installation

```powershell
# Clone the repository
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH

# Run Docker Compose directly
docker-compose up -d --build
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:3000 | Main application |
| **Database Viewer** | http://localhost:5682 | **View tables, manage users, change passwords** |
| Health API | http://localhost:3000/api/health | Health check endpoint |
| PowerShell Health | http://localhost:8080/health | PowerShell executor status |
| pgAdmin | http://localhost:5050 | Database management (optional) |

### Default Credentials

```
Email: admin@wsh.local
Password: 123456
```

---

## 🔄 Updating WSH

### Quick Update (Keeps Your Data)

If you already have WSH installed and want to update to the latest version while preserving your database and notes:

```powershell
# Navigate to your WSH directory
cd C:\path\to\WSH

# Stop the containers
docker-compose down

# Pull the latest changes from GitHub
git pull origin main

# Rebuild and restart (this preserves your database volume)
docker-compose up -d --build

# Check logs if needed
docker-compose logs -f app
```

### Full Clean Update (Resets Everything)

If you want a completely fresh installation (WARNING: This deletes all data):

```powershell
# Navigate to your WSH directory
cd C:\path\to\WSH

# Stop and remove everything including database
docker-compose down -v

# Pull the latest changes
git pull origin main

# Rebuild with no cache
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

### Update Without Git (Manual)

If you downloaded WSH as a ZIP file or don't have Git:

1. **Backup your data** (export notes manually if needed)
2. Download the latest version from: https://github.com/141stfighterwing-collab/WSH
3. Extract and replace your existing WSH folder
4. Run: `docker-compose down && docker-compose up -d --build`

### Check Current Version

```powershell
# Check version in running container
docker exec wsh-app pwsh -Command "Write-Host $env:POWERSHELL_EXECUTOR_VERSION"

# Or check the package.json
docker exec wsh-app cat /app/package.json | findstr version
```

### Update Troubleshooting

If the update fails or containers won't start:

```powershell
# Full reset with cleanup
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
docker-compose up -d

# If still failing, remove all WSH containers and volumes
docker rm -f wsh-app wsh-postgres
docker volume rm wsh_postgres-data
docker-compose up -d --build
```

### Git Merge Issues

If you see `fatal: refusing to merge unrelated histories`:

```powershell
# Option 1: Allow unrelated histories merge
git pull origin main --allow-unrelated-histories

# Option 2: Force sync with remote (recommended)
git fetch origin
git reset --hard origin/main

# Option 3: Fresh clone (if all else fails)
cd C:\Users\admin
Rename-Item WSH WSH-backup
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH
```

---

## 🗺️ Mind Map View

The Mind Map provides a visual way to explore your notes as a connected graph.

### Accessing Mind Map

Click the **🗺️** icon in the header, or use the Settings modal → View Mode → Mind Map.

### Features

| Feature | Description |
|---------|-------------|
| **Zoom** | Mouse wheel to zoom in/out |
| **Pan** | Click and drag on empty canvas |
| **Select Node** | Click on a node to open the note |
| **Fullscreen** | Click fullscreen button for immersive view |
| **Reset View** | Click ↺ to reset zoom and pan |

### Node Colors

| Note Type | Color |
|-----------|-------|
| Quick | 🟡 Amber |
| Deep | 🔵 Blue |
| Project | 🟢 Green |
| Notebook | 🟣 Purple |

### Connection Types

| Edge Type | Color | Meaning |
|-----------|-------|---------|
| Explicit | 🔴 Red | Manually linked notes |
| Tag | 🟡 Amber | Shared tags between notes |
| Folder | ⚫ Gray | Notes in same folder |

### Filters

Use the top filter bar to:
- **Folder**: Show only notes in selected folder
- **Tag**: Show only notes with selected tag
- **Type**: Show only specific note type

### Clustering

Cluster mode groups related nodes together:
- **By Folder**: Notes in same folder appear together
- **By Tag**: Notes with same tags appear together
- **By Type**: Notes of same type appear together

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Exit fullscreen |
| `Scroll` | Zoom in/out |

---

## 🩹 Patching Guide

### Applying Patches

WSH uses semantic versioning with patch releases for bug fixes.

```powershell
# Check current version
docker exec wsh-app pwsh -Command "Write-Host $env:POWERSHELL_EXECUTOR_VERSION"

# Apply latest patch
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Patch History

| Patch | Date | Description |
|-------|------|-------------|
| 3.1.0-p1 | 2026-03-28 | Fixed benchmark build error |
| 2.4.0-p1 | 2026-03-27 | Added update-users.ps1 script |
| 2.3.0-p3 | 2026-03-27 | Fixed encoding issues in db-viewer.js |
| 2.3.0-p2 | 2026-03-27 | Fixed pg module missing error |
| 2.3.0-p1 | 2026-03-27 | Fixed database credentials mismatch |

### Database Schema Patches

If database schema changes are needed:

```powershell
# Run inside container
docker exec -it wsh-app pwsh /scripts/db-inject-schema.ps1

# Or use the fix tool
docker exec -it wsh-app pwsh /scripts/db-fix-tool.ps1
```

### Manual Patch Files

To apply a manual patch:

```powershell
# Download patch file
# Apply patch
git apply patchfile.patch

# Rebuild
docker-compose up -d --build
```

---

## 🔧 Database Fix Tools

### Option 1: Web UI Database Viewer

Open **http://localhost:5682** in your browser to:
- View all database tables
- Check table schemas
- Run SELECT queries
- View row counts
- **Manage users** (promote, demote, ban, activate)
- **Change user passwords**

### Option 2: Interactive Fix Tool

```powershell
# Run inside the container
docker exec -it wsh-app pwsh /scripts/db-fix-tool.ps1
```

**Menu Options:**
1. List all tables
2. Show table schema (users/notes/etc)
3. **CREATE ALL TABLES** - Manual schema creation
4. Open PSQL shell
5. Restart database
6. Show status

### Option 3: Direct PSQL Access

```powershell
# Connect directly to PostgreSQL
docker exec -it wsh-postgres psql -U wsh -d wsh_db
```

### Option 4: Create Tables Manually

If the automatic schema creation fails, run:

```powershell
docker exec -it wsh-app pwsh /scripts/db-inject-schema.ps1
```

---

## 📊 Benchmarks & Performance Metrics

### System Requirements

| Metric | Minimum | Recommended | Production |
|--------|---------|-------------|------------|
| CPU | 2 cores | 4 cores | 8+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| Disk | 10 GB | 50 GB | 100+ GB SSD |
| Docker | 20.10+ | 24.0+ | Latest |

### Performance Benchmarks (Docker on Windows)

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| Container Startup | < 30s | 15-25s | First run may be longer |
| API Response (cached) | < 50ms | 10-30ms | Health endpoint |
| API Response (DB query) | < 200ms | 50-150ms | Notes listing |
| Database Query | < 100ms | 20-80ms | Simple queries |
| Script Execution Overhead | < 500ms | 100-300ms | PowerShell module load |
| Memory Usage (idle) | < 512MB | 200-400MB | All containers |
| Memory Usage (active) | < 2GB | 500MB-1.5GB | Under normal load |

---

## 🛡️ Error Handling Measures

### Multi-Layer Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Docker Health Checks                                    │
│   - Container health monitoring every 30s                        │
│   - Automatic restart on failure (restart: unless-stopped)       │
│   - Health check endpoint validation                             │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Application-Level Error Handling                        │
│   - Global error boundary in Next.js                             │
│   - Structured error logging with severity levels                │
│   - Graceful degradation for non-critical failures               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Database Error Handling                                 │
│   - Connection pooling with retry logic                          │
│   - Transaction rollback on failure                              │
│   - Automatic reconnection with exponential backoff              │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: PowerShell Execution Safety                             │
│   - Pre-flight validation (syntax, permissions, modules)         │
│   - Timeout enforcement (configurable)                           │
│   - Retry with exponential backoff for transient errors          │
│   - Isolated execution context                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏥 Health Monitoring

### Health Check Endpoints

```powershell
# Application health
Invoke-WebRequest http://localhost:3000/api/health

# PowerShell executor health
Invoke-WebRequest http://localhost:8080/health

# Database health
docker exec wsh-postgres pg_isready -U wsh -d wsh_db

# View database tables
Start-Process "http://localhost:5682"
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
# Database
DATABASE_URL="postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Admin User (created on first run)
ADMIN_EMAIL="admin@wsh.local"
ADMIN_PASSWORD="admin123"

# PowerShell Executor
LOG_LEVEL="INFO"
MAX_RETRIES="3"
RETRY_DELAY="5"
STRICT_MODE="true"
ERROR_ACTION="Stop"
```

### Docker Compose Services

| Service | Description | Ports | Resources |
|---------|-------------|-------|-----------|
| `postgres` | PostgreSQL 16 database | 5432 | 512MB-2GB |
| `app` | Main WSH application | 3000, 8080, 5682 | 512MB-2GB |
| `scheduler` | Optional script scheduler | - | 256MB-1GB |
| `pgadmin` | Optional database UI | 5050 | 256MB |

---

## 📁 Project Structure

```
WSH/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API Routes
│   │   │   ├── auth/        # Authentication endpoints
│   │   │   ├── notes/       # Notes CRUD
│   │   │   ├── folders/     # Folders CRUD
│   │   │   ├── health/      # Health check
│   │   │   └── executor/    # PowerShell executor API
│   │   ├── page.tsx         # Main page
│   │   └── layout.tsx       # Root layout
│   └── lib/
│       ├── auth.ts          # Authentication utilities
│       └── db.ts            # Prisma client
├── components/              # React components
│   ├── RightSidebar.tsx     # Today's Things & Ongoing Projects
│   ├── Sidebar.tsx          # Main sidebar with folders/tags
│   ├── NoteCard.tsx         # Note display component
│   └── ...
├── prisma/
│   └── schema.prisma        # Database schema
├── pwsh/                    # PowerShell modules
│   ├── modules/
│   │   ├── LoggingEngine/   # Structured logging
│   │   ├── SafeExecutor/    # Safe script execution
│   │   ├── HealthCheck/     # Health monitoring
│   │   └── ConfigManager/   # Configuration management
│   ├── scripts/             # Example scripts
│   └── app/                 # Entry points
├── scripts/
│   ├── db-fix-tool.ps1      # Interactive database fix tool
│   ├── db-inject-schema.ps1 # Manual schema injection
│   ├── db-diagnostic.ps1    # Database diagnostics
│   ├── db-viewer.js         # Web UI database viewer
│   ├── start.ps1            # Container startup script
│   └── healthcheck.ps1      # Health check script
├── installer/
│   └── Install-WSH-Windows.ps1  # Windows installer
├── docs/
│   └── WSH_Testing_Report.docx  # Comprehensive testing report
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Service orchestration
├── next.config.js           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── CHANGELOG.md             # Version history
└── .env.example             # Environment template
```

---

## 🐛 Troubleshooting

### Database Tables Not Created

If you see "relation public.users does not exist":

```powershell
# Option 1: Use the interactive fix tool
docker exec -it wsh-app pwsh /scripts/db-fix-tool.ps1
# Then select option 2 to create tables

# Option 2: Run schema injection directly
docker exec -it wsh-app pwsh /scripts/db-inject-schema.ps1

# Option 3: Connect to PSQL and create manually
docker exec -it wsh-postgres psql -U wsh -d wsh_db
```

### Docker Build Fails

```powershell
# Clean Docker cache and rebuild
docker system prune -af
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Errors

```powershell
# Check PostgreSQL container status
docker logs wsh-postgres

# Verify database credentials
docker exec -it wsh-postgres psql -U wsh -d wsh_db -c "SELECT 1"

# Restart containers
docker-compose restart
```

### Container Health Check Failures

```powershell
# Inspect container health
docker inspect wsh-app --format='{{json .State.Health}}' | ConvertFrom-Json

# Manual health check
docker exec wsh-app pwsh -File /app/healthcheck.ps1
```

---

## 🔐 Security Considerations

### Production Checklist

- [ ] Change default admin credentials
- [ ] Update `JWT_SECRET` with a strong random string
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Review CORS settings
- [ ] Update all dependencies

---

## 📝 API Documentation

### Authentication

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "user",
  "password": "securepassword"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Notes

```http
GET /api/notes
Authorization: Bearer <token>

POST /api/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Note",
  "content": "Note content",
  "type": "quick",
  "folderId": null,
  "tags": ["tag1", "tag2"]
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/141stfighterwing-collab/WSH/issues)
- **Documentation**: [Wiki](https://github.com/141stfighterwing-collab/WSH/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/141stfighterwing-collab/WSH/discussions)
