#!/usr/bin/env bash
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# This script automatically detects and removes ALL old WSH/WeaveNote
# Docker containers, images, volumes, and networks, then rebuilds from scratch.
# After install, it validates that all 3 required services are running.
#
# Usage:  chmod +x install.sh && ./install.sh
#         ./install.sh 8080            (custom port)
#         ./install.sh --clean-only    (nuke without rebuilding)
#         ./install.sh --with-pgadmin  (include pgAdmin on port 5050)

set -e

PORT="${1:-3000}"
CLEAN_ONLY=false
NO_CACHE=true
WITH_PGADMIN=false

for arg in "$@"; do
    case "$arg" in
        --clean-only) CLEAN_ONLY=true ;;
        --keep-cache) NO_CACHE=false ;;
        --with-pgadmin) WITH_PGADMIN=true ;;
    esac
done

echo ""
echo "========================================"
echo "  WSH - Auto Nuke & Reinstall v3.5.5"
echo "========================================"
echo ""

# ---- PHASE 1: Kill ALL containers ----
echo -e "\033[33m[1/7] Stopping ALL WSH/WeaveNote containers...\033[0m"

FOUND=0
for c in $(docker ps -a --format "{{.Names}}" 2>/dev/null | grep -iE "wsh|weavenote|pgadmin" || true); do
    echo "  - Removing container: $c"
    docker rm -f "$c" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND container(s)\033[0m"
else
    echo "  \033[32m[OK] No existing containers found\033[0m"
fi

# ---- PHASE 2: Remove ALL matching images ----
echo -e "\033[33m[2/7] Removing ALL WSH/WeaveNote Docker images...\033[0m"

FOUND=0
for img in $(docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | grep -iE "wsh|weavenote|adminer|pgadmin|postgres" || true); do
    echo "  - Removing image: $img"
    docker rmi -f "$img" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND image(s)\033[0m"
else
    echo "  \033[32m[OK] No existing images found\033[0m"
fi

# ---- PHASE 3: Remove ALL matching volumes ----
echo -e "\033[33m[3/7] Removing ALL WSH/WeaveNote Docker volumes...\033[0m"

FOUND=0
for vol in $(docker volume ls --format "{{.Name}}" 2>/dev/null | grep -iE "wsh|weavenote|postgres|pgadmin" || true); do
    echo "  - Removing volume: $vol"
    docker volume rm "$vol" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND volume(s)\033[0m"
else
    echo "  \033[32m[OK] No existing volumes found\033[0m"
fi

# ---- PHASE 4: Remove ALL matching networks ----
echo -e "\033[33m[4/7] Removing ALL WSH/WeaveNote Docker networks...\033[0m"

FOUND=0
for net in $(docker network ls --format "{{.Name}}" 2>/dev/null | grep -iE "wsh|weavenote" || true); do
    echo "  - Removing network: $net"
    docker network rm "$net" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND network(s)\033[0m"
else
    echo "  \033[32m[OK] No existing networks found\033[0m"
fi

# ---- PHASE 5: Docker prune ----
echo -e "\033[33m[5/7] Pruning ALL Docker resources...\033[0m"
docker system prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
echo "  \033[32m[OK] Docker fully pruned\033[0m"

if [ "$CLEAN_ONLY" = true ]; then
    echo ""
    echo "========================================"
    echo "  CLEAN COMPLETE"
    echo "========================================"
    echo ""
    exit 0
fi

# ---- PHASE 6: Build and start ----
echo -e "\033[33m[6/7] Building WSH from scratch...\033[0m"
echo ""

BUILD_ARGS="compose build"
if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --no-cache"
fi

WSH_PORT="$PORT" docker $BUILD_ARGS

echo ""
echo "  Starting WSH stack..."
if [ "$WITH_PGADMIN" = true ]; then
    WSH_PORT="$PORT" docker compose --profile admin up -d --force-recreate
else
    WSH_PORT="$PORT" docker compose up -d --force-recreate
fi

# ---- PHASE 7: Validate all services ----
echo ""
echo -e "\033[33m[7/7] Validating services...\033[0m"
echo ""

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

if [ "$WITH_PGADMIN" = true ]; then
    RUNNING=$(docker inspect -f '{{.State.Running}}' wsh-pgadmin 2>/dev/null || echo "false")
    if [ "$RUNNING" = "true" ]; then
        echo "  \033[32m[OK] wsh-pgadmin is RUNNING\033[0m"
    else
        echo "  \033[31m[FAIL] wsh-pgadmin is NOT running\033[0m"
        ALL_OK=false
    fi
fi

# Check app health
if curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
    echo "  \033[32m[OK] App health check PASSED\033[0m"
else
    echo "  \033[33m[WARN] App health check not ready yet (may still be initializing)\033[0m"
fi

echo ""
echo "========================================"
echo "  WSH INSTALLED SUCCESSFULLY"
echo "========================================"
echo ""
echo "  App:        http://localhost:$PORT"
echo "  DB Viewer:  http://localhost:5682"
echo "  PostgreSQL: localhost:5432 (internal)"
if [ "$WITH_PGADMIN" = true ]; then
    echo "  pgAdmin:    http://localhost:5050"
fi
echo ""
echo "  Logs:       docker compose logs -f weavenote"
echo "  Stop:       docker compose down"
echo "  Nuke:       ./install.sh"
echo ""
echo "  Watching startup logs (Ctrl+C to stop)..."
echo ""

sleep 2
docker compose logs -f weavenote
