# ── WSH Dockerfile v4.2.1 ────────────────────────────────────────
# Multi-stage build with progress output. Update with: ./update.sh
#
# Stage 1 (deps):   npm install (cached unless package.json changes)
# Stage 2 (build):  prisma generate → next build → standalone output
# Stage 3 (runner): Lean production image with standalone server

FROM node:20-alpine AS deps

ARG BUILD_VERSION=4.3.0

# System deps for building
RUN echo "[1/6] Installing system dependencies..." && \
    apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies (production + dev needed for build)
RUN echo "[2/6] Installing npm packages..." && \
    npm install 2>&1 | tail -5 && \
    echo "[2/6] ✓ npm install complete ($(ls node_modules | wc -l) packages)"

# ── Stage 2: Build ─────────────────────────────────────────────
FROM deps AS builder

# System deps for build
RUN echo "[3/6] Installing build tools..." && \
    apk add --no-cache openssl

WORKDIR /app

# Copy source code
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client
RUN echo "[4/6] Generating Prisma client..." && \
    npx prisma generate 2>&1 && \
    echo "[4/6] ✓ Prisma client generated"

# Build Next.js (standalone output)
RUN echo "[5/6] Building Next.js application..." && \
    npm run build 2>&1 && \
    echo "[5/6] ✓ Next.js build complete"

# ── Stage 3: Production Runner ─────────────────────────────────
FROM node:20-alpine AS runner

ARG BUILD_VERSION=4.3.0
ENV BUILD_VERSION=${BUILD_VERSION}

RUN echo "[6/6] Creating production image (v${BUILD_VERSION})..." && \
    apk add --no-cache openssl wget bind-tools

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install production deps (includes prisma + ALL transitive deps).
# This replaces the old manual per-package COPY block that broke every
# time Prisma added new transitive dependencies (empathic, c12, etc.).
# npm resolves the full dependency tree automatically — future-proof.
COPY --from=deps --chown=nextjs:nodejs /app/package.json /app/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3 && \
    chown -R nextjs:nodejs node_modules && \
    echo "[prisma] ✓ Production deps + Prisma CLI + all transitive deps installed"

# Copy Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Regenerate Prisma client into production node_modules (ensures .prisma/client
# matches the schema version, not a stale copy from the build stage)
RUN npx prisma generate 2>&1 | tail -1 && \
    chown -R nextjs:nodejs node_modules/.prisma && \
    echo "[prisma] ✓ Client regenerated for production"

# Copy standalone Next.js output (must come AFTER npm install so the
# standalone server can find @prisma/client in node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint (LF line endings enforced)
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create runtime directories
RUN mkdir -p /app/tmp /app/db /app/upload && chown -R nextjs:nodejs /app/tmp /app/db /app/upload

# Build version stamp
RUN echo "BUILD_VERSION=${BUILD_VERSION}" > /app/.build-version && \
    echo "✓ Production image ready (v${BUILD_VERSION})"

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
