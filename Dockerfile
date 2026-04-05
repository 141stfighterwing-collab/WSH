FROM node:20-alpine AS base

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
RUN apk add --no-cache openssl wget

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

# Create node_modules/.bin/prisma symlink as fallback
# Docker COPY does not preserve symlinks, so we recreate it manually
RUN mkdir -p /app/node_modules/.bin && \
    ln -sf ../prisma/build/index.js /app/node_modules/.bin/prisma && \
    chown -h nextjs:nodejs /app/node_modules/.bin/prisma

# Copy entrypoint script (with LF line endings enforced)
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy public assets (logo, robots.txt)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json (used for version info)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create database directory (owned by nextjs user)
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/db/custom.db"

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
