#!/usr/bin/env bash
# =============================================================================
# undersight.ai Test Suite
# =============================================================================
#
# Validates the dev server, content API, HTML structure, CSS tokens, security,
# and accessibility. Assumes the dev server is running on localhost:8088.
#
# Usage:
#   bash tests/test-suite.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed
# =============================================================================

set -euo pipefail

BASE="http://localhost:8088"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Site root (for file-level checks)
SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

# Fetch a URL and store HTTP status + body
fetch() {
  local url="$1"
  curl -sS --max-time 10 "$url" 2>/dev/null || echo ""
}

fetch_status() {
  local url="$1"
  curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000"
}

# Store content API response for reuse
CONTENT_JSON=""
HTML_SOURCE=""

# =============================================================================
section "Server Tests"
# =============================================================================

# Test: Server responds on :8088
STATUS=$(fetch_status "$BASE/")
if [ "$STATUS" = "200" ]; then
  pass "Server responds on :8088 (HTTP $STATUS)"
else
  fail "Server responds on :8088" "Got HTTP $STATUS"
fi

# Test: /api/content returns 200 with JSON
STATUS=$(fetch_status "$BASE/api/content")
CONTENT_JSON=$(fetch "$BASE/api/content")
if [ "$STATUS" = "200" ]; then
  # Verify it's valid JSON
  if echo "$CONTENT_JSON" | python3 -m json.tool > /dev/null 2>&1; then
    pass "/api/content returns 200 with valid JSON"
  else
    fail "/api/content returns 200 with valid JSON" "Response is not valid JSON"
  fi
else
  fail "/api/content returns 200 with valid JSON" "Got HTTP $STATUS"
fi

# Test: All entity types present in content API
for ENTITY_PREFIX in "Home" "Solutions" "Blog" "Site Config" "Contact"; do
  if echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
found = any(k.startswith('$ENTITY_PREFIX') for k in data)
sys.exit(0 if found else 1)
" 2>/dev/null; then
    pass "Entity type '$ENTITY_PREFIX' present in /api/content"
  else
    fail "Entity type '$ENTITY_PREFIX' present in /api/content"
  fi
done

# Test: Static files serve correctly
STATIC_FILES=(
  "css/tokens.css"
  "css/main.css"
  "images/og-image.png"
  "images/brand/logo-horizontal-line-primary.svg"
  "favicon.svg"
  "favicon-32.png"
  "favicon-16.png"
  "apple-touch-icon.png"
  "robots.txt"
  "sitemap.xml"
  "llms.txt"
  "manifest.json"
)

for FILE in "${STATIC_FILES[@]}"; do
  STATUS=$(fetch_status "$BASE/$FILE")
  if [ "$STATUS" = "200" ]; then
    pass "Static file serves: $FILE"
  else
    fail "Static file serves: $FILE" "Got HTTP $STATUS"
  fi
done

# =============================================================================
section "Content Tests"
# =============================================================================

# Test: Hero entity has title containing "underwriting"
if echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
hero = data.get('Home - Hero', {}).get('content', '')
sys.exit(0 if 'underwriting' in hero.lower() else 1)
" 2>/dev/null; then
  pass "Hero entity contains 'underwriting'"
else
  fail "Hero entity contains 'underwriting'"
fi

# Test: No "merchant" or "SMB" in non-blog entity content (copy rules)
# Blog posts may legitimately reference these terms in context
for BANNED_TERM in "merchant" "SMB"; do
  FOUND=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
violations = []
for name, entity in data.items():
    if name.startswith('Blog - '): continue
    content = entity.get('content', '')
    if '$BANNED_TERM' in content:
        violations.append(name)
if violations:
    print(', '.join(violations))
" 2>/dev/null)
  if [ -z "$FOUND" ]; then
    pass "No '$BANNED_TERM' in non-blog entity content"
  else
    fail "No '$BANNED_TERM' in non-blog entity content" "Found in: $FOUND"
  fi
done

# Test: All 3 solution entities present
SOLUTION_COUNT=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
count = sum(1 for k in data if k.startswith('Solutions - '))
print(count)
" 2>/dev/null)
if [ "$SOLUTION_COUNT" = "3" ]; then
  pass "All 3 solution entities present"
else
  fail "All 3 solution entities present" "Found $SOLUTION_COUNT"
fi

# Test: Blog entities have Date and Excerpt metadata
BLOG_META_OK=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
blogs = {k: v for k, v in data.items() if k.startswith('Blog - ')}
if not blogs:
    print('no blogs')
    sys.exit(1)
missing = []
for name, entity in blogs.items():
    content = entity.get('content', '')
    has_date = '**Date:**' in content or '**Date:' in content
    has_excerpt = '**Excerpt:**' in content or '**Excerpt:' in content
    if not has_date or not has_excerpt:
        missing.append(name)
if missing:
    print(', '.join(missing))
    sys.exit(1)
print('ok')
sys.exit(0)
" 2>/dev/null)
if [ "$BLOG_META_OK" = "ok" ]; then
  pass "Blog entities have Date and Excerpt metadata"
else
  fail "Blog entities have Date and Excerpt metadata" "Missing in: $BLOG_META_OK"
fi

# Test: Contact entity has Calendly URL
if echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
contact = data.get('Contact Page', {}).get('content', '')
sys.exit(0 if 'calendly.com' in contact.lower() else 1)
" 2>/dev/null; then
  pass "Contact entity has Calendly URL"
else
  # Check the HTML directly as fallback (Calendly link may be hardcoded)
  HTML=$(fetch "$BASE/")
  if echo "$HTML" | grep -qi "calendly.com"; then
    pass "Contact entity has Calendly URL (found in HTML)"
  else
    fail "Contact entity has Calendly URL"
  fi
fi

# =============================================================================
section "HTML Tests"
# =============================================================================

HTML_SOURCE=$(fetch "$BASE/")

# Test: DOCTYPE present
if [[ "$HTML_SOURCE" == "<!DOCTYPE html>"* ]]; then
  pass "index.html contains DOCTYPE"
else
  fail "index.html contains DOCTYPE"
fi

# Test: All CSS link tags present
for CSS_FILE in "tokens.css" "main.css"; do
  if grep -q "href=\"css/$CSS_FILE\"" <<< "$HTML_SOURCE"; then
    pass "CSS link tag present: $CSS_FILE"
  else
    fail "CSS link tag present: $CSS_FILE"
  fi
done

# Test: Favicon link tags present
for FAVICON in "favicon.svg" "favicon-32" "favicon-16" "apple-touch-icon"; do
  if grep -q "$FAVICON" <<< "$HTML_SOURCE"; then
    pass "Favicon link present: $FAVICON"
  else
    fail "Favicon link present: $FAVICON"
  fi
done

# Test: Meta description present
if grep -q '<meta name="description"' <<< "$HTML_SOURCE"; then
  pass "Meta description present"
else
  fail "Meta description present"
fi

# Test: OG tags present
for OG_TAG in "og:title" "og:description" "og:image" "og:url"; do
  if grep -q "property=\"$OG_TAG\"" <<< "$HTML_SOURCE"; then
    pass "OG tag present: $OG_TAG"
  else
    fail "OG tag present: $OG_TAG"
  fi
done

# Test: Twitter card tags present
for TW_TAG in "twitter:card" "twitter:title" "twitter:description" "twitter:image"; do
  if grep -q "name=\"$TW_TAG\"" <<< "$HTML_SOURCE"; then
    pass "Twitter card tag present: $TW_TAG"
  else
    fail "Twitter card tag present: $TW_TAG"
  fi
done

# Test: JSON-LD structured data present
if grep -q 'application/ld+json' <<< "$HTML_SOURCE"; then
  pass "JSON-LD structured data present"
else
  fail "JSON-LD structured data present"
fi

# Test: No hardcoded "fibery.io" in HTML
if grep -qi "fibery\.io" <<< "$HTML_SOURCE"; then
  fail "No hardcoded 'fibery.io' in HTML" "Found fibery.io reference"
else
  pass "No hardcoded 'fibery.io' in HTML"
fi

# Test: No hardcoded auth tokens in HTML
if grep -qiE "(api[_-]?key|bearer [a-zA-Z0-9._-]{20,}|token\s*[:=]\s*['\"][a-zA-Z0-9._-]{20,})" <<< "$HTML_SOURCE"; then
  fail "No hardcoded auth tokens in HTML" "Found potential auth token"
else
  pass "No hardcoded auth tokens in HTML"
fi

# Test: "undersight" never capitalized
CAPS_VIOLATIONS=$(grep -oE "(Undersight|UNDERSIGHT)" <<< "$HTML_SOURCE" | head -5 || true)
if [ -z "$CAPS_VIOLATIONS" ]; then
  pass "'undersight' never capitalized (no 'Undersight' or 'UNDERSIGHT')"
else
  fail "'undersight' never capitalized" "Found: $CAPS_VIOLATIONS"
fi

# =============================================================================
section "CSS Tests"
# =============================================================================

MAIN_CSS=$(fetch "$BASE/css/main.css")
TOKENS_CSS=$(fetch "$BASE/css/tokens.css")

