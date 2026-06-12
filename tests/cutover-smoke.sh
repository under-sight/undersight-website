#!/usr/bin/env bash
# =============================================================================
# Cutover smoke test — Fibery space rename Website -> CMS
# =============================================================================
# Usage:
#   bash tests/cutover-smoke.sh <stage> [--space Website|CMS|"CMS Staging"] [--baseline <path>]
#
#   --baseline defaults to tests/cutover-baseline.json; pass
#   tests/cutover-baseline-staging.json with --space "CMS Staging" to smoke
#   the mirrored staging space. A baseline may set "other_space" to override
#   the opposite-prefix-absent check (default: Website<->CMS).
#
# Stages:
#   fibery   entity counts per DB match tests/cutover-baseline.json under the
#            given space prefix, and the opposite space prefix is absent
#   build    python3 build.py --env production produces a FULL site (not the
#            under-construction fallback) and the baseline blog page exists
#   uc       production URL serves the under-construction page
#   prod     production URL serves the full site; blog page live; lead API
#            alive; Fibery write path works under the given space prefix
#
# Exit codes: 0 = all pass, 1 = any fail
# =============================================================================
set -euo pipefail

STAGE="${1:?usage: cutover-smoke.sh fibery|build|uc|prod [--space <Space>] [--baseline <path>]}"
shift
SPACE="CMS"
BASELINE_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --space)    SPACE="${2:?--space needs a value}"; shift 2;;
    --baseline) BASELINE_ARG="${2:?--baseline needs a path}"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 1;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="${BASELINE_ARG:-$ROOT/tests/cutover-baseline.json}"
PROD_URL=$(python3 -c "import json;print(json.load(open('$BASELINE'))['prod_url'])")
SLUG=$(python3 -c "import json;print(json.load(open('$BASELINE'))['blog_slug'])")
UC_MARKER=$(python3 -c "import json;print(json.load(open('$BASELINE'))['uc_marker'])")

PASS_COUNT=0
FAIL_COUNT=0
pass() { PASS_COUNT=$((PASS_COUNT + 1)); echo "  PASS  $1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL  $1"; }

count_entities() { # count_entities "<Type>"
  fibery undersight query "$1" --select "fibery/id" --limit 200 2>/dev/null \
    | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "-1"
}

case "$STAGE" in
  fibery)
    OTHER=$(python3 -c "import json;print(json.load(open('$BASELINE')).get('other_space',''))")
    [ -n "$OTHER" ] || OTHER=$([ "$SPACE" = "CMS" ] && echo "Website" || echo "CMS")
    while IFS=$'\t' read -r db expected minbound; do
      got=$(count_entities "$SPACE/$db")
      if [ "$minbound" = "1" ]; then
        [ "$got" -ge "$expected" ] && pass "$SPACE/$db count $got >= $expected" \
                                   || fail "$SPACE/$db count $got < $expected"
      else
        [ "$got" -eq "$expected" ] && pass "$SPACE/$db count $got" \
                                   || fail "$SPACE/$db count $got != $expected"
      fi
    done < <(python3 -c "
import json
b = json.load(open('$BASELINE'))
for db, n in b['entity_counts'].items():
    print(f\"{db}\t{n}\t{int(db in b['min_bound_dbs'])}\")")
    if fibery undersight query "$OTHER/Pages" --select "fibery/id" --limit 1 >/dev/null 2>&1; then
      fail "$OTHER/Pages still queryable (space not renamed)"
    else
      pass "$OTHER/Pages absent"
    fi
    ;;

  build)
    OUT=$(cd "$ROOT" && python3 build.py --env production 2>&1) || { fail "build.py exited non-zero"; echo "$OUT" | tail -5; }
    if echo "$OUT" | grep -q "BUILD COMPLETE" && ! echo "$OUT" | grep -q "under-construction fallback"; then
      pass "full build completed (not fallback)"
    else
      fail "build fell back to under-construction (Fibery fetch failed?)"
    fi
    # single-page build: blog catalog is baked into dist/index.html
    grep -q "$SLUG" "$ROOT/dist/index.html" 2>/dev/null && pass "dist/index.html contains blog slug $SLUG" \
                                                        || fail "dist/index.html missing blog slug $SLUG"
    ;;

  uc)
    BODY=$(curl -fsS --max-time 30 "$PROD_URL/?cutover=$(date +%s)") || { fail "GET / failed"; BODY=""; }
    echo "$BODY" | grep -q "$UC_MARKER" && pass "under-construction page live" \
                                        || fail "UC marker '$UC_MARKER' not found on /"
    ;;

  prod)
    BODY=$(curl -fsS --max-time 30 "$PROD_URL/?cutover=$(date +%s)") || { fail "GET / failed"; BODY=""; }
    if [ -n "$BODY" ] && ! echo "$BODY" | grep -q "$UC_MARKER"; then
      pass "full site live (no UC marker)"
    else
      fail "/ still shows under-construction"
    fi
    echo "$BODY" | grep -q "$SLUG" && pass "blog slug $SLUG baked into /" \
                                   || fail "blog slug $SLUG missing from /"
    # Lead API alive: valid payload without a Turnstile token.
    # 403 = function alive, Turnstile enforced (the only acceptable outcome).
    # 200 = CF_TURNSTILE_SECRET_KEY missing from the Pages deployment, so bot
    #       protection is silently off and a real lead was created -> clean it
    #       up AND fail. Re-set the secret (Pages > Settings > Variables and
    #       Secrets, Production + Preview) and redeploy.
    WP=$(python3 -c "import json;print(json.load(open('$BASELINE'))['whitepaper_name'])")
    TEST_EMAIL="cutover-test+$(date +%s)@undersight.ai"
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST \
      -H "Content-Type: application/json" -H "Origin: $PROD_URL" \
      -d "{\"email\":\"$TEST_EMAIL\",\"whitepaper\":\"$WP\"}" \
      "$PROD_URL/api/whitepaper-lead")
    case "$CODE" in
      403) pass "lead API alive (403 Turnstile-enforced)";;
      200) fail "tokenless lead POST returned 200 — Turnstile is OFF in prod"
           LEAD_ID=$(fibery undersight query "$SPACE/Blog Leads" \
             --where "$SPACE/Email=$TEST_EMAIL" --select "fibery/id" --limit 1 2>/dev/null \
             | python3 -c "import json,sys; r=json.load(sys.stdin); print(r[0]['fibery/id'] if r else '')")
           [ -n "$LEAD_ID" ] && fibery undersight delete "$LEAD_ID" --type "$SPACE/Blog Leads" --yes >/dev/null 2>&1 || true
           ;;
      *)   fail "lead API returned $CODE (expected 403)";;
    esac
    # Fibery write path under the active prefix: create + delete a rank-only lead.
    EID=$(fibery undersight create "$SPACE/Blog Leads" --fields '{"fibery/rank":1}' 2>/dev/null \
      | python3 -c "import json,sys; print(json.load(sys.stdin)['fibery/id'])") || EID=""
    if [ -n "$EID" ]; then
      fibery undersight delete "$EID" --type "$SPACE/Blog Leads" --yes >/dev/null 2>&1 || true
      pass "Fibery write path OK ($SPACE/Blog Leads create+delete)"
    else
      fail "Fibery create failed on $SPACE/Blog Leads"
    fi
    ;;

  *) echo "unknown stage: $STAGE" >&2; exit 1;;
esac

echo
echo "cutover-smoke[$STAGE --space $SPACE]: $PASS_COUNT pass, $FAIL_COUNT fail"
[ "$FAIL_COUNT" -eq 0 ]
