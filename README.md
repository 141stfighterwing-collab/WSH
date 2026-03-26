# WSH - Weavenote Self Hosted

**Self-hosted notes application with PostgreSQL database and robust PowerShell execution engine.**

## Overview

WSH combines a full-featured notes application with an enterprise-grade PowerShell execution engine, providing:

- 📝 **Notes Management** - Multiple note types (quick, deep, project, notebook)
- 🗄️ **PostgreSQL Database** - Self-hosted, no cloud dependencies
- 🔒 **Secure PowerShell Execution** - Isolated, logged, validated script execution
- 📊 **Comprehensive Logging** - Structured logs with severity levels
- 🔄 **Retry Logic** - Auto-retry with exponential backoff
- 🏥 **Health Monitoring** - HTTP endpoints for orchestration

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Default Credentials

- **Email:** `admin@wsh.local`
- **Password:** `admin123`

⚠️ **Change these credentials immediately after first login!**

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      WSH Application                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16 App          │     PowerShell Executor Engine   │
│  ├── React UI            │     ├── LoggingEngine           │
│  ├── API Routes          │     ├── SafeExecutor            │
│  └── Prisma ORM          │     ├── ConfigManager           │
│                          │     └── HealthCheck              │
├─────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                       │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Notes Application

| Feature | Description |
|---------|-------------|
| **Multiple Note Types** | Quick, Deep, Project, Notebook |
| **Folder Organization** | Organize notes into folders |
| **Search** | Full-text search across all notes |
| **Dark Mode** | Easy on the eyes |
| **Tags** | Categorize with hashtags |
| **Export** | JSON, CSV, SQL export options |

### PowerShell Executor

| Feature | Description |
|---------|-------------|
| **Secure Execution** | Isolated Docker environment with least-privilege defaults |
| **Pre-flight Validation** | Validates script paths, syntax, modules, and permissions |
| **Retry Logic** | Auto-retry with exponential backoff for transient failures |
| **Structured Logging** | Timestamps, severity levels (DEBUG→CRITICAL), JSON/Text/CSV formats |
| **Health Checks** | HTTP endpoint at `/health` for container orchestration |
| **Scheduling** | Cron-based scheduled execution mode |
| **Daemon Mode** | Continuous operation with health monitoring |

## Directory Structure

```
WSH/
├── src/                    # Next.js application
│   ├── app/               # App Router pages and API routes
│   └── lib/               # Database and auth utilities
├── pwsh/                   # PowerShell Executor
│   ├── modules/           # PowerShell modules
│   │   ├── LoggingEngine/ # Structured logging
│   │   ├── SafeExecutor/  # Safe script execution
│   │   ├── ConfigManager/ # Configuration management
│   │   └── HealthCheck/   # Health endpoints
│   ├── app/               # Entry points
│   └── scripts/           # Example scripts
├── prisma/                 # Database schema
├── components/             # React components
└── docker-compose.yml      # Docker configuration
```

## API Endpoints

### Application APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | User registration |
| `/api/notes` | GET/POST | Notes CRUD |
| `/api/folders` | GET/POST | Folders CRUD |

### Executor APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/executor/execute` | POST | Execute a PowerShell script |
| `/api/executor/scripts` | GET | List available scripts |
| `/api/executor/logs` | GET | Retrieve execution logs |
| `/api/health` | GET | Health check status |

### Execute Script API

```bash
# Execute a PowerShell script
curl -X POST http://localhost:3000/api/executor/execute \
  -H "Content-Type: application/json" \
  -d '{
    "scriptPath": "/scripts/wsh_maintenance.ps1",
    "parameters": {
      "Mode": "cleanup",
      "DryRun": true
    },
    "retryCount": 3,
    "timeout": 600
  }'
```

## PowerShell Modules

### LoggingEngine