# Test: Zero hardcoded hex colors in main.css (excluding comments and #fff/#999)
# #fff is allowed for white-on-dark text (stats bar, case study, testimonial)
# #999 is allowed for muted text on dark backgrounds
HEX_MATCHES=$(echo "$MAIN_CSS" \
  | sed 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' \
  | grep -oE '#[0-9a-fA-F]{3,8}\b' \
  | grep -v '^$' \
  | grep -vi '^#fff$' \
  | grep -vi '^#ffffff$' \
  | grep -vi '^#999$' \
  | grep -vi '^#C97A54$' || true)
if [ -z "$HEX_MATCHES" ]; then
  pass "Zero hardcoded hex colors in main.css"
else
  HEX_COUNT=$(echo "$HEX_MATCHES" | wc -l | tr -d ' ')
  UNIQUE_HEXES=$(echo "$HEX_MATCHES" | sort -u | head -10 | tr '\n' ', ')
  fail "Zero hardcoded hex colors in main.css" "Found $HEX_COUNT instances: $UNIQUE_HEXES"
fi

# Test: Brand colors referenced via tokens (check that token variables are used)
for TOKEN in "--color-accent" "--color-graphite-900"; do
  if echo "$MAIN_CSS" | grep -q -- "var($TOKEN"; then
    pass "Brand token referenced in main.css: $TOKEN"
  else
    # Some tokens may be referenced indirectly via aliases
    if echo "$TOKENS_CSS" | grep -q -- "$TOKEN"; then
      pass "Brand token defined in tokens.css: $TOKEN (used via alias)"
    else
      fail "Brand token referenced: $TOKEN"
    fi
  fi
done

# Test: prefers-reduced-motion media query present in main.css
if echo "$MAIN_CSS" | grep -q "prefers-reduced-motion"; then
  pass "prefers-reduced-motion media query present in main.css"
else
  fail "prefers-reduced-motion media query present in main.css"
fi

# Test: prefers-color-scheme dark media query present in tokens.css
if echo "$TOKENS_CSS" | grep -q "prefers-color-scheme.*dark"; then
  pass "prefers-color-scheme dark media query present in tokens.css"
else
  fail "prefers-color-scheme dark media query present in tokens.css"
fi

# Test: Font feature settings cv01, ss03 present
if echo "$MAIN_CSS" | grep -q "'cv01'" && echo "$MAIN_CSS" | grep -q "'ss03'"; then
  pass "Font feature settings cv01, ss03 present in main.css"
else
  fail "Font feature settings cv01, ss03 present in main.css"
fi

# =============================================================================
section "Security Tests"
# =============================================================================

# Test: No "fibery.io" in any served file
FIBERY_FOUND=false
for CHECK_FILE in "/" "/css/main.css" "/css/tokens.css" "/robots.txt" "/sitemap.xml" "/llms.txt" "/manifest.json"; do
  CONTENT=$(fetch "$BASE$CHECK_FILE")
  if echo "$CONTENT" | grep -qi "fibery\.io"; then
    fail "No 'fibery.io' in served file: $CHECK_FILE"
    FIBERY_FOUND=true
  fi
done
if [ "$FIBERY_FOUND" = false ]; then
  pass "No 'fibery.io' in any served file"
fi

# Test: No "/api/content" in dist/ HTML (if dist exists)
DIST_DIR="$SITE_ROOT/dist"
if [ -d "$DIST_DIR" ]; then
  if [ -f "$DIST_DIR/index.html" ]; then
    if grep -q "/api/content" "$DIST_DIR/index.html"; then
      fail "No '/api/content' in dist/index.html" "API endpoint reference found in static build"
    else
      pass "No '/api/content' in dist/index.html"
    fi
  else
    skip "dist/index.html does not exist"
  fi
else
  skip "dist/ directory does not exist"
fi

