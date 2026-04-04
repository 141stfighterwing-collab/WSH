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

# Copy Prisma schema and CLI (needed for runtime db init in entrypoint)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script (with LF line endings enforced)
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy public assets (logo, robots.txt)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json so npx can resolve prisma CLI
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
