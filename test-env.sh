#!/usr/bin/env bash
# WSH — ENV Persistence Test Script v4.4.3
#
# Validates the full lifecycle of environment variable persistence:
#   1. Health check
#   2. Login & JWT auth
#   3. Save test API key via POST /api/admin/env
#   4. Verify key is active in memory via GET /api/synthesis
#   5. Verify key exists on disk (runtime.env in container)
#   6. Soft restart the app container
#   7. Verify key persists after restart
#
# Usage:
#   chmod +x test-env.sh && ./test-env.sh
#   ADMIN_USER=admin ADMIN_PASS=admin123 ./test-env.sh
#   ADMIN_USER=admin ADMIN_PASS=admin123 TEST_KEY=sk-test-12345 ./test-env.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
PORT="${WSH_PORT:-8883}"
BASE_URL="http://localhost:$PORT"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin123}"
TEST_KEY="${TEST_KEY:-sk-test-key-for-validation-$(date +%s)}"
TEST_ENV_KEY="OPENAI_API_KEY"  # Use OpenAI key for testing (allowlisted)

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ─────────────────────────────────────────────────────────────────
pass() { PASS_COUNT=$((PASS_COUNT + 1)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); echo -e "  ${RED}[FAIL]${NC} $1"; }
warn() { WARN_COUNT=$((WARN_COUNT + 1)); echo -e "  ${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "  ${CYAN}[INFO]${NC} $1"; }
section() { echo ""; echo -e "${BOLD}── $1 ──${NC}"; }

# ── Pre-flight ──────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  WSH — ENV Persistence Test v4.4.3"
echo "========================================="
echo ""
info "Base URL:  $BASE_URL"
info "Admin:     $ADMIN_USER"
info "Test Key:  ${TEST_KEY:0:20}..."
info "Test ENV:  $TEST_ENV_KEY"
echo ""

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    fail "Docker is not running"
    exit 1
fi
pass "Docker is running"

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q 'weavenote-app'; then
    fail "weavenote-app container is not running. Start with: docker compose up -d"
    exit 1
fi
pass "weavenote-app container is running"

# ── Test 1: Health Check ────────────────────────────────────────────────────
section "Test 1: Health Check"

HEALTH_JSON=$(curl -sf --max-time 10 "$BASE_URL/api/health" 2>/dev/null || echo "")
if [ -z "$HEALTH_JSON" ]; then
    fail "Health endpoint unreachable at $BASE_URL/api/health"
    echo "  Run: docker compose up -d && sleep 15"
    exit 1
fi
pass "Health endpoint responded"

VERSION=$(echo "$HEALTH_JSON" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$VERSION" ]; then
    info "Version: $VERSION"
    pass "Version detected: $VERSION"
else
    warn "Could not parse version from health response"
fi

DB_STATUS=$(echo "$HEALTH_JSON" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$DB_STATUS" = "connected" ] || [ "$DB_STATUS" = "connected_no_tables" ]; then
    pass "Database: $DB_STATUS"
else
    warn "Database status: $DB_STATUS"
fi

# ── Test 2: Login ───────────────────────────────────────────────────────────
section "Test 2: Login & JWT Authentication"

LOGIN_RESPONSE=$(curl -sf --max-time 10 -X POST "$BASE_URL/api/admin/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || echo "")

if [ -z "$LOGIN_RESPONSE" ]; then
    fail "Login request failed (no response from server)"
    exit 1
fi

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$JWT_TOKEN" ]; then
    LOGIN_ERROR=$(echo "$LOGIN_RESPONSE" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
    fail "Login failed: ${LOGIN_ERROR:-unknown error}"
    echo "  Check ADMIN_USER and ADMIN_PASS environment variables"
    exit 1
fi
pass "Login successful"
info "JWT token: ${JWT_TOKEN:0:30}..."

# Check role
USER_ROLE=$(echo "$LOGIN_RESPONSE" | grep -o '"role":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$USER_ROLE" = "admin" ] || [ "$USER_ROLE" = "super-admin" ]; then
    pass "User role: $USER_ROLE (has admin access)"
else
    fail "User role '$USER_ROLE' does not have admin access. Need 'admin' or 'super-admin'."
    exit 1
fi

# ── Test 3: Check Current AI Status ────────────────────────────────────────
section "Test 3: Check Current AI Provider Status"

SYNTH_RESPONSE=$(curl -sf --max-time 10 "$BASE_URL/api/synthesis" \
    -H "Authorization: Bearer $JWT_TOKEN" 2>/dev/null || echo "")

if [ -z "$SYNTH_RESPONSE" ]; then
    fail "Synthesis endpoint not reachable"
else
    pass "Synthesis endpoint responded"

    CURRENT_OPENAI=$(echo "$SYNTH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('available',{}).get('openai','not-set'))" 2>/dev/null || echo "parse-error")
    info "Current OPENAI availability: $CURRENT_OPENAI"
fi

# ── Test 4: Save Test API Key ───────────────────────────────────────────────
section "Test 4: Save Test API Key via POST /api/admin/env"

SAVE_RESPONSE=$(curl -sf --max-time 10 -X POST "$BASE_URL/api/admin/env" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d "{\"key\":\"$TEST_ENV_KEY\",\"value\":\"$TEST_KEY\"}" 2>/dev/null || echo "")

if [ -z "$SAVE_RESPONSE" ]; then
    fail "POST /api/admin/env returned no response"
else
    SAVE_SUCCESS=$(echo "$SAVE_RESPONSE" | grep -o '"success":true' | head -1)
    if [ -n "$SAVE_SUCCESS" ]; then
        pass "API key saved successfully"

        PERSISTED=$(echo "$SAVE_RESPONSE" | grep -o '"persisted":true' | head -1)
        if [ -n "$PERSISTED" ]; then
            pass "Key persisted to disk (runtime.env)"
        else
            warn "Key saved to memory but persistence flag not confirmed"
        fi
    else
        SAVE_ERROR=$(echo "$SAVE_RESPONSE" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
        fail "Failed to save key: ${SAVE_ERROR:-unknown error}"
    fi
fi

# ── Test 5: Verify Key Active in Memory ────────────────────────────────────
section "Test 5: Verify Key Active in Memory (GET /api/synthesis)"

SYNTH_AFTER=$(curl -sf --max-time 10 "$BASE_URL/api/synthesis" \
    -H "Authorization: Bearer $JWT_TOKEN" 2>/dev/null || echo "")

if [ -z "$SYNTH_AFTER" ]; then
    fail "Synthesis endpoint not reachable after save"
else
    OPENAI_NOW=$(echo "$SYNTH_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('available',{}).get('openai','false'))" 2>/dev/null || echo "parse-error")
    if [ "$OPENAI_NOW" = "True" ]; then
        pass "OPENAI_API_KEY is now active in memory"
    else
        fail "OPENAI_API_KEY not detected after save (got: $OPENAI_NOW)"
    fi
fi

# ── Test 6: Verify Key on Disk (runtime.env) ───────────────────────────────
section "Test 6: Verify Key Persisted on Disk (runtime.env in container)"

DISK_CONTENTS=$(docker exec weavenote-app cat /app/tmp/env/runtime.env 2>/dev/null || echo "")
if [ -z "$DISK_CONTENTS" ]; then
    warn "runtime.env file not found or empty inside container"
    warn "The volume may not be mounted yet. This is OK on first use."
else
    if echo "$DISK_CONTENTS" | grep -q "$TEST_ENV_KEY"; then
        pass "runtime.env contains $TEST_ENV_KEY"
    else
        fail "$TEST_ENV_KEY not found in runtime.env"
        info "Contents:"
        echo "$DISK_CONTENTS" | head -10
    fi

    if echo "$DISK_CONTENTS" | grep -q "sk-test-key-for-validation"; then
        pass "runtime.env contains the test key value"
    else
        # The key might be quoted or truncated, check just the env key line
        KEY_LINE=$(echo "$DISK_CONTENTS" | grep "^${TEST_ENV_KEY}=" | head -1)
        if [ -n "$KEY_LINE" ]; then
            pass "Key line found: $KEY_LINE"
        else
            warn "Test key value not found in runtime.env (key line may be formatted differently)"
        fi
    fi
fi

# ── Test 7: Soft Restart ────────────────────────────────────────────────────
section "Test 7: Soft Restart Container"

echo -e "  Restarting weavenote-app..."
docker compose restart weavenote > /dev/null 2>&1
pass "Container restart command executed"

# Wait for health check
echo -e "  Waiting for container to become healthy..."
sleep 5
RETRIES=0
MAX_RETRIES=24
HEALTHY=false
while [ $RETRIES -lt $MAX_RETRIES ]; do
    CONTAINER_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' weavenote-app 2>/dev/null || echo "unknown")
    if [ "$CONTAINER_HEALTH" = "healthy" ]; then
        HEALTHY=true
        break
    fi
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -eq $MAX_RETRIES ]; then
        break
    fi
    sleep 5
done

if [ "$HEALTHY" = "true" ]; then
    pass "Container is healthy after restart"
else
    warn "Container health check not passing yet (may still be starting)"
fi

# Also try the HTTP health endpoint
sleep 3
HEALTH_AFTER=$(curl -sf --max-time 10 "$BASE_URL/api/health" 2>/dev/null || echo "")
if [ -n "$HEALTH_AFTER" ]; then
    pass "HTTP health endpoint responding after restart"
else
    warn "HTTP health endpoint not ready yet after restart"
fi

# ── Test 8: Re-login and Verify Key Persisted ──────────────────────────────
section "Test 8: Verify Key Persisted After Restart"

# Need fresh login after restart (JWT might be session-bound)
LOGIN_AFTER=$(curl -sf --max-time 10 -X POST "$BASE_URL/api/admin/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || echo "")

if [ -z "$LOGIN_AFTER" ]; then
    fail "Login failed after restart"
else
    JWT_AFTER=$(echo "$LOGIN_AFTER" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$JWT_AFTER" ]; then
        pass "Re-login successful after restart"

        # Check synthesis endpoint
        SYNTH_FINAL=$(curl -sf --max-time 10 "$BASE_URL/api/synthesis" \
            -H "Authorization: Bearer $JWT_AFTER" 2>/dev/null || echo "")

        if [ -z "$SYNTH_FINAL" ]; then
            fail "Synthesis endpoint not reachable after restart"
        else
            OPENAI_FINAL=$(echo "$SYNTH_FINAL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('available',{}).get('openai','false'))" 2>/dev/null || echo "parse-error")
            if [ "$OPENAI_FINAL" = "True" ]; then
                pass "OPENAI_API_KEY PERSISTS after container restart"
            else
                fail "OPENAI_API_KEY lost after restart (persistence not working)"
            fi
        fi
    else
        fail "No JWT token received after restart"
    fi
fi

# ── Test 9: Check runtime.env Still on Disk ────────────────────────────────
section "Test 9: Verify runtime.env Still on Disk After Restart"

DISK_AFTER=$(docker exec weavenote-app cat /app/tmp/env/runtime.env 2>/dev/null || echo "")
if [ -z "$DISK_AFTER" ]; then
    fail "runtime.env is missing after restart (volume not persisting)"
else
    if echo "$DISK_AFTER" | grep -q "$TEST_ENV_KEY"; then
        pass "runtime.env still contains $TEST_ENV_KEY after restart"
    else
        fail "$TEST_ENV_KEY lost from runtime.env after restart"
    fi
fi

# ── Test 10: Admin ENV GET Endpoint ────────────────────────────────────────
section "Test 10: Admin ENV GET Endpoint"

ENV_GET=$(curl -sf --max-time 10 "$BASE_URL/api/admin/env" \
    -H "Authorization: Bearer ${JWT_AFTER:-$JWT_TOKEN}" 2>/dev/null || echo "")

if [ -z "$ENV_GET" ]; then
    fail "GET /api/admin/env returned no response"
else
    ENV_OPENAI=$(echo "$ENV_GET" | grep -o '"OPENAI_API_KEY":"configured"' | head -1)
    if [ -n "$ENV_OPENAI" ]; then
        pass "Admin ENV endpoint confirms OPENAI_API_KEY is configured"
    else
        # Check if it says "not set"
        ENV_NOTSET=$(echo "$ENV_GET" | grep -o '"OPENAI_API_KEY":"not set"' | head -1)
        if [ -n "$ENV_NOTSET" ]; then
            fail "Admin ENV endpoint says OPENAI_API_KEY is 'not set'"
        else
            warn "Could not parse OPENAI_API_KEY status from admin ENV endpoint"
        fi
    fi
fi

# ── Cleanup: Remove Test Key ────────────────────────────────────────────────
section "Cleanup: Remove Test Key"

CLEANUP=$(curl -sf --max-time 10 -X POST "$BASE_URL/api/admin/env" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${JWT_AFTER:-$JWT_TOKEN}" \
    -d "{\"key\":\"$TEST_ENV_KEY\",\"value\":\"\"}" 2>/dev/null || echo "")

if [ -n "$CLEANUP" ]; then
    CLEANUP_OK=$(echo "$CLEANUP" | grep -o '"success":true' | head -1)
    if [ -n "$CLEANUP_OK" ]; then
        pass "Test key cleared (set to empty string)"
    else
        warn "Could not clear test key (may need manual cleanup)"
    fi
else
    warn "Cleanup request failed (test key may still be set)"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  TEST RESULTS"
echo "========================================="
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASS_COUNT"
echo -e "  ${RED}Failed:${NC}   $FAIL_COUNT"
echo -e "  ${YELLOW}Warnings:${NC} $WARN_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}ALL TESTS PASSED${NC}"
    echo ""
    echo "  The ENV persistence system is working correctly."
    echo "  API keys saved via Settings > AI Engine will survive container restarts."
else
    echo -e "  ${RED}${BOLD}$FAIL_COUNT TEST(S) FAILED${NC}"
    echo ""
    echo "  Troubleshooting:"
    echo "  1. Check wsh-env volume: docker volume inspect wsh_wsh-env"
    echo "  2. Check container logs: docker compose logs weavenote --tail 50"
    echo "  3. Check entrypoint logs: docker compose logs weavenote | grep -i 'persistent\\|runtime.env'"
    echo "  4. Manual volume check: docker exec weavenote-app ls -la /app/tmp/env/"
    echo "  5. If volume is empty, try: docker compose down && docker compose up -d"
fi
echo ""
echo "========================================="
echo ""

# Exit with failure if any tests failed
[ $FAIL_COUNT -eq 0 ] || exit 1
