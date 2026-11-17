#!/usr/bin/env python3
"""
Static site builder for undersight.ai

Reads content/content.json and the repo's static assets, and bakes everything
into a self-contained static site in dist/.

Usage:
    python3 build.py            # Build to dist/
    python3 build.py --verify   # Build + run security checks on output

"""

import hashlib
import json
import os
import re
import shutil
import sys
import time

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SITE_URL = "https://undersight.ai"
DOCS_URL = "https://documentation.underchat.ai/"
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(SRC_DIR, "dist")
CONTENT_PATH = os.path.join(SRC_DIR, "content", "content.json")

# Static files and directories to copy into dist/
# NOTE: sitemap.xml and llms.txt are copied as fallbacks and then REGENERATED
# from CMS content (per-post URLs / blog index) later in the build.
STATIC_DIRS = ["css", "images", "resources"]
STATIC_FILES = [
    "robots.txt",
    "sitemap.xml",
    "manifest.json",
    "llms.txt",
    "_headers",
    "favicon.svg",
    "favicon-16.png",
    "favicon-32.png",
    "favicon-180.png",
    "favicon-192.png",
    "favicon-512.png",
    "apple-touch-icon.png",
    "_redirects",
]

def bake_content_into_html(html, content_json):
    """
    Replace the async fetch('/api/content') call in loadContent() with
    inline content injection.
    """
    # The loadContent function fetches /api/content and passes it to renderContent.
    # We replace the entire function body to use baked-in data instead.

    baked_json = json.dumps(content_json, ensure_ascii=False, separators=(",", ":"))

    # Escape for embedding inside a JS string literal in HTML
    # (close-script tag, backslashes, etc.)
    baked_json = baked_json.replace("</", "<\\/")

    # Replace the loadContent function
    old_pattern = r"(async function loadContent\(\) \{)[^}]*\}[^}]*\}"
    # More robust: find the function and replace its body
    # The function spans from "async function loadContent()" to its closing }
    # We need to match balanced braces

    old_func = _extract_function(html, "loadContent")
    if not old_func:
        print("ERROR: Could not find loadContent() function in index.html")
        sys.exit(1)

    new_func = (
        "async function loadContent() {\n"
        "    try {\n"
        f"      const data = {baked_json};\n"
        "      renderContent(data);\n"
        "    } catch (err) {\n"
        "      console.error('Content render failed:', err);\n"
        "    }\n"
        "    // Swap skeleton for live content on all pages\n"
        "    document.querySelectorAll('.page.loading').forEach(p => p.classList.remove('loading'));\n"
        "  }"
    )

    return html.replace(old_func, new_func)


def _extract_function(html, func_name):
    """
    Extract a complete function definition from HTML/JS by matching braces.
    Returns the full function text including the function keyword and closing brace.
    """
    # Find the start of the function
    pattern = rf"(async\s+)?function\s+{re.escape(func_name)}\s*\("
    match = re.search(pattern, html)
    if not match:
        return None

    start = match.start()
    # Find the opening brace
    brace_pos = html.index("{", match.end())
    depth = 1
    pos = brace_pos + 1

    while depth > 0 and pos < len(html):
        ch = html[pos]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif ch == "'" or ch == '"' or ch == "`":
            # Skip string literals
            quote = ch
            pos += 1
            while pos < len(html):
                if html[pos] == "\\" and pos + 1 < len(html):
                    pos += 2
                    continue
                if html[pos] == quote:
                    break
                if quote == "`" and html[pos] == "$" and pos + 1 < len(html) and html[pos + 1] == "{":
                    # Template literal interpolation - skip
                    pass
                pos += 1
        elif ch == "/" and pos + 1 < len(html):
            next_ch = html[pos + 1]
            if next_ch == "/":
                # Line comment - skip to end of line
                while pos < len(html) and html[pos] != "\n":
                    pos += 1
                continue
            elif next_ch == "*":
                # Block comment - skip to */
                pos += 2
                while pos + 1 < len(html) and not (html[pos] == "*" and html[pos + 1] == "/"):
                    pos += 1
                pos += 1  # skip past /
                continue
        pos += 1

    if depth != 0:
        return None

    return html[start:pos]


