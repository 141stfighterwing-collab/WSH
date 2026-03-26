# WSH - Weavenote Self Hosted

> **Version 2.1.0** | Self-hosted notes application with PostgreSQL and robust PowerShell execution engine

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![PowerShell](https://img.shields.io/badge/PowerShell-7+-blue)](https://github.com/PowerShell/PowerShell)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![Tested](https://img.shields.io/badge/Tested-Windows-blueviolet)](./docs/WSH_Testing_Report.docx)

> 📋 **[Testing Report Available](./docs/WSH_Testing_Report.docx)** - Comprehensive testing documentation including what was tried, what passed, what failed, root cause analysis, and resolution details.

---

## 🚀 Quick Start (Windows)

### Prerequisites

- **Docker Desktop** for Windows (with WSL2 backend)
- **PowerShell 7+** (for local scripts)
- **8GB+ RAM** recommended
- **10GB+ free disk space**

### One-Command Installation

```powershell
# Clone the repository
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH

# Run the Windows installer (forced installation)
.\installer\Install-WSH-Windows.ps1 -Force -Benchmark

# Or use Docker Compose directly
docker-compose up -d --build
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:3000 | Main application |
| Health API | http://localhost:3000/api/health | Health check endpoint |
| PowerShell Health | http://localhost:8080/health | PowerShell executor status |
| pgAdmin | http://localhost:5050 | Database management (optional) |

### Default Credentials

```
Email: admin@wsh.local
Password: admin123
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

### Running Benchmarks

```powershell
# Run full benchmark suite
.\installer\Install-WSH-Windows.ps1 -Force -Benchmark

# Or use the included benchmark scripts
node benchmarks/benchmark.js
```

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

### Error Response Codes

| Code | Category | Description | Recovery Action |
|------|----------|-------------|-----------------|
| 400 | Client Error | Invalid request data | Check request format |
| 401 | Auth Error | Authentication required | Login again |
| 403 | Auth Error | Insufficient permissions | Contact admin |
| 404 | Not Found | Resource not found | Check resource ID |
| 429 | Rate Limit | Too many requests | Wait and retry |
| 500 | Server Error | Internal server error | Check logs, retry |
| 502 | Gateway Error | Service unavailable | Check container status |
| 503 | Service Error | Database unavailable | Check PostgreSQL |

### Retry Configuration

```env
# .env configuration for retry behavior
MAX_RETRIES=3              # Maximum retry attempts
RETRY_DELAY=5              # Initial delay in seconds
RETRY_BACKOFF_MULTIPLIER=2 # Exponential backoff multiplier
MAX_RETRY_DELAY=60         # Maximum delay cap in seconds
DEFAULT_TIMEOUT=3600       # Default script timeout in seconds
```

### Transient Error Detection

The system automatically detects and retries these transient errors:

- Network timeout / connection reset
- Service temporarily unavailable
- Rate limiting responses
- Deadlock / lock timeout
- DNS resolution failures

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
```

### Health Check Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.1.0",
  "components": {
    "database": "connected",
    "cache": "available",
    "storage": "available"
  },
  "metrics": {
    "uptime": 86400,
    "memoryUsage": "256MB",
    "cpuUsage": "5%"
  }
}
```

### Container Health Status

```powershell
# Check all container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}"

# Detailed health inspection
docker inspect --format='{{json .State.Health}}' wsh-app | ConvertFrom-Json
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
| `app` | Main WSH application | 3000, 8080 | 512MB-2GB |
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
├── installer/
│   └── Install-WSH-Windows.ps1  # Windows installer
├── docs/
│   └── WSH_Testing_Report.docx  # Comprehensive testing report
├── benchmarks/              # Performance benchmarks
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Service orchestration
├── next.config.js           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
└── .env.example             # Environment template
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Docker Build Fails

```powershell
# Clean Docker cache and rebuild
docker system prune -af
docker-compose build --no-cache
docker-compose up -d
```

#### 2. TypeScript Module Resolution Errors

```powershell
# Ensure tsconfig.json has correct paths
# Check that "@/*" maps to "./src/*"
npm run build
```

#### 3. Database Connection Errors

```powershell
# Check PostgreSQL container status
docker logs wsh-postgres

# Verify database credentials
docker exec -it wsh-postgres psql -U wsh -d wsh_db -c "SELECT 1"
```

#### 4. PowerShell Module Import Errors

```powershell
# Check module paths in container
docker exec wsh-app pwsh -c "Get-ChildItem /modules"

# Test module import
docker exec wsh-app pwsh -c "Import-Module /modules/LoggingEngine -Force"
```

#### 5. Health Check Failures

```powershell
# Inspect container health
docker inspect wsh-app --format='{{json .State.Health}}' | ConvertFrom-Json

# Manual health check
docker exec wsh-app pwsh -File /app/healthcheck.ps1
```

### Log Collection

```powershell
# Collect all logs
docker-compose logs > logs/all-logs.txt

# Follow logs in real-time
docker-compose logs -f

# Container-specific logs
docker logs wsh-app > logs/app.log
docker logs wsh-postgres > logs/postgres.log
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

### Network Security

```yaml
# docker-compose.yml network isolation
networks:
  wsh-network:
    driver: bridge
    internal: false  # Set to true for complete isolation
```

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

### PowerShell Execution

```http
POST /api/executor/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "scriptPath": "/scripts/example.ps1",
  "parameters": {
    "param1": "value1"
  },
  "timeout": 300
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