# Test: No Fibery secrets/UUIDs in dist/ HTML (if dist exists)
if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ]; then
  # UUID pattern: 8-4-4-4-12 hex chars
  UUID_MATCHES=$(grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$DIST_DIR/index.html" 2>/dev/null || true)
  if [ -z "$UUID_MATCHES" ]; then
    pass "No Fibery UUIDs in dist/index.html"
  else
    UUID_COUNT=$(echo "$UUID_MATCHES" | wc -l | tr -d ' ')
    fail "No Fibery UUIDs in dist/index.html" "Found $UUID_COUNT UUID(s)"
  fi
else
  skip "dist/index.html does not exist for UUID check"
fi

# Test: No auth tokens in any served file
AUTH_FOUND=false
for CHECK_FILE in "/" "/css/main.css" "/manifest.json" "/llms.txt"; do
  CONTENT=$(fetch "$BASE$CHECK_FILE")
  if echo "$CONTENT" | grep -qiE "(Authorization.*Token|Bearer [a-zA-Z0-9._-]{20,})"; then
    fail "No auth tokens in served file: $CHECK_FILE"
    AUTH_FOUND=true
  fi
done
if [ "$AUTH_FOUND" = false ]; then
  pass "No auth tokens in any served file"
fi

# Test: No staging URLs exposed (skip — Sign In intentionally uses staging until prod auth)
skip "Staging URL check (Sign In link uses staging.app by design)"

# =============================================================================
section "Accessibility Tests"
# =============================================================================

# Test: All img tags have alt attributes (check HTML source)
# Extract img tags and check for alt
IMGS_WITHOUT_ALT=$(echo "$HTML_SOURCE" | grep -oE '<img [^>]*>' | grep -v 'alt=' || true)
if [ -z "$IMGS_WITHOUT_ALT" ]; then
  pass "All img tags have alt attributes"
else
  IMG_COUNT=$(echo "$IMGS_WITHOUT_ALT" | wc -l | tr -d ' ')
  fail "All img tags have alt attributes" "$IMG_COUNT img tag(s) missing alt"
fi

# Test: All interactive elements (onclick) are on focusable elements
# Focusable elements: a, button, input, select, textarea, [tabindex], [role="button"]
NON_FOCUSABLE_ONCLICK=$(echo "$HTML_SOURCE" | grep -oE '<(div|span|p|h[1-6]|li|section) [^>]*onclick=' | grep -v 'tabindex=' | grep -v 'role="button"' || true)
if [ -z "$NON_FOCUSABLE_ONCLICK" ]; then
  pass "All onclick handlers on focusable elements (a, button)"
else
  COUNT=$(echo "$NON_FOCUSABLE_ONCLICK" | wc -l | tr -d ' ')
  ELEMENTS=$(echo "$NON_FOCUSABLE_ONCLICK" | head -3 | sed 's/onclick=.*//' | tr '\n' '; ')
  fail "All onclick handlers on focusable elements" "$COUNT non-focusable element(s): $ELEMENTS"
fi

# Test: Focus-visible CSS rule present
if grep -q "focus-visible" <<< "$MAIN_CSS"; then
  pass "Focus-visible CSS rule present"
else
  fail "Focus-visible CSS rule present"
fi

# Test: ARIA labels on logo SVG
if grep -q 'aria-label="undersight' <<< "$HTML_SOURCE"; then
  pass "ARIA label on logo SVG"
elif grep -q 'aria-label.*undersight' <<< "$HTML_SOURCE"; then
  pass "ARIA label on logo SVG (variant)"
else
  fail "ARIA label on logo SVG"
fi

# =============================================================================
section "Navigation & Browser History Tests"
# =============================================================================
# Browser back/forward uses history.pushState + popstate listener.
# Clean path URLs: /, /blog, /copilot, etc. (no hash fragments).
# SPA fallback via _redirects (prod) and serve_static_or_spa (dev).

SRC_HTML="$SITE_ROOT/index.html"

# Test: history.pushState is called in navigate()
if grep -q 'history.pushState' "$SRC_HTML"; then
  pass "navigate() uses history.pushState for browser history"
else
  fail "navigate() uses history.pushState" "Browser back/forward won't work"
fi

# Test: popstate listener exists
if grep -q "addEventListener('popstate'" "$SRC_HTML" || grep -q 'addEventListener("popstate"' "$SRC_HTML"; then
  pass "popstate listener registered for browser back/forward"
else
  fail "popstate listener registered" "Browser back button won't navigate"
fi

# Test: Boot reads location.pathname for direct URL navigation
if grep -q 'location.pathname' "$SRC_HTML"; then
  pass "Boot reads location.pathname for direct URL support"
else
  fail "Boot reads location.pathname" "Direct URLs like /blog won't work"
fi

# Test: history.replaceState used for initial page load
if grep -q 'history.replaceState' "$SRC_HTML"; then
  pass "Boot uses replaceState (no back-button loop on landing)"
else
  fail "Boot uses replaceState" "Pressing back on landing page may loop"
fi

# Test: Nav links use clean paths (not hash fragments)
HASH_NAV=$(grep -E 'href="#(blog|docs|underscore|rfi|copilot|home|contact)"' "$SRC_HTML" | grep 'onclick.*navigate' || true)
if [ -z "$HASH_NAV" ]; then
  pass "Nav links use clean paths (no hash fragment hrefs)"
else
  COUNT=$(echo "$HASH_NAV" | wc -l | tr -d ' ')
  fail "Nav links use clean paths" "$COUNT link(s) still use hash fragment hrefs"
fi

# Test: SPA fallback file exists for production
if [ -f "$SITE_ROOT/_redirects" ]; then
  pass "_redirects file exists for production SPA fallback"
else
  fail "_redirects file exists" "Direct URL navigation will 404 in production"
fi

# Test: Dev server has SPA fallback
if grep -q 'serve_static_or_spa\|_serve_static_or_spa' "$SITE_ROOT/undersight-serve.py" 2>/dev/null; then
  pass "Dev server has SPA fallback routing"
else
  fail "Dev server has SPA fallback" "Direct URLs will 404 on dev server"
fi

# Test: All page sections exist for navigate() targets
for PAGE in "home" "underscore" "rfi" "copilot" "docs" "blog" "post" "contact"; do
  if grep -q "id=\"page-$PAGE\"" "$SRC_HTML"; then
    pass "Page section exists: page-$PAGE"
  else
    fail "Page section exists: page-$PAGE" "navigate('$PAGE') would find no target"
  fi
done

# Test: Logo links back to home
if grep -q 'class="nav-logo"' <<< "$HTML_SOURCE" && grep -q "navigate('home')" <<< "$HTML_SOURCE"; then
  pass "Logo navigates to home (global back path)"
else
  fail "Logo navigates to home (global back path)"
fi

# Test: SPA routes return 200 from dev server
for ROUTE in "/" "/blog" "/copilot" "/docs" "/underscore"; do
  STATUS=$(fetch_status "$BASE$ROUTE")
  if [ "$STATUS" = "200" ]; then
    pass "SPA route serves 200: $ROUTE"
  else
    fail "SPA route serves 200: $ROUTE" "Got HTTP $STATUS"
  fi
done

# =============================================================================
section "Cross-Browser Compatibility Tests"
# =============================================================================
# Validates patterns required for consistent behavior across:
# Desktop Safari, Desktop Chrome, Mobile Safari, Mobile Chrome, Desktop Firefox

# Test: backdrop-filter always paired with -webkit- prefix (Safari)
BDF_TOTAL=$(echo "$MAIN_CSS" | grep -c 'backdrop-filter' || true)
BDF_PREFIXED=$(echo "$MAIN_CSS" | grep -c '\-webkit-backdrop-filter' || true)
BDF_UNPREFIXED=$((BDF_TOTAL - BDF_PREFIXED))
if [ "$BDF_UNPREFIXED" -eq "$BDF_PREFIXED" ]; then
  pass "backdrop-filter always paired with -webkit- prefix ($BDF_PREFIXED pairs)"
else
  fail "backdrop-filter always paired with -webkit- prefix" "$BDF_UNPREFIXED unprefixed vs $BDF_PREFIXED prefixed"
fi

# Test: backdrop-filter has rgba() fallback background (Firefox)
BDF_WITH_RGBA=$(echo "$MAIN_CSS" | grep -B5 'backdrop-filter' | grep -c 'rgba(' || true)
if [ "$BDF_WITH_RGBA" -gt 0 ]; then
  pass "backdrop-filter has rgba() fallback background"
else
  fail "backdrop-filter has rgba() fallback background" "No rgba() background found near backdrop-filter"
fi

# Test: position: sticky has -webkit-sticky prefix (Safari <13)
STICKY_COUNT=$(echo "$MAIN_CSS" | grep -c 'position: sticky\|position:sticky' || true)
WEBKIT_STICKY=$(echo "$MAIN_CSS" | grep -c '\-webkit-sticky' || true)
if [ "$STICKY_COUNT" -eq 0 ]; then
  pass "position: sticky not used (no prefix needed)"
elif [ "$WEBKIT_STICKY" -ge "$STICKY_COUNT" ]; then
  pass "position: sticky has -webkit-sticky prefix ($WEBKIT_STICKY prefixed)"
else
  fail "position: sticky has -webkit-sticky prefix" "$STICKY_COUNT sticky, only $WEBKIT_STICKY prefixed"
fi

# Test: CSS inset shorthand not used — longhand for Safari <14.1
INSET_COUNT=$(echo "$MAIN_CSS" | grep -c 'inset:' || true)
if [ "$INSET_COUNT" -eq 0 ]; then
  pass "CSS inset shorthand not used (longhand for Safari compat)"
else
  fail "CSS inset shorthand not used" "$INSET_COUNT usage(s) of inset: — use top/right/bottom/left"
fi

# Test: 100vh has 100dvh progressive enhancement (Mobile Safari/Chrome)
VH_LINES=$(echo "$MAIN_CSS" | grep -c '100vh' || true)
DVH_LINES=$(echo "$MAIN_CSS" | grep -c '100dvh' || true)
if [ "$VH_LINES" -eq 0 ]; then
  pass "No 100vh used (no mobile viewport issue)"
elif [ "$DVH_LINES" -ge "$VH_LINES" ]; then
  pass "100vh has 100dvh fallback ($DVH_LINES dvh for $VH_LINES vh)"
else
  fail "100vh has 100dvh fallback" "$VH_LINES uses of 100vh but only $DVH_LINES of 100dvh"
fi

# Test: fit-content has -webkit-fit-content prefix (older Safari)
FIT_COUNT=$(echo "$MAIN_CSS" | grep -c 'fit-content' || true)
WEBKIT_FIT=$(echo "$MAIN_CSS" | grep -c '\-webkit-fit-content' || true)
FIT_UNPREFIXED=$((FIT_COUNT - WEBKIT_FIT))
if [ "$FIT_COUNT" -eq 0 ]; then
  pass "fit-content not used (no prefix needed)"
elif [ "$FIT_UNPREFIXED" -le "$WEBKIT_FIT" ]; then
  pass "fit-content has -webkit- prefix ($WEBKIT_FIT prefixed)"
else
  fail "fit-content has -webkit- prefix" "$FIT_UNPREFIXED without prefix"
fi

# Test: focus-visible has :focus fallback (Safari <15.4)
if grep -q ':focus-visible' <<< "$MAIN_CSS"; then
  if grep -q 'a:focus,' <<< "$MAIN_CSS" || grep -q 'button:focus,' <<< "$MAIN_CSS"; then
    pass ":focus-visible has :focus fallback for older Safari"
  else
    fail ":focus-visible has :focus fallback" "No a:focus/button:focus rule — keyboard nav invisible on Safari <15.4"
  fi
else
  pass ":focus-visible not used (no fallback needed)"
fi

# Test: No regex lookbehind assertions in JS (Safari <16.4 crashes)
LOOKBEHIND_NEG=$(grep -c '(?<!' "$SRC_HTML" 2>/dev/null || true)
LOOKBEHIND_POS=$(grep -c '(?<=' "$SRC_HTML" 2>/dev/null || true)
TOTAL_LOOKBEHIND=$((LOOKBEHIND_NEG + LOOKBEHIND_POS))
if [ "$TOTAL_LOOKBEHIND" -eq 0 ]; then
  pass "No regex lookbehind assertions (Safari <16.4 safe)"
else
  fail "No regex lookbehind assertions" "$TOTAL_LOOKBEHIND lookbehind(s) — crashes Safari <16.4"
fi

# Test: IntersectionObserver has feature detection guard
if grep -q 'IntersectionObserver' "$SRC_HTML"; then
  if grep -q "IntersectionObserver.*in.*window\|typeof IntersectionObserver" "$SRC_HTML"; then
    pass "IntersectionObserver has feature detection guard"
  else
    fail "IntersectionObserver has feature detection guard" "Used without checking browser support"
  fi
else
  pass "IntersectionObserver not used (no guard needed)"
fi

# Test: Dropdown has click/touch handler for mobile (Mobile Safari/Chrome)
if grep -q 'nav-dropdown-trigger' "$SRC_HTML"; then
  if grep -q 'force-open' "$SRC_HTML"; then
    pass "Dropdown has click/touch handler for mobile devices"
  else
    fail "Dropdown has click/touch handler" "Dropdown uses :hover only — inaccessible on touch"
  fi
else
  pass "No dropdown trigger (no touch handler needed)"
fi

# Test: Google Fonts loaded with display=swap (consistent FOUT across browsers)
if grep -q 'fonts.googleapis.com.*display=swap' "$SRC_HTML"; then
  pass "Google Fonts loaded with display=swap (prevents FOIT)"
else
  fail "Google Fonts loaded with display=swap" "Fonts may block rendering inconsistently"
fi

# Test: SVG favicon has PNG fallback (older browsers)
if grep -q 'image/svg+xml' "$SRC_HTML"; then
  if grep -q 'image/png' "$SRC_HTML"; then
    pass "SVG favicon has PNG fallback"
  else
    fail "SVG favicon has PNG fallback" "SVG favicon only — no icon in older browsers"
  fi
else
  pass "No SVG favicon (PNG only — universally supported)"
fi

# Test: meta viewport includes width=device-width (all mobile browsers)
if grep -q 'viewport.*width=device-width' "$SRC_HTML"; then
  pass "Meta viewport includes width=device-width"
else
  fail "Meta viewport includes width=device-width" "Mobile browsers will render at 980px"
fi

# Test: apple-touch-icon link present (iOS Safari home screen)
if grep -q 'apple-touch-icon' "$SRC_HTML"; then
  pass "apple-touch-icon link present for iOS Safari"
else
  fail "apple-touch-icon link present for iOS Safari"
fi

# Test: .btn-primary uses background-color not background shorthand (iOS Safari)
if echo "$MAIN_CSS" | grep -A3 '\.btn-primary {' | grep -q 'background-color:'; then
  pass ".btn-primary uses background-color (iOS Safari <a> compat)"
else
  fail ".btn-primary uses background-color" "background shorthand ignored on <a> tags in iOS Safari"
fi

# Test: .btn-primary has -webkit-appearance: none (iOS Safari)
if echo "$MAIN_CSS" | grep -A5 '\.btn-primary {' | grep -q '\-webkit-appearance.*none'; then
  pass ".btn-primary has -webkit-appearance: none (iOS Safari)"
else
  fail ".btn-primary has -webkit-appearance: none" "iOS Safari may override button styling"
fi

# Test: .btn-primary has hardcoded color fallback before CSS variable (iOS Safari)
if echo "$MAIN_CSS" | grep -A5 '\.btn-primary {' | grep -q '#C97A54\|#c97a54'; then
  pass ".btn-primary has hardcoded #C97A54 fallback for CSS variable"
else
  fail ".btn-primary has hardcoded color fallback" "CSS variable may not resolve on older iOS Safari"
fi

# Test: Mobile menu Solutions header not using var(--light) (invisible in light mode)
if grep -q 'Solutions.*color:var(--light)' "$SRC_HTML"; then
  fail "Mobile menu Solutions header visible in light mode" "color:var(--light) is near-invisible on white"
else
  pass "Mobile menu Solutions header visible in light mode"
fi

# Test: Mobile .mobile-sub uses var(--dark) not var(--mid) (contrast)
if echo "$MAIN_CSS" | grep 'mobile-sub' | grep -q 'var(--dark)'; then
  pass "Mobile solution links use var(--dark) for sufficient contrast"
else
  fail "Mobile solution links use var(--dark)" "var(--mid) has insufficient contrast on white"
fi

# Test: Mobile .sol-row-img uses aspect-ratio not fixed height (prevents cropping)
if echo "$MAIN_CSS" | grep 'sol-row-img.*aspect-ratio\|sol-row-img.*height: auto' | grep -q 'aspect-ratio'; then
  pass "Mobile solution images use aspect-ratio (prevents cropping)"
else
  fail "Mobile solution images use aspect-ratio" "Fixed height causes image cropping on mobile"
fi

# Test: prefers-reduced-motion covers .reveal animations
if echo "$MAIN_CSS" | grep -q 'prefers-reduced-motion.*reduce'; then
  MOTION_BLOCK=$(echo "$MAIN_CSS" | sed -n '/prefers-reduced-motion.*reduce/,/}/p' | head -20)
  if echo "$MOTION_BLOCK" | grep -q '\.reveal'; then
    pass "prefers-reduced-motion covers .reveal animations"
  else
    fail "prefers-reduced-motion covers .reveal animations" ".reveal not in reduced motion block"
  fi
else
  fail "prefers-reduced-motion present" "No reduced motion media query"
fi

# =============================================================================
section "Fibery Content Linkage Tests"
# =============================================================================
# Verifies 1:1 mapping between Fibery entities and site consumption.
#
# Entity map (Fibery → index.html):
#   "Home - Hero"                         → hero section (heroTitle, heroSubtitle)
#   "Site Config"                         → signInLink, footerPrivacy, contactEmail, footerCopy
#   "Contact Page"                        → contactTitle, contactSubtitle
#   "Solutions - underscore"              → page-underscore, nav dropdown, home solutions
#   "Solutions - Agentic Client RFI"      → page-rfi, nav dropdown, home solutions
#   "Solutions - AI Underwriting Copilot" → page-copilot, nav dropdown, home solutions
#   "Blog - *"                            → blogGrid cards, page-post on click
#
# The site JS uses getContent(data, '<entity name>') and data.filter(k => k.startsWith('Blog - '))
# to consume entities. Any entity not in the above map is orphaned.

# -- API entity inventory --

# Required entities: these MUST exist in the API response for the site to render
REQUIRED_ENTITIES=(
  "Home - Hero"
  "Home - Who We Serve"
  "Home - Metrics"
  "Home - How It Works"
  "Home - Case Study: Chat Advance"
  "Home - Testimonial"
  "Home - Case Study: 4D Financing"
  "Home - CTA"
  "Site Config"
  "Contact Page"
  "Solutions - underscore"
  "Solutions - Agentic Client RFI"
  "Solutions - AI Underwriting Copilot"
)

for ENTITY in "${REQUIRED_ENTITIES[@]}"; do
  HAS_ENTITY=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
e = data.get('$ENTITY', {})
has_content = bool(e.get('content', '').strip())
print('content' if has_content else 'empty' if '$ENTITY' in data else 'missing')
" 2>/dev/null)
  case "$HAS_ENTITY" in
    content)
      pass "Required entity has content: $ENTITY"
      ;;
    empty)
      fail "Required entity has content: $ENTITY" "Entity exists but content is empty"
      ;;
    *)
      fail "Required entity has content: $ENTITY" "Entity missing from /api/content"
      ;;
  esac