def strip_serve_references(html):
    """
    Remove any references to the dev server or /api/ endpoints
    that shouldn't be in production output.
    """
    # Remove comments mentioning serve.py
    html = re.sub(
        r"<!--.*?undersight-serve\.py.*?-->",
        "",
        html,
        flags=re.DOTALL,
    )
    return html


# ---------------------------------------------------------------------------
# Agent discoverability artifacts (sitemap / JSON-LD / llms.txt / llms-full.txt)
#
# All generated at build time from the CMS content map so blog titles, dates,
# and URLs always track content/content.json. Pure functions — unit-tested with fixture data
# in tests/test-suite.sh, validated against dist/ in tests/build-validation.sh.
# ---------------------------------------------------------------------------

# Static site pages: (path, changefreq, priority). Blog posts are appended
# dynamically. /docs is deliberately absent — documentation lives on
# documentation.underchat.ai, which publishes its own sitemap.
SITEMAP_PAGES = [
    ("/", "weekly", "1.0"),
    ("/underscore", "monthly", "0.8"),
    ("/underchat", "monthly", "0.8"),
    ("/copilot", "monthly", "0.8"),
    ("/blog", "weekly", "0.7"),
    ("/contact", "monthly", "0.5"),
    # Standalone GEO/SEO landing page (static file in resources/, not in nav)
    ("/cash-flow-underwriting", "monthly", "0.7"),
]

# CMS/Pages entities that are site configuration rather than content —
# excluded from llms-full.txt.
LLMS_FULL_EXCLUDE = {"Site Config", "SEO", "Docs Page"}


def _post_url(post):
    """Canonical deep-link URL for a blog post (SPA route /blog/<slug>)."""
    return f"{SITE_URL}/blog/{post['slug']}"


def _post_date(post):
    """ISO date (YYYY-MM-DD) for a post: Post Date, else creation date."""
    return (post.get("post_date") or post.get("creation_date") or "")[:10]


def _xml_escape(text):
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def strip_legacy_frontmatter(md):
    """Drop legacy migration front-matter from a blog body, mirroring
    index.html's parseMeta: `**Key:** value` lines, `# title` lines, and the
    `---` separator are metadata; everything else is body. Post metadata is
    emitted from first-class content fields instead, so these stale lines
    (notably the old **Date:**) must never leak into llms-full.txt."""
    body_lines = []
    past_separator = False
    for line in (md or "").split("\n"):
        clean = re.sub(r"\\$", "", line)
        if re.match(r"^\*\*(.+?):\*\*\s*(.+)", clean):
            continue  # meta line (Date/Excerpt/Tag/...)
        if clean.startswith("# "):
            continue  # h1 = title (rendered from the entity name instead)
        if clean.strip() == "---":
            past_separator = True
            continue
        if past_separator or not clean.startswith("#"):
            body_lines.append(clean)
        # else: sub-heading before the separator — front-matter noise, drop
    return "\n".join(body_lines).strip()


