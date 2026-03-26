# WSH - Weavenote Self Hosted

A fully self-hosted notes application with PostgreSQL database. No cloud dependencies required.

## Features

- 🗄️ **PostgreSQL Database** - All data stored locally in your own database
- 🔐 **User Authentication** - Secure login with JWT tokens
- 📝 **Multiple Note Types** - Quick, Deep, Project, and Notebook notes
- 📁 **Folder Organization** - Organize notes into folders
- 🌙 **Dark Mode** - Easy on the eyes
- 🐳 **Docker Ready** - One-command deployment with Docker Compose
- 🚀 **Self-Contained** - No external cloud services required
- ✅ **Automated Testing** - Built-in Playwright UI tests with screenshots

---

## 🚀 Quick Start

### Option 1: One-Click PowerShell Installer (Windows 11) - RECOMMENDED

The easiest way to deploy WSH on Windows with full validation, testing, and screenshots.

```powershell
# Download and run the installer
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/141stfighterwing-collab/WSH/main/installer/Install-WSH-Extended.ps1" -OutFile "Install-WSH.ps1"
.\Install-WSH.ps1
```

**What the installer does:**
1. ✅ Validates prerequisites (Docker, Node.js, ports)
2. ✅ Creates environment and Docker configuration
3. ✅ Deploys PostgreSQL database
4. ✅ Deploys WSH application
5. ✅ Runs health validation
6. ✅ Performs functional API testing
7. ✅ Runs Playwright UI tests (14 tests)
8. ✅ Captures screenshots automatically
9. ✅ Generates HTML validation report

**Installation Options:**

```powershell
# Basic installation
.\Install-WSH.ps1

# With pgAdmin (database management UI)
.\Install-WSH.ps1 -EnablePgAdmin

# With AI API key for testing AI features
.\Install-WSH.ps1 -AIApiKey "your-gemini-api-key"

# Skip UI tests (validation only)
.\Install-WSH.ps1 -SkipUITests

# Custom installation path
.\Install-WSH.ps1 -InstallPath "D:\WSH" -AppPort 8080

# Uninstall
.\Install-WSH.ps1 -Uninstall -RemoveData
```

**After installation:**
- Application: http://localhost:3000
- Validation Report: `%USERPROFILE%\WSH\wsh-validation-report.html`
- Screenshots: `%USERPROFILE%\WSH\screenshots\`

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
| `Install-WSH.ps1` | Basic one-click installer |
| `Install-WSH-Extended.ps1` | Full installer with validation & UI testing |
| `docker-compose.yml` | Standalone Docker Compose configuration |
| `.env.example` | Environment configuration template |
| `init-db.sql` | Database initialization script |
| `tests/` | Playwright test suite |
| `VERIFICATION.md` | Verification checklist |
| `EXAMPLE_OUTPUT.md` | Example output logs |

### Deployment Phases

| Phase | Step | Description |
|-------|------|-------------|
| 1 | Prerequisites | Docker, Node.js, ports validation |
| 2 | Environment | Directories, volumes, network |
| 3 | Configuration | .env, docker-compose, Playwright |
| 4 | Database | PostgreSQL deployment & health |
| 5 | Application | WSH app deployment & validation |
| 6 | Health Validation | Container, HTTP, DB checks |
| 7 | Functional Testing | API endpoints, login testing |
| 8 | UI Testing Setup | Playwright & browser install |
| 9 | Playwright Tests | 14 UI tests with screenshots |
| 10 | Report Generation | HTML report with all results |

### Playwright UI Tests

The installer automatically runs these tests:

1. Homepage loads successfully
2. Login page accessibility
3. Login with credentials
4. Dashboard/Notes page
5. New Note button functionality
6. Navigation menu
7. Dark mode toggle
8. Mobile responsiveness (375x667)
9. UI Elements capture
10. Error page handling
11. Folder creation button
12. Search functionality
13. Settings button
14. Logout button

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

## 🧪 Manual Testing

If you want to run tests manually after installation:

```powershell
cd C:\Users\<User>\WSH\tests

# Install dependencies
npm install

# Run all tests
npm test

# Run in headed mode (visible browser)
npm run test:headed

# Capture screenshots only
npm run test:screenshot

# View test report
npm run report
```

---

## 📸 Screenshots

The installer automatically captures screenshots:

```
C:\Users\<User>\WSH\screenshots\<timestamp>\
├── 01-homepage.png
├── 02-login-page.png
├── 03-login-filled.png
├── 04-dashboard.png
├── 05-create-note-form.png
├── 06-navigation.png
├── 07-dark-mode.png
├── 08-mobile-view.png
└── ... (more screenshots)
```

---

## 📊 Validation Report

After installation, a comprehensive HTML report is generated:

- **Location:** `%USERPROFILE%\WSH\wsh-validation-report.html`
- **Contents:**
  - Test summary with pass/fail counts
  - Response times for all endpoints
  - Screenshot gallery
  - Container status
  - File locations

The report automatically opens in your browser after installation.

---

## ❓ Troubleshooting

### Container Won't Start
```powershell
# Check logs
docker logs wsh-app
docker logs wsh-postgres

# Restart containers
docker-compose -f C:\Users\<User>\WSH\docker-compose.yml restart
```

### Node.js Not Installing
```powershell
# Manual install
winget install OpenJS.NodeJS.LTS
```

### Playwright Browser Issues
```powershell
cd C:\Users\<User>\WSH\tests
npx playwright install chromium
```

### Port Conflicts
```powershell
# Find process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <pid> /F
```

---

## 📁 Project Structure

```
WSH/
├── installer/                 # PowerShell installer
│   ├── Install-WSH.ps1       # Basic installer
│   ├── Install-WSH-Extended.ps1  # Full installer with testing
│   ├── docker-compose.yml    # Docker configuration
│   ├── .env.example          # Environment template
│   ├── init-db.sql           # Database init script
│   ├── tests/                # Playwright test suite
│   │   ├── package.json
│   │   ├── playwright.config.js
│   │   ├── ui-tests.spec.js
│   │   └── screenshot-runner.js
│   ├── VERIFICATION.md       # Verification checklist
│   └── EXAMPLE_OUTPUT.md     # Example output logs
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
