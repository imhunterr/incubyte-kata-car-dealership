#!/usr/bin/env bash
# End-to-end smoke test of the running stack, through the web server.
#
#   scripts/smoke-test.sh [BASE_URL]      (default: http://localhost:8080)
#
# Exercises the real path a browser takes: nginx serves the SPA and proxies
# /api to FastAPI, which talks to PostgreSQL. Needs an admin account
# (SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD) and at least one vehicle in stock;
# `make stack-smoke` prepares both. Exits non-zero on the first failure.
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-admin-pass-123}"
API="$BASE_URL/api"

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

# expect_status <expected> <description> <curl args...>
expect_status() {
  local expected="$1" description="$2"
  shift 2
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  [[ "$status" == "$expected" ]] && pass "$description ($status)" || fail "$description: got $status, want $expected"
}

json_post() { curl -sf -X POST -H 'Content-Type: application/json' "$@"; }

echo "Smoke-testing $BASE_URL"

# Frontend: the SPA is served, and client-side routes fall back to index.html.
curl -sf "$BASE_URL/" | grep -q '<div id="root">' && pass "SPA index served" || fail "SPA index not served"
curl -sf "$BASE_URL/login" | grep -q '<div id="root">' && pass "client-side route falls back to the SPA" || fail "SPA fallback missing"

# API health through the proxy.
curl -sf "$API/health" | grep -q '"database":"ok"' && pass "API healthy, database reachable" || fail "API unhealthy"

# Auth.
email="smoke-$(date +%s)-$RANDOM@example.com"
expect_status 201 "register a new user" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"smoke-test-pw\"}" "$API/auth/register"
user_token=$(json_post -d "{\"email\":\"$email\",\"password\":\"smoke-test-pw\"}" "$API/auth/login" | jq -r .access_token)
[[ -n "$user_token" && "$user_token" != null ]] && pass "log in as the new user" || fail "login failed"
admin_token=$(json_post -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$API/auth/login" | jq -r .access_token)
[[ -n "$admin_token" && "$admin_token" != null ]] && pass "log in as admin" || fail "admin login failed"

auth_user=(-H "Authorization: Bearer $user_token")
auth_admin=(-H "Authorization: Bearer $admin_token")

expect_status 401 "vehicles require a token" "$API/vehicles"

# Browse and search.
vehicles=$(curl -sf "${auth_user[@]}" "$API/vehicles")
count=$(jq length <<<"$vehicles")
(( count > 0 )) && pass "list $count vehicles" || fail "inventory is empty"
expect_status 200 "search by category and price" "${auth_user[@]}" "$API/vehicles/search?category=suv&max_price=50000"

# Purchase and restock one in-stock vehicle.
vehicle_id=$(jq -r 'map(select(.quantity > 0))[0].id' <<<"$vehicles")
before=$(jq -r "map(select(.id == $vehicle_id))[0].quantity" <<<"$vehicles")
after=$(curl -sf -X POST "${auth_user[@]}" "$API/vehicles/$vehicle_id/purchase" | jq -r .quantity)
(( after == before - 1 )) && pass "purchase vehicle $vehicle_id ($before → $after)" || fail "purchase did not decrement stock"
expect_status 403 "regular users cannot restock" -X POST "${auth_user[@]}" \
  -H 'Content-Type: application/json' -d '{"quantity":1}' "$API/vehicles/$vehicle_id/restock"
restocked=$(json_post "${auth_admin[@]}" -d '{"quantity":1}' "$API/vehicles/$vehicle_id/restock" | jq -r .quantity)
(( restocked == before )) && pass "admin restocks it back to $restocked" || fail "restock failed"

echo "All smoke checks passed."
