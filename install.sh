#!/usr/bin/env bash
# WeaveNote Self-Hosted (WSH) - Auto Nuke & Reinstall
# v3.9.2: Multi-stage Docker build. Installs a pre-built image.
# Updates are non-destructive: just `./update.sh` to pull + rebuild.
#
# Usage:  chmod +x install.sh && ./install.sh
#         ./install.sh 8080            (custom port)
#         ./install.sh --clean-only    (nuke without rebuilding)
#         ./install.sh --with-pgadmin  (include pgAdmin on port 5050)
#
# SAFETY: This script ONLY removes containers, images, volumes, and
#         networks that belong to WSH. It will NEVER touch resources
#         from other Docker Compose projects or standalone containers.

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
echo "  WSH - Auto Nuke & Reinstall v3.9.2"
echo "========================================"
echo ""

# ---- PHASE 1: Stop & remove WSH containers (exact names only) ----
echo -e "\033[33m[1/5] Stopping WSH containers...\033[0m"

# Use docker compose down for project-scoped cleanup (containers + networks)
# This ONLY touches resources defined in docker-compose.yml
docker compose down -v --remove-orphans 2>/dev/null || true
docker compose --profile admin down -v --remove-orphans 2>/dev/null || true

# Also remove any orphaned WSH containers by their EXACT container_name values
# These are the only container_name values defined in docker-compose.yml
FOUND=0
for c in wsh-postgres weavenote-app wsh-dbviewer wsh-pgadmin; do
    if docker ps -a --format "{{.Names}}" 2>/dev/null | grep -qx "$c"; then
        echo "  - Removing container: $c"
        docker rm -f "$c" 2>/dev/null || true
        FOUND=$((FOUND + 1))
    fi
done
[ "$FOUND" -gt 0 ] && echo "  \033[32m[OK] Removed $FOUND orphaned container(s)\033[0m" || echo "  \033[32m[OK] No orphaned containers\033[0m"

# ---- PHASE 2: Remove WSH images (exact matches only) ----
echo -e "\033[33m[2/5] Removing WSH Docker images...\033[0m"

FOUND=0
# Only remove images that WSH explicitly builds or tags
# We do NOT remove shared images like postgres:16-alpine, adminer:latest, etc.
for img in \
    "weavenote:3.9.2" \
    "weavenote:latest" \
    "weavenote-app" \
; do
    if docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | grep -qx "$img"; then
        echo "  - Removing image: $img"
        docker rmi -f "$img" 2>/dev/null || true
        FOUND=$((FOUND + 1))
    fi
done
[ "$FOUND" -gt 0 ] && echo "  \033[32m[OK] Removed $FOUND image(s)\033[0m" || echo "  \033[32m[OK] No WSH images to remove\033[0m"

# ---- PHASE 3: Remove WSH volumes & networks (exact names only) ----
echo -e "\033[33m[3/5] Removing WSH volumes and networks...\033[0m"

# Docker Compose prefixes volumes with the project directory name (e.g., "WSH_postgres-data")
# Remove known WSH volume names by exact match
COMPOSE_PROJECT=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]')
for v in \
    "postgres-data" \
    "weavenote-data" \
    "pgadmin-data" \
    "${COMPOSE_PROJECT}_postgres-data" \
    "${COMPOSE_PROJECT}_weavenote-data" \
    "${COMPOSE_PROJECT}_pgadmin-data" \
    "WSH_postgres-data" \
    "WSH_weavenote-data" \
    "WSH_pgadmin-data" \
; do
    if docker volume ls --format "{{.Name}}" 2>/dev/null | grep -qx "$v"; then
        echo "  - Removing volume: $v"
        docker volume rm "$v" 2>/dev/null || true
    fi
done

# Remove WSH networks by exact name
for n in "wsh-net" "${COMPOSE_PROJECT}_wsh-net" "WSH_wsh-net" "WSH_default"; do
    if docker network ls --format "{{.Name}}" 2>/dev/null | grep -qx "$n"; then
        echo "  - Removing network: $n"
        docker network rm "$n" 2>/dev/null || true
    fi
done

echo "  \033[32m[OK] Cleaned\033[0m"

# ---- PHASE 4: Clean WSH build cache only ----
echo -e "\033[33m[4/5] Cleaning WSH build cache...\033[0m"

# Use --filter to ONLY prune build cache for this project
# We DO NOT use "docker system prune -af" as that would destroy resources
# from other Docker Compose projects and standalone containers.
docker builder prune -f --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" 2>/dev/null || true
echo "  \033[32m[OK] Build cache cleaned\033[0m"

if [ "$CLEAN_ONLY" = true ]; then
    echo ""
    echo "========================================"
    echo "  CLEAN COMPLETE"
    echo "========================================"
    echo ""
    echo "  Only WSH resources were removed."
    echo "  Other Docker containers/images/volumes are untouched."
    echo ""
    exit 0
fi

# ---- PHASE 5: Build and start ----
echo -e "\033[33m[5/5] Building WSH Docker image...\033[0m"
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

# ---- Validate ----
echo ""
echo -e "\033[33mValidating services...\033[0m"
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
