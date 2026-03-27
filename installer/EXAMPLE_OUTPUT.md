# WSH Extended Installer - Example Output Logs

This document shows example output from running the extended installer.

## Successful Installation Output

```
================================================================================
                     WSH EXTENDED INSTALLER v2.0.0
              Weavenote Self Hosted - Docker Deployment with Testing
================================================================================

Installation Path: C:\Users\Admin\WSH
Application Port:  3000
Database Port:     5432
AI API Key:        Provided

┌─────────────────────────────────────────────────────────────────┐
│  STEP 1/10: Prerequisites Check                                 │
│                                                                 │
│  Progress: [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 20% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 1: Prerequisites Check
[INFO]     Checking Docker Desktop installation...
  ✓ Docker Desktop is installed and running
[SUCCESS]  Docker Desktop verified successfully
[INFO]     Checking Docker Compose availability...
  ✓ Docker Compose v2 available: Docker Compose version v2.23.3
[SUCCESS]  Docker Compose v2 verified
[INFO]     Checking Node.js installation...
  ✓ Node.js installed: v20.10.0
[INFO]     Checking required ports: 3000, 5432...
  ✓ Port 3000 is available
  ✓ Port 5432 is available
[INFO]     Checking installation directory...
  ✓ Installation directory ready: C:\Users\Admin\WSH
[SUCCESS]  All prerequisites passed

┌─────────────────────────────────────────────────────────────────┐
│  STEP 2/10: Environment Preparation                             │
│                                                                 │
│  Progress: [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 30% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 2: Environment Preparation
[INFO]     Creating installation directory structure...
  ✓ Directory structure created successfully
[INFO]     Creating Docker volumes...
  ✓ Volume 'wsh_postgres_data' already exists
[INFO]     Created Docker network
[SUCCESS]  Environment preparation completed

┌─────────────────────────────────────────────────────────────────┐
│  STEP 3/10: Configuration Generation                            │
│                                                                 │
│  Progress: [████████████████████████████░░░░░░░░░░░░░░░░░░░░░░] 40% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 3: Configuration Generation
[INFO]     Creating environment configuration file...
  ✓ Environment file created: C:\Users\Admin\WSH\.env
[INFO]     Creating Docker Compose configuration...
  ✓ Docker Compose file created
[INFO]     Creating Playwright test script...
  ✓ Playwright test scripts created
[SUCCESS]  Configuration generation completed

┌─────────────────────────────────────────────────────────────────┐
│  STEP 4/10: Database Deployment                                 │
│                                                                 │
│  Progress: [██████████████████████████████████░░░░░░░░░░░░░░░░] 50% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 4: Database Deployment
[INFO]     Starting PostgreSQL database container...
[INFO]     Pulling PostgreSQL image...
    Pulling from library/postgres
    Digest: sha256:abc123...
    Status: Downloaded newer image
  ✓ Database container started
[INFO]     Waiting for database to be ready...
    [20%] Database status: starting (Attempt 1/30)
    [40%] Database status: starting (Attempt 2/30)
    [60%] Database status: healthy (Attempt 3/30)
  ✓ Database is healthy and ready!
[SUCCESS]  Database health check passed after 3 attempts
[SUCCESS]  Database deployment completed successfully

┌─────────────────────────────────────────────────────────────────┐
│  STEP 5/10: Application Deployment                              │
│                                                                 │
│  Progress: [████████████████████████████████████████░░░░░░░░░░] 60% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 5: Application Deployment
[INFO]     Starting WSH application container...
[INFO]     Pulling WSH application image...
    Pulling from 141stfighterwing-collab/wsh
    Status: Downloaded newer image
  ✓ Application container started
[INFO]     Waiting for application to be ready...
    [30%] Container status: running (Attempt 1/30)
    [60%] Application is responding!
  ✓ Application is healthy and responding!
[SUCCESS]  Application health check passed after 2 attempts
[SUCCESS]  Application deployment completed successfully

┌─────────────────────────────────────────────────────────────────┐
│  STEP 6/10: Health Validation                                   │
│                                                                 │
│  Progress: [████████████████████████████████████████████░░░░░░] 70% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 6: Health Validation
[INFO]     Validating container status...
  ✓ wsh-postgres: running
  ✓ wsh-app: running
[INFO]     Testing HTTP endpoints...
  ✓ Homepage: HTTP 200 (45ms)
  ✓ Health API: HTTP 200 (12ms)
  ✓ Login Page: HTTP 200 (38ms)
[INFO]     Testing database connectivity...
  ✓ Database accepting connections
  ✓ Database 'wsh_db' is accessible
[SUCCESS]  Health validation passed

┌─────────────────────────────────────────────────────────────────┐
│  STEP 7/10: Functional Testing                                  │
│                                                                 │
│  Progress: [███████████████████████████████████████████████░░░] 80% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 7: Functional Testing
[INFO]     Testing: API Health Check...
  ✓ API Health Check: HTTP 200 (8ms)
[INFO]     Testing: Auth Endpoint...
  ✓ Auth Endpoint: Auth required (expected)
[INFO]     Testing: Notes List...
  ✓ Notes List: Auth required (expected)
[INFO]     Testing: Folders List...
  ✓ Folders List: Auth required (expected)
[INFO]     Testing login functionality...
  ✓ Login API: Success (156ms)
  ✓ JWT token received
[SUCCESS]  Functional tests completed

┌─────────────────────────────────────────────────────────────────┐
│  STEP 8/10: UI Testing Setup                                    │
│                                                                 │
│  Progress: [█████████████████████████████████████████████████░] 90% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 8: UI Testing Setup
[INFO]     Checking Node.js...
  ✓ Node.js installed: v20.10.0
[INFO]     Installing Playwright dependencies...
[INFO]     Running npm install...
    added 45 packages in 12s
[INFO]     Installing Playwright browsers...
    Downloading Chromium...
    Chromium downloaded
  ✓ Playwright dependencies installed
[SUCCESS]  UI testing setup completed

┌─────────────────────────────────────────────────────────────────┐
│  STEP 9/10: Playwright UI Tests                                 │
│                                                                 │
│  Progress: [██████████████████████████████████████████████████] 95% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 9: Playwright UI Tests
[INFO]     Running Playwright UI tests...

Running 14 tests using 1 worker

  ✓ [chromium] › 01 - Application is accessible (2.3s)
  ✓ [chromium] › 02 - Login page loads (1.1s)
  ✓ [chromium] › 03 - Login with credentials (3.2s)
  ✓ [chromium] › 04 - Dashboard/Notes page (4.1s)
  ✓ [chromium] › 05 - New Note button functionality (2.8s)
  ✓ [chromium] › 06 - Navigation menu (0.9s)
  ✓ [chromium] › 07 - Dark mode toggle (1.5s)
  ✓ [chromium] › 08 - Responsive design (Mobile) (1.2s)
  ✓ [chromium] › 09 - UI Elements Capture (1.8s)
  ✓ [chromium] › 10 - Error page handling (1.1s)
  ✓ [chromium] › B1 - Folder creation button (2.4s)
  ✓ [chromium] › B2 - Search functionality (1.3s)
  ✓ [chromium] › B3 - Settings/Profile button (1.1s)
  ✓ [chromium] › B4 - Logout button (2.2s)

  14 passed (28s)

  ✓ All Playwright tests passed
📸 Screenshots saved to: C:\Users\Admin\WSH\screenshots\2025-03-26T12-30-45\

┌─────────────────────────────────────────────────────────────────┐
│  STEP 10/10: Report Generation                                  │
│                                                                 │
│  Progress: [██████████████████████████████████████████████████] 100% │
└─────────────────────────────────────────────────────────────────┘

[INFO]     Starting Step 10: Report Generation
[INFO]     Creating HTML report...
  ✓ Validation report created: C:\Users\Admin\WSH\wsh-validation-report.html
[SUCCESS]  Report generation completed

================================================================================
                    DEPLOYMENT SUCCESSFUL
================================================================================

  Test Results Summary:
  ────────────────────────────────────────────────────────────────
  Deployment:        PASSED
  Container Health:  PASSED
  Database Health:   PASSED
  API Tests:         8/8 passed
  UI Tests:          14/14 passed
  Screenshots:       28 captured

  Access Information:
  ────────────────────────────────────────────────────────────────
  Application URL:   http://localhost:3000
  Database Port:     localhost:5432

  File Locations:
  ────────────────────────────────────────────────────────────────
  Install Directory: C:\Users\Admin\WSH
  Validation Report: C:\Users\Admin\WSH\wsh-validation-report.html
  Screenshots:       C:\Users\Admin\WSH\screenshots\
  Log File:          C:\Users\Admin\WSH\wsh-install.log

  Default Credentials (CHANGE IMMEDIATELY!):
  ────────────────────────────────────────────────────────────────
  Email:             admin@wsh.local
  Password:          admin123

================================================================================
  Opening validation report in browser...

Installation completed in 04:32
```

