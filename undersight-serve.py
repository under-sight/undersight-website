#!/usr/bin/env python3
"""
Dev server for the undersight skeleton.
Fetches all content from Fibery in 2 API calls (entity query + batch docs).
Proxies file assets for images.

Usage:
    python3 undersight-serve.py          # http://localhost:8088
    python3 undersight-serve.py 3000     # custom port
"""

import http.server
import json
import os
import subprocess
import sys
import time
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
WORKSPACE = "subscript.fibery.io"
DB = "Website/Database 1"
CACHE_TTL = 5  # seconds - short for dev, increase for prod

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
        return json.loads(resp.read())


def fetch_all():
    """Fetch all entities + docs in 2 API calls."""
    # 1. Entity query: names, doc secrets, file attachments - single API call
    entities = api_post("/api/commands", [{
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
    }])[0]["result"]

    # 2. Batch doc fetch: all document contents in one API call
    secrets = [e["DocSecret"] for e in entities if e.get("DocSecret")]
    docs = {}
    if secrets:
        doc_results = api_post(
            "/api/documents/commands?format=md",
            {"command": "get-documents", "args": [{"secret": s} for s in secrets]},
        )
        for d in doc_results:
            docs[d["secret"]] = d.get("content", "")

    # 3. Combine into {name: {content, files}} map
    # Use opaque IDs instead of Fibery secrets in the response
    import hashlib
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
            "content": docs.get(e.get("DocSecret", ""), ""),
            "files": files,
        }

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


class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/whitepaper-lead":
            self._capture_lead()
        else:
            self.send_error(404)

    def _capture_lead(self):
        import re
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        email = (body.get("email") or "").strip()
        if not email or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            self._send_json({"error": "Invalid email"})
            return
        whitepaper_name = body.get("whitepaper", "Chat Advance Case Study")
        try:
            # 1. Look up the Whitepaper entity by name
            wp_results = api_post("/api/commands", [{
                "command": "fibery.entity/query",
                "args": {
                    "query": {
                        "q/from": "Website/Whitepapers",
                        "q/select": ["fibery/id"],
                        "q/where": ["=", ["Website/name"], "$name"],
                        "q/limit": 1,
                    },
                    "params": {"$name": whitepaper_name},
                },
            }])
            wp_id = None
            wp_matches = wp_results[0].get("result", [])
            if wp_matches:
                wp_id = wp_matches[0]["fibery/id"]

            # 2. Create the lead entity
            lead_entity = {
                "Website/Email": email,
                "Website/Source": "website-modal",
            }
            # 3. Link to whitepaper if found
            if wp_id:
                lead_entity["Website/Whitepaper"] = {"fibery/id": wp_id}

            api_post("/api/commands", [{
                "command": "fibery.entity/create",
                "args": {
                    "type": "Website/Whitepaper Leads",
                    "entity": lead_entity,
                },
            }])
            print(f"  [LEAD] {email} -> {whitepaper_name}" + (" (linked)" if wp_id else " (no match)"))
            self._send_json({"ok": True})
        except Exception as e:
            print(f"  [LEAD] {email} -> ERROR: {e}")
            self._send_json({"error": str(e)})

    def do_GET(self):
        if self.path == "/api/content":
            self._send_json(get_cached())
        elif self.path.startswith("/api/file/"):
            self._proxy_file(self.path[len("/api/file/"):])
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

    def _send_json(self, data):
        payload = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "private, no-store")
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
