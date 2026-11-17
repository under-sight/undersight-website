#!/usr/bin/env bash
# =============================================================================
# Link & Content Parity Checks (dist/)
# =============================================================================
#
# Validates the baked build output in dist/:
#   - internal links resolve to dist/ files, SPA routes, or in-page anchors
#   - external links are alive (2xx/3xx) and TLS-only
#   - Sign In links are pinned to staging (intentional until prod auth)
#   - canonical + og:url point at production (intentional pre-promotion)
#
# Run `python3 build.py` first to produce dist/.
#
# Usage:
#   bash tests/link-check.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed
# =============================================================================

set -uo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$SITE_ROOT/dist"
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

if [ ! -f "$DIST/index.html" ]; then
  echo "ERROR: $DIST/index.html not found — run 'python3 build.py' first" >&2
  exit 1
fi

# Hosts that block bots/HEAD probes (e.g. LinkedIn returns 999) — SKIP not FAIL
BOT_BLOCKED_HOSTS="linkedin.com twitter.com x.com"

# Extract href/src URLs from dist/index.html, one "<category>\t<url>" per line.
# Categories: external, preconnect, internal, fragment, insecure.
# JS template literals (${...}) and pseudo-URLs are excluded at the source.
extract_urls() {
  python3 - "$DIST/index.html" <<'PY'
import re, sys
html = open(sys.argv[1], encoding="utf-8").read()
preconnect = set(re.findall(r'<link[^>]*rel="preconnect"[^>]*href="([^"]+)"', html))
preconnect |= set(re.findall(r'<link[^>]*href="([^"]+)"[^>]*rel="preconnect"', html))
seen = set()
for url in re.findall(r'(?:href|src)="([^"]+)"', html):
    if url in seen:
        continue
    seen.add(url)
    if "${" in url or url.startswith(("mailto:", "data:", "javascript:", "$")):
        continue
    if url.startswith("http://"):
        print(f"insecure\t{url}")
    elif url.startswith("https://"):
        print(f"{'preconnect' if url in preconnect else 'external'}\t{url}")
    elif url.startswith("#"):
        if url != "#":
            print(f"fragment\t{url}")
    else:
        print(f"internal\t{url}")
PY
}
URL_TABLE="$(extract_urls)"

urls_of() { echo "$URL_TABLE" | awk -F'\t' -v c="$1" '$1 == c {print $2}'; }

# =============================================================================
section "internal_links_resolve"
# =============================================================================
# Every relative href/src must map to a file in dist/ or a SPA page section
# (clean paths fall back to index.html via _redirects). In-page anchors must
# match an element id.

INTERNAL_CHECKED=0
while IFS= read -r URL; do
  [ -z "$URL" ] && continue
  INTERNAL_CHECKED=$((INTERNAL_CHECKED + 1))
  # Strip query string and fragment for file lookup
  CLEAN_PATH="${URL%%\?*}"; CLEAN_PATH="${CLEAN_PATH%%#*}"
  ROUTE="${CLEAN_PATH#/}"
  if [ -f "$DIST/${CLEAN_PATH#/}" ] || { [ -z "$ROUTE" ] && [ -f "$DIST/index.html" ]; }; then
    pass "Internal link resolves to file: $URL"
  elif grep -q "id=\"page-${ROUTE}\"" "$DIST/index.html"; then
    pass "Internal link resolves to SPA route: $URL"
  else
    fail "Internal link resolves: $URL" "No dist file or id=\"page-${ROUTE}\" section"
  fi
done <<< "$(urls_of internal)"

while IFS= read -r FRAG; do
  [ -z "$FRAG" ] && continue
  ANCHOR="${FRAG#\#}"
  if grep -q "id=\"${ANCHOR}\"" "$DIST/index.html"; then
    pass "In-page anchor resolves: $FRAG"
  else
    fail "In-page anchor resolves: $FRAG" "No element with id=\"${ANCHOR}\""
  fi
done <<< "$(urls_of fragment)"

if [ "$INTERNAL_CHECKED" -gt 0 ]; then
  pass "Internal links found and checked ($INTERNAL_CHECKED)"
else
  fail "Internal links found and checked" "Zero relative href/src extracted — extractor broken?"
fi

# =============================================================================
section "external_links_alive"
# =============================================================================
# Deduped external https URLs must answer 2xx/3xx (HEAD, GET fallback).
# Bot-blocking hosts (999/403) are SKIP not FAIL. Any http:// link is a FAIL.
# rel="preconnect" hosts are connection hints, not content links — not probed.

while IFS= read -r URL; do
  [ -z "$URL" ] && continue
  fail "External link uses TLS: $URL" "http:// link — must be https://"
done <<< "$(urls_of insecure)"

while IFS= read -r URL; do
  [ -z "$URL" ] && continue
  skip "Preconnect host (hint, not probed): $URL"
done <<< "$(urls_of preconnect)"