---

## Partial Failure Output Example

```
================================================================================
                    DEPLOYMENT FAILED
================================================================================

  Error: Application health check timed out after 30 attempts

  Test Results Summary:
  ────────────────────────────────────────────────────────────────
  Deployment:        PASSED
  Container Health:  FAILED
  Database Health:   PASSED
  API Tests:         0/0 passed
  UI Tests:          SKIPPED
  Screenshots:       0 captured

  Rollback Instructions:
  ────────────────────────────────────────────────────────────────
  1. Stop containers:     docker-compose down
  2. Remove volumes:      docker volume rm wsh_postgres_data
  3. Clean install:       Remove-Item -Recurse -Force "C:\Users\Admin\WSH"
  4. Check logs:          Get-Content "C:\Users\Admin\WSH\wsh-install.log"

================================================================================
```

---

## Log File Example (wsh-install.log)

```
[2025-03-26 12:25:30] [INFO] Starting WSH Extended Installer v2.0.0
[2025-03-26 12:25:30] [INFO] Installation path: C:\Users\Admin\WSH
[2025-03-26 12:25:30] [INFO] Starting Step 1: Prerequisites Check
[2025-03-26 12:25:30] [INFO] Checking Docker Desktop installation...
[2025-03-26 12:25:31] [SUCCESS] Docker Desktop verified successfully
[2025-03-26 12:25:31] [INFO] Checking Docker Compose availability...
[2025-03-26 12:25:31] [SUCCESS] Docker Compose v2 verified
[2025-03-26 12:25:31] [INFO] Checking Node.js installation...
[2025-03-26 12:25:31] [SUCCESS] Node.js verified
[2025-03-26 12:25:31] [INFO] Starting Step 2: Environment Preparation
[2025-03-26 12:25:31] [INFO] Creating installation directory structure...
[2025-03-26 12:25:31] [SUCCESS] Directory structure created
[2025-03-26 12:25:32] [INFO] Creating Docker volumes...
[2025-03-26 12:25:32] [SUCCESS] Docker volumes configured
[2025-03-26 12:25:32] [INFO] Starting Step 3: Configuration Generation
[2025-03-26 12:25:32] [INFO] Creating environment configuration file...
[2025-03-26 12:25:32] [SUCCESS] Environment file created
[2025-03-26 12:25:32] [INFO] Creating Docker Compose configuration...
[2025-03-26 12:25:32] [SUCCESS] Docker Compose file created
[2025-03-26 12:25:32] [INFO] Creating Playwright test script...
[2025-03-26 12:25:32] [SUCCESS] Playwright scripts created
[2025-03-26 12:25:32] [INFO] Starting Step 4: Database Deployment
[2025-03-26 12:25:32] [INFO] Starting PostgreSQL database container...
[2025-03-26 12:25:45] [SUCCESS] Database container started
[2025-03-26 12:25:45] [INFO] Waiting for database to be ready...
[2025-03-26 12:25:55] [SUCCESS] Database health check passed
[2025-03-26 12:25:55] [INFO] Starting Step 5: Application Deployment
[2025-03-26 12:25:55] [INFO] Starting WSH application container...
[2025-03-26 12:26:10] [SUCCESS] Application container started
[2025-03-26 12:26:10] [INFO] Waiting for application to be ready...
[2025-03-26 12:26:25] [SUCCESS] Application health check passed
[2025-03-26 12:26:25] [INFO] Starting Step 6: Health Validation
[2025-03-26 12:26:25] [INFO] Validating container status...
[2025-03-26 12:26:25] [SUCCESS] Container validation passed
[2025-03-26 12:26:25] [INFO] Testing HTTP endpoints...
[2025-03-26 12:26:26] [SUCCESS] HTTP endpoint tests passed
[2025-03-26 12:26:26] [INFO] Testing database connectivity...
[2025-03-26 12:26:26] [SUCCESS] Database connectivity verified
[2025-03-26 12:26:26] [INFO] Starting Step 7: Functional Testing
[2025-03-26 12:26:26] [INFO] Running functional tests...
[2025-03-26 12:26:28] [PASS] API Health Check: HTTP 200
[2025-03-26 12:26:28] [PASS] Auth Endpoint: Auth required
[2025-03-26 12:26:28] [PASS] Notes List: Auth required
[2025-03-26 12:26:28] [PASS] Folders List: Auth required
[2025-03-26 12:26:28] [PASS] Login API: Success
[2025-03-26 12:26:28] [SUCCESS] Functional tests completed
[2025-03-26 12:26:28] [INFO] Starting Step 8: UI Testing Setup
[2025-03-26 12:26:28] [INFO] Installing Playwright dependencies...
[2025-03-26 12:26:45] [SUCCESS] Playwright setup completed
[2025-03-26 12:26:45] [INFO] Starting Step 9: Playwright UI Tests
[2025-03-26 12:26:45] [INFO] Running Playwright tests...
[2025-03-26 12:27:15] [SUCCESS] All Playwright tests passed
[2025-03-26 12:27:15] [INFO] Starting Step 10: Report Generation
[2025-03-26 12:27:15] [INFO] Generating HTML report...
[2025-03-26 12:27:15] [SUCCESS] Report generated
[2025-03-26 12:27:15] [INFO] Installation completed successfully
```