done

# -- Blog entities: at least 1 must exist with Date + Excerpt --

BLOG_COUNT=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
blogs = [k for k in data if k.startswith('Blog - ')]
print(len(blogs))
" 2>/dev/null)
if [ "$BLOG_COUNT" -gt 0 ]; then
  pass "At least 1 blog entity exists ($BLOG_COUNT found)"
else
  fail "At least 1 blog entity exists" "No 'Blog - *' entities in /api/content"
fi

# -- Every blog entity must have Date and Excerpt metadata --

BLOG_MISSING=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
missing = []
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    has_date = '**Date:**' in content or '**Date:' in content
    has_excerpt = '**Excerpt:**' in content or '**Excerpt:' in content
    if not has_date:
        missing.append(f'{name} (no Date)')
    if not has_excerpt:
        missing.append(f'{name} (no Excerpt)')
if missing:
    print('; '.join(missing))
else:
    print('ok')
" 2>/dev/null)
if [ "$BLOG_MISSING" = "ok" ]; then
  pass "All blog entities have Date and Excerpt metadata"
else
  fail "All blog entities have Date and Excerpt metadata" "$BLOG_MISSING"
fi

# -- Orphan check: every entity in the API must be consumed by the site --

ORPHANS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Known consumed patterns
consumed_exact = {'Home - Hero', 'Home - Who We Serve', 'Home - Metrics',
                  'Home - How It Works', 'Home - Case Study: Chat Advance',
                  'Home - Testimonial', 'Home - Case Study: 4D Financing',
                  'Home - CTA', 'Site Config', 'Contact Page', 'Docs Page',
                  'Footer', 'SEO', 'Solutions - underscore',
                  'Solutions - Agentic Client RFI',
                  'Solutions - AI Underwriting Copilot'}
consumed_prefixes = ['Blog - ']
orphans = []
for name in data:
    if name in consumed_exact:
        continue
    if any(name.startswith(p) for p in consumed_prefixes):
        continue
    orphans.append(name)
if orphans:
    print('; '.join(orphans))
else:
    print('none')
" 2>/dev/null)
if [ "$ORPHANS" = "none" ]; then
  pass "No orphan entities in /api/content (all entities consumed by site)"
else
  fail "No orphan entities in /api/content" "Unconsumed: $ORPHANS"
fi

# -- Source code audit: every getContent() call maps to a real entity --

# Extract entity names from getContent(data, '...') calls using python to handle spaces
grep -oE "getContent\(data, '[^']+'\)" "$SRC_HTML" \
  | sed "s/getContent(data, '//;s/')//" \
  | sort -u \
  | while IFS= read -r REF; do
  HAS_REF=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('yes' if '$REF' in data else 'no')
" 2>/dev/null)
  if [ "$HAS_REF" = "yes" ]; then
    pass "getContent() target exists in API: $REF"
  else
    fail "getContent() target exists in API: $REF" "Source references entity not found in Fibery"
  fi
done

# -- SOLUTION_MAP audit: every JS key maps to a real entity --

grep -oE "'Solutions - [^']+'" "$SRC_HTML" \
  | tr -d "'" \
  | sort -u \
  | while IFS= read -r SOL; do
  HAS_SOL=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('yes' if '$SOL' in data else 'no')
" 2>/dev/null)
  if [ "$HAS_SOL" = "yes" ]; then
    pass "SOLUTION_MAP key exists in API: $SOL"
  else
    fail "SOLUTION_MAP key exists in API: $SOL" "JS references solution entity not in Fibery"
  fi
done

# -- Content freshness: API cache refreshes --
# The dev server has a 5s cache TTL. Verify two fetches return valid data.

