#!/usr/bin/env bash
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# This script automatically detects and removes ALL old WSH/WeaveNote
# Docker containers, images, volumes, and networks, then rebuilds from scratch.
#
# Usage:  chmod +x install.sh && ./install.sh
#         ./install.sh 8080            (custom port)
#         ./install.sh --clean-only    (nuke without rebuilding)
#         ./install.sh --no-cache      (force rebuild no cache)

set -e

PORT="${1:-3000}"
CLEAN_ONLY=false
NO_CACHE=true

for arg in "$@"; do
    case "$arg" in
        --clean-only) CLEAN_ONLY=true ;;
        --keep-cache) NO_CACHE=false ;;
    esac
done

echo ""
echo "========================================"
echo "  WEAVENOTE - Auto Nuke & Reinstall"
echo "========================================"
echo ""

# ---- PHASE 1: Kill all containers matching wsh/weavenote ----
echo -e "\033[33m[1/6] Stopping all WSH/WeaveNote containers...\033[0m"

FOUND=0
for c in $(docker ps -a --format "{{.Names}}" 2>/dev/null | grep -iE "wsh|weavenote" || true); do
    echo "  - Removing container: $c"
    docker rm -f "$c" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND container(s)\033[0m"
else
    echo "  \033[32m[OK] No existing containers found\033[0m"
fi

# ---- PHASE 2: Remove all matching images ----
echo -e "\033[33m[2/6] Removing all WSH/WeaveNote Docker images...\033[0m"

FOUND=0
for img in $(docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | grep -iE "wsh|weavenote" || true); do
    echo "  - Removing image: $img"
    docker rmi -f "$img" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND image(s)\033[0m"
else
    echo "  \033[32m[OK] No existing images found\033[0m"
fi

# ---- PHASE 3: Remove all matching volumes ----
echo -e "\033[33m[3/6] Removing all WSH/WeaveNote Docker volumes...\033[0m"

FOUND=0
for vol in $(docker volume ls --format "{{.Name}}" 2>/dev/null | grep -iE "wsh|weavenote" || true); do
    echo "  - Removing volume: $vol"
    docker volume rm "$vol" 2>/dev/null || true
    FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
    echo "  \033[32m[OK] Removed $FOUND volume(s)\033[0m"
else
    echo "  \033[32m[OK] No existing volumes found\033[0m"
fi

# ---- PHASE 4: Remove all matching networks ----
echo -e "\033[33m[4/6] Removing all WSH/WeaveNote Docker networks...\033[0m"

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
echo -e "\033[33m[5/6] Pruning dangling Docker resources...\033[0m"
docker system prune -f 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo "  \033[32m[OK] Docker pruned\033[0m"

if [ "$CLEAN_ONLY" = true ]; then
    echo ""
    echo "========================================"
    echo "  CLEAN COMPLETE"
    echo "========================================"
    echo ""
    exit 0
fi

# ---- PHASE 6: Build and start ----
echo -e "\033[33m[6/6] Building WeaveNote from scratch...\033[0m"
echo ""

BUILD_ARGS="compose build"
if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --no-cache"
fi

WSH_PORT="$PORT" docker $BUILD_ARGS

echo ""
echo "  Starting WeaveNote..."
WSH_PORT="$PORT" docker compose up -d --force-recreate

echo ""
echo "========================================"
echo "  WEAVENOTE INSTALLED SUCCESSFULLY"
echo "========================================"
echo ""
echo "  URL:      http://localhost:$PORT"
echo "  Logs:     docker compose logs -f weavenote"
echo "  Stop:     docker compose down"
echo "  Nuke:     ./install.sh"
echo ""
echo "  Watching startup logs (Ctrl+C to stop)..."
echo ""

sleep 2
docker compose logs -f weavenote
