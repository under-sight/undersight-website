#!/usr/bin/env bash
# =============================================================================
# Unsubscribe flow tests
# =============================================================================
#
# Exercises the /unsubscribe route and the suppression + token behavior of
# /api/whitepaper-lead against the dev server (undersight-serve.py, :8088,
# FIBERY_SPACE="CMS Staging"). State assertions query Fibery directly and
# SKIP if no token is available (env FIBERY_TOKEN or Keychain).
#
# Usage:
#   python3 undersight-serve.py &   # dev server on :8088
#   bash tests/test-unsubscribe.sh
#
# Exit codes: 0 = all passed, 1 = failures
# =============================================================================

set -uo pipefail

BASE="${BASE:-http://localhost:8088}"
SPACE="CMS Staging"
PASS_COUNT=0; FAIL_COUNT=0; SKIP_COUNT=0

if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' BOLD='' RESET=''
fi
pass() { PASS_COUNT=$((PASS_COUNT + 1)); echo -e "  ${GREEN}PASS${RESET}  $1"; }
fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1)); echo -e "  ${RED}FAIL${RESET}  $1"
  [ -n "${2:-}" ] && echo -e "        ${RED}-> $2${RESET}"
}
skip() { SKIP_COUNT=$((SKIP_COUNT + 1)); echo -e "  ${YELLOW}SKIP${RESET}  $1"; }
section() { echo ""; echo -e "${BOLD}=== $1 ===${RESET}"; }

FIBERY_TOKEN="${FIBERY_TOKEN:-$(security find-generic-password -s mcp-credentials -a fibery-undersight -w 2>/dev/null || true)}"

# Query staging leads for an email; prints JSON result array.
fibery_leads() {
  local email="$1"
  curl -s -X POST "https://subscript.fibery.io/api/commands" \
    -H "Authorization: Token $FIBERY_TOKEN" -H "Content-Type: application/json" \
    -d "[{\"command\":\"fibery.entity/query\",\"args\":{\"query\":{
      \"q/from\":\"$SPACE/Website Leads\",
      \"q/select\":{\"id\":[\"fibery/id\"],\"token\":[\"$SPACE/Unsubscribe Token\"],\"unsub\":[\"$SPACE/Unsubscribed\"],\"unsubAt\":[\"$SPACE/Unsubscribed At\"]},
      \"q/where\":[\"=\",[\"$SPACE/Email\"],\"\$e\"],\"q/limit\":10},\"params\":{\"\$e\":\"$email\"}}}]"
}

# Unique test address per run (staging space has no email automation — safe)
RUN_ID="$(date +%s)$$"
ADDR="unsub-test-${RUN_ID}@example.com"

# Dev server reachable?
if ! curl -s -o /dev/null --max-time 3 "$BASE/api/content"; then
  echo "Dev server not reachable at $BASE — start undersight-serve.py first."
  exit 1
fi

section "GET /unsubscribe (confirm page)"

body=$(curl -s -w '\n%{http_code}' "$BASE/unsubscribe?e=someone%40example.com&t=abc123")
code=$(echo "$body" | tail -1); html=$(echo "$body" | sed '$d')
[ "$code" = "200" ] && pass "GET with email returns 200" || fail "GET with email returns 200" "got $code"
echo "$html" | grep -q 'someone@example.com' && pass "confirm page echoes the address" || fail "confirm page echoes the address"
echo "$html" | grep -qi '<form' && echo "$html" | grep -qi 'method="post"' \
  && pass "confirm page contains a POST form (no GET side effects)" || fail "confirm page contains a POST form (no GET side effects)"

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/unsubscribe")
[ "$code" = "400" ] && pass "GET without email returns 400" || fail "GET without email returns 400" "got $code"

body=$(curl -s "$BASE/unsubscribe?e=%3Cscript%3Ealert(1)%3C/script%3E@x.com")
echo "$body" | grep -q '<script>alert' && fail "invalid/XSS address is not reflected raw" || pass "invalid/XSS address is not reflected raw"

section "Lead creation generates an unsubscribe token"

if [ -z "$FIBERY_TOKEN" ]; then
  skip "no FIBERY_TOKEN — state assertions skipped"
else
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/whitepaper-lead" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADDR\",\"whitepaper\":\"Chat Advance Case Study\"}")
  [ "$code" = "200" ] && pass "lead created via dev endpoint" || fail "lead created via dev endpoint" "got $code"
  sleep 1
  leads=$(fibery_leads "$ADDR")
  tok=$(echo "$leads" | python3 -c "import json,sys; r=json.load(sys.stdin)[0]['result']; print(r[0]['token'] or '' if r else '')" 2>/dev/null)
  [ -n "$tok" ] && [ ${#tok} -ge 16 ] && pass "lead has a generated Unsubscribe Token (${#tok} chars)" || fail "lead has a generated Unsubscribe Token" "token='$tok'"
fi

section "POST /unsubscribe executes"

body=$(curl -s -w '\n%{http_code}' -X POST "$BASE/unsubscribe" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "e=$ADDR" --data-urlencode "t=${tok:-}")
code=$(echo "$body" | tail -1); html=$(echo "$body" | sed '$d')
[ "$code" = "200" ] && pass "POST unsubscribe returns 200" || fail "POST unsubscribe returns 200" "got $code"
echo "$html" | grep -qi 'unsubscribed' && pass "response confirms unsubscribe" || fail "response confirms unsubscribe"

if [ -n "$FIBERY_TOKEN" ]; then
  sleep 1
  leads=$(fibery_leads "$ADDR")
  echo "$leads" | python3 -c "
import json,sys
r=json.load(sys.stdin)[0]['result']
assert r and all(x['unsub'] for x in r), 'not all leads unsubscribed'
assert all(x['unsubAt'] for x in r), 'missing Unsubscribed At'
" 2>/dev/null && pass "Fibery lead marked Unsubscribed + timestamp" || fail "Fibery lead marked Unsubscribed + timestamp"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/unsubscribe" \
  -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "e=not-an-email")
[ "$code" = "422" ] && pass "POST with invalid email returns 422" || fail "POST with invalid email returns 422" "got $code"

section "Suppression: unsubscribed address gets no new lead"

if [ -z "$FIBERY_TOKEN" ]; then
  skip "no FIBERY_TOKEN — suppression assertion skipped"
else
  before=$(fibery_leads "$ADDR" | python3 -c "import json,sys; print(len(json.load(sys.stdin)[0]['result']))")
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/whitepaper-lead" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADDR\",\"whitepaper\":\"Chat Advance Case Study\"}")
  [ "$code" = "200" ] && pass "suppressed submit still returns 200 (no status leak)" || fail "suppressed submit still returns 200 (no status leak)" "got $code"
  sleep 1
  after=$(fibery_leads "$ADDR" | python3 -c "import json,sys; print(len(json.load(sys.stdin)[0]['result']))")
  [ "$before" = "$after" ] && pass "no new lead created for unsubscribed address ($before -> $after)" || fail "no new lead created for unsubscribed address" "$before -> $after"
fi

echo ""
echo -e "${BOLD}Results: $PASS_COUNT passed, $FAIL_COUNT failed, $SKIP_COUNT skipped${RESET}"
[ "$FAIL_COUNT" -eq 0 ]
