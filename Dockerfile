# WSH - Weavenote Self Hosted with PowerShell Executor
# Optimized Dockerfile - Version 2.5.1
# Build time: ~2-3 minutes (optimized from ~8 minutes)

# ============================================================================
# Stage 1: Base with Node.js + PowerShell
# ============================================================================
FROM mcr.microsoft.com/powershell:lts-ubuntu-22.04 AS base

LABEL maintainer="WSH - Weavenote Self Hosted"
LABEL description="Self-hosted notes with PostgreSQL and robust PowerShell execution"
LABEL version="3.0.0"

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20.x and dependencies in single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg git postgresql-client \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

ENV POWERSHELL_EXECUTOR_VERSION="3.0.0" \
    LOG_LEVEL="INFO" \
    MAX_RETRIES="3" \
    RETRY_DELAY_SECONDS="5" \
    STRICT_MODE="true" \
    ERROR_ACTION="Stop" \
    TZ="UTC" \
    NODE_ENV="production"

RUN mkdir -p /scripts /logs /config /output /modules /app /data /public /schema

# ============================================================================
# Stage 2: Dependencies (cached separately)
# ============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies with cache mount for speed
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev 2>&1 || npm install 2>&1

RUN npx prisma generate

# ============================================================================
# Stage 3: Builder
# ============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy PowerShell modules in one step
RUN cp -r pwsh/modules/ /modules/ 2>/dev/null || true
RUN cp -r pwsh/app/ /app/pwsh/ 2>/dev/null || true

# Generate Prisma and build
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV="production"

RUN mkdir -p public && touch public/.gitkeep

# Build Next.js
RUN npm run build

# Verify build
RUN ls -la .next/standalone/ && ls -la .next/static/

# ============================================================================
# Stage 4: Runner (Production) - OPTIMIZED
# ============================================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV="production" \
    NEXT_TELEMETRY_DISABLED=1 \
    POWERSHELL_EXECUTOR_VERSION="3.0.0" \
    HOST=0.0.0.0 \
    PORT=3000

# Create user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install Prisma CLI globally
RUN npm install -g prisma@latest

# Copy Next.js standalone in single layer
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma (needed for db push on startup)
COPY --from=builder /app/prisma ./prisma

# Copy Prisma client libraries in one step
RUN mkdir -p ./node_modules/.prisma ./node_modules/@prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Pre-install pg and bcryptjs during build (not at runtime)
RUN npm install pg bcryptjs --no-save 2>&1

# Copy all scripts in one layer
COPY --from=builder /modules/ /modules/
COPY --from=builder /app/pwsh/ /app/pwsh/
COPY scripts/start.ps1 /app/start.ps1
COPY scripts/healthcheck.ps1 /app/healthcheck.ps1
COPY scripts/db-diagnostic.ps1 /scripts/db-diagnostic.ps1
COPY scripts/db-inject-schema.ps1 /scripts/db-inject-schema.ps1
COPY scripts/db-fix-tool.ps1 /scripts/db-fix-tool.ps1
COPY scripts/user-management.ps1 /scripts/user-management.ps1
COPY scripts/update-users.ps1 /scripts/update-users.ps1
COPY scripts/db-viewer.js /app/db-viewer.js
COPY scripts/inject-schema.js /app/inject-schema.js
COPY schema/tables.json /schema/tables.json

# Single chmod/chown layer - much faster
RUN chmod -R 755 /app /scripts /logs /output /config /data /schema /modules 2>/dev/null; \
    chmod +x /app/start.ps1 /app/healthcheck.ps1 /app/db-viewer.js /app/inject-schema.js; \
    chown -R nextjs:nodejs /app /logs /output /config /scripts /data /schema /modules

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
    CMD pwsh -NoProfile -Command "& /app/healthcheck.ps1" || exit 1

EXPOSE 3000 5682 8080

USER nextjs

ENTRYPOINT ["pwsh", "-NoLogo", "-NoProfile", "-File", "/app/start.ps1"]
CMD ["app"]
