#!/bin/sh
# WSH Docker Entrypoint — Git-pull-based update architecture
# v3.9.0: Complete rewrite — no more multi-stage build. The container
# clones the repo, builds inside, and supports hot-updates via git pull.
#
# Flow:
# 1. First run: git clone → npm install → prisma generate → next build → start
# 2. Subsequent starts: skip build, just start server
# 3. Update (restart with WSH_UPDATE=true): git pull → npm install → prisma → rebuild → restart

set -e

PRISMA_CLI="npx prisma"
SCHEMA_FLAG="--schema=./prisma/schema.prisma"
MARKER_FILE="/app/tmp/.app-built"
UPDATE_MARKER="/app/tmp/.needs-update"
REPO_DIR="/app/repo"
GIT_REPO="${WSH_GIT_REPO:-https://github.com/141stfighterwing-collab/WSH.git}"
GIT_BRANCH="${WSH_GIT_BRANCH:-main}"
GIT_PAT="${WSH_GIT_PAT:-}"

# ── Helper: Wait for PostgreSQL ─────────────────────────────────
wait_for_postgres() {
  if [ -z "$DATABASE_URL" ]; then
    echo "[WARN] DATABASE_URL not set — skipping DB connectivity check"
    return 0
  fi

  local DB_HOST DB_PORT
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')

  if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
    echo "[WARN] Could not parse DATABASE_URL — skipping DB check"
    return 0
  fi

  echo "[*] Waiting for PostgreSQL at $DB_HOST:$DB_PORT ..."
  local RETRIES=0 MAX=30

  while [ $RETRIES -lt $MAX ]; do
    local RESULT
    RESULT=$(node -e "
      const dns = require('dns'); const net = require('net');
      const host = process.argv[1]; const port = parseInt(process.argv[2], 10);
      dns.resolve4(host, (err, addresses) => {
        if (err) { console.log('FAIL:' + err.code); process.exit(0); }
        const s = net.createConnection(port, host, () => {
          console.log('OK'); s.destroy(); process.exit(0);
        });
        s.on('error', (e) => { console.log('FAIL:' + e.code); process.exit(0); });
        setTimeout(() => { console.log('FAIL:TIMEOUT'); process.exit(0); }, 5000);
      });
    " "$DB_HOST" "$DB_PORT" 2>&1)

    if echo "$RESULT" | grep -q "OK"; then
      echo "[+] PostgreSQL connected at $DB_HOST:$DB_PORT"
      return 0
    fi

    RETRIES=$((RETRIES + 1))
    sleep 2
  done

  echo "[ERROR] PostgreSQL not reachable after 60s at $DB_HOST:$DB_PORT"
  return 1
}

# ── Helper: Initialize database ──────────────────────────────────
init_database() {
  if [ ! -f "$MARKER_FILE" ]; then
    echo "[*] Initializing database schema..."
    $PRISMA_CLI db push $SCHEMA_FLAG 2>&1 || {
      echo "[!] Retrying with generate first..."
      $PRISMA_CLI generate $SCHEMA_FLAG 2>&1
      $PRISMA_CLI db push $SCHEMA_FLAG 2>&1
    }
    echo "[+] Database schema applied"
  else
    echo "[+] Database already initialized"
  fi
}

# ── Helper: Build the app ────────────────────────────────────────
build_app() {
  local SRC_DIR="$1"
  echo "[*] Building WSH from $SRC_DIR ..."

  # Sync source to /app (preserving node_modules from parent layer)
  echo "[*] Copying source files..."
  rsync -a --exclude='node_modules' --exclude='.next' --exclude='.git' \
    --exclude='tmp' --exclude='db' --exclude='.env' \
    "$SRC_DIR/" /app/

  # Install dependencies (only if package.json changed)
  echo "[*] Installing dependencies..."
  npm install 2>&1

  # Generate Prisma client
  echo "[*] Generating Prisma client..."
  $PRISMA_CLI generate $SCHEMA_FLAG 2>&1

  # Build Next.js
  echo "[*] Building Next.js (this may take a minute)..."
  NEXT_TELEMETRY_DISABLED=1 npm run build 2>&1

  # Copy static assets to standalone output
  if [ -d "/app/.next/standalone" ]; then
    cp -r /app/.next/static /app/.next/standalone/.next/ 2>/dev/null || true
    cp -r /app/public /app/.next/standalone/ 2>/dev/null || true
  fi

  echo "[+] Build complete!"
}

# ── Main ────────────────────────────────────────────────────────
echo "======================================================="
echo "  WSH (WeaveNote Self-Hosted) v${BUILD_VERSION:-3.9.0}"
echo "  Pull-based update architecture"
echo "======================================================="

# ── Step 1: Get source code ─────────────────────────────────────
if [ -d "$REPO_DIR/.git" ]; then
  echo "[*] Repository exists at $REPO_DIR"

  if [ "${WSH_UPDATE}" = "true" ] || [ -f "$UPDATE_MARKER" ]; then
    echo "[*] Updating repository (git pull)..."
    cd "$REPO_DIR"
    git fetch origin "$GIT_BRANCH" 2>&1
    git reset --hard "origin/$GIT_BRANCH" 2>&1
    cd /app
    rm -f "$UPDATE_MARKER"
    # Force rebuild after pull
    rm -f "$MARKER_FILE"
  fi
else
  echo "[*] Cloning repository from $GIT_REPO (branch: $GIT_BRANCH)..."

  # Add PAT to URL if provided (for private repos)
  local CLONE_URL="$GIT_REPO"
  if [ -n "$GIT_PAT" ]; then
    CLONE_URL=$(echo "$GIT_REPO" | sed "s|https://|https://${GIT_PAT}@|")
  fi

  git clone --branch "$GIT_BRANCH" --depth 1 "$CLONE_URL" "$REPO_DIR" 2>&1
  echo "[+] Repository cloned"
fi

# ── Step 2: Build if needed ─────────────────────────────────────
if [ ! -f "$MARKER_FILE" ]; then
  wait_for_postgres
  build_app "$REPO_DIR"
  init_database
  touch "$MARKER_FILE"
else
  echo "[*] App already built (marker exists). To force update:"
  echo "    docker exec weavenote-app touch /app/tmp/.needs-update && docker restart weavenote-app"
  echo "    Or set WSH_UPDATE=true in environment"
fi

# ── Step 3: Verify Prisma client on each start ──────────────────
echo "[*] Verifying Prisma client..."
$PRISMA_CLI generate $SCHEMA_FLAG 2>&1

# ── Step 4: Push schema changes if needed ────────────────────────
if [ -n "$DATABASE_URL" ]; then
  echo "[*] Applying any pending schema changes..."
  $PRISMA_CLI db push $SCHEMA_FLAG 2>&1 || true
fi

# ── Step 5: Start server ────────────────────────────────────────
echo "[*] Starting WSH server on port ${PORT:-3000}..."

# If standalone build exists, use it; otherwise use next start
if [ -f "/app/.next/standalone/server.js" ]; then
  cd /app/.next/standalone
  exec node server.js
elif [ -f "/app/node_modules/.bin/next" ]; then
  cd /app
  exec npx next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
else
  echo "[ERROR] No build output found. Build may have failed."
  echo "[ERROR] Run with WSH_UPDATE=true or delete /app/tmp/.app-built"
  exit 1
fi
