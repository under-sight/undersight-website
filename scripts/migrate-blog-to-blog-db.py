#!/usr/bin/env python3
"""Migrate Website/Pages 'Blog - *' entities into Website/Blog entities.

PREREQUISITE: 6 fields must be added to Website/Blog in Fibery UI first:
  - Website/Description  (rich-text, Collaboration~Documents/Document)
  - Website/Assets       (file collection)
  - Website/Post Date    (date or date-time)
  - Website/Subtitle     (text)
  - Website/Author       (text)
  - Website/Excerpt      (text)

This script:
  1. Verifies the 6 fields exist (exits 2 if not).
  2. For each of 7 source/target pairs, copies Description doc, Assets,
     and metadata fields from a Website/Pages "Blog - *" entity into the
     existing Website/Blog entity.
  3. Is idempotent — running twice should be a no-op the second time.
  4. Skips B8 (Test Blog) and B9 (null stub) explicitly.

Usage:
  python3 scripts/migrate-blog-to-blog-db.py --dry-run
  python3 scripts/migrate-blog-to-blog-db.py

Exit codes:
  0 = success (including dry-run that found schema gaps when --dry-run)
  1 = unexpected error
  2 = schema gap (required fields missing from Website/Blog)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

FIBERY = "/Users/kyle/bin/fibery"
WORKSPACE = "undersight"

# These six fields must exist on Website/Blog before we can migrate.
REQUIRED_FIELDS = [
    "Website/Description",
    "Website/Assets",
    "Website/Post Date",
    "Website/Subtitle",
    "Website/Author",
    "Website/Excerpt",
]

# Skip these entities entirely (B8 + B9 in the existing Blog DB).
SKIP_BLOG_IDS = {
    "6a44e070-5148-11f1-988b-3b8e74536b68": "Test Blog",
    "6a8bfb90-5148-11f1-988b-3b8e74536b68": "null stub",
}

# Tag enum UUIDs for Website/Type — used for verification only (no mutation).
TAG_IDS = {
    "Case Study": "019e2dd0-3d19-7294-8479-237720ed58ee",
    "Research":   "019e2dd0-3d19-7295-8d6c-d7ca4f7b0eda",
    "Insight":    "019e2dd0-3d19-7296-b7b2-a1aebe38c262",
}

# Hardcoded manifest — 7 source/target pairs approved by user.
MANIFEST: list[dict[str, Any]] = [
    {
        "source_id":  "019e1de0-9dc3-7021-8b21-2683bd328356",
        "target_id":  "019e2dd2-8121-72b9-b925-b33f49d7d601",
        "target_name": None,  # don't rename
        "post_date":  "2025-11-20",
        "tag":        "Insight",
        "slug":       "ai-augmentation-not-automation",
        "subtitle":   None,
        "author":     None,
    },
    {
        "source_id":  "019e1de0-aa7b-7352-9c3e-00b7188f6698",
        "target_id":  "019e2dd2-849c-73b7-8b66-16cd01ade626",
        "target_name": None,
        "post_date":  "2026-02-18",
        "tag":        "Insight",
        "slug":       "rfi-bottleneck",
        "subtitle":   None,
        "author":     None,
    },
    {
        "source_id":  "019e1de0-b966-7092-969c-9294325e9da7",
        "target_id":  "019e2dd2-8825-718a-a5cf-3d848409db96",
        "target_name": None,
        "post_date":  "2026-03-12",
        "tag":        "Insight",
        "slug":       "building-underwriting-copilot",
        "subtitle":   None,
        "author":     None,
    },
    {
        "source_id":  "019e1f07-df93-7255-b4d9-51e1e7117419",
        "target_id":  "019e29c8-8f59-730e-bb7b-a6a7fb7896e9",
        "target_name": None,  # keep "Chat Advance Case Study"
        "post_date":  "2026-05-08",
        "tag":        "Case Study",
        "slug":       "chat-advance",
        "subtitle":   None,  # parse from body
        "author":     None,  # parse from body
    },
    {
        "source_id":  "019e22a9-2544-71ad-b8ce-042a524c4ad5",
        "target_id":  "019e29c8-c885-704e-b928-5c710063e3ec",
        "target_name": None,
        "post_date":  "2025-12-12",
        "tag":        "Research",
        "slug":       "institutional-mca-capital",
        "subtitle":   "A Technology-Enabled Transformation Thesis",
        "author":     "Kyle Adriany",
    },
    {
        "source_id":  "019e27cc-5456-7370-9eb9-4ca8a904e096",
        "target_id":  "019e29c8-c585-72e2-9e9c-e4c3cbb5e953",
        "target_name": None,
        "post_date":  "2026-01-22",
        "tag":        "Research",
        "slug":       "agentic-scorecards",
        "subtitle":   "A Vision for AI-Native Credit Assessment Architectures",
        "author":     "Sajit Roshan",
    },
    {
        "source_id":  "019e2cc7-8fa3-737e-aba9-e7f7949c3d9a",
        "target_id":  "019e2d2e-564c-713b-815d-1fb943e510bc",
        "target_name": "4D Financing Case Study",  # rename from "...Maybe"
        "post_date":  "2026-02-18",
        "tag":        "Case Study",
        "slug":       "4d-financing",
        "subtitle":   None,
        "author":     "Kyle Adriany",
    },
]

# ----------------------------------------------------------------------------
# Token loading
# ----------------------------------------------------------------------------

def load_token() -> str:
    """Load FIBERY_TOKEN from env or macOS Keychain."""
    tok = os.environ.get("FIBERY_TOKEN")
    if tok:
        return tok
    try:
        out = subprocess.run(
            ["security", "find-generic-password",
             "-s", "mcp-credentials", "-a", "fibery-undersight", "-w"],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except subprocess.CalledProcessError:
        print("ERROR: FIBERY_TOKEN not in env and Keychain lookup failed.",
              file=sys.stderr)
        sys.exit(1)

# ----------------------------------------------------------------------------
# fibery CLI wrapper
# ----------------------------------------------------------------------------

def run_fibery(*args: str, capture_json: bool = True) -> Any:
    """Run /Users/kyle/bin/fibery and return parsed JSON (or raw string)."""
    cmd = [FIBERY, WORKSPACE] + list(args)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"fibery cmd failed: {' '.join(cmd)}\n"
            f"stderr: {proc.stderr}\nstdout: {proc.stdout}"
        )
    if not capture_json:
        return proc.stdout
    try:
        return json.loads(proc.stdout) if proc.stdout.strip() else {}
    except json.JSONDecodeError:
        return proc.stdout

# ----------------------------------------------------------------------------
# Schema check
# ----------------------------------------------------------------------------

def assert_schema_ready() -> tuple[bool, list[str]]:
    """Return (ok, missing_fields)."""
    schema = run_fibery("describe", "Website/Blog")
    have = {f["name"] for f in schema.get("fields", [])}
    missing = [f for f in REQUIRED_FIELDS if f not in have]
    return (len(missing) == 0, missing)

# ----------------------------------------------------------------------------
# Front-matter stripping & parsing
# ----------------------------------------------------------------------------

FIELD_LINE_RE = re.compile(r"^\*\*([^:*]+):\*\*\s*(.*)$")

def parse_front_matter(md: str) -> tuple[dict[str, str], str]:
    """Parse `**Field:** value` lines until first `---` or blank gap.

    Returns (fields_dict, body_md).
    Recognized fields: Date, Tag, Subtitle, Author, Excerpt, PDF.
    """
    if not md:
        return ({}, "")
    lines = md.splitlines()
    fields: dict[str, str] = {}
    body_start = 0
    saw_field = False
    for i, raw in enumerate(lines):
        stripped = raw.strip()
        if not stripped:
            # blank line — keep scanning if we haven't seen a real body yet
            if saw_field:
                body_start = i + 1
            continue
        if stripped == "---":
            body_start = i + 1
            break
        m = FIELD_LINE_RE.match(stripped)
        if m:
            key = m.group(1).strip()
            val = m.group(2).strip()
            fields[key] = val
            saw_field = True
            body_start = i + 1
            continue
        # First non-front-matter content line — stop.
        if saw_field:
            body_start = i
            break
        else:
            body_start = 0
            break
    body = "\n".join(lines[body_start:]).lstrip("\n")
    return (fields, body)

# ----------------------------------------------------------------------------
# Fetch source / target
# ----------------------------------------------------------------------------

def fetch_pages_entity(entity_id: str) -> dict[str, Any]:
    """Fetch a Website/Pages entity with name, description doc, and assets."""
    q = {
        "q/from": "Website/Pages",
        "q/where": ["=", ["fibery/id"], "$id"],
        "q/select": {
            "id":   ["fibery/id"],
            "name": ["Website/name"],
            "doc":  ["Website/Description", "Collaboration~Documents/secret"],
        },
        "q/limit": 1,
        "q/params": {"$id": entity_id},
    }
    res = run_fibery("query", "--query-json", json.dumps(q))
    if not res:
        raise RuntimeError(f"Pages entity not found: {entity_id}")
    return res[0]

def fetch_blog_entity(entity_id: str) -> dict[str, Any]:
    """Fetch a Website/Blog entity with all relevant fields."""
    q = {
        "q/from": "Website/Blog",
        "q/where": ["=", ["fibery/id"], "$id"],
        "q/select": {
            "id":        ["fibery/id"],
            "name":      ["Website/name"],
            "slug":      ["Website/Slug"],
            "doc":       ["Website/Description", "Collaboration~Documents/secret"],
            "post_date": ["Website/Post Date"],
            "subtitle":  ["Website/Subtitle"],
            "author":    ["Website/Author"],
            "excerpt":   ["Website/Excerpt"],
        },
        "q/limit": 1,
        "q/params": {"$id": entity_id},
    }
    res = run_fibery("query", "--query-json", json.dumps(q))
    if not res:
        raise RuntimeError(f"Blog entity not found: {entity_id}")
    return res[0]

def fetch_doc_md(secret: str) -> str:
    """Return markdown content of a doc by secret."""
    if not secret:
        return ""
    out = run_fibery("doc", secret, "--format", "md", capture_json=False)
    return out or ""

def list_files_on(entity_type: str, entity_id: str, field: str) -> list[dict[str, Any]]:
    """List files attached to an entity's collection field."""
    try:
        res = run_fibery(
            "file", "list-on",
            "--type", entity_type,
            "--entity-id", entity_id,
            "--field", field,
        )
        if isinstance(res, list):
            return res
        if isinstance(res, dict) and "files" in res:
            return res["files"]
        return []
    except RuntimeError as e:
        # If field doesn't exist on entity, treat as empty.
        if "not found" in str(e).lower() or "no such field" in str(e).lower():
            return []
        raise

