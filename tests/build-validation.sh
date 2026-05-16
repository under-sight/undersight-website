#!/usr/bin/env bash
# Validates dist/ build output before deployment
set -euo pipefail

DIST="dist"
PASS=0; FAIL=0

pass() { PASS=$((PASS+1)); echo "  PASS  $1"; }
fail() { FAIL=$((FAIL+1)); echo "  FAIL  $1 -> ${2:-}"; }

echo "=== Build Validation ==="
echo ""

# dist/index.html exists and is non-trivial
[ -f "$DIST/index.html" ] && [ $(wc -c < "$DIST/index.html") -gt 10000 ] && pass "dist/index.html exists and >10KB" || fail "dist/index.html exists and >10KB"

# CSS files present
[ -f "$DIST/css/main.css" ] && pass "dist/css/main.css present" || fail "dist/css/main.css present"
[ -f "$DIST/css/tokens.css" ] && pass "dist/css/tokens.css present" || fail "dist/css/tokens.css present"

# No /api/content calls in baked build
! grep -q "fetch('/api/content')" "$DIST/index.html" && pass "No runtime API calls in dist" || fail "No runtime API calls in dist"

# Baked content contains required entities
for entity in "Home - Hero" "Site Config" "Solutions - underscore" "Solutions - underchat agent" "Solutions - AI Underwriting Copilot"; do
  grep -q "$entity" "$DIST/index.html" && pass "Baked entity: $entity" || fail "Baked entity: $entity" "Missing from dist"
done

# At least one Blog entity baked
grep -q "Blog - " "$DIST/index.html" && pass "Blog content baked" || fail "Blog content baked"

# No Fibery secrets/UUIDs leaked
! grep -qE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$DIST/index.html" && pass "No Fibery UUIDs in dist" || fail "No Fibery UUIDs in dist"

# No auth tokens
! grep -qiE 'Authorization.*Token [a-zA-Z0-9]' "$DIST/index.html" && pass "No auth tokens in dist" || fail "No auth tokens in dist"

# Images directory exists with files
[ -d "$DIST/images" ] && pass "dist/images/ directory exists" || fail "dist/images/ directory exists"

# Favicon present
[ -f "$DIST/favicon.svg" ] && pass "Favicon present" || fail "Favicon present"

echo ""
echo "Results: $((PASS+FAIL)) tests — PASS: $PASS, FAIL: $FAIL"
[ $FAIL -eq 0 ] && echo "ALL PASSED" && exit 0 || echo "FAILED" && exit 1
