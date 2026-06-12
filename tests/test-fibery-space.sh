#!/usr/bin/env bash
# =============================================================================
# FIBERY_SPACE parameterization tests
# =============================================================================
#
# Verifies every Fibery consumer derives its space prefix from the
# FIBERY_SPACE environment variable (default "CMS"), so dev builds can read
# "CMS Staging" while prod keeps reading "CMS".
#
# Live schema guards run build.py's exact queries against both spaces and
# require FIBERY_TOKEN (env or Keychain); they SKIP if no token is available.
#
# Usage:
#   bash tests/test-fibery-space.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed
# =============================================================================

set -uo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

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

# Import a python module by file path with controlled argv and print FIBERY_SPACE.
py_space() {  # $1 = file, $2 = env value or "" for unset
  local file="$1" envval="${2:-}"
  local prog
  prog=$(cat <<'PYEOF'
import importlib.util, sys
sys.argv = [sys.argv[1]]
spec = importlib.util.spec_from_file_location("mod_under_test", sys.argv[0])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print(mod.FIBERY_SPACE)
PYEOF
)
  if [ -n "$envval" ]; then
    FIBERY_SPACE="$envval" python3 -c "$prog" "$SITE_ROOT/$file" 2>/dev/null
  else
    env -u FIBERY_SPACE python3 -c "$prog" "$SITE_ROOT/$file" 2>/dev/null
  fi
}

check_py() {  # $1 = file, $2 = label
  local file="$1" label="$2" got
  got="$(py_space "$file" "")"
  if [ "$got" = "CMS" ]; then
    pass "${label}_space_default (unset -> CMS)"
  else
    fail "${label}_space_default" "expected CMS, got '$got'"
  fi
  got="$(py_space "$file" "CMS Staging")"
  if [ "$got" = "CMS Staging" ]; then
    pass "${label}_space_env_override (env -> CMS Staging)"
  else
    fail "${label}_space_env_override" "expected 'CMS Staging', got '$got'"
  fi
}

check_js() {  # $1 = file, $2 = label
  local file="$1" label="$2"
  if grep -qE "const FIBERY_SPACE *= *'CMS'" "$SITE_ROOT/$file"; then
    fail "${label}_space_env_derived" "hardcoded module-level FIBERY_SPACE constant still present"
  elif grep -q "env.FIBERY_SPACE || 'CMS'" "$SITE_ROOT/$file"; then
    pass "${label}_space_env_derived (env.FIBERY_SPACE || 'CMS')"
  else
    fail "${label}_space_env_derived" "no env-derived space found"
  fi
  if command -v node >/dev/null 2>&1; then
    if node --check "$SITE_ROOT/$file" 2>/dev/null; then
      pass "${label}_syntax_valid"
    else
      fail "${label}_syntax_valid" "node --check failed"
    fi
  else
    skip "${label}_syntax_valid (node not installed)"
  fi
}

section "Python consumers: env override"
check_py "build.py" "build"
check_py "undersight-serve.py" "serve"
check_py "deploy-report.py" "deploy_report"

section "JS consumers: per-request env derivation"
check_js "functions/api/whitepaper-lead.js" "pages_fn"
check_js "worker/index.js" "worker"

section "Live schema guards (build.py queries vs live Fibery)"
TOKEN_OK=0
if [ -n "${FIBERY_TOKEN:-}" ]; then
  TOKEN_OK=1
elif security find-generic-password -s mcp-credentials -a fibery-undersight -w >/dev/null 2>&1; then
  TOKEN_OK=1
fi

if [ "$TOKEN_OK" -eq 0 ]; then
  skip "live_schema_guard_cms (no FIBERY_TOKEN available)"
  skip "live_schema_guard_staging (no FIBERY_TOKEN available)"
else
  guard_prog=$(cat <<'PYEOF'
import importlib.util, sys
sys.argv = [sys.argv[1]]
spec = importlib.util.spec_from_file_location("build_mod", sys.argv[0])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
token = mod.get_token()
content = mod.fetch_all(token)
print("OK %d" % len(content) if isinstance(content, (dict, list)) else "OK")
PYEOF
)
  for space in "CMS" "CMS Staging"; do
    label="live_schema_guard_$(echo "$space" | tr '[:upper:] ' '[:lower:]_' | sed 's/_$//')"
    if out=$(FIBERY_SPACE="$space" python3 -c "$guard_prog" "$SITE_ROOT/build.py" 2>&1); then
      pass "$label (fetch_all green against '$space')"
    else
      fail "$label" "$(echo "$out" | tail -1)"
    fi
  done
fi

echo ""
echo -e "${BOLD}Results: ${GREEN}${PASS_COUNT} passed${RESET}, ${RED}${FAIL_COUNT} failed${RESET}, ${YELLOW}${SKIP_COUNT} skipped${RESET}"
[ "$FAIL_COUNT" -eq 0 ]
