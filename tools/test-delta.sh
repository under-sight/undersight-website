#!/usr/bin/env bash
# =============================================================================
# tools/test-delta.sh
# =============================================================================
# Run tests/test-suite.sh against two worktrees (baseline + merge-preview) and
# emit a delta summary. Sequential — uses port 8088 then 8089 (the suite
# hardcodes 8088, so for the merge-preview run we set BASE=...:8089 via env
# fallback if the suite supports it, otherwise we re-run on 8088 after killing
# the baseline server).
#
# Usage:
#   tools/test-delta.sh <branch>
#
# Inputs (env, optional):
#   WT_BASELINE  worktree dir for origin/main (default: /tmp/wt-baseline)
#   WT_PREVIEW   worktree dir for merge-preview (default: /tmp/wt-<branch>)
#
# Outputs:
#   /tmp/test-base-<safebranch>.log         baseline raw stdout
#   /tmp/test-after-<safebranch>.log        merge-preview raw stdout
#   /tmp/test-delta-<safebranch>.diff       unified diff of the two logs
#   /tmp/test-summary-<safebranch>.md       markdown summary for PR body
# Exit 0 on success regardless of test outcome (test outcome is in the report).
# =============================================================================

set -uo pipefail

BRANCH="${1:-}"
if [ -z "$BRANCH" ]; then
  echo "usage: test-delta.sh <branch>" >&2
  exit 64
fi

SAFE_BRANCH="${BRANCH//\//__}"
WT_BASELINE="${WT_BASELINE:-/tmp/wt-baseline}"
WT_PREVIEW="${WT_PREVIEW:-/tmp/wt-$SAFE_BRANCH}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
PORT=8088

BASE_LOG="/tmp/test-base-$SAFE_BRANCH.log"
AFTER_LOG="/tmp/test-after-$SAFE_BRANCH.log"
DELTA_DIFF="/tmp/test-delta-$SAFE_BRANCH.diff"
SUMMARY_MD="/tmp/test-summary-$SAFE_BRANCH.md"

# ---------- helpers ----------
# Sets global SERVER_PID. Returns 0 if port came up, 1 on timeout.
# Avoids command substitution because the backgrounded python child inherits
# the substitution pipe and would block the caller from ever closing it.
serve_and_wait() {
  local dir="$1"
  ( cd "$dir" && exec python3 undersight-serve.py "$PORT" ) \
    >/tmp/serve-$SAFE_BRANCH.log 2>&1 </dev/null &
  SERVER_PID=$!
  local i=0
  while [ $i -lt 30 ]; do
    if curl -fsS -o /dev/null "http://localhost:$PORT/"; then
      return 0
    fi
    sleep 0.5
    i=$((i+1))
  done
  return 1
}

kill_server() {
  local pid="$1"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    wait "$pid" 2>/dev/null || true
  fi
  # Also kill anything else still on the port (e.g. forked children).
  lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null || true
}

# Sets global SUITE_EXIT.
run_suite() {
  local dir="$1" out="$2"
  ( cd "$dir" && bash tests/test-suite.sh ) > "$out" 2>&1
  SUITE_EXIT=$?
}

parse_counts() {
  # Parse the suite's "PASS:" / "FAIL:" summary lines (strip ANSI).
  local log="$1"
  local plain
  plain="$(sed 's/\x1b\[[0-9;]*m//g' "$log")"
  local pass fail skip
  pass="$(echo "$plain" | awk '/^[[:space:]]+PASS:[[:space:]]+[0-9]+/ {print $2}' | tail -1)"
  fail="$(echo "$plain" | awk '/^[[:space:]]+FAIL:[[:space:]]+[0-9]+/ {print $2}' | tail -1)"
  skip="$(echo "$plain" | awk '/^[[:space:]]+SKIP:[[:space:]]+[0-9]+/ {print $2}' | tail -1)"
  echo "${pass:-0} ${fail:-0} ${skip:-0}"
}

extract_failures() {
  local log="$1"
  sed 's/\x1b\[[0-9;]*m//g' "$log" | awk '/^[[:space:]]+FAIL[[:space:]]/ {sub(/^[[:space:]]+FAIL[[:space:]]+/, ""); print}'
}

# ---------- baseline run ----------
echo "[delta] baseline run in $WT_BASELINE on :$PORT"
lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null || true
SERVER_PID=""
serve_and_wait "$WT_BASELINE" || { echo "[delta] baseline server failed to bind :$PORT"; cat /tmp/serve-$SAFE_BRANCH.log; }
BASE_SRV_PID="$SERVER_PID"
SUITE_EXIT=0
run_suite "$WT_BASELINE" "$BASE_LOG"
BASE_EXIT="$SUITE_EXIT"
kill_server "$BASE_SRV_PID"
sleep 1

# ---------- merge-preview run ----------
echo "[delta] merge-preview run in $WT_PREVIEW on :$PORT"
SERVER_PID=""
serve_and_wait "$WT_PREVIEW" || { echo "[delta] preview server failed to bind :$PORT"; cat /tmp/serve-$SAFE_BRANCH.log; }
AFTER_SRV_PID="$SERVER_PID"
SUITE_EXIT=0
run_suite "$WT_PREVIEW" "$AFTER_LOG"
AFTER_EXIT="$SUITE_EXIT"
kill_server "$AFTER_SRV_PID"

# ---------- diff + summary ----------
diff -u "$BASE_LOG" "$AFTER_LOG" > "$DELTA_DIFF" || true

read -r BP BF BS <<< "$(parse_counts "$BASE_LOG")"
read -r AP AF AS <<< "$(parse_counts "$AFTER_LOG")"

# Failure set diff (which named tests newly fail / newly pass).
BASE_FAILS="$(extract_failures "$BASE_LOG" | sort -u)"
AFTER_FAILS="$(extract_failures "$AFTER_LOG" | sort -u)"
NEWLY_FAILING="$(comm -13 <(echo "$BASE_FAILS") <(echo "$AFTER_FAILS") | grep -v '^$' || true)"
NEWLY_FIXED="$(comm -23 <(echo "$BASE_FAILS") <(echo "$AFTER_FAILS") | grep -v '^$' || true)"
STILL_FAILING="$(comm -12 <(echo "$BASE_FAILS") <(echo "$AFTER_FAILS") | grep -v '^$' || true)"

{
  echo "## Test delta (tests/test-suite.sh)"
  echo ""
  echo "| | Pass | Fail | Skip | Exit |"
  echo "|---|---|---|---|---|"
  echo "| Baseline (\`origin/main\`) | $BP | $BF | $BS | $BASE_EXIT |"
  echo "| Merge-preview | $AP | $AF | $AS | $AFTER_EXIT |"
  echo ""
  if [ -n "$NEWLY_FAILING" ]; then
    echo "### Newly failing"
    echo "$NEWLY_FAILING" | sed 's/^/- /'
    echo ""
  fi
  if [ -n "$NEWLY_FIXED" ]; then
    echo "### Newly fixed"
    echo "$NEWLY_FIXED" | sed 's/^/- /'
    echo ""
  fi
  if [ -n "$STILL_FAILING" ]; then
    echo "### Still failing (pre-existing)"
    echo "$STILL_FAILING" | sed 's/^/- /'
    echo ""
  fi
  echo "Full delta: \`$DELTA_DIFF\`"
} > "$SUMMARY_MD"

cat "$SUMMARY_MD"