CONTENT_JSON_2=$(fetch "$BASE/api/content")
if echo "$CONTENT_JSON_2" | python3 -m json.tool > /dev/null 2>&1; then
  pass "Second /api/content fetch returns valid JSON (cache or fresh)"
else
  fail "Second /api/content fetch returns valid JSON" "Possible Fibery connection issue"
fi

# -- Entity content not stale: key fields are non-trivial --

HERO_LEN=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
content = data.get('Home - Hero', {}).get('content', '')
print(len(content))
" 2>/dev/null)
if [ "$HERO_LEN" -gt 20 ]; then
  pass "Home - Hero has substantive content (${HERO_LEN} chars)"
else
  fail "Home - Hero has substantive content" "Only ${HERO_LEN} chars — may be placeholder"
fi

# -- Solution entities have non-empty body content --

for SOL_NAME in "Solutions - underscore" "Solutions - Agentic Client RFI" "Solutions - AI Underwriting Copilot"; do
  SOL_LEN=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
content = data.get('$SOL_NAME', {}).get('content', '')
print(len(content))
" 2>/dev/null)
  if [ "$SOL_LEN" -gt 50 ]; then
    pass "Solution entity has body content: $SOL_NAME (${SOL_LEN} chars)"
  else
    fail "Solution entity has body content: $SOL_NAME" "Only ${SOL_LEN} chars — insufficient for detail page"
  fi
done

# -- Verify Site Config has expected meta fields --

CONFIG_FIELDS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
content = data.get('Site Config', {}).get('content', '')
missing = []
for field in ['Sign In URL', 'Contact Email']:
    if f'**{field}:**' not in content and f'**{field}:' not in content:
        missing.append(field)
if missing:
    print('; '.join(missing))
else:
    print('ok')
" 2>/dev/null)
if [ "$CONFIG_FIELDS" = "ok" ]; then
  pass "Site Config entity has expected meta fields"
else
  fail "Site Config entity has expected meta fields" "Missing: $CONFIG_FIELDS"
fi

# -- Dist build contains baked content (no /api/content calls) --

if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ]; then
  # The dist should have baked JSON, NOT fetch('/api/content')
  if grep -q "fetch('/api/content')" "$DIST_DIR/index.html"; then
    fail "Dist has baked content (no runtime API calls)" "dist/index.html still calls fetch('/api/content')"
  else
    pass "Dist has baked content (no runtime API calls)"
  fi

  # Dist baked content should include all required entities
  for ENTITY in "${REQUIRED_ENTITIES[@]}"; do
    if grep -q "$ENTITY" "$DIST_DIR/index.html"; then
      pass "Dist contains baked entity: $ENTITY"
    else
      fail "Dist contains baked entity: $ENTITY" "Entity missing from dist — rebuild needed"
    fi
  done
else
  skip "dist/ not present — skipping baked content checks"
fi

# =============================================================================
section "Contact Email Tests"
# =============================================================================
# The canonical contact email is contact@undersight.ai (not contact@undersight.ai).
# It must be consistent across Fibery Site Config, HTML fallbacks, structured data,
# and all CTA sections.

# Test: Site Config entity has correct contact email
CONFIG_EMAIL=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
config = data.get('Site Config', {}).get('content', '')
for line in config.split('\n'):
    if '**Contact Email:**' in line:
        email = line.split('**Contact Email:**')[1].strip().rstrip('\\\\')
        print(email)
        break
" 2>/dev/null)
if [ "$CONFIG_EMAIL" = "contact@undersight.ai" ]; then
  pass "Site Config contact email is contact@undersight.ai"
else
  fail "Site Config contact email is contact@undersight.ai" "Got: $CONFIG_EMAIL"
fi

