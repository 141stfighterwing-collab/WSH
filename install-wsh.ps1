#!/usr/bin/env pwsh
<#
.SYNOPSIS
    WSH (WeaveNote Self-Hosted) — Comprehensive PowerShell Installer v3.4.0

.DESCRIPTION
    Automates the full setup of the WSH project: prerequisite checks, repo clone,
    dependency installation, environment configuration, database migration, production
    build, and launch.  Supports interactive and silent modes, Docker and native
    run-modes, and a post-install health check.

.NOTES
    Project   : WSH — WeaveNote Self-Hosted
    Version   : 3.4.0
    GitHub    : https://github.com/141stfighterwing-collab/WSH
    License   : MIT
    Requires  : PowerShell 7+ (recommended), Node.js 20+, Git, Bun
#>

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

$Script:WSH_VERSION       = "3.4.0"
$Script:REPO_URL          = "https://github.com/141stfighterwing-collab/WSH.git"
$Script:DEFAULT_BRANCH    = "main"
$Script:DEFAULT_PORT      = 3000
$Script:HEALTH_ENDPOINT   = "http://localhost:{0}/api/health"
$Script:HEALTH_TIMEOUT_MS = 15000

# Runtime flags (populated by parameter parsing)
$Script:Silent       = $false
$Script:SkipClone   = $false
$Script:SkipDeps    = $false
$Script:SkipMigrate = $false
$Script:SkipBuild   = $false
$Script:RunMode     = "none"          # dev | prod | docker | none
$Script:InstallDir  = ""
$Script:Branch      = $Script:DEFAULT_BRANCH

# ═══════════════════════════════════════════════════════════════════════════════
#  COLORED OUTPUT HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Info    { param([string]$Msg) Write-Host "  [i] $Msg" -ForegroundColor Cyan }
function Write-Ok      { param([string]$Msg) Write-Host "  [+] $Msg" -ForegroundColor Green }
function Write-Warn    { param([string]$Msg) Write-Host "  [!] $Msg" -ForegroundColor Yellow }
function Write-Err     { param([string]$Msg) Write-Host "  [-] $Msg" -ForegroundColor Red }
function Write-Step    { param([string]$Step, [string]$Msg) Write-Host "  [$Step] $Msg" -ForegroundColor Magenta }
function Write-Divider { Write-Host ("─" * 72) -ForegroundColor DarkGray }

# ═══════════════════════════════════════════════════════════════════════════════
#  BANNER
# ═══════════════════════════════════════════════════════════════════════════════

function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║           WSH  —  WeaveNote Self-Hosted  Installer          ║" -ForegroundColor White
    Write-Host "  ╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "  ║  Version  : $($Script:WSH_VERSION.PadRight(43))║" -ForegroundColor DarkGray
    Write-Host "  ║  GitHub   : github.com/141stfighterwing-collab/WSH          ║" -ForegroundColor DarkGray
    Write-Host "  ║  Stack    : Next.js 16 · Bun · Prisma · Docker             ║" -ForegroundColor DarkGray
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PARAMETER PARSING
# ═══════════════════════════════════════════════════════════════════════════════

function Resolve-Parameters {
    param([string[]]$Args)

    for ($i = 0; $i -lt $Args.Count; $i++) {
        switch ($Args[$i].ToLower()) {
            { $_ -in "--silent", "-y" }    { $Script:Silent       = $true }
            { $_ -in "--skip-clone" }       { $Script:SkipClone    = $true }
            { $_ -in "--skip-deps" }        { $Script:SkipDeps     = $true }
            { $_ -in "--skip-migrate" }     { $Script:SkipMigrate  = $true }
            { $_ -in "--skip-build" }       { $Script:SkipBuild    = $true }
            { $_ -in "--dev" }              { $Script:RunMode      = "dev" }
            { $_ -in "--prod" }             { $Script:RunMode      = "prod" }
            { $_ -in "--docker" }           { $Script:RunMode      = "docker" }
            { $_ -in "--branch", "-b" }     {
                if ($i + 1 -lt $Args.Count) { $Script:Branch = $Args[++$i] }
                else { Write-Err "--branch requires a value"; exit 1 }
            }
            { $_ -in "--dir", "-d" }        {
                if ($i + 1 -lt $Args.Count) { $Script:InstallDir = $Args[++$i] }
                else { Write-Err "--dir requires a value"; exit 1 }
            }
            { $_ -in "--help", "-h" }       { Show-Help; exit 0 }
            default { Write-Warn "Unknown parameter: $($Args[$i])" }
        }
    }
}

