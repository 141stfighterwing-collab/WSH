FROM node:20-alpine

ARG BUILD_VERSION=3.9.0
ENV BUILD_VERSION=${BUILD_VERSION}

# Install git + system deps needed for building
RUN apk add --no-cache libc6-compat openssl git bind-tools wget rsync

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package.json first for faster Docker layer caching on npm install
COPY package.json package-lock.json* ./

# Pre-install production dependencies (fast layer, cached unless package.json changes)
RUN npm install

# Copy prisma schema for DB init
RUN mkdir -p prisma
COPY prisma ./prisma

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy public assets
COPY public ./public

# Copy .env.example
COPY .env.example ./.env.example 2>/dev/null || true

# Create runtime directories
RUN mkdir -p /app/tmp && chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
