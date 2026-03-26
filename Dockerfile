# WSH - Weavenote Self Hosted with PowerShell Executor
# Unified Dockerfile with Node.js + PowerShell support
# FORCED INSTALLATION - Overwrites any previous setup

# ============================================================================
# Stage 1: PowerShell Executor Base
# ============================================================================
FROM mcr.microsoft.com/powershell:lts-ubuntu-22.04 AS pwsh-base

LABEL maintainer="WSH - Weavenote Self Hosted"
LABEL description="Self-hosted notes with PostgreSQL and robust PowerShell execution"
LABEL version="2.0.0"

# Install Node.js 20.x
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
    && npm install -g bun \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set environment variables
ENV POWERSHELL_EXECUTOR_VERSION="2.0.0" \
    LOG_LEVEL="INFO" \
    MAX_RETRIES="3" \
    RETRY_DELAY_SECONDS="5" \
    STRICT_MODE="true" \
    ERROR_ACTION="Stop" \
    TZ="UTC" \
    NODE_ENV="production"

# Create operational directories
RUN mkdir -p /scripts /logs /config /output /modules /app /data

# ============================================================================
# Stage 2: Dependencies
# ============================================================================
FROM pwsh-base AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm install -g prisma && \
    npx prisma generate

# ============================================================================
# Stage 3: Builder
# ============================================================================
FROM pwsh-base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy PowerShell modules and scripts
COPY pwsh/modules/ /modules/
COPY pwsh/app/ /app/pwsh/
COPY pwsh/scripts/ /scripts/

# Set permissions for PowerShell scripts
RUN chmod -R 755 /modules /app/pwsh /scripts

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================================================
# Stage 4: Runner (Production)
# ============================================================================
FROM pwsh-base AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    POWERSHELL_EXECUTOR_VERSION="2.0.0"

# Create users
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy PowerShell modules and scripts
COPY --from=builder /modules/ /modules/
COPY --from=builder /app/pwsh/ /app/pwsh/
COPY --from=builder /scripts/ /scripts/

# Set permissions
RUN chmod -R 755 /modules /app/pwsh /scripts /logs /output /config

# Create health check script
RUN echo '#!/usr/bin/env pwsh\n\
$health = @{\n\
    status = "healthy"\n\
    timestamp = (Get-Date -Format "o")\n\
    version = $env:POWERSHELL_EXECUTOR_VERSION\n\
    database = "checking"\n\
}\n\
try {\n\
    $null = node -e "require('"'"'./prisma'"'"')"\n\
    $health.database = "connected"\n\
} catch {\n\
    $health.database = "disconnected"\n\
    $health.status = "unhealthy"\n\
}\n\
Write-Output ($health | ConvertTo-Json -Compress)\n\
exit $(if ($health.status -eq "healthy") { 0 } else { 1 })\n\
' > /app/healthcheck.ps1 && chmod +x /app/healthcheck.ps1

# Create startup script that handles both PowerShell and Node.js
RUN echo '#!/usr/bin/env pwsh\n\
param([string]$Mode = "app")\n\
\n\
Set-StrictMode -Version Latest\n\
$ErrorActionPreference = "Stop"\n\
\n\
# Import modules\n\
Import-Module -Name "/modules/LoggingEngine" -Force -ErrorAction SilentlyContinue\n\
Import-Module -Name "/modules/SafeExecutor" -Force -ErrorAction SilentlyContinue\n\
Import-Module -Name "/modules/ConfigManager" -Force -ErrorAction SilentlyContinue\n\
Import-Module -Name "/modules/HealthCheck" -Force -ErrorAction SilentlyContinue\n\
\n\
Write-Host "========================================" -ForegroundColor Cyan\n\
Write-Host "WSH - Weavenote Self Hosted" -ForegroundColor Cyan\n\
Write-Host "PowerShell Executor Enabled" -ForegroundColor Cyan\n\
Write-Host "========================================" -ForegroundColor Cyan\n\
\n\
switch ($Mode) {\n\
    "app" {\n\
        Write-Host "Starting WSH Application..." -ForegroundColor Green\n\
        & node server.js\n\
    }\n\
    "script" {\n\
        $ScriptPath = $env:SCRIPT_PATH\n\
        if (-not $ScriptPath) { throw "SCRIPT_PATH not set" }\n\
        Write-Host "Executing script: $ScriptPath" -ForegroundColor Green\n\
        & pwsh -NoProfile -File $ScriptPath\n\
    }\n\
    "daemon" {\n\
        Write-Host "Starting daemon mode..." -ForegroundColor Green\n\
        Start-HealthServer -Port 8080\n\
        & node server.js\n\
    }\n\
    default {\n\
        & node server.js\n\
    }\n\
}\n\
' > /app/start.ps1 && chmod +x /app/start.ps1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD pwsh -NoProfile -Command "& /app/healthcheck.ps1" || exit 1

# Expose ports
EXPOSE 3000 8080

# Set ownership
RUN chown -R nextjs:nodejs /app /logs /output /config /scripts

USER nextjs

# Entrypoint - Use PowerShell startup
ENTRYPOINT ["pwsh", "-NoLogo", "-NoProfile", "-File", "/app/start.ps1"]

# Default: run the app
CMD ["app"]
