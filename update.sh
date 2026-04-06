#!/usr/bin/env bash
# WSH - One-Command Update
# Pulls latest changes from GitHub and rebuilds the app inside the container.
# Your database and notes are preserved — only the app code changes.
#
# Usage:  chmod +x update.sh && ./update.sh
#         ./update.sh develop     (custom branch)

set -e

BRANCH="${1:-main}"

echo ""
echo "========================================"
echo "  WSH Update v3.9.0"
echo "========================================"
echo ""

# Check container is running
RUNNING=$(docker inspect -f '{{.State.Running}}' weavenote-app 2>/dev/null || echo "false")
if [ "$RUNNING" != "true" ]; then
    echo "ERROR: WSH container is not running!"
    echo "  Start it first:  docker compose up -d"
    exit 1
fi

echo -e "\033[33m[1/3] Triggering update inside container...\033[0m"

# Touch the update marker and restart (triggers git pull + rebuild)
docker exec weavenote-app sh -c "touch /app/tmp/.needs-update" 2>/dev/null
if [ $? -ne 0 ]; then
    # Fallback: use WSH_UPDATE env
    echo "  Using WSH_UPDATE=true method..."
    docker compose stop weavenote
    docker compose up -d -e WSH_UPDATE=true
else
    docker restart weavenote-app
fi

echo -e "\033[33m[2/3] Waiting for rebuild (1-2 minutes)...\033[0m"
echo "  Watch: docker compose logs -f weavenote"
echo ""

# Poll health endpoint
CHECKED=0
while [ $CHECKED -lt 120 ]; do
    sleep 5
    CHECKED=$((CHECKED + 5))
    if curl -sf "http://localhost:3000/api/health" > /dev/null 2>&1; then
        VERSION=$(curl -sf "http://localhost:3000/api/health" 2>/dev/null | grep -o '"version":"[^"]*"' | head -1 || echo "unknown")
        echo ""
        echo -e "\033[32m[3/3] Update complete! App is healthy.\033[0m"
        echo ""
        echo "  App:     http://localhost:3000"
        echo "  Version: $VERSION"
        echo ""
        exit 0
    fi
    echo "  ... still building (${CHECKED}s)"
done

echo ""
echo -e "\033[33m[WARN] Update taking longer than expected.\033[0m"
echo "  Check logs: docker compose logs --tail 50 weavenote"
exit 1
