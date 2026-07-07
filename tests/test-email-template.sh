#!/usr/bin/env bash
# =============================================================================
# Validates email-templates/download-dispatch.fibery.txt — the exact text
# pasted into the "undersight research dispatch" Fibery automation
# (CMS/Blog Leads → Send Email action). Rules from docs/ARCHITECTURE.md
# "Critical formatting rules for Fibery email HTML".
#
# Usage: bash tests/test-email-template.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
T="$ROOT/email-templates/download-dispatch.fibery.txt"
FAIL=0

check() { # name, condition-result (0/1)
  if [ "$2" -eq 0 ]; then echo "PASS: $1"; else echo "FAIL: $1"; FAIL=1; fi
}

[ -f "$T" ] || { echo "FAIL: template file missing: $T"; exit 1; }

# 1. Zero indentation — markdown mode treats 4+ leading spaces as code blocks
grep -qE '^[ \t]+' "$T" && r=1 || r=0
check "no indented lines" $r

# 2. Relation preload directive present on line 1
head -1 "$T" | grep -q '^{! Blog Post:Name,PDF !}$' && r=0 || r=1
check "{! Blog Post:Name,PDF !} preload is line 1" $r

# 3. Preload appears exactly once (old template had it doubled)
[ "$(grep -c '{! Blog Post' "$T")" -eq 1 ] && r=0 || r=1
check "preload appears exactly once" $r

# 4. Generic copy — no 'research piece' anywhere
grep -qi 'research piece' "$T" && r=1 || r=0
check "no 'research piece' wording" $r

# 5. Unsubscribe link carries both field templates
grep -q 'undersight.ai/unsubscribe?e={{Email}}&amp;t={{Unsubscribe Token}}' "$T" && r=0 || r=1
check "unsubscribe URL uses {{Email}} + {{Unsubscribe Token}}" $r

# 6. Correct legal links (legal.undersight.ai has /privacy and /saas; no /terms)
grep -q 'https://legal.undersight.ai/privacy' "$T" && r=0 || r=1
check "privacy policy -> legal.undersight.ai/privacy" $r
grep -q 'https://legal.undersight.ai/saas' "$T" && r=0 || r=1
check "terms -> legal.undersight.ai/saas" $r
grep -q 'legal.undersight.ai/terms' "$T" && r=1 || r=0
check "no dead /terms link" $r

# 7. Dark mode support
grep -q 'prefers-color-scheme: dark' "$T" && r=0 || r=1
check "dark mode media query present" $r
grep -q '<meta name="color-scheme" content="light dark">' "$T" && r=0 || r=1
check "color-scheme meta present" $r

# 8. Balanced structure — exactly one html/body open+close, no trailing junk
[ "$(grep -c '<html>' "$T")" -eq 1 ] && [ "$(grep -c '</html>' "$T")" -eq 1 ] && r=0 || r=1
check "single <html>...</html>" $r
tail -1 "$T" | grep -q '</html>' && r=0 || r=1
check "file ends at </html> (no trailing junk)" $r

# 9. Voice: no 'Kyle reads' (company voice is 'we')
grep -q 'Kyle reads' "$T" && r=1 || r=0
check "company voice ('we'), not 'Kyle reads'" $r

exit $FAIL
