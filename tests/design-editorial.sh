#!/usr/bin/env bash
# design-editorial.sh — invariants for the Column-inspired "underwriting file"
# editorial redesign (2026-07). File-level greps only; no server needed.
# Run from repo root: bash tests/design-editorial.sh

cd "$(dirname "$0")/.." || exit 1

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }
check(){ if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fi; }

echo "== Editorial tokens exist in BOTH token files (sync mandate) =="
for f in css/tokens.css tokens/tokens.css; do
  check "$f defines --measure"            "grep -q -- '--measure:' $f"
  check "$f defines --color-rule"         "grep -q -- '--color-rule:' $f"
  check "$f defines --space-xxxl"         "grep -q -- '--space-xxxl:' $f"
  check "$f defines --text-display-hero"  "grep -q -- '--text-display-hero:' $f"
done

echo "== --color-rule is dark-aware in the production token file =="
check "css/tokens.css swaps --color-rule in @media dark block" \
  "awk '/prefers-color-scheme: dark/,/^}/' css/tokens.css | grep -q -- '--color-rule:'"
check "css/tokens.css swaps --color-rule in html.theme-dark block" \
  "awk '/^html.theme-dark/,/^}/' css/tokens.css | grep -q -- '--color-rule:'"
check "css/tokens.css re-asserts --color-rule in html.theme-light block" \
  "awk '/^html.theme-light/,/^}/' css/tokens.css | grep -q -- '--color-rule:'"

echo "== Token drift reconciliation (two-copy system agrees) =="
EL1=$(grep -o -- '--color-eucalyptus-light:[^;]*' css/tokens.css | head -1)
EL2=$(grep -o -- '--color-eucalyptus-light:[^;]*' tokens/tokens.css | head -1)
if [ -n "$EL1" ] && [ "$EL1" = "$EL2" ]; then ok "--color-eucalyptus-light identical in both token files"; else bad "--color-eucalyptus-light drifted: '$EL1' vs '$EL2'"; fi
check "css/tokens.css has --color-accent-secondary (INSIGHT alias family)" \
  "grep -q -- '--color-accent-secondary:' css/tokens.css"
check "tokens/tokens.css has --color-graphite-500 (muted ink tier)" \
  "grep -q -- '--color-graphite-500:' tokens/tokens.css"
check "tokens/tokens.css has --color-text-muted alias" \
  "grep -q -- '--color-text-muted:' tokens/tokens.css"

echo "== tokens.json + DESIGN.md carry the new tokens =="
check "tokens/tokens.json has measure"        "grep -q 'measure' tokens/tokens.json"
check "tokens/tokens.json has display-hero"   "grep -q 'display-hero' tokens/tokens.json"
check "tokens/tokens.json has xxxl"           "grep -q 'xxxl' tokens/tokens.json"
check "tokens/tokens.json has rule color"     "grep -q '\"rule\"' tokens/tokens.json"
check "DESIGN.md documents display-hero"      "grep -q 'display-hero' DESIGN.md"
check "DESIGN.md documents measure"           "grep -q 'measure' DESIGN.md"
check "DESIGN.md carries the Column adaptation record" \
  "grep -qi 'column adaptation' DESIGN.md"

echo "== Dead V1 CSS burned down =="
for sel in '.stats-bar' '.testimonial-section' '.case-study-inner' '.how-timeline' '.sol-visual-box'; do
  check "main.css no longer styles $sel" "! grep -qF '$sel' css/main.css"
done
RGBA_COUNT=$(grep -c 'rgba(255' css/main.css)
if [ "$RGBA_COUNT" -le 20 ]; then ok "rgba(255 literal count $RGBA_COUNT <= 20 (was <= 28)"; else bad "rgba(255 literal count $RGBA_COUNT > 20"; fi

echo "== Editorial component grammar =="
check "section eyebrows are monospace (.sect-head .eyebrow uses --font-mono)" \
  "awk '/^.sect-head .eyebrow/,/^}/' css/main.css | grep -q 'font-mono'"
check "buttons squared to --rounded-xs" \
  "awk '/^.btn \{/,/^}/' css/main.css | grep -q 'rounded-xs'"
check "hero decision-ledger exhibit styled (.hv-ledger)" \
  "grep -q '.hv-ledger' css/main.css"
check "index.html hero carries the decision-ledger exhibit" \
  "grep -q 'hv-ledger' index.html"
check "index.html hero keeps .hero-overlay-cta (contract)" \
  "grep -q 'hero-overlay-cta' index.html"
check "index.html hero carries mono kicker (.hero-kicker)" \
  "grep -q 'hero-kicker' index.html"
check "section eyebrows are folio-numbered (01 &middot;)" \
  "grep -q '01 &middot; ' index.html"
check "preview.html demos display-hero cut" \
  "grep -q 'display-hero' preview.html"

echo
echo "design-editorial: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
