#!/usr/bin/env bash
# =============================================================================
# CMS -> CMS Staging mirror test suite (track A4)
# =============================================================================
#
# Validates scripts/mirror-cms-to-staging.py end to end:
#   1. mirror_dry_run_plan        --dry-run prints the plan, makes zero writes
#   2. mirror_populates_staging   real run brings staging counts to parity
#   3. mirror_idempotent          second run: 0 creates / 0 doc writes / 0 uploads
#   4. mirror_content_hash_parity --verify exits 0 + chat-advance doc spot check
#   5. staging_leads_empty        CMS Staging/Website Leads stays at 0
#   6. staging_build_full_site    build.py against staging produces the full site
#
# NOTE: runs the real mirror (writes to the CMS Staging space only).
#
# Usage:
#   bash tests/test-mirror-staging.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed
# =============================================================================

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIRROR="$ROOT/scripts/mirror-cms-to-staging.py"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' BOLD='' RESET=''
fi

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "  ${GREEN}PASS${RESET}  $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo -e "  ${RED}FAIL${RESET}  $1"
  if [ -n "${2:-}" ]; then
    echo -e "        ${RED}-> $2${RESET}"
  fi
}

skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo -e "  ${YELLOW}SKIP${RESET}  $1"
}

section() {
  echo ""
  echo -e "${BOLD}=== $1 ===${RESET}"
}

finish() {
  echo ""
  echo -e "${BOLD}Results: $((PASS_COUNT + FAIL_COUNT + SKIP_COUNT)) tests — PASS: $PASS_COUNT, FAIL: $FAIL_COUNT, SKIP: $SKIP_COUNT${RESET}"
  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "ALL PASSED"
    exit 0
  else
    echo "FAILED"
    exit 1
  fi
}

count_entities() { # count_entities "<Space>/<DB>"
  fibery subscript query "$1" --select "fibery/id" --limit 300 2>/dev/null \
    | python3 -c "import json,sys; print(len([x for x in json.load(sys.stdin) if isinstance(x,dict)]))" 2>/dev/null \
    || echo "-1"
}

# Mirrored DBs (bash 3.2: parallel indexed arrays, no assoc arrays)
DBS=("Pages" "Blog" "Animations" "Emails" "Integrations")

# =============================================================================
section "Preflight"
# =============================================================================

if [ ! -f "$MIRROR" ]; then
  fail "mirror script exists at scripts/mirror-cms-to-staging.py"
  finish
fi
pass "mirror script exists at scripts/mirror-cms-to-staging.py"

# =============================================================================
section "mirror_dry_run_plan"
# =============================================================================

SRC_N=()
BEFORE_N=()
i=0
for db in "${DBS[@]}"; do
  SRC_N[$i]=$(count_entities "CMS/$db")
  BEFORE_N[$i]=$(count_entities "CMS Staging/$db")
  i=$((i + 1))
done

DRY_OUT=$(python3 "$MIRROR" --dry-run 2>&1)
DRY_RC=$?
if [ "$DRY_RC" -eq 0 ]; then
  pass "--dry-run exits 0"
else
  fail "--dry-run exits 0" "exit $DRY_RC"
  echo "$DRY_OUT" | tail -10
fi

echo "$DRY_OUT" | grep -q "EXCLUDED: CMS/Website Leads" \
  && pass "--dry-run prints Website Leads as EXCLUDED" \
  || fail "--dry-run prints Website Leads as EXCLUDED"

echo "$DRY_OUT" | grep -q "EXCLUDED: CMS/Deployments" \
  && pass "--dry-run prints Deployments as EXCLUDED" \
  || fail "--dry-run prints Deployments as EXCLUDED"

i=0
for db in "${DBS[@]}"; do
  EXPECT=$((SRC_N[$i] - BEFORE_N[$i]))
  if echo "$DRY_OUT" | grep -q "PLAN $db: create $EXPECT"; then
    pass "--dry-run plans $EXPECT creates for $db"
  else
    fail "--dry-run plans $EXPECT creates for $db" "no 'PLAN $db: create $EXPECT' line"
  fi
  i=$((i + 1))
done

i=0
for db in "${DBS[@]}"; do
  AFTER=$(count_entities "CMS Staging/$db")
  if [ "$AFTER" = "${BEFORE_N[$i]}" ]; then
    pass "--dry-run made zero writes to CMS Staging/$db (count ${AFTER})"
  else
    fail "--dry-run made zero writes to CMS Staging/$db" "before=${BEFORE_N[$i]} after=$AFTER"
  fi
  i=$((i + 1))
done

# =============================================================================
section "mirror_populates_staging"
# =============================================================================

RUN_OUT=$(python3 "$MIRROR" 2>&1)
RUN_RC=$?
if [ "$RUN_RC" -eq 0 ]; then
  pass "mirror run exits 0"