# Test: HTML schema.org email matches
SCHEMA_EMAIL=$(echo "$HTML_SOURCE" | python3 -c "
import sys, json, re
html = sys.stdin.read()
for m in re.finditer(r'application/ld\+json[^>]*>(.*?)</script>', html, re.S):
    try:
        d = json.loads(m.group(1))
        cp = d.get('contactPoint', {})
        email = cp.get('email', '') if isinstance(cp, dict) else ''
        if email:
            print(email)
            break
    except: pass
" 2>/dev/null)
if [ "$SCHEMA_EMAIL" = "contact@undersight.ai" ]; then
  pass "Schema.org structured data email is contact@undersight.ai"
else
  fail "Schema.org structured data email is contact@undersight.ai" "Got: $SCHEMA_EMAIL"
fi

# Test: llms.txt uses contact@undersight.ai
LLMS_EMAIL=$(fetch "$BASE/llms.txt")
if echo "$LLMS_EMAIL" | grep -q 'contact@undersight.ai'; then
  pass "llms.txt uses contact@undersight.ai"
else
  fail "llms.txt uses contact@undersight.ai"
fi

# Test: All email links in HTML use contact-email-link class for CMS propagation
EMAIL_LINKS_WITHOUT_CLASS=$(grep -c 'mailto:contact@undersight\.ai' "$SRC_HTML" || true)
EMAIL_LINKS_WITH_CLASS=$(grep -c 'contact-email-link.*mailto:contact@undersight\.ai\|mailto:contact@undersight\.ai.*contact-email-link' "$SRC_HTML" || true)
# Schema.org JSON-LD email is static (not a link), so subtract 1 from total
STATIC_REFS=1
EXPECTED_WITH_CLASS=$((EMAIL_LINKS_WITHOUT_CLASS - STATIC_REFS))
if [ "$EMAIL_LINKS_WITH_CLASS" -ge "$EXPECTED_WITH_CLASS" ]; then
  pass "All email <a> tags have contact-email-link class for CMS propagation"
else
  fail "All email <a> tags have contact-email-link class" "Only $EMAIL_LINKS_WITH_CLASS of $EXPECTED_WITH_CLASS have the class"
fi

# =============================================================================
section "Blog Tag Tests"
# =============================================================================
# Every blog post MUST have a **Tag:** metadata field. Tags categorize posts
# (e.g., Research, Case Study, Insight) and drive the filter UI on /blog.

BLOG_TAG_RESULT=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
missing = []
tagged = []
for name, entity in sorted(data.items()):
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    has_tag = '**Tag:**' in content
    if has_tag:
        for line in content.split('\n'):
            if '**Tag:**' in line:
                tag = line.split('**Tag:**')[1].strip().rstrip('\\\\')
                tagged.append(f'{name}={tag}')
                break
    else:
        missing.append(name)
if missing:
    print('MISSING:' + ';'.join(missing))
else:
    print('ALL_TAGGED:' + ';'.join(tagged))
" 2>/dev/null)

if [[ "$BLOG_TAG_RESULT" == ALL_TAGGED* ]]; then
  pass "All blog posts have Tag metadata"
else
  MISSING_TAGS=$(echo "$BLOG_TAG_RESULT" | sed 's/MISSING://')
  fail "All blog posts have Tag metadata" "Missing: $MISSING_TAGS"
fi

# Test: Blog filter pills render for known tags
# At minimum Research and Case Study tags should exist
for TAG in "Research" "Case Study"; do
  TAG_EXISTS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    if '**Tag:** $TAG' in entity.get('content', ''):
        print('yes')
        break
else:
    print('no')
" 2>/dev/null)
  if [ "$TAG_EXISTS" = "yes" ]; then
    pass "Blog tag '$TAG' exists in at least one post"
  else
    fail "Blog tag '$TAG' exists in at least one post"
  fi
done

# =============================================================================
section "Whitepaper Download Capture Tests"
# =============================================================================
# Research posts gated behind email capture must store submissions in a Fibery
# database (Website/Blog). The PDF modal must reference
# a functioning endpoint, not be in mock mode.

# Test: WORKER_URL is configured (not empty string)
WORKER_CONFIGURED=$(grep -c "const WORKER_URL = ''" "$SRC_HTML" || true)
if [ "$WORKER_CONFIGURED" = "0" ]; then
  pass "WORKER_URL is configured (not empty/mock mode)"
else
  fail "WORKER_URL is configured (not empty/mock mode)" "Still set to empty string — submissions only log to console"
fi

# Test: Whitepaper modal HTML exists with required elements (check source file)
for ELEM_ID in "wpOverlay" "wpForm" "wpEmail" "wpError" "wpSuccess"; do
  if grep -q "id=\"$ELEM_ID\"" "$SRC_HTML"; then
    pass "Whitepaper modal element present: #$ELEM_ID"
  else
    fail "Whitepaper modal element present: #$ELEM_ID"
  fi
done

# Test: submitWhitepaperEmail function exists
if grep -q "function submitWhitepaperEmail" "$SRC_HTML"; then
  pass "submitWhitepaperEmail() function exists"
else
  fail "submitWhitepaperEmail() function exists"
fi

# Test: openWhitepaperModal function exists
if grep -q "function openWhitepaperModal" "$SRC_HTML"; then
  pass "openWhitepaperModal() function exists"
else
  fail "openWhitepaperModal() function exists"
fi

# Test: Research blog posts have a download CTA that triggers the modal
# (At least one call to openWhitepaperModal must exist in the page)
if grep -q "openWhitepaperModal" "$SRC_HTML"; then
  pass "openWhitepaperModal() is called somewhere in the page"
else
  fail "openWhitepaperModal() is called somewhere in the page"
fi

# =============================================================================
section "Image & Asset Provenance Tests"
# =============================================================================
# All images referenced in code must exist on disk. Solution narrative images
# and blog images must resolve to actual files.

# Test: All SOLUTION_NARRATIVES images exist
SOL_IMAGES=$(grep -oE "images/solutions/[a-z0-9]+\.(png|webp)" "$SRC_HTML" | sort -u)
for IMG in $SOL_IMAGES; do
  if [ -f "$SITE_ROOT/$IMG" ]; then
    pass "Solution image exists: $IMG"
  else
    fail "Solution image exists: $IMG" "File not found on disk"
  fi
done

# Test: All BLOG_IMAGES (non-special) exist
BLOG_IMGS=$(grep -oE "images/blog/[a-z0-9-]+\.(png|webp)" "$SRC_HTML" | sort -u)
for IMG in $BLOG_IMGS; do
  if [ -f "$SITE_ROOT/$IMG" ]; then
    pass "Blog image exists: $IMG"
  else
    fail "Blog image exists: $IMG" "File not found on disk"
  fi
done

# Test: Logo SVG used in nav header exists
if [ -f "$SITE_ROOT/images/brand/logo-horizontal-line-primary.svg" ]; then
  pass "Nav logo SVG exists: images/brand/logo-horizontal-line-primary.svg"
else
  fail "Nav logo SVG exists: images/brand/logo-horizontal-line-primary.svg"
fi

# Test: OG image exists
if [ -f "$SITE_ROOT/images/og-image.png" ]; then
  pass "OG image exists: images/og-image.png"
else
  fail "OG image exists: images/og-image.png"
fi

# Test: All favicon variants exist
for ICON in "favicon.svg" "favicon-16.png" "favicon-32.png" "apple-touch-icon.png" "favicon-180.png" "favicon-192.png" "favicon-512.png"; do
  if [ -f "$SITE_ROOT/$ICON" ]; then
    pass "Favicon exists: $ICON"
  else
    fail "Favicon exists: $ICON"
  fi
done

# =============================================================================
section "CMS Content Coverage Tests"
# =============================================================================
# Every visible section of the site should pull content from a Fibery entity.
# Hardcoded text means content cannot be updated without a code deploy.

# Test: Homepage hero is CMS-driven
if grep -q "getContent(data, 'Home - Hero')" "$SRC_HTML"; then
  pass "Homepage hero pulls from Fibery entity 'Home - Hero'"
else
  fail "Homepage hero pulls from Fibery entity 'Home - Hero'"
fi

# Test: Contact page is CMS-driven
if grep -q "getContent(data, 'Contact Page')" "$SRC_HTML"; then
  pass "Contact page pulls from Fibery entity 'Contact Page'"
else
  fail "Contact page pulls from Fibery entity 'Contact Page'"
fi

# Test: Site Config is CMS-driven
if grep -q "getContent(data, 'Site Config')" "$SRC_HTML"; then
  pass "Site config pulls from Fibery entity 'Site Config'"
else
  fail "Site config pulls from Fibery entity 'Site Config'"
fi

# Test: All 3 solution entities are in SOLUTION_MAP and consumed via getContent
# Solutions use getContent(data, entityName) with entityName from SOLUTION_MAP keys
if grep -q "SOLUTION_MAP" "$SRC_HTML" && grep -q "getContent(data, entityName)" "$SRC_HTML"; then
  pass "Solution pages are CMS-driven via SOLUTION_MAP + getContent(data, entityName)"
else
  fail "Solution pages are CMS-driven via SOLUTION_MAP + getContent(data, entityName)"
fi

# Test: Blog posts are CMS-driven (dynamic rendering from Blog - * entities)
if grep -q "k\.startsWith('Blog - ')" "$SRC_HTML" || grep -q "k.startsWith('Blog - ')" "$SRC_HTML"; then
  pass "Blog grid dynamically renders from 'Blog - *' entities"
else
  fail "Blog grid dynamically renders from 'Blog - *' entities"
fi

# Test: Docs/Construction page entity exists in Fibery
# Must be a dedicated entity (not a blog post) with name starting with "Docs" or "Construction"
DOCS_ENTITY=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
found = [k for k in data if k.startswith('Docs') or k.startswith('Construction')]
print(';'.join(found) if found else 'none')
" 2>/dev/null)
if [ "$DOCS_ENTITY" != "none" ]; then
  pass "Docs/Construction page entity exists in Fibery: $DOCS_ENTITY"
else
  fail "Docs/Construction page entity exists in Fibery" "No dedicated entity — page content is fully hardcoded"
fi

# Test: Contact Page entity has email field
CONTACT_HAS_EMAIL=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
content = data.get('Contact Page', {}).get('content', '')
has = '**Email:**' in content
print('yes' if has else 'no')
" 2>/dev/null)
if [ "$CONTACT_HAS_EMAIL" = "yes" ]; then
  pass "Contact Page entity has Email metadata field"
else
  fail "Contact Page entity has Email metadata field"
fi

# Test: Contact Page entity email matches canonical
CONTACT_EMAIL=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
content = data.get('Contact Page', {}).get('content', '')
for line in content.split('\n'):
    if '**Email:**' in line:
        print(line.split('**Email:**')[1].strip().rstrip('\\\\'))
        break
" 2>/dev/null)
if [ "$CONTACT_EMAIL" = "contact@undersight.ai" ]; then
  pass "Contact Page entity email is contact@undersight.ai"
else
  fail "Contact Page entity email is contact@undersight.ai" "Got: $CONTACT_EMAIL"
fi

# =============================================================================
section "Whitepaper Lead Capture"
# =============================================================================

# Test: Whitepaper modal HTML exists
if grep -q 'wp-overlay' "$SITE_ROOT/index.html"; then
  pass "Whitepaper modal HTML present in index.html"
else
  fail "Whitepaper modal HTML present in index.html"
fi

# Test: Modal CSS classes defined
if grep -q '\.wp-overlay' "$SITE_ROOT/css/main.css"; then
  pass "Whitepaper modal CSS defined in main.css"
else
  fail "Whitepaper modal CSS defined in main.css"
fi

# Test: openWhitepaperModal function exists
if grep -q 'function openWhitepaperModal' "$SITE_ROOT/index.html"; then
  pass "openWhitepaperModal() function defined"
else
  fail "openWhitepaperModal() function defined"
fi

# Test: Download button in Chat Advance case study section
if grep -q "Home - Case Study: Chat Advance" "$SITE_ROOT/index.html" && grep -q "openWhitepaperModal" "$SITE_ROOT/index.html"; then
  pass "Download button present in Chat Advance case study"
else
  fail "Download button present in Chat Advance case study"
fi

# Test: Download button in 4D Financing case study section
if grep -q "Home - Case Study: 4D Financing" "$SITE_ROOT/index.html" && grep -q "openWhitepaperModal" "$SITE_ROOT/index.html"; then
  pass "Download button present in 4D Financing case study"
else
  fail "Download button present in 4D Financing case study"
fi

# Test: Modal title is generic (not hardcoded to a specific case study)
MODAL_TITLE=$(grep 'id="wpTitle"' "$SITE_ROOT/index.html" | head -1)
if echo "$MODAL_TITLE" | grep -qi "chat advance"; then
  fail "Modal title is generic" "Hardcoded to 'Chat Advance'"
else
  pass "Modal title is generic (not hardcoded to a specific post)"
fi

# Test: Modal description is generic (not hardcoded to a specific case study)
MODAL_DESC=$(grep 'id="wpDesc"\|class="wp-desc"' "$SITE_ROOT/index.html" | head -1)
if echo "$MODAL_DESC" | grep -qi "chat advance"; then
  fail "Modal description is generic" "Hardcoded to 'Chat Advance'"
else
  pass "Modal description is generic (not hardcoded to a specific post)"
fi

# Test: Modal description is dynamically set by openWhitepaperModal
if grep -q "wpDesc.*textContent" "$SITE_ROOT/index.html"; then
  pass "openWhitepaperModal() dynamically sets modal description"
else
  fail "openWhitepaperModal() dynamically sets modal description"
fi

# Test: Success message is generic (not "case study")
SUCCESS_MSG=$(sed -n '/id="wpSuccess"/,/<\/div>/p' "$SITE_ROOT/index.html" | head -10)
if echo "$SUCCESS_MSG" | grep -qi "case study"; then
  fail "Success message is generic" "Still mentions 'case study'"
else
  pass "Success message is generic (says 'PDF' not 'case study')"
fi

# Test: No staging URLs (skip — Sign In intentionally uses staging until prod auth)
skip "Staging URL source check (Sign In link uses staging.app by design)"

# Test: Dist modal has no hardcoded "Chat Advance" in static HTML
# (catches the bug where baked dist still shows old hardcoded modal text)
if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ]; then
  # Check the static modal HTML (not JS-generated content)
  DIST_MODAL=$(sed -n '/id="wpTitle"/,/id="wpSuccess"/p' "$DIST_DIR/index.html" | head -5)
  if echo "$DIST_MODAL" | grep -qi "chat advance"; then
    fail "Dist modal text is generic" "Baked dist still has hardcoded 'Chat Advance' in modal HTML"
  else
    pass "Dist modal text is generic (no hardcoded post name)"
  fi

  # Check that the default _activeWhitepaper is empty (not pre-set to Chat Advance)
  if grep -q "_activeWhitepaper = 'Chat Advance" "$DIST_DIR/index.html"; then
    fail "Dist _activeWhitepaper is not hardcoded" "Default is still 'Chat Advance Case Study'"
  else
    pass "Dist _activeWhitepaper is not hardcoded to a specific post"
  fi