# ----------------------------------------------------------------------------
# Per-entity merge
# ----------------------------------------------------------------------------

def merge_one(item: dict[str, Any], dry_run: bool) -> dict[str, int]:
    """Process a single source→target pair. Returns counters."""
    source_id = item["source_id"]
    target_id = item["target_id"]

    if target_id in SKIP_BLOG_IDS:
        print(f"SKIP {SKIP_BLOG_IDS[target_id]} ({target_id})")
        return {"body_chars": 0, "assets_uploaded": 0, "fields_set": 0}

    source = fetch_pages_entity(source_id)
    target = fetch_blog_entity(target_id)

    source_name = source.get("name", "<unnamed>")
    target_name_current = target.get("name", "<unnamed>")
    source_doc_secret = source.get("doc")
    target_doc_secret = target.get("doc")

    # 1. Fetch + parse source markdown.
    source_md = fetch_doc_md(source_doc_secret) if source_doc_secret else ""
    parsed_fields, body = parse_front_matter(source_md)

    # 2. Pull values from parsed fields if not in manifest.
    subtitle = item["subtitle"] or parsed_fields.get("Subtitle") or None
    author   = item["author"]   or parsed_fields.get("Author")   or None
    excerpt = parsed_fields.get("Excerpt") or None

    # 3. Compare to target current body to decide if we need to write.
    target_md_current = fetch_doc_md(target_doc_secret) if target_doc_secret else ""
    body_will_change = (body.strip() != target_md_current.strip())

    # 4. Asset diff.
    source_files = list_files_on("Website/Pages", source_id, "Website/Assets")
    target_files = list_files_on("Website/Blog",  target_id, "Website/Assets")
    target_filenames = {f.get("name") for f in target_files if f.get("name")}

    files_to_upload = []
    seen_filenames: set[str] = set()
    for f in source_files:
        fname = f.get("name")
        if not fname or fname in seen_filenames:
            continue
        seen_filenames.add(fname)
        if fname in target_filenames:
            continue
        files_to_upload.append(f)

    # 5. Field diffs.
    fields_to_update: dict[str, Any] = {}

    if item["target_name"] and target_name_current != item["target_name"]:
        fields_to_update["Website/name"] = item["target_name"]

    current_post_date = target.get("post_date")
    desired_post_date = item["post_date"]
    if desired_post_date and not _date_matches(current_post_date, desired_post_date):
        fields_to_update["Website/Post Date"] = desired_post_date

    if not target.get("slug") and item["slug"]:
        fields_to_update["Website/Slug"] = item["slug"]

    if subtitle and target.get("subtitle") != subtitle:
        fields_to_update["Website/Subtitle"] = subtitle
    if author and target.get("author") != author:
        fields_to_update["Website/Author"] = author
    if excerpt and target.get("excerpt") != excerpt:
        fields_to_update["Website/Excerpt"] = excerpt

    # 6. Verify Tag (Website/Type) — log only, no mutation.
    # (Not querying Type here to keep query simple; can be added later.)

    # 7. Print plan / execute.
    final_name = item["target_name"] or target_name_current
    label = f"[DRY-RUN] {final_name}" if dry_run else final_name
    print(
        f"PLAN {label}: "
        f"body {'CHANGE' if body_will_change else 'same'} ({len(body)} chars), "
        f"assets {len(files_to_upload)} to upload "
        f"({len(source_files) - len(files_to_upload)} dedup-skipped), "
        f"fields {len(fields_to_update)} to set "
        f"({sorted(fields_to_update.keys())})"
    )

    if dry_run:
        return {
            "body_chars": len(body) if body_will_change else 0,
            "assets_uploaded": len(files_to_upload),
            "fields_set": len(fields_to_update),
        }

    # ---- LIVE MUTATIONS ----

    # 7a. Write doc body.
    if body_will_change and target_doc_secret:
        tmp_path = Path(f"/tmp/blog-migration/{source_id}/body.md")
        tmp_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path.write_text(body, encoding="utf-8")
        run_fibery(
            "doc-write", target_doc_secret,
            "--content-file", str(tmp_path),
            "--format", "md",
        )

    # 7b. Upload assets.
    uploaded_count = 0
    if files_to_upload:
        dl_dir = Path(f"/tmp/blog-migration/{source_id}")
        dl_dir.mkdir(parents=True, exist_ok=True)
        local_paths: list[str] = []
        for f in files_to_upload:
            secret = f.get("secret") or f.get("file-secret")
            if not secret:
                print(f"  WARN: no secret for {f.get('name')}, skipping")
                continue
            local = dl_dir / f["name"]
            run_fibery(
                "file", "download", secret,
                "--out", str(local),
                capture_json=False,
            )
            local_paths.append(str(local))
        if local_paths:
            run_fibery(
                "file", "attach",
                "--paths", ",".join(local_paths),
                "--type", "Website/Blog",
                "--entity-id", target_id,
                "--field", "Website/Assets",
            )
            uploaded_count = len(local_paths)

    # 7c. Update fields.
    if fields_to_update:
        run_fibery(
            "update",
            "--type", "Website/Blog",
            "--fields", json.dumps(fields_to_update),
            target_id,
        )

    print(
        f"MERGED {final_name}: "
        f"body {len(body) if body_will_change else 0} chars, "
        f"{uploaded_count} assets attached, "
        f"{len(fields_to_update)} fields updated"
    )
    return {
        "body_chars": len(body) if body_will_change else 0,
        "assets_uploaded": uploaded_count,
        "fields_set": len(fields_to_update),
    }

