# WSH - Weavenote Self Hosted

> **Version 2.5.0** | Self-hosted notes application with PostgreSQL and robust PowerShell execution engine

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![PowerShell](https://img.shields.io/badge/PowerShell-7+-blue)](https://github.com/PowerShell/PowerShell)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![Tested](https://img.shields.io/badge/Tested-Windows-blueviolet)](./docs/WSH_Testing_Report.docx)

> 📋 **[Testing Report Available](./docs/WSH_Testing_Report.docx)** - Comprehensive testing documentation including what was tried, what passed, what failed, root cause analysis, and resolution details.

---

## 🆕 What's New in v2.5.0

### Critical Docker Fixes
- **Fixed Next.js standalone server binding** - Server now correctly binds to 0.0.0.0 for Docker container accessibility
- **Fixed database password consistency** - Unified password across all configuration files
- **Fixed Prisma database setup** - Uses Prisma db push instead of psql commands for reliable schema creation
- **Fixed HOST environment variable** - Correct variable name for Next.js standalone (HOST, not HOSTNAME)

### Improved Database Setup
- **Prisma-based schema creation** - More reliable than psql commands
- **Automatic admin user creation** - Pre-hashed password for immediate login
- **Better error handling** - Clear logging during startup

### Windows Installer Improvements
- **One-click installation** - `.\install-WSH.ps1 -force` handles everything
- **Automatic cleanup** - Removes old volumes and containers
- **Progress tracking** - Visual progress bar during installation

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
cd WSH\installer

# Run the installer
.\install-WSH.ps1 -force
```

### Manual Docker Compose

```powershell
# Clone and run
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH
docker-compose up -d --build
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:3000 | Main application |
| **Database Viewer** | http://localhost:5682 | View tables & run queries |
| Health API | http://localhost:3000/api/health | Health check endpoint |
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
- Manage users (promote/demote/ban)

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
| Container Startup | < 60s | 30-50s | Including database setup |
| API Response (cached) | < 50ms | 10-30ms | Health endpoint |
| API Response (DB query) | < 200ms | 50-150ms | Notes listing |
| Database Query | < 100ms | 20-80ms | Simple queries |
| Docker Build | < 5min | 3-4min | First build |

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
│   - Prisma connection pooling with retry logic                   │
│   - Automatic schema creation on startup                         │
│   - Transaction rollback on failure                              │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: PowerShell Execution Safety                             │
│   - Pre-flight validation (syntax, permissions, modules)         │
│   - Timeout enforcement (configurable)                           │
│   - Retry with exponential backoff for transient errors          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public"

# Server (CRITICAL for Docker)
HOST="0.0.0.0"
PORT="3000"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Admin User (created on first run)
ADMIN_EMAIL="admin@wsh.local"
ADMIN_PASSWORD="123456"

# PowerShell Executor
LOG_LEVEL="INFO"
MAX_RETRIES="3"
RETRY_DELAY="5"
STRICT_MODE="true"
```

### Docker Compose Services

| Service | Description | Ports | Resources |
|---------|-------------|-------|-----------|
| `postgres` | PostgreSQL 16 database | 5432 | 512MB-2GB |
| `app` | Main WSH application | 3000, 5682 | 512MB-2GB |
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
│   │   │   └── health/      # Health check
│   │   ├── page.tsx         # Main page
│   │   └── layout.tsx       # Root layout
│   └── lib/
│       ├── auth.ts          # Authentication utilities
│       └── db.ts            # Prisma client
├── components/              # React components
├── prisma/
│   └── schema.prisma        # Database schema
├── pwsh/                    # PowerShell modules
│   ├── modules/
│   │   ├── LoggingEngine/   # Structured logging
│   │   ├── SafeExecutor/    # Safe script execution
│   │   ├── HealthCheck/     # Health monitoring
│   │   └── ConfigManager/   # Configuration management
│   └── scripts/             # Example scripts
├── scripts/
│   ├── start.ps1            # Container startup script
│   ├── healthcheck.ps1      # Health check script
│   ├── db-viewer.js         # Web UI database viewer
│   └── db-fix-tool.ps1      # Database fix tool
├── installer/
│   └── Install-WSH.ps1      # Windows installer
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Service orchestration
└── CHANGELOG.md             # Version history
```

---

## 🐛 Troubleshooting

### Application Not Accessible

If you can't access http://localhost:3000:

```powershell
# Check container status
docker ps -a

# Check container logs
docker logs wsh-app

# Verify HOST environment variable
docker exec wsh-app printenv HOST
# Should output: 0.0.0.0
```

### Database Tables Not Created

If you see "relation public.users does not exist":

```powershell
# Check database logs
docker logs wsh-postgres

# Run Prisma push manually
docker exec -it wsh-app npx prisma db push

# Or use the fix tool
docker exec -it wsh-app pwsh /scripts/db-fix-tool.ps1
```

### Password Authentication Failed

If PostgreSQL reports password authentication failed:

```powershell
# Stop and remove everything
docker stop wsh-app wsh-postgres
docker rm wsh-app wsh-postgres
docker volume rm wsh_postgres_data

# Reinstall
cd WSH\installer
.\install-WSH.ps1 -force
```

### Docker Build Fails

```powershell
# Clean Docker cache and rebuild
docker system prune -af
docker-compose build --no-cache
docker-compose up -d
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
