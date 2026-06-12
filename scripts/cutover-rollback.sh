#!/usr/bin/env bash
# =============================================================================
# Staged auto-rollback — Fibery space rename Website -> CMS
# =============================================================================
# Usage:
#   bash scripts/cutover-rollback.sh --stage rename|build|full [--revert-sha <sha>]
#
# Stages (each includes the previous):
#   rename  G5 fail: only the Fibery rename happened. Rename CMS -> Website.
#   build   G6 fail: rename done, nothing new deployed. Also restore Site
#           Config to live and dispatch the production CI workflow (which
#           rebuilds the OLD world from main).
#   full    G7 fail: new code already on main/deployed. Also git-revert the
#           rename commit on main, push, redeploy via CI, roll back the
#           undersight-whitepaper Worker if it was deployed this window.
#
# Production deploys are CI-owned (.github/workflows/deploy-production.yml,
# cron + dispatch): local `wrangler pages deploy` would be overwritten by the
# next CI run, so rollback goes through git + workflow dispatch.
#
# Idempotent: each step checks current state before acting.
# =============================================================================
set -euo pipefail

STAGE=""
REVERT_SHA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --stage) STAGE="$2"; shift 2;;
    --revert-sha) REVERT_SHA="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 1;;
  esac
done
[ -n "$STAGE" ] || { echo "usage: cutover-rollback.sh --stage rename|build|full"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPACE_ID=$(python3 -c "import json;print(json.load(open('$ROOT/tests/cutover-baseline.json'))['space_id'])")
TOKEN=$(security find-generic-password -s mcp-credentials -a fibery-undersight -w)

rename_back() {
  if fibery undersight query "Website/Pages" --select "fibery/id" --limit 1 >/dev/null 2>&1; then
    echo "[rollback] space already named Website — skip rename"
    return
  fi
  echo "[rollback] renaming space CMS -> Website"
  curl -fsS -X POST "https://subscript.fibery.io/api/commands" \
    -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
    -d "[{\"command\":\"fibery.app/update\",\"args\":{\"fibery/id\":\"$SPACE_ID\",\"fibery/name\":\"Website\",\"fibery/title\":\"Website\",\"fibery/namespace\":\"Website\"}}]" \
    | grep -q '"success":true' || { echo "[rollback] FATAL: rename-back failed"; exit 1; }
  fibery undersight query "Website/Pages" --select "fibery/id" --limit 1 >/dev/null \
    || { echo "[rollback] FATAL: Website/Pages not queryable after rename-back"; exit 1; }
  echo "[rollback] Website/* restored"
}

flag_live() {
  bash "$ROOT/scripts/site-mode.sh" live
}

dispatch_ci_and_wait() {
  echo "[rollback] dispatching deploy-production workflow"
  (cd "$ROOT" && gh workflow run deploy-production.yml)
  sleep 20
  for _ in $(seq 1 30); do
    STATUS=$(cd "$ROOT" && gh run list --workflow deploy-production.yml -L1 \
      --json status,conclusion -q '.[0].status + "/" + (.[0].conclusion // "-")')
    echo "[rollback] CI: $STATUS"
    case "$STATUS" in
      completed/success) return 0;;
      completed/*) echo "[rollback] FATAL: CI run failed"; return 1;;
    esac
    sleep 20
  done
  echo "[rollback] FATAL: CI run did not finish in 10 min"; return 1
}

revert_main() {
  [ -n "$REVERT_SHA" ] || { echo "[rollback] no --revert-sha given; skip git revert (verify main manually)"; return; }
  echo "[rollback] reverting $REVERT_SHA on main"
  (cd "$ROOT" \
    && git fetch origin main \
    && git checkout main && git pull --ff-only origin main \
    && git revert --no-edit "$REVERT_SHA" \
    && git push origin main)
}

worker_rollback() {
  if [ -f "/tmp/cutover-worker-deployed" ]; then
    echo "[rollback] rolling back undersight-whitepaper Worker"
    (cd "$ROOT/worker" && wrangler rollback --yes 2>/dev/null || wrangler rollback)
  else
    echo "[rollback] worker was not deployed this window — skip"
  fi
}

case "$STAGE" in
  rename)
    rename_back
    ;;
  build)
    rename_back
    flag_live
    dispatch_ci_and_wait
    ;;
  full)
    rename_back
    flag_live
    revert_main
    worker_rollback
    dispatch_ci_and_wait
    bash "$ROOT/tests/cutover-smoke.sh" prod --space Website
    ;;
  *) echo "unknown stage: $STAGE" >&2; exit 1;;
esac

echo "[rollback] stage '$STAGE' complete"