function Show-Help {
    Show-Banner
    Write-Host "  USAGE" -ForegroundColor Yellow
    Write-Host "    ./install-wsh.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "  OPTIONS" -ForegroundColor Yellow
    Write-Host "    -y, --silent         Run without interactive prompts (use defaults)"
    Write-Host "    --skip-clone         Skip git clone (use existing source)"
    Write-Host "    --skip-deps          Skip dependency installation"
    Write-Host "    --skip-migrate       Skip database migrations"
    Write-Host "    --skip-build         Skip production build"
    Write-Host "    --dev                Start in development mode after install"
    Write-Host "    --prod               Start in production mode after install"
    Write-Host "    --docker             Start via Docker Compose after install"
    Write-Host "    -b, --branch <name>  Clone a specific branch (default: main)"
    Write-Host "    -d, --dir <path>     Installation directory"
    Write-Host "    -h, --help           Show this help message"
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PREREQUISITE CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

function Test-CommandAvailable {
    param(
        [string]$Name,
        [string]$MinVersion = "",
        [scriptblock]$VersionCommand
    )
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) { return $false, "" }

    if ($MinVersion -and $VersionCommand) {
        $raw = & $VersionCommand 2>&1 | Out-String
        $ver = $raw -replace '[^\d.]', '' -replace '^(\d+\.\d+).*', '$1'
        return $true, $ver
    }
    return $true, ""
}

