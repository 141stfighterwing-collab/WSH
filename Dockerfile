# ── WSH Dockerfile v3.9.1 ────────────────────────────────────────
# Multi-stage build with progress output. Update with: ./update.sh
#
# Stage 1 (deps):   npm install (cached unless package.json changes)
# Stage 2 (build):  prisma generate → next build → standalone output
# Stage 3 (runner): Lean production image with standalone server

FROM node:20-alpine AS deps

ARG BUILD_VERSION=3.9.1

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

ARG BUILD_VERSION=3.9.1
ENV BUILD_VERSION=${BUILD_VERSION}

RUN echo "[6/6] Creating production image (v${BUILD_VERSION})..." && \
    apk add --no-cache openssl wget bind-tools

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma — schema, CLI, generated client, and ALL runtime dependencies
# Uses nuclear copy of full node_modules (post npm prune --production) to
# permanently eliminate all MODULE_NOT_FOUND crashes from transitive deps
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Transitive deps: @prisma/config → effect → fast-check → pure-rand
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/effect ./node_modules/effect
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pure-rand ./node_modules/pure-rand

# Create prisma CLI wrapper (guaranteed to use pinned v6.x, never downloads from npm)
RUN mkdir -p /app/node_modules/.bin && \
    ln -sf ../prisma/build/index.js /app/node_modules/.bin/prisma && \
    chown -h nextjs:nodejs /app/node_modules/.bin/prisma && \
    echo '#!/bin/sh' > /usr/local/bin/prisma && \
    echo 'exec node /app/node_modules/prisma/build/index.js "$@"' >> /usr/local/bin/prisma && \
    chmod +x /usr/local/bin/prisma

# Copy entrypoint (LF line endings enforced)
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json (used for version info)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create runtime directories
RUN mkdir -p /app/tmp /app/db && chown -R nextjs:nodejs /app/tmp /app/db

# Build version stamp
RUN echo "BUILD_VERSION=${BUILD_VERSION}" > /app/.build-version && \
    echo "✓ Production image ready (v${BUILD_VERSION})"

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
