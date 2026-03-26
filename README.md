# WSH - Weavenote Self Hosted

A fully self-hosted notes application with PostgreSQL database. No cloud dependencies required.

## Features

- **PostgreSQL Database** - All data stored locally in your own database
- **User Authentication** - Secure login with JWT tokens
- **Multiple Note Types** - Quick, Deep, Project, and Notebook notes
- **Folder Organization** - Organize notes into folders
- **Dark Mode** - Easy on the eyes
- **Docker Ready** - One-command deployment with Docker Compose
- **Self-Contained** - No external cloud services required
- **One-Click Installer** - Windows PowerShell installer for easy deployment

---

## 🚀 Quick Start

### Option 1: One-Click PowerShell Installer (Windows 11) - RECOMMENDED

The easiest way to deploy WSH on Windows with automated Docker deployment.

```powershell
# Download and run the installer
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/141stfighterwing-collab/WSH/main/installer/Install-WSH.ps1" -OutFile "Install-WSH.ps1"
.\Install-WSH.ps1
```

**What the installer does:**
1. Validates prerequisites (Docker, ports, permissions)
2. Creates environment and Docker configuration
3. Deploys PostgreSQL database
4. Deploys WSH application
5. Validates health endpoints
6. Creates desktop shortcut and opens browser

**Installation Options:**

```powershell
# Basic installation
.\Install-WSH.ps1

# With pgAdmin (database management UI)
.\Install-WSH.ps1 -EnablePgAdmin

# With AI API key for testing AI features
.\Install-WSH.ps1 -GeminiApiKey "your-gemini-api-key"

# Custom installation path
.\Install-WSH.ps1 -InstallPath "D:\WSH" -AppPort 8080

# Uninstall
.\Install-WSH.ps1 -Uninstall -RemoveData
```

**After installation:**
- Application: http://localhost:3000
- pgAdmin (if enabled): http://localhost:5050
- Log file: `%USERPROFILE%\WSH\wsh-install.log`

---

### Option 2: Docker Compose (Manual)

```bash
# Clone the repository
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start with Docker Compose
docker-compose up -d

# Access the app at http://localhost:3000
```

---

### Option 3: Local Development

```bash
# Clone the repository
git clone https://github.com/141stfighterwing-collab/WSH.git
cd WSH

# Run the installation script
bash scripts/install.sh

# Or manually:
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## 📦 PowerShell Installer Details

The installer directory contains:

| File | Description |
|------|-------------|
| `Install-WSH.ps1` | One-click installer with all features |
| `docker-compose.yml` | Standalone Docker Compose configuration |
| `init-db.sql` | Database initialization script |
| `README.md` | Detailed installer documentation |
| `VERIFICATION.md` | Verification checklist |

### Deployment Phases

| Phase | Step | Description |
|-------|------|-------------|
| 1 | Prerequisites | Docker, ports, permissions validation |
| 2 | Environment | Directories, volumes, network |
| 3 | Configuration | .env, docker-compose generation |
| 4 | Database | PostgreSQL deployment & health |
| 5 | Application | WSH app deployment & validation |
| 6 | Health Validation | Container, HTTP, DB checks |
| 7 | Finalization | Shortcuts, installation info |

---

## 🔐 Default Credentials

After installation, use these credentials to log in:

- **Email:** `admin@wsh.local`
- **Password:** `admin123`

⚠️ **Change these credentials immediately after first login!**

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://wsh:wsh_secure_password@localhost:5432/wsh_db` |
| `JWT_SECRET` | Secret for JWT tokens | (change in production!) |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `ADMIN_EMAIL` | Default admin email | `admin@wsh.local` |
| `ADMIN_PASSWORD` | Default admin password | `admin123` |
| `ADMIN_USERNAME` | Default admin username | `Admin` |
| `GEMINI_API_KEY` | AI API key (optional) | - |

---

## 🗄️ Database Schema

The application uses the following PostgreSQL tables:

- **users** - User accounts and authentication
- **notes** - All notes with content, tags, and metadata
- **folders** - Folder organization for notes
- **audit_logs** - Security audit logging
- **system_config** - System configuration storage

---

## 🐳 Docker Services

The `docker-compose.yml` includes:

1. **postgres** - PostgreSQL 16 database (port 5432)
2. **app** - WSH application (port 3000)
3. **pgadmin** - Database management UI (port 5050, optional)

To enable pgAdmin:
```bash
docker-compose --profile admin up -d
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New user registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Notes
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create a new note
- `GET /api/notes/[id]` - Get a specific note
- `PUT /api/notes/[id]` - Update a note
- `DELETE /api/notes/[id]` - Delete a note

### Folders
- `GET /api/folders` - List all folders
- `POST /api/folders` - Create a new folder
- `PUT /api/folders/[id]` - Update a folder
- `DELETE /api/folders/[id]` - Delete a folder

### System
- `GET /api/health` - Health check endpoint

---

## 💻 Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Open Prisma Studio (database GUI)
npx prisma studio

# Run development server
npm run dev
```

---

## 🏭 Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## ❓ Troubleshooting

### Container Won't Start
```powershell
# Check logs
docker logs wsh-app
docker logs wsh-postgres

# Restart containers
docker-compose -f "$env:USERPROFILE\WSH\docker-compose.yml" restart
```

### Port Conflicts
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <pid> /F
```

### Installation Issues
```powershell
# Check install log
Get-Content "$env:USERPROFILE\WSH\wsh-install.log"

# Full reset
.\Install-WSH.ps1 -Uninstall -RemoveData
.\Install-WSH.ps1 -Force
```

---

## 📁 Project Structure

```
WSH/
├── installer/                 # PowerShell installer
│   ├── Install-WSH.ps1       # One-click installer
│   ├── docker-compose.yml    # Docker configuration
│   ├── init-db.sql           # Database init script
│   ├── README.md             # Installer documentation
│   └── VERIFICATION.md       # Verification checklist
├── src/                      # Application source
│   ├── app/                  # Next.js app router
│   └── lib/                  # Libraries
├── components/               # React components
├── prisma/                   # Database schema
├── scripts/                  # Utility scripts
├── docker-compose.yml        # Main Docker config
├── Dockerfile                # Container definition
└── package.json              # Dependencies
```

---

## 📄 License

MIT

---

## 🤝 Support

For issues and feature requests, please open an issue on GitHub.

- **Repository:** https://github.com/141stfighterwing-collab/WSH
- **Issues:** https://github.com/141stfighterwing-collab/WSH/issues
