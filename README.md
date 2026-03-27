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

### Today's Things & Ongoing Projects Sidebar
- **TODAY'S THINGS**: Shows notes created today with quick access links
- **ONGOING PROJECTS**: Displays active projects with progress bars
  - Color-coded progress indicators (green > 75%, blue > 50%, yellow > 25%)
  - Click to open project details
  - Sorted by progress percentage

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
