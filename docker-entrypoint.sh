#!/bin/sh
# WSH Docker Entrypoint v4.2.0
# Handles PostgreSQL connectivity check, first-run DB init, admin seeding, and server startup.
# Uses direct node path for Prisma CLI (never npx — prevents v7.x download).

#set -e  # Disabled: individual errors are handled below to prevent crash loops

PRISMA_CLI="node /app/node_modules/prisma/build/index.js"
SCHEMA_FLAG="--schema=./prisma/schema.prisma"
MARKER_FILE="/app/tmp/.db-initialized"
SEED_MARKER="/app/tmp/.admin-seeded"

# ── Pre-flight checks ──────────────────────────────────────────
if [ ! -f "/app/node_modules/prisma/build/index.js" ]; then
  echo "[ERROR] Prisma CLI not found at /app/node_modules/prisma/build/index.js"
  echo "[ERROR] Container image may be corrupted. Rebuild: docker compose build --no-cache"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[ERROR] DATABASE_URL environment variable is not set."
  echo "[ERROR] When using docker-compose, this is set automatically."
  exit 1
fi

echo "======================================================="
echo "  WSH (WeaveNote Self-Hosted) v${BUILD_VERSION:-4.2.0}"
echo "======================================================="
$PRISMA_CLI --version 2>&1 | head -1 | sed 's/^/[+] /'

# ── Parse DATABASE_URL ────────────────────────────────────────
# Format: postgresql://user:pass@host:port/db
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "[ERROR] Could not parse DATABASE_URL. Expected: postgresql://user:pass@host:port/db"
  echo "[ERROR] DATABASE_URL=$DATABASE_URL"
  exit 1
fi

echo "[*] Target: PostgreSQL at $DB_HOST:$DB_PORT"

# ── Wait for PostgreSQL ────────────────────────────────────────
echo "[*] Waiting for PostgreSQL to be ready..."
RETRIES=0
MAX_RETRIES=30

while [ $RETRIES -lt $MAX_RETRIES ]; do
  RESULT=$(node -e "
    const dns = require('dns');
    const net = require('net');
    const host = process.argv[1];
    const port = parseInt(process.argv[2], 10);
    dns.resolve4(host, (err, addresses) => {
      if (err) { console.log('FAIL:' + err.code); process.exit(0); }
      console.log('DNS:' + addresses[0]);
      const s = net.createConnection(port, host, () => {
        console.log('OK'); s.destroy(); process.exit(0);
      });
      s.on('error', (e) => { console.log('FAIL:' + e.code); process.exit(0); });
      setTimeout(() => { console.log('FAIL:TIMEOUT'); process.exit(0); }, 5000);
    });
  " "$DB_HOST" "$DB_PORT" 2>&1)

  if echo "$RESULT" | grep -q "OK"; then
    DNS_IP=$(echo "$RESULT" | grep "DNS:" | sed 's/DNS://')
    echo "[+] PostgreSQL connected at $DB_HOST:$DB_PORT (IP: $DNS_IP)"
    break
  fi

  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -eq 1 ]; then
    echo "[!] Diagnostic: $RESULT"
    echo "    Retrying up to $((MAX_RETRIES * 2)) seconds..."
  fi
  sleep 2
done

if [ $RETRIES -ge $MAX_RETRIES ]; then
  echo "[ERROR] PostgreSQL not reachable after 60s at $DB_HOST:$DB_PORT"
  echo "[ERROR] Last result: $RESULT"
  echo ""
  echo "[ERROR] Troubleshooting:"
  echo "  docker compose logs postgres"
  echo "  docker compose down && docker compose up -d"
  exit 1
fi

# ── Database initialization (first run only) ───────────────────
if [ ! -f "$MARKER_FILE" ]; then
  echo "[*] First run — initializing database schema..."
  if $PRISMA_CLI db push $SCHEMA_FLAG 2>&1; then
    echo "[+] Database schema pushed successfully"
  else
    echo "[!] db push failed — regenerating Prisma client and retrying..."
    $PRISMA_CLI generate $SCHEMA_FLAG 2>&1 || echo "[!] prisma generate failed (non-fatal)"
    if $PRISMA_CLI db push $SCHEMA_FLAG 2>&1; then
      echo "[+] Database schema pushed on retry"
    else
      echo "[ERROR] Database initialization failed after retry."
      echo "[ERROR] The server will still start — check /api/health after boot."
    fi
  fi
  mkdir -p /app/tmp
  touch "$MARKER_FILE"
  echo "[+] Database initialization complete (marker: $MARKER_FILE)"
