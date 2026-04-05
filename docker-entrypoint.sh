#!/bin/sh
# WSH Docker Entrypoint - Handles first-run database initialization and server startup
# v3.4.4: Uses direct node path to prisma CLI (no npx, no symlinks, no PATH issues)
# This avoids: Docker COPY not preserving symlinks, npx downloading wrong version,
# and prisma not being in $PATH.

set -e

DB_DIR="/app/db"
DB_FILE="$DB_DIR/custom.db"
PRISMA_CLI="node /app/node_modules/prisma/build/index.js"
SCHEMA_FLAG="--schema=./prisma/schema.prisma"

# Verify prisma CLI exists before anything else
if [ ! -f "/app/node_modules/prisma/build/index.js" ]; then
  echo "[ERROR] Prisma CLI not found at /app/node_modules/prisma/build/index.js"
  echo "[ERROR] Container image may be corrupted. Rebuild with: docker compose build --no-cache"
  exit 1
fi

echo "======================================================="
echo "  WSH (WeaveNote Self-Hosted) v3.4.4 - Starting up..."
echo "======================================================="
$PRISMA_CLI --version 2>&1 | head -1 | sed 's/^/[+] /'

# Ensure database directory exists
if [ ! -d "$DB_DIR" ]; then
  echo "[*] Creating database directory: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

# Initialize database on first run
if [ ! -f "$DB_FILE" ]; then
  echo "[*] First run detected - initializing database..."
  $PRISMA_CLI db push $SCHEMA_FLAG 2>&1 || {
    echo "[!] prisma db push failed, retrying with generate first..."
    $PRISMA_CLI generate $SCHEMA_FLAG 2>&1
    $PRISMA_CLI db push $SCHEMA_FLAG 2>&1
  }
  echo "[+] Database initialized successfully."
else
  echo "[+] Existing database found, skipping initialization."
fi

# Ensure Prisma client is generated
echo "[*] Verifying Prisma client..."
$PRISMA_CLI generate $SCHEMA_FLAG 2>&1

echo "[*] Starting WSH server on port ${PORT:-3000}..."
exec "$@"
