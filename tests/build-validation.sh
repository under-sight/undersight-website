#!/usr/bin/env bash
# Validates dist/ build output before deployment
set -euo pipefail

DIST="dist"
PASS=0; FAIL=0

pass() { PASS=$((PASS+1)); echo "  PASS  $1"; }
fail() { FAIL=$((FAIL+1)); echo "  FAIL  $1 -> ${2:-}"; }

echo "=== Build Validation ==="
echo ""

# dist/index.html exists and is non-trivial
[ -f "$DIST/index.html" ] && [ $(wc -c < "$DIST/index.html") -gt 10000 ] && pass "dist/index.html exists and >10KB" || fail "dist/index.html exists and >10KB"

# CSS files present
[ -f "$DIST/css/main.css" ] && pass "dist/css/main.css present" || fail "dist/css/main.css present"
[ -f "$DIST/css/tokens.css" ] && pass "dist/css/tokens.css present" || fail "dist/css/tokens.css present"

# No /api/content calls in baked build
! grep -q "fetch('/api/content')" "$DIST/index.html" && pass "No runtime API calls in dist" || fail "No runtime API calls in dist"

# Baked content contains required entities
for entity in "Home - Hero" "Site Config" "Solutions - underscore" "Solutions - underchat agent" "Solutions - AI Underwriting Copilot"; do
  grep -q "$entity" "$DIST/index.html" && pass "Baked entity: $entity" || fail "Baked entity: $entity" "Missing from dist"
done

# At least one Blog entity baked (look for the _blogs structured data with a slug).
# Blog content moved from CMS/Pages 'Blog -*' entries to the dedicated
# CMS/Blog database in May 2026, so legacy "Blog - " prefix is gone.
grep -q '"_blogs"' "$DIST/index.html" && grep -q '"slug":' "$DIST/index.html" && pass "Blog content baked" || fail "Blog content baked"

# Migration-created JSON/markdown escaping should not surface in site copy.
if python3 - <<'PY'
from pathlib import Path
import sys

html = Path("dist/index.html").read_text(encoding="utf-8")
bad = [
    r"\\* Offer",
    r"\\* **",
    r"\\u2014",
    r"\\~8",
    r"\\n",
    r"\\\n",
    r"\\\\n",
    r"\\\\\n",
]
found = [pattern for pattern in bad if pattern in html]
if found:
    print("Escaped CMS artifacts found: " + ", ".join(found))
    sys.exit(1)
PY
then
  pass "No escaped CMS markdown artifacts in dist"
else
  fail "No escaped CMS markdown artifacts in dist"
fi

# No Fibery secrets/UUIDs leaked
! grep -qE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$DIST/index.html" && pass "No Fibery UUIDs in dist" || fail "No Fibery UUIDs in dist"

# No auth tokens
! grep -qiE 'Authorization.*Token [a-zA-Z0-9]' "$DIST/index.html" && pass "No auth tokens in dist" || fail "No auth tokens in dist"

# Images directory exists with files
[ -d "$DIST/images" ] && pass "dist/images/ directory exists" || fail "dist/images/ directory exists"

# Favicon present
[ -f "$DIST/favicon.svg" ] && pass "Favicon present" || fail "Favicon present"

# --- Agent discoverability artifacts (generated at build time from CMS) ---

# sitemap.xml: clean paths, per-post URLs with lastmod, no hash fragments
if [ -f "$DIST/sitemap.xml" ]; then
  pass "dist/sitemap.xml present"
  ! grep -q '#' "$DIST/sitemap.xml" && pass "sitemap has no hash-fragment URLs" || fail "sitemap has no hash-fragment URLs"
  BLOG_LOCS=$(grep -c '<loc>https://undersight.ai/blog/' "$DIST/sitemap.xml" || true)
  [ "$BLOG_LOCS" -ge 1 ] && pass "sitemap has per-post blog URLs ($BLOG_LOCS)" || fail "sitemap has per-post blog URLs" "none found"
  grep -q '<lastmod>' "$DIST/sitemap.xml" && pass "sitemap has <lastmod> from Post Date" || fail "sitemap has <lastmod> from Post Date"
else
  fail "dist/sitemap.xml present"
  BLOG_LOCS=0
fi