def md_to_text(md):
    """Reduce markdown to readable plain text (for llms-full.txt)."""
    text = md or ""
    # Images -> alt text
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    # Links -> "text (url)"
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    # Heading / blockquote markers
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.M)
    text = re.sub(r"^>\s?", "", text, flags=re.M)
    # Emphasis / inline code (run twice for nested markers like **_x_**)
    for _ in range(2):
        text = re.sub(r"(\*{1,3}|_{1,3}|`{1,3})(\S(?:.*?\S)?)\1", r"\2", text, flags=re.DOTALL)
    # Horizontal rules and table pipes are left as-is (rare, harmless)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def generate_sitemap(blogs):
    """Sitemap with clean page paths + one URL per blog post (lastmod = Post Date)."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for path, freq, prio in SITEMAP_PAGES:
        loc = SITE_URL if path == "/" else f"{SITE_URL}{path}"
        # Keep the homepage's canonical trailing slash
        loc = f"{SITE_URL}/" if path == "/" else loc
        lines.append(
            f"  <url><loc>{loc}</loc><changefreq>{freq}</changefreq>"
            f"<priority>{prio}</priority></url>"
        )
    for post in blogs:
        date = _post_date(post)
        lastmod = f"<lastmod>{date}</lastmod>" if date else ""
        lines.append(
            f"  <url><loc>{_xml_escape(_post_url(post))}</loc>{lastmod}"
            f"<changefreq>yearly</changefreq><priority>0.6</priority></url>"
        )
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def generate_blog_jsonld(blogs):
    """One <script type="application/ld+json"> block with a BlogPosting per post."""
    items = []
    for post in blogs:
        url = _post_url(post)
        item = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.get("name", ""),
            "url": url,
            "mainEntityOfPage": url,
            "publisher": {
                "@type": "Organization",
                "name": "undersight",
                "url": SITE_URL,
            },
        }
        date = _post_date(post)
        if date:
            item["datePublished"] = date
        if post.get("author"):
            item["author"] = {"@type": "Person", "name": post["author"]}
        desc = post.get("excerpt") or post.get("subtitle")
        if desc:
            item["description"] = desc
        if post.get("type"):
            item["articleSection"] = post["type"]
        items.append(item)
    payload = json.dumps(items, indent=2, ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">\n{payload}\n</script>'


def inject_blog_jsonld(html, blogs):
    """Inject per-post BlogPosting JSON-LD into <head>, alongside the existing
    Organization/WebSite blocks."""
    if not blogs:
        return html
    block = (
        "<!-- Per-post BlogPosting structured data (generated at build time from the CMS) -->\n"
        + generate_blog_jsonld(blogs)
        + "\n</head>"
    )
    return html.replace("</head>", block, 1)


def generate_llms_txt(base_text, blogs):
    """llms.txt = static base (source llms.txt) + current blog index from the CMS."""
    lines = ["", "## Blog Posts", ""]
    for post in blogs:
        date = _post_date(post)
        meta = [p for p in (date, post.get("author") or "", post.get("type") or "") if p]
        suffix = f" ({', '.join(meta)})" if meta else ""
        lines.append(f"- [{post.get('name', '')}]({_post_url(post)}){suffix}")
    return base_text.rstrip() + "\n" + "\n".join(lines) + "\n"


def generate_llms_full_txt(content_map):
    """Full plain-text content of the site's pages and every blog post, so
    agents that fetch it get everything without crawling the SPA."""
    parts = [
        "# undersight.ai — full site content",
        "",
        f"Plain-text export of every page and blog post on {SITE_URL},",
        "generated at build time from the undersight CMS.",
        f"Site summary: {SITE_URL}/llms.txt",
        f"Product documentation: {DOCS_URL}",
        "",
        "# Pages",
        "",
    ]
    for name, data in content_map.items():
        if name.startswith("_") or name in LLMS_FULL_EXCLUDE:
            continue
        body = md_to_text(data.get("content") or "")
        if not body:
            continue
        parts += [f"## {name}", "", body, ""]

    blogs = (content_map.get("_blogs") or {}).get("_data") or []
    parts += ["# Blog", ""]
    for post in blogs:
        meta = [f"URL: {_post_url(post)}"]
        date = _post_date(post)
        if date:
            meta.append(f"Published: {date}")
        if post.get("author"):
            meta.append(f"Author: {post['author']}")
        if post.get("type"):
            meta.append(f"Category: {post['type']}")
        parts += [f"## {post.get('name', '')}", "", " | ".join(meta)]
        if post.get("subtitle"):
            parts += ["", md_to_text(post["subtitle"])]
        parts += ["", md_to_text(strip_legacy_frontmatter(post.get("body") or "")), ""]
    return "\n".join(parts).rstrip() + "\n"


# ---------------------------------------------------------------------------
# Per-page Markdown for AI agents (free "Markdown for Agents")
#
# Emits one dist/<route>.md per page/post so functions/_middleware.js can serve
# Markdown on `Accept: text/markdown` or a `.md` URL — replicating Cloudflare's
# Pro "Markdown for Agents" on the free tier. The route -> content-entity map
# mirrors the SPA page assembly in index.html (the pageMeta table). Pure
# functions, unit-tested in tests/md-pages.test.py; dist output checked in
# tests/build-validation.sh.
# ---------------------------------------------------------------------------

# Static (non-blog) routes -> the content entities that compose each page.
# Config-only entities (Site Config, SEO, Footer, ContactPoint, Docs Page) have
# no route and are omitted, same intent as LLMS_FULL_EXCLUDE.
MD_PAGE_ROUTES = [
    ("/underscore", ["Solutions - underscore"]),
    ("/underchat", ["Solutions - underchat agent"]),
    ("/copilot",
     ["Solutions - AI Underwriting Copilot", "Solutions - copilot - Scoring Engine"]),
    ("/contact", ["Contact Page"]),
    # Offer page (static file in resources/, served at /workshop via _redirects)
    ("/workshop", ["Offer - AI Implementation Workshop"]),
]

# Preferred display order for the composed home page. Any other "Home - *"
# entity is appended alphabetically so new CMS sections are never silently
# dropped from /index.md.
MD_HOME_ORDER = [
    "Home - Hero",
    "Home - Who We Serve",
    "Home - How It Works",
    "Home - Metrics",
    "Home - Case Study: 4D Financing",
    "Home - Case Study: Chat Advance",
    "Home - Testimonial",
    "Home - CTA",
]


def _home_entity_names(content_map):
    ordered = [n for n in MD_HOME_ORDER if n in content_map]
    extras = sorted(
        n for n in content_map
        if n.startswith("Home - ") and n not in MD_HOME_ORDER
    )
    return ordered + extras


def _clean_entity_markdown(md):
    """Prepare a CMS entity's markdown for a standalone page. The CMS stores
    real content as `**Key:** value` lines (metrics, titles, quotes) that the
    SPA renders as UI and that llms-full.txt already exposes — so those are kept
    verbatim. Only the UI-only `**Icon:**` marker (a single display letter) is
    dropped. The entity keeps its own leading heading as the page/section title
    (no synthetic title is prepended, avoiding duplicate headings)."""
    lines = [
        line for line in (md or "").split("\n")
        if not re.match(r"^\*\*Icon:\*\*", line.strip())
    ]
    return "\n".join(lines).strip()


def compose_page_markdown(entity_names, content_map):
    """Concatenate one or more content entities' Markdown into one page.
    Returns "" if no entity has content (so empty pages aren't written)."""
    bodies = []
    for name in entity_names:
        data = content_map.get(name)
        if not data:
            continue
        body = _clean_entity_markdown(data.get("content") or "")
        if body:
            bodies.append(body)
    if not bodies:
        return ""
    return "\n\n".join(bodies).strip() + "\n"


def blog_markdown(post):
    """Markdown for a single blog post: title, meta line, subtitle, body.
    Reuses strip_legacy_frontmatter so stale migration front-matter never leaks
    (mirrors generate_llms_full_txt)."""
    lines = [f"# {post.get('name', '')}", ""]
    meta = [p for p in (_post_date(post), post.get("author") or "",
                        post.get("type") or "") if p]
    if meta:
        lines += ["*" + " · ".join(meta) + "*", ""]
    subtitle = (post.get("subtitle") or "").strip()
    if subtitle:
        lines += [subtitle, ""]
    body = strip_legacy_frontmatter(post.get("body") or "").strip()
    if body:
        lines += [body, ""]
    return "\n".join(lines).strip() + "\n"


def blog_index_markdown(blogs):
    """Markdown index of all blog posts for /blog.md."""
    lines = ["# Blog", ""]
    for post in blogs:
        date = _post_date(post)
        suffix = f" — {date}" if date else ""
        lines.append(f"- [{post.get('name', '')}]({_post_url(post)}){suffix}")
    return "\n".join(lines).strip() + "\n"


def markdown_targets(content_map):
    """Map request route (no .md suffix) -> page Markdown, for every page/post.
    Home is "/index" so it maps cleanly to dist/index.md."""
    targets = {}

    home = compose_page_markdown(_home_entity_names(content_map), content_map)
    if home:
        targets["/index"] = home

    for route, entities in MD_PAGE_ROUTES:
        md = compose_page_markdown(entities, content_map)
        if md:
            targets[route] = md

    blogs = (content_map.get("_blogs") or {}).get("_data") or []
    if blogs:
        targets["/blog"] = blog_index_markdown(blogs)
        for post in blogs:
            slug = post.get("slug")
            if slug:
                targets[f"/blog/{slug}"] = blog_markdown(post)

    return targets


def write_markdown_pages(content_map):
    """Write dist/<route>.md for every markdown target + dist/_md-manifest.json
    (the list of available .md asset paths). Returns the manifest list."""
    manifest = []
    for route, md in markdown_targets(content_map).items():
        rel = route.lstrip("/") + ".md"  # "/index" -> "index.md", "/blog/x" -> "blog/x.md"
        dest = os.path.join(DIST_DIR, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(md)
        manifest.append("/" + rel)
    manifest.sort()
    with open(os.path.join(DIST_DIR, "_md-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    return manifest


def write_discoverability_artifacts(content_map):
    """Write dist/sitemap.xml, dist/llms.txt, dist/llms-full.txt from CMS content.
    Overwrites the static fallbacks copied by copy_static_files()."""
    blogs = (content_map.get("_blogs") or {}).get("_data") or []

    sitemap = generate_sitemap(blogs)
    with open(os.path.join(DIST_DIR, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap)
    print(f"  Written: dist/sitemap.xml ({len(SITEMAP_PAGES)} pages + {len(blogs)} posts)")

    with open(os.path.join(SRC_DIR, "llms.txt"), "r", encoding="utf-8") as f:
        llms_base = f.read()
    llms = generate_llms_txt(llms_base, blogs)
    with open(os.path.join(DIST_DIR, "llms.txt"), "w", encoding="utf-8") as f:
        f.write(llms)
    print(f"  Written: dist/llms.txt (blog index: {len(blogs)} posts)")

    llms_full = generate_llms_full_txt(content_map)
    with open(os.path.join(DIST_DIR, "llms-full.txt"), "w", encoding="utf-8") as f:
        f.write(llms_full)
    print(f"  Written: dist/llms-full.txt ({format_size(len(llms_full.encode('utf-8')))})")

    md_manifest = write_markdown_pages(content_map)
    print(f"  Written: {len(md_manifest)} per-page .md files + dist/_md-manifest.json")


# ---------------------------------------------------------------------------
# Static file copying
# ---------------------------------------------------------------------------


def copy_static_files():
    """Copy all static assets to dist/. Returns (file_count, total_bytes)."""
    file_count = 0
    total_bytes = 0

    # Copy directories recursively
    for dirname in STATIC_DIRS:
        src = os.path.join(SRC_DIR, dirname)
        dst = os.path.join(DIST_DIR, dirname)
        if os.path.isdir(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
            for root, _dirs, files in os.walk(dst):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    size = os.path.getsize(fpath)
                    total_bytes += size
                    file_count += 1
                    rel = os.path.relpath(fpath, DIST_DIR)
                    print(f"    {rel} ({format_size(size)})")
        else:
            print(f"    WARNING: Directory {dirname}/ not found, skipping")

    # Copy individual files
    for fname in STATIC_FILES:
        src = os.path.join(SRC_DIR, fname)
        dst = os.path.join(DIST_DIR, fname)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            size = os.path.getsize(dst)
            total_bytes += size
            file_count += 1
            print(f"    {fname} ({format_size(size)})")
        else:
            print(f"    WARNING: {fname} not found, skipping")

    return file_count, total_bytes


# ---------------------------------------------------------------------------
# Security verification
# ---------------------------------------------------------------------------


def verify_output():
    """
    Scan all files in dist/ for leaked secrets and server API calls. Returns (pass_count, fail_count, issues).
    """
    checks = [
        ("'/api/", "Server API call on a static site"),
        ('"/api/', "Server API call on a static site"),
        ("Token ", "Possible auth token header (in non-meta context)"),
    ]

    uuid_pattern = re.compile(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        re.IGNORECASE,
    )

    issues = []
    files_checked = 0

    for root, _dirs, files in os.walk(DIST_DIR):
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, DIST_DIR)

            # Only check text files
            ext = os.path.splitext(fname)[1].lower()
            if ext not in (".html", ".css", ".js", ".json", ".txt", ".xml", ".svg"):
                continue

            files_checked += 1
            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
            except Exception:
                continue

            for needle, desc in checks:
                if needle == "Token ":
                    # Special case: only flag "Token " if it looks like an auth header
                    # Skip meta tags like <meta name="twitter:...">
                    for i, line in enumerate(content.split("\n"), 1):
                        if "Token " in line:
                            # Ignore known safe patterns
                            if any(
                                safe in line
                                for safe in [
                                    "twitter:",
                                    "og:",
                                    "schema.org",
                                    "ld+json",
                                    "<!-- ",
                                    "Design Token",
                                    "token",  # CSS token references are fine
                                ]
                            ):
                                continue
                            # Check if it looks like an Authorization header value
                            if re.search(r'["\']?Token\s+[a-zA-Z0-9.]{10,}', line):
                                issues.append(
                                    f"  FAIL: {rel}:{i} - {desc}: {line.strip()[:80]}"
                                )
                else:
                    for i, line in enumerate(content.split("\n"), 1):
                        if needle in line:
                            issues.append(
                                f"  FAIL: {rel}:{i} - {desc}: {line.strip()[:80]}"
                            )

            for i, line in enumerate(content.split("\n"), 1):
                matches = uuid_pattern.findall(line)
                for m in matches:
                    # Ignore common false positives
                    # (manifest.json might have a theme_color or similar, but UUIDs are suspect)
                    issues.append(
                        f"  WARN: {rel}:{i} - Possible UUID/secret: {m}"
                    )

    return files_checked, issues


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def format_size(nbytes):
    """Format byte count as human-readable string."""
    if nbytes < 1024:
        return f"{nbytes} B"
    elif nbytes < 1024 * 1024:
        return f"{nbytes / 1024:.1f} KB"
    else:
        return f"{nbytes / (1024 * 1024):.1f} MB"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    do_verify = "--verify" in sys.argv

    # Parse --env flag (production or dev)
    env_name = "dev"
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg.startswith("--env="):
            env_name = arg.split("=", 1)[1]
        elif arg == "--env" and i + 1 < len(sys.argv):
            env_name = sys.argv[i + 1]

    print("=" * 60)
    print(f"undersight.ai static site builder  [env={env_name}]")
    print("=" * 60)

    start_time = time.time()

    print("\n[1/5] Reading content/content.json...")
    with open(CONTENT_PATH, encoding="utf-8") as f:
        content_map = json.load(f)
    print(f"  Entities: {', '.join(content_map.keys())}")

    site_mode = "live"
    site_config_md = content_map.get("Site Config", {}).get("content", "")
    mode_key = f"**{'Production' if env_name == 'production' else 'Dev'} Mode:**"
    fallback_key = "**Site Mode:**"
    for line in site_config_md.split("\n"):
        if mode_key in line:
            site_mode = line.split(mode_key)[1].strip().rstrip("\\").strip().lower()
            break
        elif fallback_key in line:
            site_mode = line.split(fallback_key)[1].strip().rstrip("\\").strip().lower()
    print(f"  Site Mode: {site_mode} (env={env_name})")
    if env_name == "production" and site_mode == "under-construction":
        print("\n  Site Mode is 'under-construction' — building fallback page")
        content_map = None

    print("\n[2/5] Preparing dist/ directory...")
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)
    print(f"  Created {DIST_DIR}")

    if content_map is None:
        print("\n[3/5] Building under-construction fallback...")
        # Copy only essential static files for the fallback page
        for static_dir in ["css", "images/brand"]:
            src = os.path.join(SRC_DIR, static_dir)
            dst = os.path.join(DIST_DIR, static_dir)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
        for f_name in ["favicon.svg", "favicon-16.png", "favicon-32.png",
                        "apple-touch-icon.png", "manifest.json", "robots.txt"]:
            src = os.path.join(SRC_DIR, f_name)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(DIST_DIR, f_name))

        fallback_path = os.path.join(SRC_DIR, "under-construction.html")
        if os.path.isfile(fallback_path):
            shutil.copy2(fallback_path, os.path.join(DIST_DIR, "index.html"))
        else:
            # Inline minimal fallback if template doesn't exist
            with open(os.path.join(DIST_DIR, "index.html"), "w") as f:
                f.write("<html><body><h1>undersight — coming soon</h1></body></html>")

        elapsed = time.time() - start_time
        print("\n" + "=" * 60)
        print("BUILD COMPLETE (under-construction fallback)")
        print("=" * 60)
        print(f"  Output: {DIST_DIR}")
        print(f"  Time:   {elapsed:.1f}s")

        # Write build metadata for deploy-report.py
        meta = {"site_mode": "under-construction", "env": env_name,
                "entity_count": 0, "content_hash": "none"}
        with open(os.path.join(DIST_DIR, ".build-meta.json"), "w") as f:
            json.dump(meta, f)
        return

    print("\n[3/5] Copying static files...")
    file_count, static_bytes = copy_static_files()

    print("\n[4/5] Baking content into index.html...")
    with open(os.path.join(SRC_DIR, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    html = bake_content_into_html(html, content_map)
    html = strip_serve_references(html)

    # Per-post BlogPosting JSON-LD (dates/URLs track the CMS)
    blogs = (content_map.get("_blogs") or {}).get("_data") or []
    html = inject_blog_jsonld(html, blogs)
    print(f"  Injected BlogPosting JSON-LD for {len(blogs)} posts")

    # Regenerate agent discoverability artifacts from CMS content
    write_discoverability_artifacts(content_map)

    # Workshop offer page: resources/workshop.html renders one Pages entity via
    # the same loadContent()/renderContent() shape as index.html, so it bakes the
    # same way — with only its own entity, not the whole content map.
    ws_name = "Offer - AI Implementation Workshop"
    ws_src = os.path.join(SRC_DIR, "resources", "workshop.html")
    if os.path.isfile(ws_src):
        with open(ws_src, "r", encoding="utf-8") as f:
            ws_html = f.read()
        ws_html = bake_content_into_html(ws_html, {ws_name: content_map.get(ws_name, {})})
        ws_html = strip_serve_references(ws_html)
        with open(os.path.join(DIST_DIR, "resources", "workshop.html"), "w", encoding="utf-8") as f:
            f.write(ws_html)
        print(f"  Written: dist/resources/workshop.html ({'baked' if ws_name in content_map else 'ENTITY MISSING'})")

    # Write the baked HTML
    dist_html_path = os.path.join(DIST_DIR, "index.html")
    with open(dist_html_path, "w", encoding="utf-8") as f:
        f.write(html)
    html_size = os.path.getsize(dist_html_path)
    print(f"  Written: dist/index.html ({format_size(html_size)})")

    # Write build metadata for deploy-report.py
    content_hash = hashlib.sha256(
        json.dumps(content_map, sort_keys=True).encode()
    ).hexdigest()[:16]
    meta = {"site_mode": site_mode, "env": env_name,
            "entity_count": len(content_map), "content_hash": content_hash}
    with open(os.path.join(DIST_DIR, ".build-meta.json"), "w") as f:
        json.dump(meta, f)

    # Summary
    total_size = html_size + static_bytes
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("BUILD COMPLETE")
    print("=" * 60)
    print(f"  Output:      {DIST_DIR}")
    print(f"  index.html:  {format_size(html_size)}")
    print(f"  Static files: {file_count}")
    print(f"  Total size:  {format_size(total_size)}")
    print(f"  Time:        {elapsed:.1f}s")
    print(f"  Entities:    {len(content_map)}")
    print(f"  Site Mode:   {site_mode}")
    print(f"  Content Hash: {content_hash}")

    # 7. Verify (if requested or always do a quick sanity check)
    if do_verify:
        print("\n" + "=" * 60)
        print("SECURITY VERIFICATION")
        print("=" * 60)
        files_checked, issues = verify_output()
        print(f"  Files checked: {files_checked}")

        if issues:
            fails = [i for i in issues if i.strip().startswith("FAIL")]
            warns = [i for i in issues if i.strip().startswith("WARN")]

            if fails:
                print(f"\n  FAILURES ({len(fails)}):")
                for issue in fails:
                    print(issue)

            if warns:
                print(f"\n  WARNINGS ({len(warns)}):")
                for issue in warns:
                    print(issue)

            if fails:
                print(f"\n  RESULT: FAILED ({len(fails)} failures, {len(warns)} warnings)")
                sys.exit(1)
            else:
                print(f"\n  RESULT: PASSED with {len(warns)} warnings")
        else:
            print("\n  RESULT: PASSED (no issues found)")
    else:
        # Always do a quick check for hard failures
        _, issues = verify_output()
        fails = [i for i in issues if i.strip().startswith("FAIL")]
        if fails:
            print(f"\n  WARNING: {len(fails)} security issues detected. Run with --verify for details.")

    print()


if __name__ == "__main__":
    main()