function Assert-Prerequisites {
    Write-Step "1/8" "Checking prerequisites..."
    Write-Divider

    # --- Node.js ---
    $hasNode, $nodeVer = Test-CommandAvailable "node" "20.0.0" { node --version }
    if (-not $hasNode) {
        Write-Err "Node.js is NOT installed."
        Write-Info "Install it from https://nodejs.org (v20 LTS or later)."
        if (-not $Script:Silent) {
            $answer = Read-Host "  Continue anyway? (y/N)"
            if ($answer -notin "y", "yes") { exit 1 }
        } else { exit 1 }
    } else {
        $major = [int]($nodeVer -split '\.')[0]
        if ($major -lt 20) {
            Write-Warn "Node.js v$nodeVer detected — v20+ is recommended."
        } else {
            Write-Ok "Node.js v$nodeVer"
        }
    }

    # --- Git ---
    $hasGit, $gitVer = Test-CommandAvailable "git" "" { git --version }
    if (-not $hasGit) {
        Write-Err "Git is NOT installed."
        Write-Info "Install it from https://git-scm.com."
        if (-not $Script:Silent) {
            $answer = Read-Host "  Continue anyway? (y/N)"
            if ($answer -notin "y", "yes") { exit 1 }
        } else { exit 1 }
    } else {
        Write-Ok "Git $($gitVer.Trim())"
    }

    # --- Bun ---
    $hasBun, $bunVer = Test-CommandAvailable "bun" "" { bun --version }
    if (-not $hasBun) {
        Write-Warn "Bun is NOT installed. Attempting to install via official script..."
        try {
            Invoke-RestMethod -Uri https://bun.sh/install | Invoke-Expression
            $hasBun = (Get-Command bun -ErrorAction SilentlyContinue) -ne $null
            if ($hasBun) { Write-Ok "Bun installed successfully." }
        } catch {
            Write-Warn "Auto-install failed. Falling back to npm."
        }
    }
    if ($hasBun) {
        Write-Ok "Bun $($bunVer.Trim())"
    } else {
        Write-Warn "Bun not available — will attempt npm as fallback."
    }

    # --- Docker (optional) ---
    $hasDocker, $dockerVer = Test-CommandAvailable "docker" "" { docker --version }
    $hasCompose = (Get-Command "docker-compose" -ErrorAction SilentlyContinue) -ne $null
    if ($hasDocker) {
        Write-Ok "Docker $($dockerVer.Trim())"
        if ($hasCompose) { Write-Ok "Docker Compose available" }
        else { Write-Info "Docker Compose (plugin) detected" }
    } else {
        Write-Info "Docker not found — Docker mode will be unavailable."
    }

    # --- PowerShell version ---
    $psVer = $PSVersionTable.PSVersion.ToString()
    Write-Ok "PowerShell $psVer"

    Write-Divider
    Write-Ok "Prerequisite check complete.`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  CLONE REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-CloneRepo {
    if ($Script:SkipClone) {
        Write-Step "2/8" "Skipping clone (--skip-clone).`n"
        return
    }

    Write-Step "2/8" "Cloning WSH repository..."
    Write-Divider

    # Determine install directory
    if (-not $Script:InstallDir) {
        if ($Script:Silent) {
            $Script:InstallDir = Join-Path $PWD "WSH"
        } else {
            $Script:InstallDir = Read-Host "  Install directory (default: .\WSH)"
            if ([string]::IsNullOrWhiteSpace($Script:InstallDir)) {
                $Script:InstallDir = Join-Path $PWD "WSH"
            }
        }
    }

    if (Test-Path $Script:InstallDir) {
        Write-Warn "Directory already exists: $Script:InstallDir"
        if (-not $Script:Silent) {
            $answer = Read-Host "  Overwrite? (y/N)"
            if ($answer -notin "y", "yes") {
                Write-Info "Using existing directory."
            } else {
                Remove-Item -Recurse -Force $Script:InstallDir
                Write-Ok "Removed old directory."
            }
        }
    }

    try {
        Write-Info "Cloning branch '$($Script:Branch)' into $Script:InstallDir ..."
        & git clone --branch $Script:Branch --depth 1 $Script:REPO_URL $Script:InstallDir 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "git clone exited with code $LASTEXITCODE" }
        Write-Ok "Repository cloned successfully."
    } catch {
        Write-Err "Failed to clone repository: $_"
        Write-Info "Trying without --depth 1 ..."
        try {
            & git clone --branch $Script:Branch $Script:REPO_URL $Script:InstallDir 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "git clone exited with code $LASTEXITCODE" }
            Write-Ok "Repository cloned successfully (full history)."
        } catch {
            Write-Err "Clone failed again: $_"
            if (-not $Script:Silent) {
                $answer = Read-Host "  Continue anyway? (y/N)"
                if ($answer -notin "y", "yes") { exit 1 }
            } else { exit 1 }
        }
    }

    Write-Divider
    Write-Ok "Repository ready at $Script:InstallDir`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  INSTALL DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-InstallDeps {
    if ($Script:SkipDeps) {
        Write-Step "3/8" "Skipping dependency install (--skip-deps).`n"
        return
    }

    Write-Step "3/8" "Installing dependencies..."
    Write-Divider

    $pkgCmd = $null
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        $pkgCmd = "bun"
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        $pkgCmd = "npm"
    } else {
        Write-Err "No package manager found (bun or npm)."
        exit 1
    }

    Write-Info "Using '$pkgCmd' as package manager."

    Push-Location $Script:InstallDir
    try {
        switch ($pkgCmd) {
            "bun"  {
                & bun install 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
                if ($LASTEXITCODE -ne 0) { throw "bun install failed (exit $LASTEXITCODE)" }
            }
            "npm"  {
                & npm install 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
                if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }
            }
        }
        Write-Ok "Dependencies installed successfully."
    } catch {
        Write-Err "Dependency installation failed: $_"
        if (-not $Script:Silent) {
            $answer = Read-Host "  Continue anyway? (y/N)"
            if ($answer -notin "y", "yes") { Pop-Location; exit 1 }
        } else { Pop-Location; exit 1 }
    }
    Pop-Location

    Write-Divider
    Write-Ok "Dependencies ready.`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ENVIRONMENT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ConfigureEnv {
    Write-Step "4/8" "Configuring environment..."
    Write-Divider

    $envExample = Join-Path $Script:InstallDir ".env.example"
    $envFile    = Join-Path $Script:InstallDir ".env"

    if (-not (Test-Path $envExample)) {
        Write-Warn ".env.example not found — creating a minimal .env file."
        @"
# ── WSH Environment ────────────────────────────────────────────────
# Generated by install-wsh.ps1 v$($Script:WSH_VERSION)

# Application
NODE_ENV=production
PORT=$Script:DEFAULT_PORT

# Database (SQLite default — change if using Postgres/MySQL)
DATABASE_URL="file:./db/wsh.db"

# Auth
NEXTAUTH_SECRET="$( -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) )"
NEXTAUTH_URL="http://localhost:$Script:DEFAULT_PORT"

# AI Synthesis (z-ai-web-dev-sdk) — leave empty to disable
Z_AI_API_KEY=""
Z_AI_BASE_URL=""

# ────────────────────────────────────────────────────────────────────
"@ | Set-Content -Path $envFile -Encoding UTF8
        Write-Ok "Created .env with generated secrets."
    } else {
        Copy-Item -Path $envExample -Destination $envFile -Force
        Write-Ok "Copied .env.example -> .env"
    }

    if (-not $Script:Silent) {
        Write-Host ""
        Write-Info "Review and edit your .env file before continuing:"
        Write-Info "  Path: $envFile"
        Write-Host ""
        Write-Info "Key settings to configure:"
        Write-Info "  - PORT              (default: 3000)"
        Write-Info "  - DATABASE_URL      (SQLite, Postgres, or MySQL)"
        Write-Info "  - NEXTAUTH_SECRET   (auto-generated if blank)"
        Write-Info "  - NEXTAUTH_URL      (your public URL)"
        Write-Info "  - Z_AI_API_KEY      (for AI Synthesis features)"
        Write-Host ""

        $openFile = $false
        if ($IsWindows -or ($env:OS -eq "Windows_NT")) {
            $answer = Read-Host "  Open .env in notepad? (Y/n)"
            if ($answer -notin "n", "no") {
                & notepad.exe $envFile
                $openFile = $true
            }
        } elseif ($IsMacOS) {
            $answer = Read-Host "  Open .env in default editor? (Y/n)"
            if ($answer -notin "n", "no") {
                & open -t $envFile
                $openFile = $true
            }
        } else {
            $editors = @("code", "nano", "vim", "vi")
            foreach ($ed in $editors) {
                if (Get-Command $ed -ErrorAction SilentlyContinue) {
                    $answer = Read-Host "  Open .env in $ed? (Y/n)"
                    if ($answer -notin "n", "no") {
                        & $ed $envFile
                        $openFile = $true
                    }
                    break
                }
            }
        }

        if (-not $openFile) {
            Write-Info "You can edit the file later: $envFile"
        }
        Write-Host ""
        $answer = Read-Host "  Proceed with installation? (Y/n)"
        if ($answer -in "n", "no") {
            Write-Warn "Aborted by user."
            exit 0
        }
    }

    Write-Divider
    Write-Ok "Environment configured.`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  DATABASE MIGRATION
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-DatabaseMigration {
    if ($Script:SkipMigrate) {
        Write-Step "5/8" "Skipping database migration (--skip-migrate).`n"
        return
    }

    Write-Step "5/8" "Running database migrations..."
    Write-Divider

    Push-Location $Script:InstallDir
    try {
        # Ensure Prisma client is generated
        if (Get-Command bun -ErrorAction SilentlyContinue) {
            Write-Info "Generating Prisma client..."
            & bunx prisma generate 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

            Write-Info "Pushing schema to database..."
            & bunx prisma db push 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
            if ($LASTEXITCODE -ne 0) { throw "prisma db push failed (exit $LASTEXITCODE)" }
        } elseif (Get-Command npx -ErrorAction SilentlyContinue) {
            Write-Info "Generating Prisma client..."
            & npx prisma generate 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

            Write-Info "Pushing schema to database..."
            & npx prisma db push 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
            if ($LASTEXITCODE -ne 0) { throw "prisma db push failed (exit $LASTEXITCODE)" }
        } else {
            Write-Warn "Neither bun nor npx available — skipping migration."
            Write-Info "Run 'bunx prisma db push' manually after setup."
            Pop-Location
            return
        }

        Write-Ok "Database migrations applied successfully."
    } catch {
        Write-Err "Database migration failed: $_"
        Write-Info "You can run migrations manually later:"
        Write-Info "  cd $($Script:InstallDir)"
        Write-Info "  bunx prisma db push"
        if (-not $Script:Silent) {
            $answer = Read-Host "  Continue anyway? (y/N)"
            if ($answer -notin "y", "yes") { Pop-Location; exit 1 }
        }
    }
    Pop-Location

    Write-Divider
    Write-Ok "Database ready.`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  BUILD PRODUCTION APP
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-BuildProduction {
    if ($Script:SkipBuild) {
        Write-Step "6/8" "Skipping build (--skip-build).`n"
        return
    }

    Write-Step "6/8" "Building production application..."
    Write-Divider

    Push-Location $Script:InstallDir
    try {
        if (Get-Command bun -ErrorAction SilentlyContinue) {
            Write-Info "Running 'bun run build'..."
            & bun run build 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
            if ($LASTEXITCODE -ne 0) { throw "build failed (exit $LASTEXITCODE)" }
        } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            Write-Info "Running 'npm run build'..."
            & npm run build 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
            if ($LASTEXITCODE -ne 0) { throw "build failed (exit $LASTEXITCODE)" }
        } else {
            Write-Err "No package manager available for build."
            Pop-Location
            return
        }

        Write-Ok "Production build completed successfully."
    } catch {
        Write-Err "Build failed: $_"
        Write-Info "You can rebuild manually later:"
        Write-Info "  cd $($Script:InstallDir)"
        Write-Info "  bun run build"
        if (-not $Script:Silent) {
            $answer = Read-Host "  Continue anyway? (y/N)"
            if ($answer -notin "y", "yes") { Pop-Location; exit 1 }
        }
    }
    Pop-Location

    Write-Divider
    Write-Ok "Build artifacts ready.`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-HealthCheck {
    param(
        [int]$Port = $Script:DEFAULT_PORT,
        [int]$Retries = 15,
        [int]$DelayMs = 2000
    )

    Write-Step "HEALTH" "Checking WSH service health..."
    Write-Divider

    $url = $Script:HEALTH_ENDPOINT -f $Port

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $body = $response.Content
                Write-Ok "Service is healthy! (HTTP 200)"
                Write-Info "Response: $($body.Substring(0, [Math]::Min(200, $body.Length)))"
                return $true
            }
        } catch {
            $status = $_.Exception.Message
            if ($status -match "404") {
                Write-Warn "Health endpoint returned 404 — the app is running but /api/health may not exist yet."
                return $true
            }
            Write-Host "    Attempt $i/$Retries — $status" -ForegroundColor DarkGray
        }
        Start-Sleep -Milliseconds $DelayMs
    }

    Write-Warn "Health check did not pass after $Retries attempts."
    Write-Info "The service may still be starting. Check manually at: $url"
    return $false
}

