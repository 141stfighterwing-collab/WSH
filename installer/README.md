# WSH PowerShell Installer

## One-Click Docker Deployment for Windows

This installer provides a fully automated, production-style deployment of WSH (Weavenote Self Hosted) on Windows using Docker and Docker Compose.

### Features

- **Prerequisites Verification**: Automatically checks Docker Desktop, Docker Compose, PowerShell execution policy, and port availability
- **Environment Preparation**: Creates necessary directories, Docker volumes, and networks
- **Configuration Generation**: Generates environment files, Docker Compose configurations, and database initialization scripts
- **Database Deployment**: Deploys PostgreSQL with health checks and automatic retry logic
- **Application Deployment**: Deploys the WSH application with dependency management
- **Health Validation**: Validates all services are running correctly
- **Progress Tracking**: Real-time progress display with percentage indicators
- **Comprehensive Logging**: Detailed logs saved to `wsh-install.log`
- **Rollback Support**: Clear instructions for cleanup if installation fails
- **AI API Support**: Optional Gemini API key integration for AI features

---

## Quick Start

### Prerequisites

1. **Windows 10/11** (64-bit)
2. **Docker Desktop** installed and running
   - Download from: https://www.docker.com/products/docker-desktop
3. **PowerShell 5.1+** (included with Windows)
4. **Administrator access** (for some operations)

### Installation

Open PowerShell and run:

```powershell
# Download the installer
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/141stfighterwing-collab/WSH/main/installer/Install-WSH.ps1" -OutFile "Install-WSH.ps1"

# Run the installer
.\Install-WSH.ps1
```

That's it! The installer will:
1. Check all prerequisites
2. Set up the environment
3. Deploy PostgreSQL database
4. Deploy the WSH application
5. Validate everything is working
6. Open your browser to the application

---

## Installation Options

### Basic Installation

```powershell
.\Install-WSH.ps1
```

Installs WSH with default settings:
- Install path: `%USERPROFILE%\WSH`
- Application port: 3000
- Database port: 5432

### Custom Installation Path

```powershell
.\Install-WSH.ps1 -InstallPath "D:\MyApps\WSH"
```

### With pgAdmin (Database Management UI)

```powershell
.\Install-WSH.ps1 -EnablePgAdmin
```

Adds pgAdmin web interface at http://localhost:5050

### With AI Features (Gemini API)

```powershell
.\Install-WSH.ps1 -GeminiApiKey "your-api-key-here"
```

Enables AI-powered features using Google's Gemini API.

### Force Overwrite Existing Installation

```powershell
.\Install-WSH.ps1 -Force
```

Overwrites any existing installation at the target path.

### Skip Port Availability Check

```powershell
.\Install-WSH.ps1 -SkipPortCheck
```

Useful if ports are shown as in use but you want to proceed anyway.

### Full Custom Installation

```powershell
.\Install-WSH.ps1 `
    -InstallPath "D:\WSH" `
    -AppPort 8080 `
    -DatabasePort 5433 `
    -EnablePgAdmin `
    -PgAdminPort 5050 `
    -GeminiApiKey "your-api-key"
```

---

## Parameters Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-InstallPath` | String | `%USERPROFILE%\WSH` | Installation directory |
| `-AppName` | String | `WSH - Weavenote Self Hosted` | Application display name |
| `-AppPort` | Integer | `3000` | Port for the web application |
| `-DatabasePort` | Integer | `5432` | Port for PostgreSQL |
| `-PgAdminPort` | Integer | `5050` | Port for pgAdmin (if enabled) |
| `-EnablePgAdmin` | Switch | `false` | Enable pgAdmin database management UI |
| `-SkipPortCheck` | Switch | `false` | Skip port availability verification |
| `-Force` | Switch | `false` | Overwrite existing installation |
| `-GeminiApiKey` | String | `""` | Gemini API key for AI features |
| `-Uninstall` | Switch | `false` | Uninstall WSH |
| `-RemoveData` | Switch | `false` | Remove data when uninstalling |

---

## Uninstallation

### Basic Uninstall (Preserves Data)

```powershell
.\Install-WSH.ps1 -Uninstall
```

Stops and removes containers but preserves database volume.

### Complete Uninstall (Removes Everything)

```powershell
.\Install-WSH.ps1 -Uninstall -RemoveData
```

Removes all containers, volumes, and data.

---

## Post-Installation

### Access the Application

- **Application**: http://localhost:3000
- **pgAdmin** (if enabled): http://localhost:5050

### Default Credentials

**IMPORTANT**: Change these immediately after first login!