```powershell
Import-Module -Name "/pwsh/modules/LoggingEngine"

# Start logging session
Start-LoggingSession -SessionName "MyTask" -LogLevel "DEBUG"

# Write logs
Write-Log -Message "Processing started" -Level "INFO" -Source "Main"
Write-LogInfo "Information message"
Write-LogWarning "Warning message"
Write-LogError "Error message"
Write-LogSuccess "Success message"

# Export report
Export-LogReport -Path '/output' -Format 'json'

# Stop logging
Stop-LoggingSession
```

### SafeExecutor

```powershell
Import-Module -Name "/pwsh/modules/SafeExecutor"

# Execute with retry
$result = Invoke-Safely -StepName "Process Data" -Action {
    Get-Content -Path '/data/input.json' | ConvertFrom-Json
} -RetryCount 3 -RetryDelaySeconds 5 -TimeoutSeconds 300

if ($result.Success) {
    Write-Host "Output: $($result.Output)"
}

# Execute script file with validation
$result = Invoke-ScriptWithRetry -ScriptPath '/scripts/task.ps1' -MaxRetries 3 -Timeout 600
```

## Health Checks

### HTTP Health Endpoint

```bash
# Check health
curl http://localhost:8080/health

# Response
{
  "status": "healthy",
  "timestamp": "2026-03-26T12:00:00.000Z",
  "version": "2.0.0",
  "uptime": 3600,
  "checks": {
    "filesystem": { "status": "healthy" },
    "powershell": { "status": "healthy", "version": "7.4.0" },
    "database": { "status": "healthy", "connected": true },
    "memory": { "status": "healthy", "heapUsedMB": 45.2 }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET` | (required) | Secret for JWT tokens |
| `ADMIN_EMAIL` | `admin@wsh.local` | Default admin email |
| `ADMIN_PASSWORD` | `admin123` | Default admin password |
| `LOG_LEVEL` | `INFO` | Logging level |
| `MAX_RETRIES` | `3` | Maximum retry attempts |
| `RETRY_DELAY` | `5` | Initial retry delay (seconds) |
| `DEFAULT_TIMEOUT` | `3600` | Script timeout (seconds) |
| `HEALTH_CHECK_PORT` | `8080` | Health endpoint port |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | 3000, 8080 | Main application with health endpoint |
| `postgres` | 5432 | PostgreSQL database |
| `scheduler` | - | Scheduled script execution (optional) |
| `pgadmin` | 5050 | Database management UI (optional) |

### Running with Optional Services

```bash
# Enable scheduled execution
docker-compose --profile scheduled up -d

# Enable pgAdmin
docker-compose --profile admin up -d

# Enable all profiles
docker-compose --profile scheduled --profile admin up -d
```

## Example Scripts

### Maintenance Script

```powershell
# Run maintenance with cleanup mode
pwsh -File /scripts/wsh_maintenance.ps1 -Mode cleanup

# Run all maintenance tasks (dry run)
pwsh -File /scripts/wsh_maintenance.ps1 -Mode all -DryRun
```

### Scheduled Tasks

```yaml
# docker-compose.yml for scheduled execution
services:
  scheduler:
    environment:
      - EXECUTOR_MODE=scheduled
      - SCRIPT_PATH=/scripts/wsh_maintenance.ps1
      - SCHEDULE_CRON=0 2 * * *  # Daily at 2 AM
```

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Run development server
npm run dev

# Run PowerShell tests
pwsh -File /pwsh/scripts/test_runner.ps1
```

## Production

```bash
# Build for production
docker-compose build

# Start production stack
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Security

- Scripts must be in `/scripts` or `/pwsh/scripts` directories
- All script paths are validated and normalized
- Non-root user by default
- Health checks for monitoring
- Comprehensive audit logging

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose logs postgres

# Test connection
docker-compose exec app npx prisma db pull
```

### PowerShell Execution Errors

```bash
# Check logs
curl http://localhost:3000/api/executor/logs

# Test PowerShell
docker-compose exec app pwsh -Command '$PSVersionTable'
```

### Health Check Failing

```bash
# Check health endpoint
curl http://localhost:8080/health

# View detailed health
curl http://localhost:3000/api/health
```

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.
