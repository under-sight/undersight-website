#!/usr/bin/env bash
# =============================================================================
# tools/raise-merged-prs.sh
# =============================================================================
# For each remote branch that is ahead of origin/main and doesn't already have
# an open PR, build a merge-preview worktree, capture a test delta, look up
# the source Fibery entity, validate diff scope vs Fibery intent, and open a
# PR with all of that in the body.
#
# Usage:
#   tools/raise-merged-prs.sh                  # default: real run
#   tools/raise-merged-prs.sh --dry-run        # build everything, no gh pr create
#   tools/raise-merged-prs.sh --no-tests       # skip test-delta (faster)
#   tools/raise-merged-prs.sh --only BRANCH    # restrict to one branch (repeatable)
#
# Outputs PR URLs (or dry-run body paths) on stdout. Branches that hit merge
# conflicts are listed in /tmp/manual-review.txt and reported at end.
# =============================================================================

set -uo pipefail

cd "$(git rev-parse --show-toplevel)"

DRY_RUN=0
SKIP_TESTS=0
ONLY=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --no-tests) SKIP_TESTS=1; shift ;;
    --only) ONLY+=("$2"); shift 2 ;;
    -h|--help) sed -n '1,30p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 64 ;;
  esac
done

BASE_BRANCH="${BASE_BRANCH:-main}"
WT_BASELINE="/tmp/wt-baseline"
MANUAL_REVIEW="/tmp/manual-review.txt"
: > "$MANUAL_REVIEW"

echo "[orch] fetching..."
git fetch --all --prune --quiet

# Tear down stale baseline worktree if present, rebuild on origin/main.
if [ -d "$WT_BASELINE" ]; then
  git worktree remove "$WT_BASELINE" --force 2>/dev/null || rm -rf "$WT_BASELINE"
fi
git worktree add --detach "$WT_BASELINE" "origin/$BASE_BRANCH" >/dev/null
echo "[orch] baseline worktree at $WT_BASELINE @ $(git -C "$WT_BASELINE" rev-parse --short HEAD)"

# Discover candidates: remote branches ahead of base, not base/dev/HEAD.
CANDIDATES=()
while read -r refline; do
  refline="${refline# *}"
  refline="${refline#origin/}"
  [ -z "$refline" ] && continue
  case "$refline" in
    HEAD|"HEAD -> "*|"$BASE_BRANCH"|dev) continue ;;
  esac
  read -r behind ahead <<< "$(git rev-list --left-right --count "origin/$BASE_BRANCH...origin/$refline")"
  [ "${ahead:-0}" = "0" ] && continue
  CANDIDATES+=("$refline")
done < <(git branch -r --list 'origin/*' | grep -v ' -> ')

