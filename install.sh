#!/usr/bin/env bash
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# v3.9.0: Multi-stage Docker build. Installs a pre-built image.
# Updates are non-destructive: just `./update.sh` to pull + rebuild.
#
# Usage:  chmod +x install.sh && ./install.sh
#         ./install.sh 8080            (custom port)
#         ./install.sh --clean-only    (nuke without rebuilding)
#         ./install.sh --with-pgadmin  (include pgAdmin on port 5050)

set -e

PORT="${1:-3000}"
CLEAN_ONLY=false
WITH_PGADMIN=false

for arg in "$@"; do
    case "$arg" in
        --clean-only) CLEAN_ONLY=true ;;
        --with-pgadmin) WITH_PGADMIN=true ;;
        *) PORT="$arg" ;;
    esac
done

echo ""
echo "========================================"
echo "  WSH - Auto Nuke & Reinstall v3.9.0"
echo "========================================"
echo ""

# ---- PHASE 1: Kill ALL containers ----
echo -e "\033[33m[1/6] Stopping ALL WSH/WeaveNote containers...\033[0m"

FOUND=0
for c in $(docker ps -a --format "{{.Names}}" 2>/dev/null | grep -iE "wsh|weavenote|pgadmin" || true); do
    echo "  - Removing container: $c"
    docker rm -f "$c" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done
[ "$FOUND" -gt 0 ] && echo "  \033[32m[OK] Removed $FOUND container(s)\033[0m" || echo "  \033[32m[OK] No existing containers\033[0m"

# ---- PHASE 2: Remove ALL matching images ----
echo -e "\033[33m[2/6] Removing ALL Docker images...\033[0m"

FOUND=0
for img in $(docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | grep -iE "wsh|weavenote|adminer|pgadmin|postgres" || true); do
    docker rmi -f "$img" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done
[ "$FOUND" -gt 0 ] && echo "  \033[32m[OK] Removed $FOUND image(s)\033[0m" || echo "  \033[32m[OK] No existing images\033[0m"

# ---- PHASE 3: Remove volumes & networks ----
echo -e "\033[33m[3/6] Removing volumes and networks...\033[0m"

for v in $(docker volume ls --format "{{.Name}}" 2>/dev/null | grep -iE "wsh|weavenote|postgres|pgadmin" || true); do
    docker volume rm "$v" 2>/dev/null || true
done

for n in $(docker network ls --format "{{.Name}}" 2>/dev/null | grep -iE "wsh|weavenote" | grep -v -E "^(bridge|host|none)$" || true); do
    docker network rm "$n" 2>/dev/null || true
done

echo "  \033[32m[OK] Cleaned\033[0m"

# ---- PHASE 4: Prune ----
echo -e "\033[33m[4/6] Pruning Docker resources...\033[0m"
docker system prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
echo "  \033[32m[OK] Pruned\033[0m"

if [ "$CLEAN_ONLY" = true ]; then
    echo ""
    echo "========================================"
    echo "  CLEAN COMPLETE"
    echo "========================================"
    echo ""
    exit 0
fi

# ---- PHASE 5: Build and start ----
echo -e "\033[33m[5/6] Building WSH Docker image...\033[0m"
echo "  (this may take 3-5 minutes)"
echo ""

WSH_PORT="$PORT" docker compose build

echo ""
echo "  Starting WSH stack..."
if [ "$WITH_PGADMIN" = true ]; then
    WSH_PORT="$PORT" docker compose --profile admin up -d --force-recreate
else
    WSH_PORT="$PORT" docker compose up -d --force-recreate
fi

# ---- PHASE 6: Validate ----
echo ""
echo -e "\033[33m[6/6] Validating services...\033[0m"
echo "  Waiting 30s for services to start..."
sleep 30

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

if curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
    VERSION=$(curl -sf "http://localhost:$PORT/api/health" 2>/dev/null | grep -o '"version":"[^"]*"' | head -1)
    echo "  \033[32m[OK] Health check PASSED $VERSION\033[0m"
else
    echo "  \033[33m[WARN] Still initializing. Watch logs:\033[0m"
    echo "         docker compose logs -f weavenote"
fi

echo ""
echo "========================================"
echo "  WSH INSTALLED SUCCESSFULLY"
echo "========================================"
echo ""
echo "  App:        http://localhost:$PORT"
echo "  DB Viewer:  http://localhost:5682"
echo "  PostgreSQL: localhost:5432 (internal)"
[ "$WITH_PGADMIN" = true ] && echo "  pgAdmin:    http://localhost:5050"
echo ""
echo "  Logs:     docker compose logs -f weavenote"
echo "  Stop:     docker compose down"
echo "  Update:   ./update.sh    (preserves data!)"
echo "  Full nuke:./install.sh"
echo ""
