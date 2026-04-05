FROM node:20-alpine AS base

# CACHE-BUST: Build version arg forces rebuild when version changes
ARG BUILD_VERSION=3.5.2

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# Stage 2: Build application
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client BEFORE building Next.js (required for @prisma/client)
RUN npx prisma generate
RUN npx prisma db push --skip-generate 2>/dev/null || true

# Build Next.js (standalone output)
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
RUN apk add --no-cache openssl wget netcat-openbsd

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema, CLI, generated client, and runtime
# CRITICAL: Must copy node_modules/prisma (the CLI package) to avoid npx
# downloading Prisma 7.x from npm which has breaking changes (removed url from schema)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# FIX: Copy transitive dependencies required by Prisma's @prisma/config → effect chain
# Without these, 'prisma db push' crashes with MODULE_NOT_FOUND at runtime:
#   @prisma/config → effect → fast-check → pure-rand
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/effect ./node_modules/effect
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pure-rand ./node_modules/pure-rand

# Create node_modules/.bin/prisma symlink as fallback
# Docker COPY does not preserve symlinks, so we recreate it manually
RUN mkdir -p /app/node_modules/.bin && \
    ln -sf ../prisma/build/index.js /app/node_modules/.bin/prisma && \
    chown -h nextjs:nodejs /app/node_modules/.bin/prisma

# Create a 'prisma' wrapper script in /usr/local/bin as NUCLEAR fallback
# This ensures 'prisma' command works even if all else fails
RUN echo '#!/bin/sh' > /usr/local/bin/prisma && \
    echo 'exec node /app/node_modules/prisma/build/index.js "$@"' >> /usr/local/bin/prisma && \
    chmod +x /usr/local/bin/prisma

# Copy entrypoint script (with LF line endings enforced)
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy public assets (logo, robots.txt)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json (used for version info)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create tmp and db directories for runtime use
RUN mkdir -p /app/tmp /app/db && chown -R nextjs:nodejs /app/tmp /app/db

# Cache-bust stamp: embedding version so layers invalidate on version change
RUN echo "BUILD_VERSION=${BUILD_VERSION}" > /app/.build-version

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# DATABASE_URL is set via docker-compose.yml environment — do NOT hardcode here

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