while IFS= read -r URL; do
  [ -z "$URL" ] && continue
  STATUS=$(curl -sIL -o /dev/null -w '%{http_code}' --max-time 10 "$URL" 2>/dev/null || echo "000")
  if [[ ! "$STATUS" =~ ^[23] ]]; then
    # Some servers reject HEAD — retry with GET before judging
    STATUS=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 10 "$URL" 2>/dev/null || echo "000")
  fi
  if [[ "$STATUS" =~ ^[23] ]]; then
    pass "External link alive (HTTP $STATUS): $URL"
  else
    HOST=$(echo "$URL" | sed -E 's|https?://([^/]+).*|\1|')
    BLOCKED=false
    for B in $BOT_BLOCKED_HOSTS; do
      case "$HOST" in *"$B") BLOCKED=true ;; esac
    done
    if [ "$BLOCKED" = true ]; then
      skip "External link bot-blocked (HTTP $STATUS): $URL"
    else
      fail "External link alive: $URL" "Got HTTP $STATUS"
    fi
  fi
done <<< "$(urls_of external)"

section "booking_links_cal_com"

BOOKING_URL="https://cal.com/adriany/quick-connect"
CALENDLY_FILES=$(grep -rli 'calendly\.com' "$DIST" 2>/dev/null || true)
if [ -z "$CALENDLY_FILES" ]; then
  pass "No calendly.com anywhere in dist/"
else
  fail "No calendly.com anywhere in dist/" "Found in: $(echo "$CALENDLY_FILES" | tr '\n' ' ')"
fi

for PAGE in index.html resources/workshop.html; do
  BOOKING_HREFS=$(grep -oE 'href="https://cal\.com[^"]*"' "$DIST/$PAGE" 2>/dev/null | sed 's/^href="//;s/"$//' | sort -u)
  if [ -z "$BOOKING_HREFS" ]; then
    fail "cal.com booking links present in dist/$PAGE" "No cal.com links found"
    continue
  fi
  while IFS= read -r HREF; do
    if [ "$HREF" = "$BOOKING_URL" ]; then
      pass "Booking link in $PAGE is $BOOKING_URL"
    else
      fail "Booking link in $PAGE is $BOOKING_URL" "Got: $HREF"
    fi
  done <<< "$BOOKING_HREFS"
done

# =============================================================================
section "signin_pinned_staging"
# =============================================================================
# Sign In intentionally points at staging until prod auth ships. Pin it so a
# well-meaning cleanup doesn't break the only working login path.

SIGNIN_EXPECTED="https://staging.app.underchat.ai/login"
SIGNIN_HREFS=$(grep -oE 'href="https?://[^"]*app\.underchat\.ai[^"]*"' "$DIST/index.html" | sed 's/^href="//;s/"$//' | sort -u)
if [ -z "$SIGNIN_HREFS" ]; then
  fail "Sign-in links present in dist/index.html" "No app.underchat.ai links found"
else
  while IFS= read -r HREF; do
    if [ "$HREF" = "$SIGNIN_EXPECTED" ]; then
      pass "Sign-in link pinned to staging: $HREF"
    else
      fail "Sign-in link pinned to staging: $HREF" "Expected $SIGNIN_EXPECTED"
    fi
  done <<< "$SIGNIN_HREFS"
fi

# =============================================================================
section "canonical_is_prod"
# =============================================================================
# canonical + og:url point at https://undersight.ai — intentional
# pre-promotion. Presence + value only (trailing slash normalized).

CANONICAL=$(grep -oE '<link rel="canonical" href="[^"]*"' "$DIST/index.html" | sed 's/.*href="//;s/"$//' || true)
if [ "${CANONICAL%/}" = "https://undersight.ai" ]; then
  pass "canonical link points at production: $CANONICAL"
else
  fail "canonical link points at production" "Got: ${CANONICAL:-<missing>}"
fi

OG_URL=$(grep -oE '<meta property="og:url" content="[^"]*"' "$DIST/index.html" | sed 's/.*content="//;s/"$//' || true)
if [ "${OG_URL%/}" = "https://undersight.ai" ]; then
  pass "og:url points at production: $OG_URL"
else
  fail "og:url points at production" "Got: ${OG_URL:-<missing>}"
fi

section "no_lead_capture"

for PATTERN in turnstile whitepaper-lead workshop-apply /api/booking /unsubscribe blog-gate booking-widget; do
  HITS=$(grep -rliF "$PATTERN" "$DIST" 2>/dev/null || true)
  if [ -z "$HITS" ]; then
    pass "No '$PATTERN' anywhere in dist/"
  else
    fail "No '$PATTERN' anywhere in dist/" "Found in: $(echo "$HITS" | tr '\n' ' ')"
  fi
done

for GONE in resources/book.html resources/booking-widget.js resources/blog-gate.js; do
  if [ -e "$DIST/$GONE" ]; then
    fail "dist/$GONE is gone" "File still built"
  else
    pass "dist/$GONE is gone"
  fi
done

# =============================================================================
section "Summary"
# =============================================================================

TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
echo ""
echo -e "${BOLD}Results: $TOTAL tests${RESET}"
echo -e "  ${GREEN}PASS: $PASS_COUNT${RESET}"
echo -e "  ${RED}FAIL: $FAIL_COUNT${RESET}"
if [ "$SKIP_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}SKIP: $SKIP_COUNT${RESET}"
fi
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "${RED}${BOLD}FAILED${RESET} -- $FAIL_COUNT test(s) need attention"
  exit 1
else
  echo -e "${GREEN}${BOLD}ALL TESTS PASSED${RESET}"
  exit 0
fi