# ═══════════════════════════════════════════════════════════════════════════════
#  LAUNCH OPTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-LaunchMode {
    Write-Step "7/8" "Selecting run mode..."
    Write-Divider

    $mode = $Script:RunMode

    if ($mode -eq "none") {
        if ($Script:Silent) {
            Write-Info "Silent mode — not launching. Use --dev, --prod, or --docker."
            Write-Divider
            Write-Ok "Installation complete.`n"
            return
        }

        Write-Host ""
        Write-Host "  How would you like to run WSH?" -ForegroundColor Yellow
        Write-Host "    [1] Development mode  (bun run dev)"
        Write-Host "    [2] Production mode    (bun run start)"
        Write-Host "    [3] Docker Compose     (docker compose up)"
        Write-Host "    [4] Don't launch now"
        Write-Host ""

        $choice = Read-Host "  Select (1-4)"
        switch ($choice) {
            "1" { $mode = "dev" }
            "2" { $mode = "prod" }
            "3" { $mode = "docker" }
            default { $mode = "none" }
        }
    }

    Push-Location $Script:InstallDir

    switch ($mode) {
        "dev" {
            Write-Ok "Starting WSH in DEVELOPMENT mode..."
            Write-Info "Press Ctrl+C to stop."
            Write-Divider
            if (Get-Command bun -ErrorAction SilentlyContinue) {
                & bun run dev
            } else {
                & npm run dev
            }
        }
        "prod" {
            Write-Ok "Starting WSH in PRODUCTION mode..."
            Write-Info "Press Ctrl+C to stop."
            Write-Divider
            if (Get-Command bun -ErrorAction SilentlyContinue) {
                & bun run start
            } else {
                & npm run start
            }
        }
        "docker" {
            $hasDocker = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null
            if (-not $hasDocker) {
                Write-Err "Docker is not installed. Cannot start in Docker mode."
                Write-Info "Install Docker: https://docs.docker.com/get-docker/"
                break
            }

            $composeFile = Join-Path $Script:InstallDir "docker-compose.yml"
            if (-not (Test-Path $composeFile)) {
                Write-Err "docker-compose.yml not found."
                break
            }

            Write-Ok "Starting WSH via Docker Compose..."
            Write-Info "Press Ctrl+C to stop."
            Write-Divider
            Push-Location $Script:InstallDir
            & docker compose up --build 2>&1 | ForEach-Object { Write-Host "  $_" }
        }
        "none" {
            Write-Info "Not launching. You can start WSH manually:"
            Write-Host ""
            Write-Host "    cd $($Script:InstallDir)" -ForegroundColor White
            Write-Host "    bun run dev        # development" -ForegroundColor White
            Write-Host "    bun run start      # production" -ForegroundColor White
            Write-Host "    docker compose up  # Docker" -ForegroundColor White
            Write-Host ""
        }
    }

    Pop-Location
}

