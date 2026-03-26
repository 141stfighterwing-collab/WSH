# WSH - Weavenote Self Hosted with PowerShell Executor
# Unified Dockerfile with Node.js + PowerShell support
# FORCED INSTALLATION - Overwrites any previous setup
# Version: 2.1.0 - Windows Compatible

# ============================================================================
# Stage 1: Base with Node.js + PowerShell
# ============================================================================
FROM mcr.microsoft.com/powershell:lts-ubuntu-22.04 AS base

LABEL maintainer="WSH - Weavenote Self Hosted"
LABEL description="Self-hosted notes with PostgreSQL and robust PowerShell execution"
LABEL version="2.1.0"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20.x and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    git \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set environment variables
ENV POWERSHELL_EXECUTOR_VERSION="2.1.0" \
    LOG_LEVEL="INFO" \
    MAX_RETRIES="3" \
    RETRY_DELAY_SECONDS="5" \
    STRICT_MODE="true" \
    ERROR_ACTION="Stop" \
    TZ="UTC" \
    NODE_ENV="production"

# Create operational directories
RUN mkdir -p /scripts /logs /config /output /modules /app /data /public

# ============================================================================
# Stage 2: Dependencies
# ============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including dev for build)
RUN npm ci --include=dev 2>&1 || npm install 2>&1

# Generate Prisma client
RUN npx prisma generate

# ============================================================================
# Stage 3: Builder
# ============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Copy PowerShell modules and scripts
COPY pwsh/modules/ /modules/
COPY pwsh/app/ /app/pwsh/
COPY pwsh/scripts/ /scripts/

# Set permissions for PowerShell scripts
RUN chmod -R 755 /modules /app/pwsh /scripts

# Generate Prisma Client again for this stage
RUN npx prisma generate

# Build Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Ensure public directory exists for Next.js standalone
RUN mkdir -p public

# Build and verify
RUN npm run build && \
    ls -la .next/standalone/ && \
    ls -la .next/static/

# ============================================================================
# Stage 4: Runner (Production)
# ============================================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    POWERSHELL_EXECUTOR_VERSION="2.1.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma for database operations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy PowerShell modules and scripts
COPY --from=builder /modules/ /modules/
COPY --from=builder /app/pwsh/ /app/pwsh/
COPY --from=builder /scripts/ /scripts/

# Set permissions
RUN chmod -R 755 /modules /app/pwsh /scripts /logs /output /config /data && \
    chown -R nextjs:nodejs /app /logs /output /config /scripts /data

# Create health check script
RUN echo '#!/usr/bin/env pwsh\n\
param()\n\
\n\
$health = @{\n\
    status = "healthy"\n\
    timestamp = (Get-Date -Format "o")\n\
    version = $env:POWERSHELL_EXECUTOR_VERSION\n\
    nodejs = "unknown"\n\
    database = "checking"\n\
}\n\
\n\
try {\n\
    $nodeVersion = node --version 2>$null\n\
    $health.nodejs = $nodeVersion\n\
} catch {\n\
    $health.nodejs = "error"\n\
}\n\
\n\
try {\n\
    $result = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -UseBasicParsing 2>$null\n\
    if ($result.StatusCode -eq 200) {\n\
        $health.database = "connected"\n\
    } else {\n\
        $health.database = "error"\n\
    }\n\
} catch {\n\
    $health.database = "disconnected"\n\
    $health.status = "degraded"\n\
}\n\
\n\
Write-Output ($health | ConvertTo-Json -Compress)\n\
exit $(if ($health.status -eq "healthy") { 0 } else { 1 })\n\
' > /app/healthcheck.ps1 && chmod +x /app/healthcheck.ps1

# Create startup script
RUN echo '#!/usr/bin/env pwsh\n\
param(\n\
    [Parameter(Position=0)]\n\
    [ValidateSet("app", "script", "daemon")]\n\
    [string]$Mode = "app"\n\
)\n\
\n\
Set-StrictMode -Version Latest\n\
$ErrorActionPreference = "Stop"\n\
\n\
# Import PowerShell modules if available\n\
$modules = @("LoggingEngine", "SafeExecutor", "ConfigManager", "HealthCheck")\n\
foreach ($moduleName in $modules) {\n\
    $modulePath = "/modules/$moduleName"\n\
    if (Test-Path $modulePath) {\n\
        try {\n\
            Import-Module -Name $modulePath -Force -ErrorAction SilentlyContinue\n\
            Write-Host "Loaded module: $moduleName" -ForegroundColor Green\n\
        } catch {\n\
            Write-Warning "Could not load module: $moduleName"\n\
        }\n\
    }\n\
}\n\
\n\
Write-Host "========================================" -ForegroundColor Cyan\n\
Write-Host "WSH - Weavenote Self Hosted" -ForegroundColor Cyan\n\
Write-Host "PowerShell Executor v$env:POWERSHELL_EXECUTOR_VERSION" -ForegroundColor Cyan\n\
Write-Host "Mode: $Mode" -ForegroundColor Cyan\n\
Write-Host "========================================" -ForegroundColor Cyan\n\
\n\
# Run database migrations if needed\n\
try {\n\
    Push-Location /app\n\
    npx prisma migrate deploy 2>$null\n\
    Pop-Location\n\
    Write-Host "Database migrations completed" -ForegroundColor Green\n\
} catch {\n\
    Write-Warning "Database migration check: $($_.Exception.Message)"\n\
}\n\
\n\
switch ($Mode) {\n\
    "app" {\n\
        Write-Host "Starting WSH Application..." -ForegroundColor Green\n\
        & node server.js\n\
    }\n\
    "script" {\n\
        $ScriptPath = $env:SCRIPT_PATH\n\
        if (-not $ScriptPath) { \n\
            Write-Error "SCRIPT_PATH environment variable not set"\n\
            exit 1\n\
        }\n\
        Write-Host "Executing script: $ScriptPath" -ForegroundColor Green\n\
        & pwsh -NoProfile -File $ScriptPath\n\
    }\n\
    "daemon" {\n\
        Write-Host "Starting daemon mode with health server..." -ForegroundColor Green\n\
        & node server.js &\n\
        Start-Sleep -Seconds 5\n\
        while ($true) {\n\
            Start-Sleep -Seconds 60\n\
            Write-Host "Health check: $(Get-Date -Format "o")"\n\
        }\n\
    }\n\
}\n\
' > /app/start.ps1 && chmod +x /app/start.ps1

# Health check configuration
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
    CMD pwsh -NoProfile -Command "& /app/healthcheck.ps1" || exit 1

# Expose ports
# 3000 - Next.js application
# 8080 - PowerShell health endpoint (optional)
EXPOSE 3000 8080

# Switch to non-root user
USER nextjs

# Entrypoint
ENTRYPOINT ["pwsh", "-NoLogo", "-NoProfile", "-File", "/app/start.ps1"]

# Default command
CMD ["app"]
