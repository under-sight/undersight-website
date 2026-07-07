#!/usr/bin/env python3
"""
Dev server for the undersight skeleton.
Fetches all content from Fibery in 2 API calls (entity query + batch docs).
Proxies file assets for images.

Usage:
    python3 undersight-serve.py          # http://localhost:8088
    python3 undersight-serve.py 3000     # custom port
"""

import datetime
import html as html_mod
import http.server
import json
import os
import re
import secrets
import subprocess
import sys
import time
import traceback
import urllib.parse
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
WORKSPACE = "subscript.fibery.io"
FIBERY_SPACE = os.environ.get("FIBERY_SPACE", "CMS")
DB = f"{FIBERY_SPACE}/Pages"
CACHE_TTL = 5  # seconds - short for dev, increase for prod

# Input validation constants (mirror production handlers)
MAX_BODY_BYTES = 4096
EMAIL_MIN = 5
EMAIL_MAX = 254
WHITEPAPER_MIN = 1
WHITEPAPER_MAX = 200
# Strict email regex: local part 1-64 chars (alphanumerics + ._%+-), no leading
# or trailing dot in the local part; domain has at least one label + a 2+ char
# alpha TLD. Consecutive-dot rejection is enforced separately in _is_valid_email.
EMAIL_REGEX = re.compile(
    r'^(?![.])[A-Za-z0-9._%+\-]{1,64}(?<![.])@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$'
)

# Hardcoded whitelist of asset names. Mirrors functions/api/whitepaper-lead.js
# and worker/index.js. Update all three together when adding a new PDF asset.
KNOWN_WHITEPAPERS = {
    "Chat Advance Case Study",
    "4D Financing Case Study",
    "From Deterministic Scorecards to Agentic Credit Assessments",
    "Unlocking Institutional Capital for Mid-Tier MCA Funds",
}


def _is_valid_email(email):
    if not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) < EMAIL_MIN or len(email) > EMAIL_MAX:
        return False
    if re.search(r'[<>"\']', email):
        return False
    if '..' in email:
        return False
    return bool(EMAIL_REGEX.match(email))


def _is_valid_whitepaper(name):
    if not isinstance(name, str):
        return False
    name = name.strip()
    if len(name) < WHITEPAPER_MIN or len(name) > WHITEPAPER_MAX:
        return False
    if re.search(r'[<>]', name):
        return False
    return True


def _mask_email(email):
    """Mask an email for logging: agent@undersight.ai -> a***t@undersight.ai

    Reveals first + last char of the local part plus the full domain; enough
    context to disambiguate during debugging without leaking the address.
    """
    if not isinstance(email, str) or '@' not in email:
        return '***'
    local, _, domain = email.partition('@')
    if not local:
        return '***@' + domain
    if len(local) == 1:
        return local + '***@' + domain
    return local[0] + '***' + local[-1] + '@' + domain


# In-process rate limiter: dev only. 5 req/60s per peer IP — kept low so the
# limit fires under manual smoke testing. Production runs tighter limits
# (3/60s) via Workers KV.
_RATE_LIMIT_WINDOW = 60      # seconds
_RATE_LIMIT_MAX = 5
_rate_limit_log = {}         # ip -> [timestamps]


def _check_rate_limit(ip):
    """Returns True if request is allowed; False (with retry_after) otherwise."""
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW
    timestamps = [t for t in _rate_limit_log.get(ip, []) if t > cutoff]
    if len(timestamps) >= _RATE_LIMIT_MAX:
        # Retry-after = seconds until the oldest in-window request rolls off.
        retry_after = max(1, int(_RATE_LIMIT_WINDOW - (now - timestamps[0])))
        _rate_limit_log[ip] = timestamps
        return False, retry_after
    timestamps.append(now)
    _rate_limit_log[ip] = timestamps
    return True, 0

_cache = {"data": None, "ts": 0}


def get_token():
    token = os.environ.get("FIBERY_TOKEN")
    if token:
        return token
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "mcp-credentials",
         "-a", "fibery-undersight", "-w"],
        text=True,
    ).strip()


TOKEN = get_token()
HEADERS = {"Authorization": f"Token {TOKEN}", "Content-Type": "application/json"}