# ═══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

function Show-Summary {
    Write-Step "8/8" "Installation summary"
    Write-Divider

    $port = $Script:DEFAULT_PORT
    $envFile = Join-Path $Script:InstallDir ".env"
    if (Test-Path $envFile) {
        $portMatch = Get-Content $envFile | Select-String "^PORT\s*=\s*(\d+)"
        if ($portMatch) { $port = [int]$portMatch.Matches[0].Groups[1].Value }
    }

    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║                WSH Installation Complete!                    ║" -ForegroundColor Green
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Project      : WeaveNote Self-Hosted (WSH) v$($Script:WSH_VERSION)" -ForegroundColor White
    Write-Host "  Directory    : $($Script:InstallDir)" -ForegroundColor White
    Write-Host "  Config File  : $envFile" -ForegroundColor White
    Write-Host ""
    Write-Host "  Access URLs:" -ForegroundColor Yellow
    Write-Host "    App      : http://localhost:$port" -ForegroundColor Cyan
    Write-Host "    Health   : http://localhost:$port/api/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Features Included:" -ForegroundColor Yellow
    Write-Host "    [+] 15 Color Themes          [+] Mind Map" -ForegroundColor DarkGray
    Write-Host "    [+] Notebook View             [+] Trash & Recovery" -ForegroundColor DarkGray
    Write-Host "    [+] DB Viewer                 [+] Admin Panel" -ForegroundColor DarkGray
    Write-Host "    [+] AI Synthesis (z-ai-sdk)   [+] Calendar & Analytics" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Quick Commands:" -ForegroundColor Yellow
    Write-Host "    bun run dev          Start development server" -ForegroundColor White
    Write-Host "    bun run build        Build for production" -ForegroundColor White
    Write-Host "    bun run start        Start production server" -ForegroundColor White
    Write-Host "    bunx prisma db push  Apply database migrations" -ForegroundColor White
    Write-Host "    bunx prisma studio   Open database browser" -ForegroundColor White
    Write-Host "    docker compose up    Start via Docker" -ForegroundColor White
    Write-Host ""

    Write-Host "  Next Steps:" -ForegroundColor Yellow
    Write-Host "    1. Review and customize .env for your environment" -ForegroundColor White
    Write-Host "    2. Configure authentication (NEXTAUTH_*)" -ForegroundColor White
    Write-Host "    3. Set Z_AI_API_KEY for AI Synthesis features" -ForegroundColor White
    Write-Host "    4. Place a reverse proxy (Caddy/Nginx) in front for HTTPS" -ForegroundColor White
    Write-Host "    5. Set up backups for your database" -ForegroundColor White
    Write-Host ""

    # Run health check if we know the app might be running
    if ($Script:RunMode -in @("dev", "prod")) {
        Write-Divider
        Start-Sleep -Seconds 3
        Invoke-HealthCheck -Port $port
    }

    Write-Divider
    Write-Ok "Happy note-taking with WSH!`n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

function Main {
    # Parse CLI parameters
    Resolve-Parameters $args

    Show-Banner

    # If no install dir set and we're in the project already, use current dir
    if ([string]::IsNullOrWhiteSpace($Script:InstallDir)) {
        $Script:InstallDir = $PWD.Path
    }

    try {
        Assert-Prerequisites
        Invoke-CloneRepo
        Invoke-InstallDeps
        Invoke-ConfigureEnv
        Invoke-DatabaseMigration
        Invoke-BuildProduction
        Invoke-LaunchMode
        Show-Summary
    } catch {
        Write-Err "Unhandled error: $_"
        Write-Err "Stack: $($_.ScriptStackTrace)"
        exit 1
    }
}

# ── Entry Point ───────────────────────────────────────────────────────────────
Main @args
