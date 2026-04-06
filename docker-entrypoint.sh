#!/bin/sh
# WSH Docker Entrypoint - Handles first-run database initialization and server startup
# v3.5.4: Fixed DATABASE_URL parsing sed regex. The v3.5.3 patterns used '/@' to match the
#   separator between credentials and hostname, but standard PostgreSQL URLs use '://' for the
#   protocol and '@' (not '/@') before the hostname. The pattern '.*/@...' never matched any
#   standard postgresql:// URL, causing DB_HOST and DB_PORT to always be empty and triggering
#   immediate exit with "Could not parse DATABASE_URL". Fixed by removing the erroneous '/'
#   from the sed patterns: '.*@\([^:]*\):.*' and '.*@[^:]*:\([0-9]*\)/.*'
# v3.5.3: Replaced netcat (nc -z) with Node.js-based PostgreSQL connectivity check.
#   netcat silently fails when DNS resolution fails inside Docker (especially Docker Desktop
#   on Windows/macOS). The new check uses Node.js dns+net modules for explicit DNS resolution
#   and TCP connection testing, with full diagnostic output on every failure.
# v3.5.2: Uses direct node path to prisma CLI (no npx, no symlinks, no PATH issues).
# PostgreSQL mode: Uses marker file for first-run detection instead of SQLite file check.

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
echo "  WSH (WeaveNote Self-Hosted) v3.5.4 - Starting up..."
echo "======================================================="
$PRISMA_CLI --version 2>&1 | head -1 | sed 's/^/[+] /'

# ── Extract host and port from DATABASE_URL ─────────────────────
# Format: postgresql://user:pass@host:port/db
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "[ERROR] Could not parse DATABASE_URL. Expected format: postgresql://user:pass@host:port/db"
  echo "[ERROR] DATABASE_URL=$DATABASE_URL"
  echo "[ERROR] Extracted: host='$DB_HOST', port='$DB_PORT'"
  exit 1
fi

echo "[*] Waiting for PostgreSQL to be ready at $DB_HOST:$DB_PORT ..."

# ── Wait for PostgreSQL using Node.js (not netcat) ──────────────
# Rationale: netcat (nc -z) silently fails when Docker DNS resolution
# fails (common on Docker Desktop for Windows/macOS). Node.js provides
# explicit DNS and TCP diagnostics so we can identify the exact failure.
RETRIES=0
MAX_RETRIES=30
FIRST_DIAG=""

while [ $RETRIES -lt $MAX_RETRIES ]; do
  # Use Node.js to test DNS resolution + TCP connection
  # Returns: DNS_OK:<ips> | DNS_FAIL:<code> | TCP_OK | TCP_FAIL:<code>
  RESULT=$(node -e "
    const dns = require('dns');
    const net = require('net');
    const host = process.argv[1];
    const port = parseInt(process.argv[2], 10);
    const timeout = 5000;

    dns.resolve4(host, (err, addresses) => {
      if (err) {
        console.log('DNS_FAIL:' + err.code + ':' + err.message);
        process.exit(0);
      }
      console.log('DNS_OK:' + addresses.join(','));
      const s = net.createConnection(port, host, () => {
        console.log('TCP_OK');
        s.destroy();
        process.exit(0);
      });
      s.on('error', (e) => {
        console.log('TCP_FAIL:' + e.code + ':' + e.message);
        process.exit(0);
      });
      setTimeout(() => {
        console.log('TCP_FAIL:TIMEOUT:connection timed out after ' + timeout + 'ms');
        process.exit(0);
      }, timeout);
    });
  " "$DB_HOST" "$DB_PORT" 2>&1)

  if echo "$RESULT" | grep -q "TCP_OK"; then
    DNS_IPS=$(echo "$RESULT" | grep "DNS_OK" | sed 's/DNS_OK://')
    echo "[+] PostgreSQL is reachable at $DB_HOST:$DB_PORT (resolved to $DNS_IPS)"
    break
  fi

  RETRIES=$((RETRIES + 1))

  # Print full diagnostic on first failure (helps user identify the root cause)
  if [ $RETRIES -eq 1 ]; then
    FIRST_DIAG="$RESULT"
    echo "[!] Diagnostic (first attempt):"
    if echo "$RESULT" | grep -q "DNS_FAIL"; then
      echo "    DNS FAILURE — hostname '$DB_HOST' could not be resolved."
      echo "    This usually means:"
      echo "      1. Docker networking is not configured correctly"
      echo "      2. The postgres container is not on the same network"
      echo "      3. Docker Desktop DNS is malfunctioning (restart Docker Desktop)"
      echo "    Detail: $RESULT"
    elif echo "$RESULT" | grep -q "TCP_FAIL"; then
      echo "    TCP FAILURE — DNS resolved but connection to $DB_HOST:$DB_PORT failed."
      echo "    This usually means:"
      echo "      1. PostgreSQL is not yet accepting connections (normal during startup)"
      echo "      2. A firewall is blocking the connection"
      echo "    Detail: $RESULT"
    else
      echo "    Unknown error: $RESULT"
    fi
    echo ""
  fi

  echo "  Attempt $RETRIES/$MAX_RETRIES — PostgreSQL not ready yet..."
  sleep 2
done

if [ $RETRIES -ge $MAX_RETRIES ]; then
  echo "[ERROR] PostgreSQL did not become reachable within 60 seconds."
  echo "[ERROR] Target: $DB_HOST:$DB_PORT"
  echo "[ERROR] Last diagnostic: $RESULT"
  echo ""
  echo "[ERROR] Troubleshooting steps:"
  echo "  1. Check postgres container:  docker compose logs postgres"
  echo "  2. Check postgres is healthy: docker inspect --format='{{.State.Health.Status}}' wsh-postgres"
  echo "  3. Test DNS from inside app:  docker exec weavenote-app node -e \"require('dns').resolve4('$DB_HOST', (e,a) => console.log(e||a))\""
  echo "  4. Restart Docker Desktop (if on Windows/macOS)"
  echo "  5. Clean rebuild:  docker compose down -v && docker compose build --no-cache && docker compose up -d"
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