- **Email**: `admin@wsh.local`
- **Password**: `admin123`

### File Locations

| File | Location |
|------|----------|
| Application | `%USERPROFILE%\WSH` |
| Docker Compose | `%USERPROFILE%\WSH\docker-compose.yml` |
| Environment | `%USERPROFILE%\WSH\.env` |
| Logs | `%USERPROFILE%\WSH\wsh-install.log` |
| Uploads | `%USERPROFILE%\WSH\uploads` |
| Backups | `%USERPROFILE%\WSH\backups` |

### Common Commands

```powershell
# Stop the application
docker compose -f "$env:USERPROFILE\WSH\docker-compose.yml" down

# Start the application
docker compose -f "$env:USERPROFILE\WSH\docker-compose.yml" up -d

# View logs
docker compose -f "$env:USERPROFILE\WSH\docker-compose.yml" logs -f

# Restart the application
docker compose -f "$env:USERPROFILE\WSH\docker-compose.yml" restart

# Check container status
docker ps --filter "name=wsh-"
```

---

## Troubleshooting

### Docker Desktop Not Running

**Error**: `Docker daemon is not running`

**Solution**: Start Docker Desktop and wait for it to fully initialize (whale icon in system tray should be steady).

### Port Already in Use

**Error**: `Required ports are occupied: 3000, 5432`

**Solutions**:
1. Stop conflicting services
2. Use different ports: `.\Install-WSH.ps1 -AppPort 8080 -DatabasePort 5433`
3. Force installation: `.\Install-WSH.ps1 -Force`

### Execution Policy Error

**Error**: `running scripts is disabled on this system`

**Solution**: Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Container Fails to Start

**Steps to diagnose**:
1. Check logs: `docker compose -f "$env:USERPROFILE\WSH\docker-compose.yml" logs`
2. Check container status: `docker ps -a --filter "name=wsh-"`
3. Check Docker resources: Ensure Docker has at least 4GB RAM allocated

### Reset Installation

If you encounter persistent issues:

```powershell
# Remove everything
.\Install-WSH.ps1 -Uninstall -RemoveData

# Clean up Docker
docker system prune -f

# Reinstall
.\Install-WSH.ps1 -Force
```

---

## Security Recommendations

### Before Production Use

1. **Change Default Credentials**
   - Edit `%USERPROFILE%\WSH\.env`
   - Update `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`
   - Update `POSTGRES_PASSWORD`

2. **Generate New JWT Secret**
   ```powershell
   # Generate a new secret
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
   ```
   - Update `JWT_SECRET` in `.env`

3. **Use HTTPS**
   - Deploy behind a reverse proxy (nginx, traefik)
   - Use Let's Encrypt for SSL certificates

4. **Firewall Configuration**
   - Only expose necessary ports
   - Consider not exposing database port externally

5. **Regular Backups**
   - Database backups are stored in `%USERPROFILE%\WSH\backups`
   - Set up automated backup schedules

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      WSH Deployment                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Browser    │───►│  WSH App     │───►│  PostgreSQL  │  │
│  │              │    │  (Next.js)   │    │  (Database)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Port 3000    │    │ Port 3000    │    │ Port 5432    │  │
│  │ (External)   │    │ (Internal)   │    │ (Internal)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                              │              │
│                                              ▼              │
│                                      ┌──────────────┐       │
│                                      │ Docker Volume│       │
│                                      │ postgres_data│       │
│                                      └──────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation Phases

The installer executes in 7 phases:

1. **Prerequisites Check** (0-14%)
   - Docker Desktop verification
   - Docker Compose availability
   - PowerShell execution policy
   - Port availability
   - Directory verification

2. **Environment Preparation** (14-28%)
   - Create installation directories
   - Create Docker volumes
   - Create Docker network

3. **Configuration Generation** (28-42%)
   - Generate environment file (.env)
   - Generate Docker Compose file
   - Generate database init scripts

4. **Database Deployment** (42-56%)
   - Pull PostgreSQL image
   - Start PostgreSQL container
   - Wait for database ready

5. **Application Deployment** (56-70%)
   - Pull WSH application image
   - Start application container
   - Wait for application ready

6. **Health Validation** (70-85%)
   - Database connectivity check
   - Application health endpoint check
   - Container status verification

7. **Finalization** (85-100%)
   - Create desktop shortcut
   - Save installation info
   - Open browser to application

---

## Support

For issues and feature requests, please visit:
https://github.com/141stfighterwing-collab/WSH/issues

---

## License

Copyright 2025 - WSH Project
