FROM node:20-alpine AS base

# CACHE-BUST: Build version arg forces rebuild when version changes
ARG BUILD_VERSION=3.8.0

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

# Prune devDependencies to reduce image size — keep only production deps
# This removes eslint, typescript, playwright (~200MB+ of Chromium), etc.
RUN npm prune --production

# Stage 3: Production runner
FROM base AS runner
RUN apk add --no-cache openssl wget bind-tools

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy ENTIRE node_modules from builder (production-only after npm prune)
# This is the NUCLEAR fix for Prisma transitive dependency hell.
# Previous approach: cherry-picked individual packages (prisma, @prisma, effect,
# fast-check, pure-rand) but kept hitting new missing deps (empathic, etc.).
# The @prisma/config package has a deep, unstable transitive dependency tree
# that changes between minor versions. Copying ALL production node_modules
# eliminates this class of bugs permanently.
# Trade-off: ~100-200MB larger image vs. zero MODULE_NOT_FOUND crashes.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema for runtime use
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Create node_modules/.bin/prisma symlink (Docker COPY doesn't preserve symlinks)
RUN mkdir -p /app/node_modules/.bin && \
    ln -sf ../prisma/build/index.js /app/node_modules/.bin/prisma && \
    chown -h nextjs:nodejs /app/node_modules/.bin/prisma

# Create a 'prisma' wrapper script in /usr/local/bin as NUCLEAR fallback
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
