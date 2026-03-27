# WSH - Weavenote Self Hosted with PowerShell Executor
# Unified Dockerfile with Node.js + PowerShell support
# Version: 2.5.1 - Robust build with proper validation

# ============================================================================
# Stage 1: Base with Node.js + PowerShell
# ============================================================================
FROM mcr.microsoft.com/powershell:lts-ubuntu-22.04 AS base

LABEL maintainer="WSH - Weavenote Self Hosted"
LABEL description="Self-hosted notes with PostgreSQL and robust PowerShell execution"
LABEL version="2.5.1"

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
ENV POWERSHELL_EXECUTOR_VERSION="2.5.1" \
    LOG_LEVEL="INFO" \
    MAX_RETRIES="3" \
    RETRY_DELAY_SECONDS="5" \
    STRICT_MODE="true" \
    ERROR_ACTION="Stop" \
    TZ="UTC" \
    NODE_ENV="production"

# Create operational directories
RUN mkdir -p /scripts /logs /config /output /modules /app /data /public /schema

# Install PostgreSQL client tools (for psql)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Stage 2: Dependencies
# ============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./
COPY package-lock.json* ./

# Copy prisma schema if it exists
COPY prisma ./prisma/

# Install all dependencies (including dev for build)
RUN npm install 2>&1 || npm install --legacy-peer-deps 2>&1

# Generate Prisma client if schema exists
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# ============================================================================
# Stage 3: Builder
# ============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Copy PowerShell modules and scripts if they exist
RUN if [ -d pwsh/modules ]; then cp -r pwsh/modules/ /modules/; fi
RUN if [ -d pwsh/app ]; then mkdir -p /app/pwsh && cp -r pwsh/app/ /app/pwsh/; fi

# Set permissions for PowerShell scripts
RUN if [ -d /modules ]; then chmod -R 755 /modules; fi
RUN if [ -d /app/pwsh ]; then chmod -R 755 /app/pwsh; fi

# Generate Prisma Client again for this stage if schema exists
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Build Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV="production"

# Ensure public directory exists for Next.js standalone
RUN mkdir -p public && touch public/.gitkeep

# Build with error handling and verbose output
RUN npm run build 2>&1 || (echo "Build failed, checking..." && ls -la && exit 1)

# Verify build output exists
RUN if [ ! -d .next/standalone ]; then \
    echo "ERROR: .next/standalone directory not found"; \
    ls -la .next/ || echo "No .next directory"; \
    exit 1; \
    fi

RUN if [ ! -d .next/static ]; then \
    echo "ERROR: .next/static directory not found"; \
    ls -la .next/ || echo "No .next directory"; \
    exit 1; \
    fi

# Show build output for verification
RUN echo "Build successful! Contents:" && ls -la .next/standalone/ && ls -la .next/static/

# ============================================================================
# Stage 4: Runner (Production)
# ============================================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV="production" \
    NEXT_TELEMETRY_DISABLED=1 \
    POWERSHELL_EXECUTOR_VERSION="2.5.1"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install Prisma CLI globally for schema migrations
RUN npm install -g prisma@latest

# Copy Next.js standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma for database operations
COPY --from=builder /app/prisma ./prisma

# Copy Prisma client libraries
RUN mkdir -p ./node_modules/.prisma ./node_modules/@prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Install pg module for PostgreSQL connectivity
RUN npm install pg --no-save 2>&1 || true

# Copy PowerShell modules if they exist
RUN if [ -d /modules ]; then cp -r /modules/ /modules/; fi
COPY --from=builder /app/pwsh/ /app/pwsh/ 2>/dev/null || true

# Copy all management scripts from scripts directory
COPY scripts/start.ps1 /app/start.ps1
COPY scripts/healthcheck.ps1 /app/healthcheck.ps1
COPY scripts/db-diagnostic.ps1 /scripts/db-diagnostic.ps1
COPY scripts/db-inject-schema.ps1 /scripts/db-inject-schema.ps1
COPY scripts/db-fix-tool.ps1 /scripts/db-fix-tool.ps1
COPY scripts/user-management.ps1 /scripts/user-management.ps1
COPY scripts/update-users.ps1 /scripts/update-users.ps1
COPY scripts/db-viewer.js /app/db-viewer.js
COPY scripts/inject-schema.js /app/inject-schema.js
COPY schema/tables.json /schema/tables.json 2>/dev/null || echo "{}" > /schema/tables.json

# Set permissions - include /modules directory
RUN chmod -R 755 /app /scripts /logs /output /config /data /schema /modules 2>/dev/null || true && \
    chmod +x /app/start.ps1 /app/healthcheck.ps1 /app/db-viewer.js /app/inject-schema.js 2>/dev/null || true && \
    chown -R nextjs:nodejs /app /logs /output /config /scripts /data /schema /modules 2>/dev/null || true

# Health check configuration - increased start_period for database initialization
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
    CMD pwsh -NoProfile -Command "& /app/healthcheck.ps1" || exit 1

# Expose ports
# 3000 - Next.js application
# 5682 - Database viewer web UI
# 8080 - PowerShell health endpoint (optional)
EXPOSE 3000 5682 8080

# Switch to non-root user
USER nextjs

# Entrypoint
ENTRYPOINT ["pwsh", "-NoLogo", "-NoProfile", "-File", "/app/start.ps1"]

# Default command
CMD ["app"]
