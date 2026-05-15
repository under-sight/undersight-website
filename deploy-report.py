#!/usr/bin/env python3
"""
Post-deploy reporter: writes deployment state back to Fibery.

Usage:
    python3 deploy-report.py --env production --url https://undersight.ai
    python3 deploy-report.py --env dev --url https://dev.undersight-website.pages.dev
    python3 deploy-report.py --verify --env production   # drift detection only
"""

import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

WORKSPACE = "subscript.fibery.io"
DB = "Website/Deployments"


def get_token():
    token = os.environ.get("FIBERY_TOKEN")
    if token:
        return token
    try:
        return subprocess.check_output(
            ["security", "find-generic-password", "-s", "mcp-credentials",
             "-a", "fibery-undersight", "-w"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: No FIBERY_TOKEN available")
        sys.exit(1)


def api_post(path, body, token):
    req = urllib.request.Request(
        f"https://{WORKSPACE}{path}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Token {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def get_commit():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return os.environ.get("GITHUB_SHA", "unknown")[:7]


def find_deployment(token, env_name):
    """Find existing deployment entity by environment name."""
    results = api_post("/api/commands", [{
        "command": "fibery.entity/query",
        "args": {
            "query": {
                "q/from": DB,
                "q/select": ["fibery/id", "Website/name", "Website/Commit",
                              "Website/Site Mode", "Website/Content Hash"],
                "q/limit": 20,
            },
        },
    }], token)
    entities = results[0].get("result", [])
    # Match by name containing the env
    env_map = {
        "production": "undersight.ai - Production",
        "dev": "Dev - Full Site",
    }
    target_name = env_map.get(env_name, env_name)
    for e in entities:
        if e.get("Website/name") == target_name:
            return e
    return None


def update_deployment(token, entity_id, commit, site_mode, content_hash, url):
    """Update an existing deployment entity."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    api_post("/api/commands", [{
        "command": "fibery.entity/update",
        "args": {
            "type": DB,
            "entity": {
                "fibery/id": entity_id,
                "Website/Commit": commit,
                "Website/Deployed At": now,
                "Website/Status": site_mode,
                "Website/Site Mode": site_mode,
                "Website/Content Hash": content_hash,
                "Website/URL": url,
            },
        },
    }], token)
    return now


def read_build_meta():
    """Read .build-meta.json from dist/."""
    meta_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", ".build-meta.json")
    if not os.path.isfile(meta_path):
        print(f"WARNING: {meta_path} not found — using defaults")
        return {"site_mode": "unknown", "env": "unknown", "entity_count": 0, "content_hash": "none"}
    with open(meta_path) as f:
        return json.load(f)


def get_site_mode_from_fibery(token):
    """Read current Site Mode from Site Config entity (same query pattern as build.py)."""
    CMS_DB = "Website/Pages"
    entities = api_post("/api/commands", [{
        "command": "fibery.entity/query",
        "args": {
            "query": {
                "q/from": CMS_DB,
                "q/select": {
                    "Name": "Website/Name",
                    "DocSecret": ["Website/Description", "Collaboration~Documents/secret"],
                },
                "q/where": ["=", ["Website/Name"], "$name"],
                "q/limit": 1,
            },
            "params": {"$name": "Site Config"},
        },
    }], token)[0].get("result", [])

    if not entities or not entities[0].get("DocSecret"):
        return "live"

    docs = api_post(
        "/api/documents/commands?format=md",
        {"command": "get-documents", "args": [{"secret": entities[0]["DocSecret"]}]},
        token,
    )
    content = docs[0].get("content", "") if docs else ""

    # Check per-env mode first, then fallback to generic Site Mode
    for key in ["**Production Mode:**", "**Dev Mode:**", "**Site Mode:**"]:
        for line in content.split("\n"):
            if key in line:
                return line.split(key)[1].strip().rstrip("\\").strip().lower()
    return "live"


def main():
    args = sys.argv[1:]
    env_name = "dev"
    url = ""
    verify_only = "--verify" in args
    check_only = "--check" in args

    for i, arg in enumerate(args):
        if arg.startswith("--env="):
            env_name = arg.split("=", 1)[1]
        elif arg == "--env" and i + 1 < len(args):
            env_name = args[i + 1]
        elif arg.startswith("--url="):
            url = arg.split("=", 1)[1]
        elif arg == "--url" and i + 1 < len(args):
            url = args[i + 1]

    token = get_token()
    meta = read_build_meta()

    if check_only:
        # Check if anything changed since last deploy
        existing = find_deployment(token, env_name)
        if existing:
            last_hash = existing.get("Website/Content Hash", "")
            last_mode = existing.get("Website/Site Mode", "")
            current_mode = get_site_mode_from_fibery(token)
            # For dev, we always build full site, so only check content hash
            if env_name == "dev":
                if last_hash == meta.get("content_hash") and current_mode == last_mode:
                    print("No changes detected — skipping deploy")
                    sys.exit(78)
            else:
                if last_hash == meta.get("content_hash") and current_mode == last_mode:
                    print("No changes detected — skipping deploy")
                    sys.exit(78)
        print("Changes detected — proceeding with deploy")
        sys.exit(0)

    if verify_only:
        # Drift detection: compare intended state vs deployed state
        current_mode = get_site_mode_from_fibery(token)
        deployed_mode = meta.get("site_mode", "unknown")
        print(f"Fibery Site Mode: {current_mode}")
        print(f"Deployed mode:    {deployed_mode}")
        if env_name == "production" and current_mode != deployed_mode:
            print(f"DRIFT DETECTED: Fibery says '{current_mode}' but we deployed '{deployed_mode}'")
            print("Next cron run will correct this.")
            sys.exit(1)
        print("OK: deployed state matches Fibery intent")
        sys.exit(0)

    # Normal mode: write deployment state back to Fibery
    commit = get_commit()
    site_mode = meta.get("site_mode", "unknown")
    content_hash = meta.get("content_hash", "none")

    print(f"Reporting deployment: env={env_name} mode={site_mode} commit={commit}")

    existing = find_deployment(token, env_name)
    if existing:
        entity_id = existing["fibery/id"]
        ts = update_deployment(token, entity_id, commit, site_mode, content_hash, url)
        print(f"Updated Fibery Deployment: {existing.get('Website/name')} at {ts}")
    else:
        print(f"WARNING: No deployment entity found for env={env_name} — skipping Fibery update")


if __name__ == "__main__":
    main()
