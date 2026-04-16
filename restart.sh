#!/bin/bash
# WSH — Soft Restart Script
# Restarts the WSH application container WITHOUT rebuilding.
# This preserves all runtime environment changes (API keys, settings).
#
# Usage: ./restart.sh
#        ./restart.sh --logs    (show container logs after restart)

set -e

echo ""
echo "======================================="
echo "  WSH — Soft Restart (no rebuild)"
echo "======================================="
echo ""

# Step 1: Restart just the app container
echo "[1/4] Restarting weavenote-app container..."
docker compose restart weavenote
echo ""

# Step 2: Wait for health check
echo "[2/4] Waiting for health check..."
sleep 5

RETRIES=0
MAX_RETRIES=12
while [ $RETRIES -lt $MAX_RETRIES ]; do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' weavenote-app 2>/dev/null || echo "unknown")
  if [ "$HEALTH" = "healthy" ]; then
    echo "[+] Application is healthy"
    break
  fi
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "[!] Health check not passing yet — container is starting up"
    echo "    Check: docker compose logs weavenote --tail 50"
    break
  fi
  sleep 5
done
echo ""

# Step 3: Verify version
echo "[3/4] Checking version..."
curl -s http://localhost:${WSH_PORT:-8883}/api/health 2>/dev/null | grep -o '"version":"[^"]*"' || echo "    (health endpoint not reachable yet)"
echo ""

# Step 4: Show logs or done
if [ "$1" = "--logs" ] || [ "$1" = "-l" ]; then
  echo "[4/4] Container logs (live):"
  echo "======================================="
  docker compose logs weavenote --tail 30 -f
else
  echo "[4/4] Done. Application restarted."
  echo ""
  echo "  To view logs:  docker compose logs weavenote --tail 50"
  echo "  To follow logs: docker compose logs weavenote -f"
  echo "  To rebuild:     ./update.sh"
fi
echo ""