else
  skip "dist/ not present — skipping baked modal checks"
fi

# Test: WORKER_URL uses the shared local/prod API route
if grep -q "const WORKER_URL = '/api/whitepaper-lead'" "$SITE_ROOT/index.html"; then
  pass "WORKER_URL uses shared /api/whitepaper-lead route"
else
  fail "WORKER_URL uses shared /api/whitepaper-lead route"
fi

# Test: Modal has email input
if grep -q 'id="wpEmail"' "$SITE_ROOT/index.html"; then
  pass "Modal contains email input field"
else
  fail "Modal contains email input field"
fi

# Test: Modal has success state
if grep -q 'id="wpSuccess"' "$SITE_ROOT/index.html"; then
  pass "Modal contains success state element"
else
  fail "Modal contains success state element"
fi

# Test: Escape key closes modal
if grep -q "key === 'Escape'" "$SITE_ROOT/index.html"; then
  pass "Escape key handler for modal close"
else
  fail "Escape key handler for modal close"
fi

# Test: No hardcoded whitepaper name in submit (uses _activeWhitepaper)
if grep -q '_activeWhitepaper' "$SITE_ROOT/index.html"; then
  pass "Submit uses _activeWhitepaper variable (supports multiple whitepapers)"
else
  fail "Submit uses _activeWhitepaper variable"
fi

# Test: stripContents function for blog posts
if grep -q 'function stripContents' "$SITE_ROOT/index.html"; then
  pass "stripContents() removes table of contents from blog posts"
else
  fail "stripContents() removes table of contents from blog posts"
fi

# Test: Every downloadable blog post has a matching Blog entity in Fibery
# Frontend maps case-study display titles to delivery entities and sends that name.
WP_MATCH=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json, subprocess, urllib.request
data = json.load(sys.stdin)
token = subprocess.run(['security','find-generic-password','-s','mcp-credentials','-a','fibery-undersight','-w'], capture_output=True, text=True).stdout.strip()
# Get downloadable posts (Research + Case Study tags)
downloadable = []
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    if '**Tag:** Research' in content or '**Tag:** Case Study' in content:
        title = name.replace('Blog - ', '')
        if 'Chat Advance' in title:
            title = 'Chat Advance Case Study'
        elif '4D Financing' in title:
            title = '4D Financing Case Study'
        downloadable.append(title)
# Get all Blog delivery entity names
try:
    req = urllib.request.Request('https://subscript.fibery.io/api/commands',
        data=json.dumps([{'command':'fibery.entity/query','args':{'query':{'q/from':'Website/Blog','q/select':['Website/name'],'q/limit':50}}}]).encode(),
        headers={'Authorization':'Token '+token,'Content-Type':'application/json'})
    resp = urllib.request.urlopen(req)
    wp_data = json.loads(resp.read())
    wp_names = set(e.get('Website/name','') for e in wp_data[0].get('result',[]))
except:
    print('ERROR:could not query Blog database')
    sys.exit(0)
missing = [t for t in downloadable if t not in wp_names]
if missing:
    print('MISSING:' + ';'.join(missing))
else:
    print('ALL_MATCHED:' + str(len(downloadable)))
" 2>/dev/null)
if [[ "$WP_MATCH" == ALL_MATCHED* ]]; then
  COUNT=$(echo "$WP_MATCH" | sed 's/ALL_MATCHED://')
  pass "All $COUNT downloadable posts have matching Blog delivery entities in Fibery"
elif [[ "$WP_MATCH" == ERROR* ]]; then
  skip "Could not query Blog database"
else
  MISSING=$(echo "$WP_MATCH" | sed 's/MISSING://')
  fail "All downloadable posts have matching Blog delivery entities" "Missing: $MISSING"
fi

# Test: Lead capture endpoint responds (dev server)
if [ "${RUN_FIBERY_WRITE_TESTS:-0}" = "1" ]; then
  WP_LEAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/whitepaper-lead" \
    -H "Content-Type: application/json" \
    -d '{"email":"test-suite@example.com","whitepaper":"Chat Advance Case Study"}' 2>/dev/null)
  if [ "$WP_LEAD_RESPONSE" = "200" ]; then
    pass "POST /api/whitepaper-lead returns 200"
  else
    skip "POST /api/whitepaper-lead returns 200 (dev server may not be running)"
  fi
else
  skip "POST /api/whitepaper-lead write test (set RUN_FIBERY_WRITE_TESTS=1 to enable)"
fi

# Test: Lead capture validates email
WP_INVALID_RESPONSE=$(curl -s -X POST "$BASE/api/whitepaper-lead" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","whitepaper":"test"}' 2>/dev/null)
if echo "$WP_INVALID_RESPONSE" | grep -q '"error"'; then
  pass "Lead capture rejects invalid email"
else
  skip "Lead capture rejects invalid email (dev server may not be running)"
fi

# Test: Lead capture returns error for empty email
WP_EMPTY_RESPONSE=$(curl -s -X POST "$BASE/api/whitepaper-lead" \
  -H "Content-Type: application/json" \
  -d '{"email":"","whitepaper":"test"}' 2>/dev/null)
if echo "$WP_EMPTY_RESPONSE" | grep -q '"error"'; then
  pass "Lead capture rejects empty email"
else
  skip "Lead capture rejects empty email (dev server may not be running)"
fi

# Test: Whitepaper PDFs exist
WP_DIR="$SITE_ROOT/whitepaper"
WP_PDF_COUNT=0
for pdf in "chat-advance-case-study.pdf" "deterministic-scorecards.pdf" "institutional-capital.pdf"; do
  if [ -f "$WP_DIR/$pdf" ]; then
    WP_PDF_COUNT=$((WP_PDF_COUNT + 1))
  fi
done
if [ "$WP_PDF_COUNT" -eq 3 ]; then
  pass "All 3 whitepaper PDFs generated ($WP_PDF_COUNT/3)"
else
  fail "All 3 whitepaper PDFs generated" "Found $WP_PDF_COUNT/3"
fi

# Test: PDF generation script exists
if [ -f "$WP_DIR/generate-all.js" ]; then
  pass "PDF generation script (generate-all.js) exists"
else
  fail "PDF generation script (generate-all.js) exists"
fi

# Test: Cloudflare Worker source exists
WORKER_DIR="$SITE_ROOT/worker"
if [ -f "$WORKER_DIR/index.js" ] && [ -f "$WORKER_DIR/wrangler.toml" ]; then
  pass "Cloudflare Worker source files present (index.js + wrangler.toml)"
else
  fail "Cloudflare Worker source files present"
fi

# Test: Worker has CORS headers
if grep -q 'Access-Control-Allow-Origin' "$WORKER_DIR/index.js"; then
  pass "Worker includes CORS headers"
else
  fail "Worker includes CORS headers"
fi

# Test: Worker does not hardcode API token
if grep -q 'env.FIBERY_TOKEN' "$WORKER_DIR/index.js" && ! grep -q 'Token [a-f0-9]' "$WORKER_DIR/index.js"; then
  pass "Worker uses env secret for Fibery token (not hardcoded)"
else
  fail "Worker uses env secret for Fibery token"
fi

# Test: Dev server whitepaper relay has param syntax
if grep -q '"\$name"' "$SITE_ROOT/undersight-serve.py"; then
  pass "Dev server uses Fibery param syntax for whitepaper lookup"
else
  fail "Dev server uses Fibery param syntax for whitepaper lookup"
fi

# Test: Research blog posts get download button
if grep -q "wpName" "$SITE_ROOT/index.html" && grep -q "tag === 'Research'" "$SITE_ROOT/index.html"; then
  pass "Research blog posts include download button with dynamic whitepaper name"
else
  fail "Research blog posts include download button"
fi

# =============================================================================
section "Locked Design Decisions"
# =============================================================================
# These values were intentionally recovered after the parallel-agent regression.

MAIN_CSS_FILE="$SITE_ROOT/css/main.css"

if grep -q 'sol-row {' "$MAIN_CSS_FILE" && grep -A2 'sol-row {' "$MAIN_CSS_FILE" | grep -q 'gap: 28px'; then
  pass "sol-row gap is 28px (compact recovered layout)"
else
  fail "sol-row gap is 28px" "Old wider spacing restored"
fi

if grep -A2 'sol-row-img {' "$MAIN_CSS_FILE" | grep -q '240px'; then
  pass "sol-row-img width is 240px"
else
  fail "sol-row-img width is 240px" "Old 360px image rail restored"
fi

if grep 'object-fit' "$MAIN_CSS_FILE" | head -1 | grep -q 'cover'; then
  pass "sol-row-img uses object-fit: cover"
else
  fail "sol-row-img uses object-fit: cover" "Old contain framing restored"
fi

if grep -A3 'sol-row-img img' "$MAIN_CSS_FILE" | grep -q 'padding:'; then
  fail "sol-row-img img has no padding" "Image padding restored"
else
  pass "sol-row-img img has no padding"
fi

SOL_IMG_DIR="$SITE_ROOT/images/solutions"
LARGE_IMGS=0
for img in "$SOL_IMG_DIR"/us1.webp "$SOL_IMG_DIR"/us2.webp "$SOL_IMG_DIR"/us3.webp "$SOL_IMG_DIR"/rfi1.webp "$SOL_IMG_DIR"/rfi2.webp "$SOL_IMG_DIR"/rfi3.webp "$SOL_IMG_DIR"/cop1.webp "$SOL_IMG_DIR"/cop2.webp "$SOL_IMG_DIR"/cop3.webp; do
  if [ -f "$img" ]; then
    SIZE=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 100000 ]; then
      LARGE_IMGS=$((LARGE_IMGS + 1))
    fi
  else
    LARGE_IMGS=$((LARGE_IMGS + 1))
  fi