def api_post(path, body):
    req = urllib.request.Request(
        f"https://{WORKSPACE}{path}",
        data=json.dumps(body).encode(),
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    # Fibery returns HTTP 200 with success:false on command errors (e.g. a
    # missing database). Raise instead of silently yielding zero entities.
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("success") is False:
                raise RuntimeError(f"Fibery command failed: {item.get('result')}")
    return data


def _normalize_doc_markdown(text):
    """
    Normalize migration-created escape artifacts that would otherwise render as
    visible backslashes in markdown-derived site copy.
    """
    if not text or not isinstance(text, str):
        return text or ""
    text = re.sub(
        r"\\+u([0-9a-fA-F]{4})",
        lambda m: chr(int(m.group(1), 16)),
        text,
    )
    text = re.sub(r"\\+([*~])", r"\1", text)
    text = re.sub(r"\\+\s*(?=\n|$)", "", text)
    return text


def _unwrap_doc_content(raw):
    """
    Defensive unwrap for CMS/Blog Description docs written by the
    migration script wrapped in a JSON envelope `{"secret":..., "content":"..."}`.
    Returns the inner markdown if a wrapper is detected, else the raw string.
    Mirrors build.py:_unwrap_doc_content.
    """
    if not raw or not isinstance(raw, str):
        return raw or ""
    s = raw.lstrip()
    if not s.startswith("{"):
        return raw
    candidate = s.replace("\\\n", "\n")
    try:
        obj = json.loads(candidate)
        if isinstance(obj, dict) and "content" in obj:
            inner = obj.get("content", "")
            if isinstance(inner, str):
                return _normalize_doc_markdown(
                    inner.replace("\\n", "\n").replace("\\\"", '"')
                )
    except Exception:
        pass
    m = re.search(r'"content"\s*:\s*"(.*)"\s*\\?\s*\}\s*$', candidate, re.DOTALL)
    if m:
        inner = m.group(1)
        return _normalize_doc_markdown(
            inner.replace("\\\\n", "\n").replace("\\n", "\n").replace('\\"', '"')
        )
    return _normalize_doc_markdown(raw)


def fetch_all():
    """Fetch all entities (Pages + Blog) + docs."""
    import hashlib

    # 1a. Pages entity query
    entities = api_post("/api/commands", [{
        "command": "fibery.entity/query",
        "args": {
            "query": {
                "q/from": DB,
                "q/select": {
                    "Name": f"{FIBERY_SPACE}/Name",
                    "DocSecret": [
                        f"{FIBERY_SPACE}/Description",
                        "Collaboration~Documents/secret",
                    ],
                    "Files": {
                        "q/from": f"{FIBERY_SPACE}/Assets",
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
    }])[0]["result"]
    entities = [e for e in entities if isinstance(e, dict)]

    # Schema guard: stale 'Blog -*' entries are forbidden in Pages.
    stale_blog_pages = [
        e.get("Name") for e in entities
        if isinstance(e.get("Name"), str) and e["Name"].startswith("Blog -")
    ]
    if stale_blog_pages:
        print(f"WARNING: stale 'Blog -*' entities in {DB} — ignoring:",
              ", ".join(stale_blog_pages), file=sys.stderr)
        entities = [e for e in entities if not (
            isinstance(e.get("Name"), str) and e["Name"].startswith("Blog -")
        )]

    # 1b. Blog entity query (separate DB for blog posts since May-2026 cutover).
    blog_entities = api_post("/api/commands", [{
        "command": "fibery.entity/query",
        "args": {
            "query": {
                "q/from": f"{FIBERY_SPACE}/Blog",
                "q/select": {
                    "Name": f"{FIBERY_SPACE}/name",
                    "Slug": f"{FIBERY_SPACE}/Slug",
                    "Subtitle": f"{FIBERY_SPACE}/Subtitle",
                    "Author": f"{FIBERY_SPACE}/Author",
                    "Excerpt": f"{FIBERY_SPACE}/Excerpt",
                    "PostDate": f"{FIBERY_SPACE}/Post Date",
                    "CreationDate": "fibery/creation-date",
                    "Type": [f"{FIBERY_SPACE}/Type", "enum/name"],
                    "DocSecret": [
                        f"{FIBERY_SPACE}/Description",
                        "Collaboration~Documents/secret",
                    ],
                    "Files": {
                        "q/from": f"{FIBERY_SPACE}/Assets",
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
    }])[0]["result"]
    blog_entities = [e for e in blog_entities if isinstance(e, dict)]

    # 2. Batch doc fetch: all document contents in one API call (Pages + Blog).
    secrets = [e["DocSecret"] for e in entities if e.get("DocSecret")]
    secrets += [e["DocSecret"] for e in blog_entities if e.get("DocSecret")]
    seen = set()
    unique_secrets = [s for s in secrets if not (s in seen or seen.add(s))]
    docs = {}
    if unique_secrets:
        doc_results = api_post(
            "/api/documents/commands?format=md",
            {"command": "get-documents", "args": [{"secret": s} for s in unique_secrets]},
        )
        for d in doc_results:
            docs[d["secret"]] = d.get("content", "")

    # 3. Combine into {name: {content, files}} map; use opaque IDs.
    _file_map = {}  # opaque_id -> fibery_secret

    result = {}
    for e in entities:
        files = []
        for f in e.get("Files") or []:
            sec = f.get("FileSecret", "")
            if sec:
                opaque = hashlib.sha256(sec.encode()).hexdigest()[:12]
                _file_map[opaque] = sec
                files.append({
                    "name": f.get("FileName", ""),
                    "type": f.get("ContentType", ""),
                    "url": f"/api/file/{opaque}",
                })
        result[e["Name"]] = {
            "content": _normalize_doc_markdown(docs.get(e.get("DocSecret", ""), "")),
            "files": files,
        }

    # 3b. Build structured _blogs array from CMS/Blog.
    blogs = []
    for be in blog_entities:
        name = be.get("Name")
        slug = be.get("Slug")
        if not name or not slug:
            continue
        bfiles = []
        for f in be.get("Files") or []:
            sec = f.get("FileSecret", "")
            if sec:
                opaque = hashlib.sha256(sec.encode()).hexdigest()[:12]
                _file_map[opaque] = sec
                bfiles.append({
                    "name": f.get("FileName", ""),
                    "type": f.get("ContentType", ""),
                    "url": f"/api/file/{opaque}",
                })
        body = _unwrap_doc_content(docs.get(be.get("DocSecret", ""), ""))
        tag = ""
        if isinstance(be.get("Type"), list) and be["Type"]:
            tag = be["Type"][0] or ""
        elif isinstance(be.get("Type"), str):
            tag = be["Type"]
        blogs.append({
            "name": name,
            "slug": slug,
            "subtitle": _normalize_doc_markdown(be.get("Subtitle") or ""),
            "author": be.get("Author") or "",
            "excerpt": _normalize_doc_markdown(be.get("Excerpt") or ""),
            "post_date": be.get("PostDate") or "",
            "creation_date": be.get("CreationDate") or "",
            "type": tag,
            "body": body,
            "files": bfiles,
        })
    # Sort: Post Date desc, tie-break by creation date desc.
    blogs.sort(
        key=lambda b: (b.get("post_date") or "", b.get("creation_date") or ""),
        reverse=True,
    )
    result["_blogs"] = {"content": "", "files": [], "_data": blogs}

    # Store mapping for file proxy
    global _opaque_file_map
    _opaque_file_map = _file_map

    return result


def get_cached():
    now = time.time()
    if _cache["data"] is None or (now - _cache["ts"]) > CACHE_TTL:
        _cache["data"] = fetch_all()
        _cache["ts"] = now
    return _cache["data"]


_opaque_file_map = {}  # populated by fetch_all()


def _resolve_opaque_id(opaque_id):
    """Resolve an opaque file ID to a Fibery secret."""
    return _opaque_file_map.get(opaque_id)


def _is_suppressed(email):
    """True if any lead for this email has opted out. Fibery is the source of
    truth so dev and prod behave identically (no KV in dev)."""
    results = api_post("/api/commands", [{
        "command": "fibery.entity/query",
        "args": {
            "query": {
                "q/from": f"{FIBERY_SPACE}/Website Leads",
                "q/select": ["fibery/id"],
                "q/where": ["q/and",
                            ["=", [f"{FIBERY_SPACE}/Email"], "$email"],
                            ["=", [f"{FIBERY_SPACE}/Unsubscribed"], "$true"]],
                "q/limit": 1,
            },
            "params": {"$email": email, "$true": True},
        },
    }])
    return bool(results[0].get("result"))


def _mark_unsubscribed(email, token):
    """Mark every lead for this email as unsubscribed. Returns count updated.

    The token (when present and matching a lead) proves the caller holds the
    original email — one-click path. Without a valid token the caller has
    still confirmed via the POST form; suppressing an address is low-harm and
    CAN-SPAM favors frictionless opt-out, so we honor it either way.
    """
    results = api_post("/api/commands", [{
        "command": "fibery.entity/query",
        "args": {
            "query": {
                "q/from": f"{FIBERY_SPACE}/Website Leads",
                "q/select": ["fibery/id"],
                "q/where": ["=", [f"{FIBERY_SPACE}/Email"], "$email"],
                "q/limit": 100,
            },
            "params": {"$email": email},
        },
    }])
    leads = results[0].get("result", [])
    if not leads:
        return 0
    # Fibery date-time parsing requires millisecond precision + Z suffix
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    commands = [{
        "command": "fibery.entity/update",
        "args": {
            "type": f"{FIBERY_SPACE}/Website Leads",
            "entity": {
                "fibery/id": lead["fibery/id"],
                f"{FIBERY_SPACE}/Unsubscribed": True,
                f"{FIBERY_SPACE}/Unsubscribed At": now,
            },
        },
    } for lead in leads]
    api_post("/api/commands", commands)
    return len(leads)


# --- Unsubscribe flow (mirrors functions/unsubscribe.js) ---------------------

UNSUB_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{title} — undersight</title>
<style>
:root {{ color-scheme: light dark; }}
body {{ margin:0; background:#f2f2ef; color:#23262c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif; line-height:1.5; }}
.card {{ max-width:480px; margin:64px auto; background:#fff; border-radius:14px; overflow:hidden; }}
.head {{ background:#23262c; padding:24px 28px; }}
.head .brand {{ font-size:11px; font-weight:600; letter-spacing:.16em; color:#6b9e8c; text-transform:uppercase; }}
.body {{ padding:28px; }}
h1 {{ font-size:20px; margin:0 0 10px; }}
p {{ font-size:14px; color:#3a3f47; margin:0 0 16px; }}
.addr {{ font-weight:600; color:#23262c; }}
button {{ background:#c97a54; color:#fff; border:0; font-size:14px; font-weight:600; padding:12px 30px; border-radius:8px; cursor:pointer; }}
.foot {{ padding:0 28px 24px; font-size:11px; color:#9ba0a6; }}
a {{ color:#6b9e8c; }}
@media (prefers-color-scheme: dark) {{
body {{ background:#191b1f; }}
.card {{ background:#23262c; }}
h1, .addr {{ color:#f2f2ef; }}
p {{ color:#c9cdd3; }}
.foot {{ color:#7d838b; }}
}}
</style>
</head>
<body>
<div class="card">
<div class="head"><span class="brand">undersight</span></div>
<div class="body">{body}</div>
<div class="foot">undersight, 1032 E Brandon Blvd #2048, Brandon, FL 33511 · <a href="https://legal.undersight.ai/privacy">Privacy Policy</a></div>
</div>
</body>
</html>"""


class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/whitepaper-lead":
            self._capture_lead()
        elif path == "/unsubscribe":
            self._unsubscribe_post()
        else:
            self.send_error(404)

    def _send_html(self, html, status=200):
        payload = html.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "private, no-store")
        self.end_headers()
        self.wfile.write(payload)

    def _unsubscribe_get(self):
        """Confirm page. No side effects on GET — prefetchers must not unsubscribe."""
        qs = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(qs)
        email = (params.get("e", [""])[0] or "").strip()
        token = (params.get("t", [""])[0] or "").strip()
        if not _is_valid_email(email):
            body = "<h1>Something's missing</h1><p>This unsubscribe link is incomplete or invalid. Use the link from the email you received, or contact <a href='mailto:contact@undersight.ai'>contact@undersight.ai</a>.</p>"
            self._send_html(UNSUB_PAGE.format(title="Invalid link", body=body), status=400)
            return
        esc_email = html_mod.escape(email)
        esc_token = html_mod.escape(token)
        body = (
            "<h1>Unsubscribe</h1>"
            f"<p>Stop receiving emails at <span class='addr'>{esc_email}</span>?</p>"
            "<form method=\"post\" action=\"/unsubscribe\">"
            f"<input type=\"hidden\" name=\"e\" value=\"{esc_email}\">"
            f"<input type=\"hidden\" name=\"t\" value=\"{esc_token}\">"
            "<button type=\"submit\">Unsubscribe</button>"
            "</form>"
        )
        self._send_html(UNSUB_PAGE.format(title="Unsubscribe", body=body))

    def _unsubscribe_post(self):
        # Rate limit: same in-process limiter as lead capture
        client_ip = self.client_address[0] if self.client_address else "unknown"
        allowed, retry_after = _check_rate_limit(client_ip)
        if not allowed:
            self._send_json({"error": "Too many requests"}, status=429,
                            extra_headers={"Retry-After": str(retry_after)})
            return

        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_BODY_BYTES:
            self._send_json({"error": "Payload too large"}, status=413)
            return
        raw = self.rfile.read(min(length, MAX_BODY_BYTES + 1)) if length else b""
        if len(raw) > MAX_BODY_BYTES:
            self._send_json({"error": "Payload too large"}, status=413)
            return

        content_type = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        email, token = "", ""
        if content_type == "application/json":
            try:
                body = json.loads(raw) if raw else {}
                email = (body.get("e") or body.get("email") or "").strip()
                token = (body.get("t") or body.get("token") or "").strip()
            except Exception:
                self._send_json({"error": "Invalid request"}, status=400)
                return
        else:
            params = urllib.parse.parse_qs(raw.decode("utf-8", "replace"))
            email = (params.get("e", [""])[0] or "").strip()
            token = (params.get("t", [""])[0] or "").strip()

        if not _is_valid_email(email):
            self._send_json({"error": "Invalid request"}, status=422)
            return

        masked = _mask_email(email)
        try:
            count = _mark_unsubscribed(email, token)
            print(f"  [UNSUB] {masked} ({count} lead(s) marked)")
            body = (
                "<h1>You're unsubscribed</h1>"
                f"<p><span class='addr'>{html_mod.escape(email)}</span> won't receive emails from undersight anymore.</p>"
                "<p>Unsubscribed by mistake? Just request a download again on <a href='https://undersight.ai'>undersight.ai</a>.</p>"
            )
            self._send_html(UNSUB_PAGE.format(title="Unsubscribed", body=body))
        except Exception:
            print(f"  [UNSUB] {masked} -> ERROR (see traceback)", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            self._send_json({"error": "Internal error"}, status=500)

    def _capture_lead(self):
        # Per-IP rate limit (dev: in-process)
        client_ip = self.client_address[0] if self.client_address else "unknown"
        allowed, retry_after = _check_rate_limit(client_ip)
        if not allowed:
            self._send_json(
                {"error": "Too many requests"},
                status=429,
                extra_headers={"Retry-After": str(retry_after)},
            )
            return

        # Content-Type guard — only accept JSON. Tolerate parameters like
        # `; charset=utf-8`. Reject early so we never parse form-encoded or
        # multipart bodies as JSON (defence vs. content-type confusion).
        content_type = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if content_type != "application/json":
            self._send_json({"error": "Unsupported Media Type"}, status=415)
            return

        # Body size cap — check Content-Length header first
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_BODY_BYTES:
            self._send_json({"error": "Payload too large"}, status=413)
            return

        # Defence-in-depth: read at most MAX_BODY_BYTES + 1; reject if more present
        try:
            raw = self.rfile.read(min(length, MAX_BODY_BYTES + 1)) if length else b""
        except Exception:
            self._send_json({"error": "Invalid request"}, status=400)
            return
        if len(raw) > MAX_BODY_BYTES:
            self._send_json({"error": "Payload too large"}, status=413)
            return

        try:
            body = json.loads(raw) if raw else {}
        except Exception:
            self._send_json({"error": "Invalid request"}, status=400)
            return

        if not isinstance(body, dict):
            self._send_json({"error": "Invalid request"}, status=422)
            return

        email = (body.get("email") or "").strip()
        if not _is_valid_email(email):
            self._send_json({"error": "Invalid request"}, status=422)
            return

        whitepaper_name = (body.get("whitepaper") or "Chat Advance Case Study").strip()
        if not _is_valid_whitepaper(whitepaper_name):
            self._send_json({"error": "Invalid request"}, status=422)
            return
        if whitepaper_name not in KNOWN_WHITEPAPERS:
            self._send_json({"error": "Unknown content"}, status=422)
            return

        masked = _mask_email(email)
        try:
            # 0. Suppression check — unsubscribed addresses get a generic OK
            # with no lead created (and therefore no email). Do not leak
            # suppression status in the response.
            if _is_suppressed(email):
                print(f"  [LEAD] {masked} -> suppressed (unsubscribed); no lead created")
                self._send_json({"ok": True})
                return

            # 1. Look up the Blog entity by name
            wp_results = api_post("/api/commands", [{
                "command": "fibery.entity/query",
                "args": {
                    "query": {
                        "q/from": f"{FIBERY_SPACE}/Blog",
                        "q/select": ["fibery/id"],
                        "q/where": ["=", [f"{FIBERY_SPACE}/name"], "$name"],
                        "q/limit": 1,
                    },
                    "params": {"$name": whitepaper_name},
                },
            }])
            wp_id = None
            wp_matches = wp_results[0].get("result", [])
            if wp_matches:
                wp_id = wp_matches[0]["fibery/id"]

            # Reject if the asset name passed the allowlist but no matching
            # Fibery entity exists. Creating an unlinked lead causes the
            # dispatch automation to build a malformed `To` header — fail
            # fast instead of producing an orphan record that will silently
            # break delivery.
            if not wp_id:
                print(f"  [LEAD] {masked} -> {whitepaper_name} (not found in Fibery)", file=sys.stderr)
                self._send_json({"error": "Whitepaper not found"}, status=422)
                return

            # 2. Create the lead entity, linked to the blog post. The
            # unsubscribe token is generated here so the dispatch email can
            # interpolate a one-click unsubscribe URL ({{Unsubscribe Token}}).
            lead_entity = {
                f"{FIBERY_SPACE}/Email": email,
                f"{FIBERY_SPACE}/Blog Post": {"fibery/id": wp_id},
                f"{FIBERY_SPACE}/Unsubscribe Token": secrets.token_hex(16),
            }

            api_post("/api/commands", [{
                "command": "fibery.entity/create",
                "args": {
                    "type": f"{FIBERY_SPACE}/Website Leads",
                    "entity": lead_entity,
                },
            }])
            print(f"  [LEAD] {masked} -> {whitepaper_name} (linked)")
            self._send_json({"ok": True})
        except Exception:
            # Generic message to client; full traceback only to server stderr.
            # Never include exception details, Fibery URLs, tokens, or schema
            # names in the response body.
            print(f"  [LEAD] {masked} -> ERROR (see traceback)", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            self._send_json({"error": "Internal error"}, status=500)

    def do_GET(self):
        if self.path == "/api/content":
            self._send_json(get_cached())
        elif self.path.startswith("/api/file/"):
            self._proxy_file(self.path[len("/api/file/"):])
        elif self.path.split("?")[0] == "/unsubscribe":
            self._unsubscribe_get()
        else:
            self._serve_static_or_spa()

    MIME_TYPES = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".json": "application/json",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
    }

    def _serve_html(self):
        self._serve_file("index.html")

    def _serve_static_or_spa(self):
        path = self.path.split("?")[0].lstrip("/")
        if path and ".." not in path:
            import os
            if os.path.isfile(path):
                self._serve_file(path)
                return
        # No matching file — serve index.html (SPA fallback)
        self._serve_file("index.html")

    def _serve_file(self, filepath):
        import os
        if not os.path.isfile(filepath):
            self.send_error(404)
            return
        ext = os.path.splitext(filepath)[1].lower()
        ct = self.MIME_TYPES.get(ext, "application/octet-stream")
        with open(filepath, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, data, status=200, extra_headers=None):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "private, no-store")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(payload)

    def _proxy_file(self, opaque_id):
        # Resolve opaque ID to Fibery secret
        import re
        if not re.fullmatch(r'[0-9a-f]{12}', opaque_id):
            self.send_error(400, "Invalid file ID")
            return
        secret = _resolve_opaque_id(opaque_id)
        if not secret:
            self.send_error(404, "File not found")
            return
        try:
            req = urllib.request.Request(
                f"https://{WORKSPACE}/api/files/{secret}",
                headers={"Authorization": f"Token {TOKEN}"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                ct = resp.headers.get("Content-Type", "application/octet-stream")
                self.send_response(200)
                self.send_header("Content-Type", ct)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "max-age=3600")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_error(404, str(e))

    def log_message(self, fmt, *args):
        msg = args[0] if args else ""
        if "/api/" in msg:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.HTTPServer(("127.0.0.1", PORT), Handler) as srv:
        print(f"undersight skeleton -> http://localhost:{PORT}")
        print(f"  Content from: {WORKSPACE} / {DB}")
        print(f"  Cache TTL: {CACHE_TTL}s")
        srv.serve_forever()
