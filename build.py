#!/usr/bin/env python3
"""
Static site builder for undersight.ai

Fetches all content from Fibery, downloads file assets, and bakes everything
into a self-contained static site in dist/.

Usage:
    python3 build.py            # Build to dist/
    python3 build.py --verify   # Build + run security checks on output

Requires: FIBERY_TOKEN env var, or macOS Keychain entry (service='mcp-credentials', account='fibery-undersight')
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

WORKSPACE = "subscript.fibery.io"
DB = "Website/Database 1"
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(SRC_DIR, "dist")

# Static files and directories to copy into dist/
STATIC_DIRS = ["css", "images"]
STATIC_FILES = [
    "robots.txt",
    "sitemap.xml",
    "manifest.json",
    "llms.txt",
    "favicon.svg",
    "favicon-16.png",
    "favicon-32.png",
    "favicon-180.png",
    "favicon-192.png",
    "favicon-512.png",
    "apple-touch-icon.png",
    "_redirects",
]

# ---------------------------------------------------------------------------
# Fibery API (mirrors undersight-serve.py)
# ---------------------------------------------------------------------------


def get_token():
    """Retrieve Fibery API token from env var or macOS Keychain."""
    token = os.environ.get("FIBERY_TOKEN")
    if token:
        return token
    try:
        return subprocess.check_output(
            [
                "security",
                "find-generic-password",
                "-s",
                "mcp-credentials",
                "-a",
                "fibery-undersight",
                "-w",
            ],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: Could not retrieve Fibery token.")
        print("       Set FIBERY_TOKEN env var, or on macOS add keychain entry:")
        print("       service='mcp-credentials', account='fibery-undersight'")
        sys.exit(1)


def api_post(path, body, token):
    """POST to Fibery API and return parsed JSON."""
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(
        f"https://{WORKSPACE}{path}",
        data=json.dumps(body).encode(),
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def fetch_all(token):
    """
    Fetch all entities + docs from Fibery in 2 API calls.
    Returns (content_map, file_map) where:
      - content_map: {name: {content, files}} (same shape as serve.py)
      - file_map: {opaque_id: fibery_secret} for downloading files
    """
    print("  Querying entities...")
    entities = api_post(
        "/api/commands",
        [
            {
                "command": "fibery.entity/query",
                "args": {
                    "query": {
                        "q/from": DB,
                        "q/select": {
                            "Name": "Website/Name",
                            "DocSecret": [
                                "Website/Description",
                                "Collaboration~Documents/secret",
                            ],
                            "Files": {
                                "q/from": "Website/Assets",
                                "q/select": {
                                    "FileSecret": "fibery/secret",
                                    "FileName": "fibery/name",
                                    "ContentType": "fibery/content-type",
                                },
                                "q/limit": 20,
                            },
                        },
                        "q/limit": 100,
                    }
                },
            }
        ],
        token,
    )[0]["result"]
    print(f"  Found {len(entities)} entities")

    # Batch doc fetch
    secrets = [e["DocSecret"] for e in entities if e.get("DocSecret")]
    docs = {}
    if secrets:
        print(f"  Fetching {len(secrets)} documents...")
        doc_results = api_post(
            "/api/documents/commands?format=md",
            {"command": "get-documents", "args": [{"secret": s} for s in secrets]},
            token,
        )
        for d in doc_results:
            docs[d["secret"]] = d.get("content", "")

    # Build content map and file map (opaque_id -> fibery_secret)
    file_map = {}
    result = {}
    for e in entities:
        files = []
        for f in e.get("Files") or []:
            sec = f.get("FileSecret", "")
            if sec:
                opaque = hashlib.sha256(sec.encode()).hexdigest()[:12]
                file_map[opaque] = sec
                files.append(
                    {
                        "name": f.get("FileName", ""),
                        "type": f.get("ContentType", ""),
                        "url": f"/api/file/{opaque}",
                    }
                )
        result[e["Name"]] = {
            "content": docs.get(e.get("DocSecret", ""), ""),
            "files": files,
        }

    return result, file_map


def download_file(secret, token):
    """Download a file from Fibery by its secret. Returns bytes or None."""
    headers = {"Authorization": f"Token {token}"}
    req = urllib.request.Request(
        f"https://{WORKSPACE}/api/files/{secret}",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except Exception as e:
        print(f"    WARNING: Failed to download file {secret[:8]}...: {e}")
        return None


# ---------------------------------------------------------------------------
# Content baking
# ---------------------------------------------------------------------------


def determine_local_path(opaque_id, files_info):
    """
    Given an opaque file ID, figure out a local filename for it.
    Returns a path relative to dist/ (e.g. 'images/files/abc123def456.png').
    """
    # Find the file info matching this opaque ID
    for entity_data in files_info.values():
        for f in entity_data.get("files", []):
            if f["url"] == f"/api/file/{opaque_id}":
                name = f.get("name", opaque_id)
                content_type = f.get("type", "")
                # Sanitize filename
                safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
                if not safe_name:
                    ext = ""
                    if "png" in content_type:
                        ext = ".png"
                    elif "jpeg" in content_type or "jpg" in content_type:
                        ext = ".jpg"
                    elif "webp" in content_type:
                        ext = ".webp"
                    elif "svg" in content_type:
                        ext = ".svg"
                    safe_name = f"{opaque_id}{ext}"
                return f"images/files/{safe_name}"
    return f"images/files/{opaque_id}"


def download_fibery_files(content_map, file_map, token):
    """
    Download all Fibery file attachments to dist/images/files/.
    Returns a mapping of opaque_id -> local_relative_path.
    """
    if not file_map:
        return {}

    files_dir = os.path.join(DIST_DIR, "images", "files")
    os.makedirs(files_dir, exist_ok=True)

    local_paths = {}
    for opaque_id, secret in file_map.items():
        local_rel = determine_local_path(opaque_id, content_map)
        local_abs = os.path.join(DIST_DIR, local_rel)
        os.makedirs(os.path.dirname(local_abs), exist_ok=True)

        print(f"    Downloading {opaque_id} -> {local_rel}")
        data = download_file(secret, token)
        if data:
            with open(local_abs, "wb") as f:
                f.write(data)
            local_paths[opaque_id] = local_rel
        else:
            print(f"    SKIPPED: {opaque_id}")

    return local_paths


def rewrite_file_urls(content_map, local_paths):
    """
    Rewrite /api/file/{opaque_id} URLs in the content map to local paths.
    Modifies content_map in place.
    """
    for entity_name, entity_data in content_map.items():
        for f in entity_data.get("files", []):
            url = f.get("url", "")
            match = re.match(r"/api/file/([0-9a-f]{12})", url)
            if match:
                opaque_id = match.group(1)
                if opaque_id in local_paths:
                    f["url"] = local_paths[opaque_id]
                else:
                    # File download failed - use empty string
                    f["url"] = ""


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
    Remove any references to the dev server, /api/ endpoints, or Fibery
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
    Scan all files in dist/ for leaked secrets, Fibery references, and
    proxy URLs. Returns (pass_count, fail_count, issues).
    """
    checks = [
        ("fibery.io", "Fibery workspace URL"),
        ("subscript.fibery.io", "Fibery workspace domain"),
        ("/api/content", "Dev server content endpoint"),
        ("/api/file/", "Dev server file proxy"),
        ("/api/files/", "Fibery files API"),
        ("Token ", "Possible auth token header (in non-meta context)"),
    ]

    # UUID pattern (Fibery secrets are UUIDs)
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

            # Check for UUIDs (potential Fibery secrets)
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

    print("=" * 60)
    print("undersight.ai static site builder")
    print("=" * 60)

    start_time = time.time()

    # 1. Get Fibery token
    print("\n[1/6] Retrieving Fibery API token from Keychain...")
    token = get_token()
    print("  OK")

    # 2. Fetch content from Fibery
    print("\n[2/6] Fetching content from Fibery...")
    try:
        content_map, file_map = fetch_all(token)
    except Exception as e:
        print(f"ERROR: Failed to fetch content from Fibery: {e}")
        sys.exit(1)
    entity_names = list(content_map.keys())
    print(f"  Entities: {', '.join(entity_names)}")
    print(f"  File attachments: {len(file_map)}")

    # 3. Prepare dist directory
    print("\n[3/6] Preparing dist/ directory...")
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)
    print(f"  Created {DIST_DIR}")

    # 4. Copy static files (before file downloads so directory structure exists)
    print("\n[4/6] Copying static files...")
    file_count, static_bytes = copy_static_files()

    # 5. Download Fibery file attachments and rewrite URLs
    print("\n[5/6] Downloading file attachments...")
    if file_map:
        local_paths = download_fibery_files(content_map, file_map, token)
        rewrite_file_urls(content_map, local_paths)
        dl_count = len(local_paths)
        # Add downloaded files to totals
        for rel_path in local_paths.values():
            abs_path = os.path.join(DIST_DIR, rel_path)
            if os.path.isfile(abs_path):
                static_bytes += os.path.getsize(abs_path)
                file_count += 1
        print(f"  Downloaded {dl_count} files")
    else:
        print("  No file attachments to download")

    # 6. Bake content into HTML
    print("\n[6/6] Baking content into index.html...")
    with open(os.path.join(SRC_DIR, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    # Strip Fibery secrets from content (document secrets in the content field)
    # The content_map values should only contain markdown text and local file paths
    # But double-check: remove any lingering Fibery references from markdown content
    for entity_name, entity_data in content_map.items():
        md = entity_data.get("content", "")
        # Remove any Fibery URLs that might be in markdown links
        md = re.sub(
            r"https?://[a-z0-9.-]*fibery\.io[^\s\)\"']*",
            "",
            md,
        )
        entity_data["content"] = md

    html = bake_content_into_html(html, content_map)
    html = strip_serve_references(html)

    # Write the baked HTML
    dist_html_path = os.path.join(DIST_DIR, "index.html")
    with open(dist_html_path, "w", encoding="utf-8") as f:
        f.write(html)
    html_size = os.path.getsize(dist_html_path)
    print(f"  Written: dist/index.html ({format_size(html_size)})")

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
    print(f"  Entities:    {len(entity_names)}")

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