else
  echo "[+] Database already initialized (skipping schema push)"
fi

# ── Seed default admin user (runs on EVERY startup — idempotent) ──
# This runs outside the first-run guard so that if the seed failed on a
# previous start (e.g. DB wasn't ready yet), it will self-heal on restart.
# It checks whether the admin user already exists before attempting creation.
if [ ! -f "$SEED_MARKER" ]; then
  echo "[*] Seeding default admin user (if not exists)..."
  SEED_OUTPUT=$(node -e "
    const bcrypt = require('bcryptjs');
    const { PrismaClient } = require('@prisma/client');

    async function seed() {
      const prisma = new PrismaClient();
      try {
        const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
        const email = process.env.ADMIN_DEFAULT_EMAIL || 'admin@example.com';
        const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';

        // Check if admin user already exists (by username)
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
          console.log('[seed] Admin user already exists (' + existing.username + ', role=' + existing.role + ') — skipping.');
          return 'exists';
        }

        // Check if admin email is already taken by a different user
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
          console.log('[seed] Admin email already in use by user ' + existingEmail.username + ' — skipping.');
          return 'exists';
        }

        // Hash password using bcryptjs directly (no src/lib/auth.js needed in Docker)
        const saltRounds = 12;
        const hashed = await bcrypt.hash(password, saltRounds);

        const admin = await prisma.user.create({
          data: {
            username: username,
            email: email,
            password: hashed,
            role: 'super-admin',
            status: 'active'
          },
          select: { id: true, username: true, email: true, role: true, status: true }
        });

        console.log('[seed] Default admin user CREATED:');
        console.log('[seed]   Username: ' + admin.username);
        console.log('[seed]   Email: ' + admin.email);
        console.log('[seed]   Role: ' + admin.role);
        console.log('[seed]   Status: ' + admin.status);
        console.log('[seed]   ID: ' + admin.id);
        console.log('[seed] WARNING: Change the default admin password immediately!');
        return 'created';
      } catch(e) {
        console.error('[seed] ERROR: ' + e.message);
        console.error('[seed] Stack: ' + e.stack);
        return 'error';
      } finally {
        await prisma.\$disconnect();
      }
    }

    seed().then(function(result) {
      process.exit(result === 'error' ? 1 : 0);
    });
  " 2>&1)
  SEED_EXIT=$?
  echo "$SEED_OUTPUT"

  if [ $SEED_EXIT -eq 0 ]; then
    # Check if user was created or already existed
    if echo "$SEED_OUTPUT" | grep -q "CREATED"; then
      echo "[+] Default admin user seeded successfully"
    else
      echo "[+] Admin seed check complete (user already exists or no action needed)"
    fi
    # Mark as seeded so we don't re-run on every restart (only needed once)
    mkdir -p /app/tmp
    touch "$SEED_MARKER"
  else
    echo "[!] Admin seed failed — will retry on next container restart"
    echo "[!] Check the error above. You can also seed manually via the /api/admin/users/register endpoint."
  fi
else
  echo "[+] Admin seed already completed (marker: $SEED_MARKER) — skipping"
  # Still verify the admin user exists
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findFirst({ where: { role: { in: ['admin', 'super-admin'] } }, select: { username: true, role: true } })
      .then(function(admin) {
        if (admin) {
          console.log('[+] Admin user verified: ' + admin.username + ' (role=' + admin.role + ')');
        } else {
          console.log('[!] WARNING: No admin user found in database!');
          console.log('[!] Remove /app/tmp/.admin-seeded and restart to re-seed.');
        }
        return prisma.\$disconnect();
      });
  " 2>&1
fi

# ── Verify Prisma client ───────────────────────────────────────
echo "[*] Verifying Prisma client..."
$PRISMA_CLI generate $SCHEMA_FLAG 2>&1 | tail -1 || echo "[!] prisma generate warning (non-fatal)"

# ── Start server ───────────────────────────────────────────────
echo "[*] Starting WSH server on port ${PORT:-8883}..."
echo "======================================================="
exec "$@"
