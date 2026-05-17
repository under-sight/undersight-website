#!/usr/bin/env bash
# =============================================================================
# tools/fibery-ticket.sh
# =============================================================================
# Given a branch name, mine its commit messages for tokens that point at a
# Fibery entity (Website/Pages preferred, then Roadmap/Tasks), and emit a JSON
# blob with public-id, name, URL, and confidence.
#
# Usage:
#   tools/fibery-ticket.sh <branch>            # auto-detect
#   tools/fibery-ticket.sh <branch> <entity>   # force-match a Page name
#
# Output (stdout): one JSON object. On no match, "match":null with candidates.
# =============================================================================

set -euo pipefail

BRANCH="${1:-}"
FORCE_NAME="${2:-}"
FIBERY="${FIBERY:-/Users/kyle/bin/fibery}"
CACHE_DIR="${CACHE_DIR:-/tmp}"
WORKSPACE_URL="https://subscript.fibery.io"

if [ -z "$BRANCH" ]; then
  echo '{"error":"usage: fibery-ticket.sh <branch> [entity-name]"}' >&2
  exit 64
fi

# Cache by branch tip SHA so we re-resolve when commits change.
SHA="$(git rev-parse "origin/$BRANCH" 2>/dev/null || git rev-parse "$BRANCH")"
SAFE_BRANCH="${BRANCH//\//__}"
CACHE_FILE="$CACHE_DIR/fibery-ticket-$SAFE_BRANCH-$SHA.json"
if [ -f "$CACHE_FILE" ] && [ -z "$FORCE_NAME" ]; then
  cat "$CACHE_FILE"
  exit 0
fi

query_pages_by_name() {
  local needle="$1"
  "$FIBERY" undersight query "Website/Pages" \
    --select "Website/Name,fibery/public-id" \
    --limit 50 2>/dev/null \
  | python3 -c "
import json, sys, re
needle = sys.argv[1].lower()
data = json.load(sys.stdin)
hits = [r for r in data if needle in r.get('Website/Name','').lower()]
print(json.dumps(hits))
" "$needle"
}

emit_match() {
  local pid="$1" name="$2" conf="$3" db="$4"
  jq -n \
    --arg pid "$pid" --arg name "$name" --arg conf "$conf" --arg db "$db" \
    --arg url "$WORKSPACE_URL/${db//\//-}/$pid" \
    '{match: {public_id: $pid, name: $name, database: $db, url: $url}, confidence: $conf}' \
  | tee "$CACHE_FILE"
}

# Forced match short-circuit.
if [ -n "$FORCE_NAME" ]; then
  hits="$(query_pages_by_name "$FORCE_NAME")"
  count="$(echo "$hits" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")"
  if [ "$count" = "1" ]; then
    pid="$(echo "$hits" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['fibery/public-id'])")"
    name="$(echo "$hits" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['Website/Name'])")"
    emit_match "$pid" "$name" "forced" "Website/Pages"
    exit 0
  fi
  echo "{\"match\":null,\"error\":\"forced name '$FORCE_NAME' matched $count Pages\",\"candidates\":$hits}" | tee "$CACHE_FILE"
  exit 0
fi

# Auto-detect: branch-name tokens first (strongest signal), then commit-body
# tokens. The first single-match token wins. If no single match, the
# tightest multi-match wins.
BRANCH_TOKENS_FILE="$(mktemp)"
BODY_TOKENS_FILE="$(mktemp)"

STOPWORDS='(the|and|for|with|from|page|pages|file|files|test|tests|main|dev|feat|feature|branch|merge|push|claude|author|opus|context|noreply|anthropic|com|sync|update|fix|adds?|add|to|in|on|of|by|a|an|is|was|now|new|old|render|wires?|wired|all|are|that|this|its?|like|just|also|both|solution|solutions)'

echo "$BRANCH" | tr '/_-' '\n\n\n' \
  | tr '[:upper:]' '[:lower:]' \
  | awk 'length($0) >= 4' \
  | grep -vxE "$STOPWORDS" \
  | awk '!seen[$0]++' > "$BRANCH_TOKENS_FILE"

git log "origin/main..origin/$BRANCH" --format='%s%n%b' 2>/dev/null \
  | tr '[:punct:]' ' ' \
  | tr '[:upper:]' '[:lower:]' \
  | tr -s ' \t' '\n' \
  | awk 'length($0) >= 4' \
  | grep -vxE "$STOPWORDS" \
  | awk '!seen[$0]++' > "$BODY_TOKENS_FILE"

BEST_NAME=""
BEST_PID=""
BEST_COUNT=999
BEST_TOKEN=""

try_tokens() {
  local file="$1" source="$2" tok hits n picked_name picked_pid
  while IFS= read -r tok || [ -n "$tok" ]; do
    [ -z "$tok" ] && continue
    hits="$(query_pages_by_name "$tok" 2>/dev/null || echo '[]')"
    n="$(echo "$hits" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)"
    if [ "$n" -ge 1 ] && [ "$n" -lt "$BEST_COUNT" ]; then
      # Within hits, prefer Solutions-* over Blog-* etc.
      picked_name="$(echo "$hits" | python3 -c "
import json, sys
hits = json.load(sys.stdin)
hits.sort(key=lambda h: (not h.get('Website/Name','').startswith('Solutions'), h.get('Website/Name','')))
print(hits[0]['Website/Name'])")"
      picked_pid="$(echo "$hits" | python3 -c "
import json, sys
hits = json.load(sys.stdin)
hits.sort(key=lambda h: (not h.get('Website/Name','').startswith('Solutions'), h.get('Website/Name','')))
print(hits[0]['fibery/public-id'])")"
      BEST_COUNT="$n"
      BEST_NAME="$picked_name"
      BEST_PID="$picked_pid"
      BEST_TOKEN="$tok ($source)"
      [ "$BEST_COUNT" = "1" ] && return 0
    fi
  done < "$file"
  return 0
}

try_tokens "$BRANCH_TOKENS_FILE" "branch" || true
# Only fall through to commit-body tokens if the branch produced ZERO hits.
# A noisy branch can still pick the right Solutions-* page via the prefix
# preference inside try_tokens.
if [ -z "$BEST_PID" ]; then
  try_tokens "$BODY_TOKENS_FILE" "commit" || true
fi

rm -f "$BRANCH_TOKENS_FILE" "$BODY_TOKENS_FILE"

if [ -n "$BEST_PID" ] && [ "$BEST_COUNT" = "1" ]; then
  emit_match "$BEST_PID" "$BEST_NAME" "auto" "Website/Pages"
elif [ -n "$BEST_PID" ]; then
  emit_match "$BEST_PID" "$BEST_NAME" "auto-low (multi-match, took first)" "Website/Pages"
else
  echo "{\"match\":null,\"confidence\":\"none\",\"candidates\":[]}" | tee "$CACHE_FILE"
fi