# Apply --only filter
if [ ${#ONLY[@]} -gt 0 ]; then
  FILTERED=()
  for c in "${CANDIDATES[@]}"; do
    for o in "${ONLY[@]}"; do
      [ "$c" = "$o" ] && FILTERED+=("$c")
    done
  done
  CANDIDATES=("${FILTERED[@]}")
fi

echo "[orch] candidates: ${CANDIDATES[*]:-<none>}"
echo ""

CREATED=()
SKIPPED=()

for B in "${CANDIDATES[@]}"; do
  SAFE_B="${B//\//__}"
  WT_PREVIEW="/tmp/wt-$SAFE_B"
  echo "============================================================"
  echo "[orch] processing $B"
  echo "============================================================"

  # Skip if a PR already exists.
  existing_pr="$(gh pr list --head "$B" --state open --json number,url 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['url'] if d else '')" 2>/dev/null || true)"
  if [ -n "$existing_pr" ]; then
    echo "[orch] open PR already exists: $existing_pr"
    SKIPPED+=("$B  (existing PR: $existing_pr)")
    continue
  fi

  # Build merge-preview worktree.
  if [ -d "$WT_PREVIEW" ]; then
    git worktree remove "$WT_PREVIEW" --force 2>/dev/null || rm -rf "$WT_PREVIEW"
  fi
  git worktree add --detach "$WT_PREVIEW" "origin/$BASE_BRANCH" >/dev/null
  if ! ( cd "$WT_PREVIEW" && git merge --no-ff --no-commit "origin/$B" >/tmp/merge-$SAFE_B.log 2>&1 ); then
    conflicts="$(cd "$WT_PREVIEW" && git diff --name-only --diff-filter=U | tr '\n' ' ')"
    echo "[orch] MERGE CONFLICT on $B: $conflicts"
    echo "$B  CONFLICTS: $conflicts" >> "$MANUAL_REVIEW"
    ( cd "$WT_PREVIEW" && git merge --abort 2>/dev/null || true )
    git worktree remove "$WT_PREVIEW" --force 2>/dev/null || rm -rf "$WT_PREVIEW"
    continue
  fi

  # Fibery ticket lookup.
  ticket_json="$(./tools/fibery-ticket.sh "$B" 2>/dev/null || echo '{"match":null}')"
  ticket_name="$(echo "$ticket_json" | python3 -c "import json,sys; d=json.load(sys.stdin).get('match'); print(d['name'] if d else '')")"
  ticket_pid="$(echo "$ticket_json" | python3 -c "import json,sys; d=json.load(sys.stdin).get('match'); print(d['public_id'] if d else '')")"
  ticket_url="$(echo "$ticket_json" | python3 -c "import json,sys; d=json.load(sys.stdin).get('match'); print(d['url'] if d else '')")"
  ticket_conf="$(echo "$ticket_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('confidence','none'))")"

  # Test delta (optional).
  test_section=""
  if [ "$SKIP_TESTS" = "0" ]; then
    echo "[orch] running test delta for $B..."
    WT_BASELINE="$WT_BASELINE" WT_PREVIEW="$WT_PREVIEW" ./tools/test-delta.sh "$B" >/dev/null || true
    if [ -f "/tmp/test-summary-$SAFE_B.md" ]; then
      test_section="$(cat /tmp/test-summary-$SAFE_B.md)"
    else
      test_section="_test-delta produced no summary_"
    fi
  else
    test_section="_tests skipped (--no-tests)_"
  fi

  # Diff scope + intent-vs-diff flags.
  diff_stat="$(git diff "origin/$BASE_BRANCH...origin/$B" --stat | tail -1)"
  diff_files="$(git diff "origin/$BASE_BRANCH...origin/$B" --name-only)"
  intent_flags=""
  if [ -n "$ticket_name" ]; then
    # Naive heuristic: each meaningful word in the ticket name should at least
    # show up in either commit messages or diff filenames. Flag any miss.
    for w in $(echo "$ticket_name" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' ' '); do
      case "$w" in solutions|the|a|an|of|for|and|with|page) continue ;; esac
      [ ${#w} -lt 4 ] && continue
      if ! echo "$diff_files" $'\n' "$(git log "origin/$BASE_BRANCH..origin/$B" --format=%B | tr '[:upper:]' '[:lower:]')" | grep -qF "$w"; then
        intent_flags+="- :warning: Fibery name mentions \`$w\` but diff/commits don't reference it"$'\n'
      fi
    done
  else
    intent_flags="- :grey_question: No Fibery entity matched for this branch (confidence: $ticket_conf)"$'\n'
  fi
  [ -z "$intent_flags" ] && intent_flags="- :white_check_mark: Diff scope aligns with Fibery entity tokens"$'\n'

  # Assemble PR body.
  PR_TITLE="${ticket_pid:+#$ticket_pid: }${ticket_name:-$B}"
  [ -z "$ticket_name" ] && PR_TITLE="$B"
  BODY="/tmp/pr-body-$SAFE_B.md"
  {
    echo "## Fibery entity"
    if [ -n "$ticket_name" ]; then
      echo "[#$ticket_pid — $ticket_name]($ticket_url)  · match confidence: \`$ticket_conf\`"
    else
      echo "_No Fibery entity auto-matched (\`$ticket_conf\`). Reviewer: please link the source ticket._"
    fi
    echo ""
    echo "## Diff scope"
    echo "\`\`\`"
    echo "$diff_stat"
    echo "\`\`\`"
    echo ""
    echo "$test_section"
    echo ""
    echo "## Intent vs diff"
    echo "$intent_flags"
    echo ""
    echo "## Verification checklist"
    echo "- [ ] Visual check on dev URL (\`https://dev.undersight-website.pages.dev\`) after deploy-dev runs"
    echo "- [ ] Fibery entity content matches the rendered page"
    echo "- [ ] No newly-failing tests, or new failures explained"
    echo ""
    echo "---"
    echo "_Auto-generated by \`tools/raise-merged-prs.sh\`_"
  } > "$BODY"

  # Open the PR (or just print the body in dry-run).
  if [ "$DRY_RUN" = "1" ]; then
    echo "[orch] DRY-RUN body written to $BODY"
    echo "         title: $PR_TITLE"
    CREATED+=("DRY: $B → $BODY")
  else
    if pr_url="$(gh pr create --base "$BASE_BRANCH" --head "$B" --title "$PR_TITLE" --body-file "$BODY" 2>&1)"; then
      echo "[orch] PR created: $pr_url"
      CREATED+=("$B → $pr_url")
    else
      echo "[orch] gh pr create FAILED for $B: $pr_url"
      SKIPPED+=("$B  (gh pr create failed)")
    fi
  fi

  # Tear down preview worktree.
  git worktree remove "$WT_PREVIEW" --force 2>/dev/null || rm -rf "$WT_PREVIEW"
done

# Tear down baseline.
git worktree remove "$WT_BASELINE" --force 2>/dev/null || rm -rf "$WT_BASELINE"

echo ""
echo "============================================================"
echo "[orch] DONE"
echo "============================================================"
echo "Created/dry: ${#CREATED[@]}"
[ ${#CREATED[@]} -gt 0 ] && for c in "${CREATED[@]}"; do echo "  $c"; done
echo "Skipped: ${#SKIPPED[@]}"
[ ${#SKIPPED[@]} -gt 0 ] && for s in "${SKIPPED[@]}"; do echo "  $s"; done
if [ -s "$MANUAL_REVIEW" ]; then
  echo ""
  echo "MANUAL_REVIEW (merge conflicts — open PR by hand):"
  cat "$MANUAL_REVIEW" | sed 's/^/  /'
fi
