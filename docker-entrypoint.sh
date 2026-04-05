#!/bin/sh
# WSH Docker Entrypoint - Handles first-run database initialization and server startup

set -e

DB_DIR="/app/db"
DB_FILE="$DB_DIR/custom.db"

echo "======================================================="
echo "  WSH (WeaveNote Self-Hosted) - Starting up..."
echo "======================================================="

# Ensure database directory exists
if [ ! -d "$DB_DIR" ]; then
  echo "[*] Creating database directory: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

# Initialize database on first run
if [ ! -f "$DB_FILE" ]; then
  echo "[*] First run detected - initializing database..."
  npx prisma db push 2>&1 || {
    echo "[!] prisma db push failed, retrying with generate..."
    npx prisma generate 2>&1
    npx prisma db push 2>&1
  }
  echo "[+] Database initialized successfully."
else
  echo "[+] Existing database found, skipping initialization."
fi

# Ensure Prisma client is generated
echo "[*] Verifying Prisma client..."
npx prisma generate 2>&1

echo "[*] Starting WSH server on port ${PORT:-3000}..."
exec "$@"