else
  fail "mirror run exits 0" "exit $RUN_RC"
  echo "$RUN_OUT" | tail -20
fi

i=0
for db in "${DBS[@]}"; do
  GOT=$(count_entities "CMS Staging/$db")
  if [ "$GOT" = "${SRC_N[$i]}" ]; then
    pass "CMS Staging/$db count $GOT == CMS/$db count"
  else
    fail "CMS Staging/$db count parity" "staging=$GOT source=${SRC_N[$i]}"
  fi
  i=$((i + 1))
done

# =============================================================================
section "mirror_idempotent"
# =============================================================================

RUN2_OUT=$(python3 "$MIRROR" 2>&1)
RUN2_RC=$?
if [ "$RUN2_RC" -eq 0 ]; then
  pass "second mirror run exits 0"
else
  fail "second mirror run exits 0" "exit $RUN2_RC"
  echo "$RUN2_OUT" | tail -20
fi

SUMMARY=$(echo "$RUN2_OUT" | grep "^SUMMARY " | tail -1)
for kv in "creates=0" "doc_writes=0" "file_uploads=0"; do
  if echo "$SUMMARY" | grep -q "$kv"; then
    pass "second run reports $kv"
  else
    fail "second run reports $kv" "summary: ${SUMMARY:-<missing SUMMARY line>}"
  fi
done

# =============================================================================
section "mirror_content_hash_parity"
# =============================================================================

VERIFY_OUT=$(python3 "$MIRROR" --verify 2>&1)
VERIFY_RC=$?
if [ "$VERIFY_RC" -eq 0 ]; then
  pass "--verify exits 0 (full parity)"
else
  fail "--verify exits 0 (full parity)" "exit $VERIFY_RC"
  echo "$VERIFY_OUT" | tail -30
fi

# Independent spot check: chat-advance blog markdown sha256 matches between
# spaces (own normalization, not the mirror script's code path).
if python3 - <<'PY'
import hashlib, json, subprocess, sys

def doc_md(space):
    out = subprocess.check_output(
        ["fibery", "subscript", "query", f"{space}/Blog",
         "--where", f"{space}/Slug=chat-advance",
         "--select", f"{space}/Description.Collaboration~Documents/secret",
         "--limit", "1"], text=True)
    rows = [r for r in json.loads(out) if isinstance(r, dict)]
    secret = rows[0][f"{space}/Description.Collaboration~Documents/secret"]
    doc = subprocess.check_output(
        ["fibery", "subscript", "doc", secret, "--format", "md"], text=True)
    return json.loads(doc)["content"]

def norm(md):
    md = (md or "").replace("\r\n", "\n")
    return "\n".join(line.rstrip() for line in md.split("\n"))

a = hashlib.sha256(norm(doc_md("CMS")).encode()).hexdigest()
b = hashlib.sha256(norm(doc_md("CMS Staging")).encode()).hexdigest()
print(f"  CMS sha256:         {a}")
print(f"  CMS Staging sha256: {b}")
sys.exit(0 if a == b else 1)
PY
then
  pass "chat-advance blog markdown sha256 matches between spaces"
else
  fail "chat-advance blog markdown sha256 matches between spaces"
fi

# =============================================================================
section "staging_leads_empty"
# =============================================================================

LEADS=$(count_entities "CMS Staging/Website Leads")
if [ "$LEADS" = "0" ]; then
  pass "CMS Staging/Website Leads count is 0"
else
  fail "CMS Staging/Website Leads count is 0" "got $LEADS"
fi

# =============================================================================
section "staging_build_full_site"
# =============================================================================

BUILD_OUT=$(cd "$ROOT" && FIBERY_SPACE="CMS Staging" python3 build.py --env dev 2>&1)
BUILD_RC=$?
if [ "$BUILD_RC" -eq 0 ]; then
  pass "build.py against CMS Staging exits 0"
else
  fail "build.py against CMS Staging exits 0" "exit $BUILD_RC"
  echo "$BUILD_OUT" | tail -20
fi

if echo "$BUILD_OUT" | grep -q "BUILD COMPLETE" && ! echo "$BUILD_OUT" | grep -q "under-construction fallback"; then
  pass "staging build is the full site (not under-construction fallback)"
else
  fail "staging build is the full site (not under-construction fallback)"
fi

echo "$BUILD_OUT" | grep -q "Site Mode: live" \
  && pass "staging Site Config carries Dev Mode: live" \
  || fail "staging Site Config carries Dev Mode: live" "no 'Site Mode: live' in build output"

if (cd "$ROOT" && bash tests/build-validation.sh > /tmp/mirror-staging-build-validation.log 2>&1); then
  pass "tests/build-validation.sh passes against staging dist/"
else
  fail "tests/build-validation.sh passes against staging dist/" "see /tmp/mirror-staging-build-validation.log"
  tail -20 /tmp/mirror-staging-build-validation.log
fi

finish