# BlogPosting JSON-LD baked into index.html, one per post (same count as sitemap)
JSONLD_POSTS=$(grep -o '"@type": "BlogPosting"' "$DIST/index.html" | wc -l | tr -d ' ')
[ "$JSONLD_POSTS" -ge 1 ] && pass "BlogPosting JSON-LD baked ($JSONLD_POSTS posts)" || fail "BlogPosting JSON-LD baked" "none found"
grep -q '"datePublished"' "$DIST/index.html" && pass "BlogPosting JSON-LD has datePublished" || fail "BlogPosting JSON-LD has datePublished"
[ "$JSONLD_POSTS" = "$BLOG_LOCS" ] && pass "JSON-LD post count matches sitemap blog URLs ($JSONLD_POSTS)" || fail "JSON-LD post count matches sitemap blog URLs" "jsonld=$JSONLD_POSTS sitemap=$BLOG_LOCS"

# llms.txt: agent summary with docs link + blog index (titles/dates/URLs from CMS)
if [ -f "$DIST/llms.txt" ]; then
  pass "dist/llms.txt present"
  grep -q 'documentation.underchat.ai' "$DIST/llms.txt" && pass "llms.txt links documentation site" || fail "llms.txt links documentation site"
  LLMS_POSTS=$(grep -c 'https://undersight.ai/blog/' "$DIST/llms.txt" || true)
  [ "$LLMS_POSTS" = "$BLOG_LOCS" ] && pass "llms.txt blog index matches sitemap ($LLMS_POSTS posts)" || fail "llms.txt blog index matches sitemap" "llms=$LLMS_POSTS sitemap=$BLOG_LOCS"
else
  fail "dist/llms.txt present"
fi

# llms-full.txt: full plain-text content of pages + every blog post
if [ -f "$DIST/llms-full.txt" ] && [ "$(wc -c < "$DIST/llms-full.txt")" -gt 2000 ]; then
  pass "dist/llms-full.txt present and non-trivial"
  FULL_POSTS=$(grep -c 'URL: https://undersight.ai/blog/' "$DIST/llms-full.txt" || true)
  [ "$FULL_POSTS" = "$BLOG_LOCS" ] && pass "llms-full.txt covers every blog post ($FULL_POSTS)" || fail "llms-full.txt covers every blog post" "full=$FULL_POSTS sitemap=$BLOG_LOCS"
  grep -q 'Published: ' "$DIST/llms-full.txt" && pass "llms-full.txt has post dates" || fail "llms-full.txt has post dates"
  # Legacy migration front-matter (**Date:**/**Excerpt:**/**Tag:** lines) must
  # be stripped from post bodies — the canonical date is the Published: line.
  # Scoped to the "# Blog" section: page sections legitimately surface Tag:
  # chips that the site renders as content.
  BLOG_LEAKS=$(sed -n '/^# Blog$/,$p' "$DIST/llms-full.txt" | grep -cE '^(Date|Excerpt|Tag): ' || true)
  if [ "$BLOG_LEAKS" -gt 0 ]; then
    fail "llms-full.txt blog section free of legacy front-matter" "$BLOG_LEAKS leaked line(s)"
  else
    pass "llms-full.txt blog section free of legacy front-matter"
  fi
else
  fail "dist/llms-full.txt present and non-trivial"
fi

# robots.txt + _headers shipped with LLM hints
grep -q '/llms-full.txt' "$DIST/robots.txt" 2>/dev/null && pass "dist/robots.txt hints at llms-full.txt" || fail "dist/robots.txt hints at llms-full.txt"
[ -f "$DIST/_headers" ] && grep -q 'X-Robots-Tag: all' "$DIST/_headers" && pass "dist/_headers sets X-Robots-Tag" || fail "dist/_headers sets X-Robots-Tag"

# Docs tab: external link baked, no SPA docs routing in dist
grep -q 'https://documentation.underchat.ai/' "$DIST/index.html" && pass "dist docs links point at documentation.underchat.ai" || fail "dist docs links point at documentation.underchat.ai"
! grep -q "navigate('docs')" "$DIST/index.html" && pass "No navigate('docs') in dist" || fail "No navigate('docs') in dist"

echo ""
echo "Results: $((PASS+FAIL)) tests — PASS: $PASS, FAIL: $FAIL"
[ $FAIL -eq 0 ] && echo "ALL PASSED" && exit 0 || echo "FAILED" && exit 1
