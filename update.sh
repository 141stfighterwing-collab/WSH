#!/usr/bin/env bash
# WSH — Non-destructive Update Script v4.4.18
# Pulls latest code, rebuilds image, and restarts containers.
# Your data (PostgreSQL, volumes) is NEVER destroyed.
#
# Usage:
#   chmod +x update.sh && ./update.sh
#   ./update.sh --no-cache    # Force full rebuild (no layer caching)
#   ./update.sh --docs-only   # Validate release documentation without changing it

set -e

NO_CACHE=""
DOCS_ONLY=false
EXPECTED_VERSION="4.4.18"
for arg in "$@"; do
    case "$arg" in
        --no-cache) NO_CACHE="--no-cache" ;;
        --docs-only) DOCS_ONLY=true ;;
    esac
done

validate_docs() {
    local failed=0
    for doc in README.md CHANGELOG.md CODING_CHANGES.md FILE_TRACKER.md; do
        if [ ! -f "$doc" ] || ! grep -q "$EXPECTED_VERSION" "$doc"; then
            echo "  [FAIL] $doc is missing or not aligned to v$EXPECTED_VERSION"
            failed=1
        else
            echo "  [OK] $doc preserved and version-aligned"
        fi
    done
    return "$failed"
}

echo ""
echo "========================================"
echo "  WSH — Update v4.4.18"
echo "  (data-preserving update)"
echo "========================================"
echo ""

if [ "$DOCS_ONLY" = true ]; then
    validate_docs
    exit $?
fi

# ── Step 1: Pull latest code ─────────────────────────────────
echo -e "\033[33m[1/5] Pulling latest code from GitHub...\033[0m"
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_BRANCH=${CURRENT_BRANCH:-TST-DEV}
echo "  Branch: $CURRENT_BRANCH"
git pull --ff-only origin "$CURRENT_BRANCH" 2>&1
echo "  \033[32m[OK] Code updated\033[0m"

# ── Step 2: Stop running containers ──────────────────────────
echo ""
echo -e "\033[33m[2/5] Stopping running containers...\033[0m"
docker compose down 2>&1
echo "  \033[32m[OK] Containers stopped\033[0m"

# ── Step 3: Rebuild Docker image ─────────────────────────────
echo ""
echo -e "\033[33m[3/5] Rebuilding Docker image...\033[0m"
echo "  (this may take 2-4 minutes on first run)"
echo ""

if [ -n "$NO_CACHE" ]; then
    docker compose build --no-cache 2>&1
else
    docker compose build 2>&1
fi

echo ""
echo "  \033[32m[OK] Image built\033[0m"

# ── Step 4: Restart containers ───────────────────────────────
echo ""
echo -e "\033[33m[4/5] Restarting containers (preserving data)...\033[0m"
docker compose up -d --force-recreate 2>&1
echo "  \033[32m[OK] Containers restarted\033[0m"

# ── Step 5: Validate ─────────────────────────────────────────
echo ""
echo -e "\033[33m[5/5] Validating services...\033[0m"
echo "  Waiting 15s for services to start..."
sleep 15

ALL_OK=true
for svc in weavenote-app wsh-dbviewer wsh-postgres; do
    RUNNING=$(docker inspect -f '{{.State.Running}}' "$svc" 2>/dev/null || echo "false")
    if [ "$RUNNING" = "true" ]; then
        echo "  \033[32m[OK] $svc is RUNNING\033[0m"
    else
        echo "  \033[31m[FAIL] $svc is NOT running\033[0m"
        ALL_OK=false
    fi
done

# Health check
PORT=${WSH_PORT:-8883}
if curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
    VERSION=$(curl -sf "http://localhost:$PORT/api/health" 2>/dev/null | grep -o '"version":"[^"]*"' | head -1)
    if echo "$VERSION" | grep -q "$EXPECTED_VERSION"; then
        echo "  \033[32m[OK] Health check PASSED ($VERSION)\033[0m"
    else
        echo "  \033[31m[FAIL] Health endpoint does not report v$EXPECTED_VERSION ($VERSION)\033[0m"
        ALL_OK=false
    fi
    if curl -sf "http://localhost:$PORT/api/health" 2>/dev/null | grep -q '"authentication":{"status":"configured"'; then
        echo "  \033[32m[OK] Authentication secret is configured\033[0m"
    else
        echo "  \033[31m[FAIL] Authentication secret is not configured\033[0m"
        ALL_OK=false
    fi
else
    echo "  \033[33m[WARN] Health check not ready yet (container may still be initializing)\033[0m"
fi

validate_docs || ALL_OK=false

if [ "$ALL_OK" != true ]; then
    echo "  Update validation failed. Review the messages above."
    exit 1
fi

echo ""
echo "========================================"
echo "  UPDATE COMPLETE"
echo "========================================"
echo ""
echo "  App:        http://localhost:$PORT"
echo "  DB Viewer:  http://localhost:5682"
echo "  Logs:       docker compose logs -f weavenote"
echo ""
echo "  To do a full clean install:  ./install.sh"
echo ""