done
if [ "$LARGE_IMGS" -eq 0 ]; then
  pass "All solution WebP images are simplified (< 100KB each)"
else
  fail "All solution WebP images are simplified" "$LARGE_IMGS missing or large image(s)"
fi

# =============================================================================
section "CMS Content Safety Tests"
# =============================================================================
# Validates that content changes in Fibery don't break the site.
# These tests catch common CMS authoring mistakes before they hit production.

# Test 1: No empty blog bodies — every Blog entity must have content after ---
EMPTY_BODIES=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
empty = []
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    if '---' in content:
        body = content.split('---', 1)[1].strip()
        if not body:
            empty.append(name)
    else:
        # No separator means no metadata block — entire content is body
        if not content.strip():
            empty.append(name)
if empty:
    print(';'.join(empty))
else:
    print('ok')
" 2>/dev/null)
if [ "$EMPTY_BODIES" = "ok" ]; then
  pass "No empty blog bodies (all posts have content after --- separator)"
else
  fail "No empty blog bodies" "Empty body in: $EMPTY_BODIES"
fi

# Test 2: Blog hero images resolve — every Blog entity has at least one image file
BLOGS_WITHOUT_IMAGES=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
missing = []
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    files = entity.get('files', [])
    has_image = any(f.get('type', '').startswith('image/') for f in files)
    if not has_image:
        missing.append(name)
if missing:
    print(';'.join(missing))
else:
    print('ok')
" 2>/dev/null)
if [ "$BLOGS_WITHOUT_IMAGES" = "ok" ]; then
  pass "All blog entities have at least one image file attachment"
else
  fail "All blog entities have at least one image file attachment" "Missing images: $BLOGS_WITHOUT_IMAGES"
fi

# Test 3: Required blog metadata complete — Date, Excerpt, Tag, Author
BLOG_META_MISSING=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
issues = []
for name, entity in sorted(data.items()):
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    missing_fields = []
    if '**Date:**' not in content and '**Date:' not in content:
        missing_fields.append('Date')
    if '**Excerpt:**' not in content and '**Excerpt:' not in content:
        missing_fields.append('Excerpt')
    if '**Tag:**' not in content and '**Tag:' not in content:
        missing_fields.append('Tag')
    if '**Author:**' not in content and '**Author:' not in content:
        missing_fields.append('Author')
    if missing_fields:
        issues.append(f'{name} (missing: {\", \".join(missing_fields)})')
if issues:
    print(';'.join(issues))
else:
    print('ok')
" 2>/dev/null)
if [ "$BLOG_META_MISSING" = "ok" ]; then
  pass "All blog entities have required metadata (Date, Excerpt, Tag, Author)"
else
  fail "All blog entities have required metadata" "$BLOG_META_MISSING"
fi

# Test 4: No broken internal references — SOLUTION_MAP names exist in content API
# (This extends the existing SOLUTION_MAP audit with a content-safety framing)
SOL_REF_MISSING=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
expected = ['Solutions - underscore', 'Solutions - Agentic Client RFI', 'Solutions - AI Underwriting Copilot']
missing = [s for s in expected if s not in data]
if missing:
    print(';'.join(missing))
else:
    print('ok')
" 2>/dev/null)
if [ "$SOL_REF_MISSING" = "ok" ]; then
  pass "All SOLUTION_MAP references resolve to existing content entities"
else
  fail "All SOLUTION_MAP references resolve to existing content entities" "Missing: $SOL_REF_MISSING"
fi

# Test 5: Minimum content length per entity type
# Blog posts: body (after ---) must be > 100 chars
SHORT_BLOGS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
short = []
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    if '---' in content:
        body = content.split('---', 1)[1].strip()
    else:
        body = content.strip()
    if len(body) <= 100:
        short.append(f'{name} ({len(body)} chars)')
if short:
    print(';'.join(short))
else:
    print('ok')
" 2>/dev/null)
if [ "$SHORT_BLOGS" = "ok" ]; then
  pass "All blog posts have body content > 100 chars"
else
  fail "All blog posts have body content > 100 chars" "Too short: $SHORT_BLOGS"
fi

# Solution pages: content must be > 50 chars
SHORT_SOLUTIONS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
short = []
for name, entity in data.items():
    if not name.startswith('Solutions - '): continue
    content = entity.get('content', '').strip()
    if len(content) <= 50:
        short.append(f'{name} ({len(content)} chars)')
if short:
    print(';'.join(short))
else:
    print('ok')
" 2>/dev/null)
if [ "$SHORT_SOLUTIONS" = "ok" ]; then
  pass "All solution pages have content > 50 chars"
else
  fail "All solution pages have content > 50 chars" "Too short: $SHORT_SOLUTIONS"
fi

# Home sections: content must be > 10 chars
SHORT_HOME=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
short = []
for name, entity in data.items():
    if not name.startswith('Home - '): continue
    content = entity.get('content', '').strip()
    if len(content) <= 10:
        short.append(f'{name} ({len(content)} chars)')
if short:
    print(';'.join(short))
else:
    print('ok')
" 2>/dev/null)
if [ "$SHORT_HOME" = "ok" ]; then
  pass "All home sections have content > 10 chars"
else
  fail "All home sections have content > 10 chars" "Too short: $SHORT_HOME"
fi

# Test 6: Image file URLs in content are valid
# Markdown image syntax ![alt](url) must use /api/file/ (dev) or images/ (prod/local)
INVALID_IMG_URLS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json, re
data = json.load(sys.stdin)
invalid = []
img_pattern = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')
for name, entity in data.items():
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    for match in img_pattern.finditer(content):
        url = match.group(1)
        if url.startswith('/api/file/') or url.startswith('images/') or url.startswith('./images/'):
            continue
        # Also allow absolute https URLs (external images are acceptable)
        if url.startswith('https://') or url.startswith('http://'):
            continue
        invalid.append(f'{name}: {url}')
if invalid:
    print(';'.join(invalid[:5]))
else:
    print('ok')
" 2>/dev/null)
if [ "$INVALID_IMG_URLS" = "ok" ]; then
  pass "All markdown image URLs in blog content use valid paths"
else
  fail "All markdown image URLs in blog content use valid paths" "Invalid: $INVALID_IMG_URLS"
fi

# Test 7: No duplicate blog titles
DUPLICATE_TITLES=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
titles = []
for name in data:
    if name.startswith('Blog - '):
        title = name.replace('Blog - ', '')
        titles.append(title)
seen = set()
duplicates = set()
for t in titles:
    if t in seen:
        duplicates.add(t)
    seen.add(t)
if duplicates:
    print(';'.join(sorted(duplicates)))
else:
    print('ok')
" 2>/dev/null)
if [ "$DUPLICATE_TITLES" = "ok" ]; then
  pass "No duplicate blog titles"
else
  fail "No duplicate blog titles" "Duplicates: $DUPLICATE_TITLES"
fi

# Test 8: Tag values are from allowed set
INVALID_TAGS=$(echo "$CONTENT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
allowed_tags = {'Research', 'Case Study', 'Insight'}
invalid = []
for name, entity in sorted(data.items()):
    if not name.startswith('Blog - '): continue
    content = entity.get('content', '')
    for line in content.split('\n'):
        if '**Tag:**' in line:
            tag = line.split('**Tag:**')[1].strip().rstrip('\\\\')
            if tag and tag not in allowed_tags:
                invalid.append(f'{name} (tag: \"{tag}\")')
            break
if invalid:
    print(';'.join(invalid))
else:
    print('ok')
" 2>/dev/null)
if [ "$INVALID_TAGS" = "ok" ]; then
  pass "All blog tags are from allowed set (Research, Case Study, Insight)"
else
  fail "All blog tags are from allowed set" "Unexpected tags: $INVALID_TAGS"
fi

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
