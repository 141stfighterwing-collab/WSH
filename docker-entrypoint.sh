#!/bin/sh
# WSH Docker Entrypoint - Handles first-run database initialization and server startup
# v3.5.2: Uses direct node path to prisma CLI (no npx, no symlinks, no PATH issues).
# PostgreSQL mode: Uses marker file for first-run detection instead of SQLite file check.
# Waits for PostgreSQL to be reachable before running Prisma commands.

set -e

PRISMA_CLI="node /app/node_modules/prisma/build/index.js"
SCHEMA_FLAG="--schema=./prisma/schema.prisma"
MARKER_FILE="/app/tmp/.db-initialized"

# Verify prisma CLI exists before anything else
if [ ! -f "/app/node_modules/prisma/build/index.js" ]; then
  echo "[ERROR] Prisma CLI not found at /app/node_modules/prisma/build/index.js"
  echo "[ERROR] Container image may be corrupted. Rebuild with: docker compose build --no-cache"
  exit 1
fi

# Verify DATABASE_URL is set (required for PostgreSQL)
if [ -z "$DATABASE_URL" ]; then
  echo "[ERROR] DATABASE_URL environment variable is not set."
  echo "[ERROR] When using docker-compose, this is set automatically."
  echo "[ERROR] If running standalone, set: -e DATABASE_URL=postgresql://user:pass@host:5432/db"
  exit 1
fi

echo "======================================================="
echo "  WSH (WeaveNote Self-Hosted) v3.5.2 - Starting up..."
echo "======================================================="
$PRISMA_CLI --version 2>&1 | head -1 | sed 's/^/[+] /'

# Wait for PostgreSQL to be reachable (max 60 seconds)
echo "[*] Waiting for PostgreSQL to be ready..."
RETRIES=0
MAX_RETRIES=30
while [ $RETRIES -lt $MAX_RETRIES ]; do
  # Extract host and port from DATABASE_URL
  # Format: postgresql://user:pass@host:port/db
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*/@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*/@[^:]*:\([0-9]*\)/.*|\1|p')

  if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
      echo "[+] PostgreSQL is reachable at $DB_HOST:$DB_PORT"
      break
    fi
  fi

  RETRIES=$((RETRIES + 1))
  echo "  Attempt $RETRIES/$MAX_RETRIES — PostgreSQL not ready yet..."
  sleep 2
done

if [ $RETRIES -ge $MAX_RETRIES ]; then
  echo "[ERROR] PostgreSQL did not become reachable within 60 seconds."
  echo "[ERROR] Check that the postgres container is running and healthy."
  exit 1
fi

# Initialize database on first run (using marker file, not SQLite file check)
if [ ! -f "$MARKER_FILE" ]; then
  echo "[*] First run detected - initializing database schema..."
  $PRISMA_CLI db push $SCHEMA_FLAG 2>&1 || {
    echo "[!] prisma db push failed, retrying with generate first..."
    $PRISMA_CLI generate $SCHEMA_FLAG 2>&1
    $PRISMA_CLI db push $SCHEMA_FLAG 2>&1
  }
  echo "[+] Database schema pushed successfully."
  # Create marker file to skip init on subsequent starts
  mkdir -p /app/tmp
  touch "$MARKER_FILE"
  echo "[+] First-run marker created. Subsequent starts will skip schema push."
else
  echo "[+] Initialized database detected (marker file exists), skipping schema push."
fi

# Ensure Prisma client is generated (always run — idempotent and fast)
echo "[*] Verifying Prisma client..."
$PRISMA_CLI generate $SCHEMA_FLAG 2>&1

echo "[*] Starting WSH server on port ${PORT:-3000}..."
exec "$@"