def _date_matches(current: Any, desired: str) -> bool:
    """Compare current Fibery date to manifest date string (YYYY-MM-DD)."""
    if not current:
        return False
    if isinstance(current, str):
        return current.startswith(desired)
    return False

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true",
                        help="Plan only, no Fibery mutations.")
    args = parser.parse_args()

    # Ensure token resolvable so fibery CLI inherits env (CLI also reads keychain).
    os.environ["FIBERY_TOKEN"] = load_token()

    mode = "DRY-RUN" if args.dry_run else "LIVE (WILL MUTATE FIBERY)"
    print(f"Migration script — {mode}")
    print(f"Workspace: {WORKSPACE}.fibery.io")
    print("")

    # 1. Schema check.
    ok, missing = assert_schema_ready()
    if not ok:
        print("Schema check FAILED. Missing required fields on Website/Blog:")
        for f in missing:
            print(f"  - {f}")
        print("")
        print("Add these fields in Fibery UI, then re-run.")
        return 2
    print(f"Schema check OK — all {len(REQUIRED_FIELDS)} required fields present.")
    print("")

    # 2. Process manifest.
    totals = {"body_chars": 0, "assets_uploaded": 0, "fields_set": 0, "skipped": 0, "errors": 0}
    for item in MANIFEST:
        try:
            counters = merge_one(item, dry_run=args.dry_run)
            for k, v in counters.items():
                totals[k] = totals.get(k, 0) + v
        except Exception as e:
            totals["errors"] += 1
            print(f"ERROR processing {item['source_id']} -> {item['target_id']}: {e}",
                  file=sys.stderr)

    # 3. Summary.
    print("")
    print(
        f"Summary: {len(MANIFEST)} entities processed "
        f"({len(SKIP_BLOG_IDS)} explicitly skipped: {', '.join(SKIP_BLOG_IDS.values())}). "
        f"{totals['errors']} errors."
    )
    print(
        f"Totals: {totals['body_chars']} body chars written, "
        f"{totals['assets_uploaded']} files uploaded, "
        f"{totals['fields_set']} fields updated."
    )
    return 0 if totals["errors"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
