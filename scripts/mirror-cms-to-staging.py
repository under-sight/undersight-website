#!/usr/bin/env python3
"""
Mirror Fibery space CMS -> CMS Staging (subscript.fibery.io).

HARD SAFETY RULE: reads from CMS, writes ONLY to CMS Staging. Every mutating
call goes through guards that hard-fail unless the target type starts with
"CMS Staging/" (and doc writes unless the secret belongs to a staging entity).

Mirrored: Pages, Blog, Animations, Emails, Integrations.
Excluded: Website Leads (PII/operational), Deployments (self-populates when
deploy-report runs against staging).

Usage:
    python3 scripts/mirror-cms-to-staging.py             # create-missing-only (idempotent)
    python3 scripts/mirror-cms-to-staging.py --dry-run   # print plan, zero writes
    python3 scripts/mirror-cms-to-staging.py --update    # also rewrite fields on existing targets
    python3 scripts/mirror-cms-to-staging.py --verify    # no writes; parity report; exit 1 on mismatch

Zero-dependency: urllib + json + hashlib (+ subprocess for the fibery CLI,
used only for file uploads — `fibery subscript file attach`).

Requires: FIBERY_TOKEN env var, or macOS Keychain entry
(service='mcp-credentials', account='fibery-undersight').
"""

import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

WORKSPACE = "subscript.fibery.io"
SRC_SPACE = "CMS"
DST_SPACE = "CMS Staging"

EXCLUDED = [
    ("Website Leads", "PII/operational; never mirrored"),
    ("Deployments", "self-populates when deploy-report runs against staging"),
]

# Field shapes per mirrored DB. Field names are space-relative (the space
# prefix is added at use). NOTE: Pages' title field is capital-N "Name";
# every other DB uses lowercase "name".
SPECS = {
    "Pages": {
        "name": "Name", "prims": [], "singles": [], "multis": [],
        "doc": True, "files": ["Assets"],
    },
    "Blog": {
        "name": "name",
        "prims": ["Slug", "Subtitle", "Author", "Excerpt", "Post Date", "Version"],
        "singles": [], "multis": ["Type"],
        "doc": True, "files": ["Assets", "PDF"],
    },
    "Animations": {
        "name": "name", "prims": [], "singles": ["Status", "Type"], "multis": [],
        "doc": True, "files": ["Preview"],
    },
    "Emails": {
        "name": "name", "prims": ["Channel", "From", "Status", "Subject"],
        "singles": [], "multis": [],
        "doc": True, "files": [],
    },
    "Integrations": {
        "name": "name", "prims": ["Rank"], "singles": [], "multis": [],
        "doc": False, "files": ["Logo"],
    },
}
DB_ORDER = ["Pages", "Blog", "Animations", "Emails", "Integrations"]
# Second pass: Pages.Integrations relation (mirrored from the Pages side).
PAGE_REL_FIELD = "Integrations"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(SCRIPT_DIR, "..", ".mirror-file-cache")


# ---------------------------------------------------------------------------
# Fibery API (same pattern as build.py)
# ---------------------------------------------------------------------------


def get_token():
    """Retrieve Fibery API token from env var or macOS Keychain."""
    token = os.environ.get("FIBERY_TOKEN")
    if token:
        return token
    try:
        return subprocess.check_output(
            ["security", "find-generic-password", "-s", "mcp-credentials",
             "-a", "fibery-undersight", "-w"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: Could not retrieve Fibery token.")
        print("       Set FIBERY_TOKEN env var, or on macOS add keychain entry:")
        print("       service='mcp-credentials', account='fibery-undersight'")
        sys.exit(1)


def api_post(path, body, token):
    """POST to Fibery API and return parsed JSON. Raises on command errors."""
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(
        f"https://{WORKSPACE}{path}",
        data=json.dumps(body).encode(),
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("success") is False:
                raise RuntimeError(f"Fibery command failed: {item.get('result')}")
    return data


def entity_query(token, query):
    res = api_post(
        "/api/commands",
        [{"command": "fibery.entity/query", "args": {"query": query}}],
        token,
    )[0]["result"]
    return [e for e in res if isinstance(e, dict)]


def read_docs(token, secrets):
    """Batch-read documents as markdown. Returns {secret: content}."""
    docs = {}
    secrets = [s for s in secrets if s]
    for i in range(0, len(secrets), 50):
        chunk = secrets[i:i + 50]
        res = api_post(
            "/api/documents/commands?format=md",
            {"command": "get-documents", "args": [{"secret": s} for s in chunk]},
            token,
        )
        for d in res:
            if isinstance(d, dict) and "secret" in d:
                docs[d["secret"]] = d.get("content") or ""
    return docs


def download_file(secret, token, max_retries=4):
    """Download a file from Fibery by secret with retry/backoff (build.py pattern)."""
    headers = {"Authorization": f"Token {token}"}
    url = f"https://{WORKSPACE}/api/files/{secret}"
    last_err = None
    for attempt in range(max_retries):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429 or 500 <= e.code < 600:
                time.sleep(0.5 * (2 ** attempt))
                continue
            break
        except Exception as e:
            last_err = e
            time.sleep(0.5 * (2 ** attempt))
            continue
    raise RuntimeError(f"Failed to download file {secret[:8]}...: {last_err}")


# ---------------------------------------------------------------------------
# Guarded write helpers — ALL mutations funnel through these
# ---------------------------------------------------------------------------


def guard_dst(type_name):
    if not type_name.startswith(DST_SPACE + "/"):
        raise SystemExit(f"SAFETY VIOLATION: refusing write to type {type_name!r}")


def create_entity(token, type_name, fields):
    guard_dst(type_name)
    res = api_post(
        "/api/commands",
        [{"command": "fibery.entity/create",
          "args": {"type": type_name, "entity": fields}}],
        token,
    )
    return res[0]["result"]


def update_entity(token, type_name, eid, fields):
    guard_dst(type_name)
    api_post(
        "/api/commands",
        [{"command": "fibery.entity/update",
          "args": {"type": type_name, "entity": dict(fields, **{"fibery/id": eid})}}],
        token,
    )


def add_collection_items(token, type_name, field, eid, item_ids):
    guard_dst(type_name)
    if not item_ids:
        return
    api_post(
        "/api/commands",
        [{"command": "fibery.entity/add-collection-items",
          "args": {"type": type_name, "field": field,
                   "entity": {"fibery/id": eid},
                   "items": [{"fibery/id": i} for i in item_ids]}}],
        token,
    )


def write_doc(token, secret, md, allowed_secrets):
    if secret not in allowed_secrets:
        raise SystemExit(
            f"SAFETY VIOLATION: doc secret {secret[:8]}... is not a CMS Staging doc")
    api_post(
        "/api/documents/commands?format=md",
        {"command": "create-or-update-documents",
         "args": [{"secret": secret, "content": md}]},
        token,
    )


def attach_file(type_name, eid, field, path):
    """Upload + attach a local file via the fibery CLI (multipart upload)."""
    guard_dst(type_name)
    subprocess.run(
        ["fibery", "subscript", "file", "attach", "--paths", path,
         "--type", type_name, "--entity-id", eid, "--field", field],
        check=True, capture_output=True, text=True,
    )


# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------


def fetch_db(token, space, db):
    """Fetch all entities of one DB with name/prims/enums/doc-secret/files/relations."""
    spec = SPECS[db]
    sel = {
        "id": ["fibery/id"],
        "name": [f"{space}/{spec['name']}"],
    }
    for p in spec["prims"]:
        sel[p] = [f"{space}/{p}"]
    for s in spec["singles"]:
        sel[s] = [f"{space}/{s}", "enum/name"]
    for m in spec["multis"]:
        sel["multi_" + m] = {
            "q/from": f"{space}/{m}",
            "q/select": {"n": ["enum/name"]},
            "q/limit": 50,
        }
    if spec["doc"]:
        sel["doc_secret"] = [f"{space}/Description", "Collaboration~Documents/secret"]
    for fcol in spec["files"]:
        sel["files_" + fcol] = {
            "q/from": f"{space}/{fcol}",
            "q/select": {
                "name": ["fibery/name"],
                "secret": ["fibery/secret"],
                "size": ["fibery/content-length"],
            },
            "q/limit": 50,
        }
    if db == "Pages":
        sel["rel_integrations"] = {
            "q/from": f"{space}/{PAGE_REL_FIELD}",
            "q/select": {"n": [f"{space}/name"]},
            "q/limit": 50,
        }
    rows = entity_query(token, {"q/from": f"{space}/{db}", "q/select": sel, "q/limit": 300})
    by_name = {}
    for r in rows:
        if not r.get("name"):
            continue
        if r["name"] in by_name:
            print(f"  WARNING: duplicate name in {space}/{db}: {r['name']!r}")
        by_name[r["name"]] = r
    return by_name


def fetch_enum_types(token):
    """Map (space, db, field) -> enum type name for all single/multi enum fields."""
    schema = api_post(
        "/api/commands", [{"command": "fibery.schema/query", "args": {}}], token,
    )[0]["result"]
    types = {t["fibery/name"]: t for t in schema["fibery/types"]}
    out = {}
    for space in (SRC_SPACE, DST_SPACE):
        for db, spec in SPECS.items():
            t = types.get(f"{space}/{db}")
            if not t:
                continue
            fields = {f["fibery/name"]: f for f in t["fibery/fields"]}
            for fld in spec["singles"] + spec["multis"]:
                f = fields.get(f"{space}/{fld}")
                if f:
                    out[(space, db, fld)] = f["fibery/type"]
    return out


def fetch_enum_values(token, enum_type):
    """Return {enum value name: fibery/id} for an enum type."""
    rows = entity_query(token, {
        "q/from": enum_type,
        "q/select": {"name": ["enum/name"], "id": ["fibery/id"]},
        "q/limit": 100,
    })
    return {r["name"]: r["id"] for r in rows if r.get("name")}


# ---------------------------------------------------------------------------
# Normalization / comparison
# ---------------------------------------------------------------------------


def norm_md(text):
    """Normalize markdown for hashing: collapse \\r\\n, strip trailing ws per line."""
    text = (text or "").replace("\r\n", "\n")
    return "\n".join(line.rstrip() for line in text.split("\n"))


def md_hash(text):
    return hashlib.sha256(norm_md(text).encode()).hexdigest()


def file_set(entity, fcol):
    """{(name, size)} for one file collection on a fetched entity."""
    return {(f.get("name"), f.get("size")) for f in (entity.get("files_" + fcol) or [])}


def rel_names(entity, key):
    return sorted(x["n"] for x in (entity.get(key) or []) if x.get("n"))


# ---------------------------------------------------------------------------
# Mirror passes
# ---------------------------------------------------------------------------


class Counters:
    def __init__(self):
        self.creates = 0
        self.doc_writes = 0
        self.file_uploads = 0
        self.enum_links = 0
        self.relation_links = 0
        self.field_updates = 0
        self.manual_enums = []  # (db, field, value-name)

    def summary(self):
        return (f"SUMMARY creates={self.creates} doc_writes={self.doc_writes} "
                f"file_uploads={self.file_uploads} enum_links={self.enum_links} "
                f"relation_links={self.relation_links} field_updates={self.field_updates} "
                f"manual_enums={len(self.manual_enums)}")


def build_create_fields(token, db, src_ent, staging_enums, counters):
    """Primitive + single-enum fields for a fibery.entity/create payload."""
    spec = SPECS[db]
    fields = {f"{DST_SPACE}/{spec['name']}": src_ent["name"]}
    for p in spec["prims"]:
        v = src_ent.get(p)
        if v is not None:
            fields[f"{DST_SPACE}/{p}"] = v
    for s in spec["singles"]:
        v = src_ent.get(s)
        if v is None:
            continue
        eid = resolve_enum(db, s, v, staging_enums, counters, token=token)
        if eid:
            fields[f"{DST_SPACE}/{s}"] = {"fibery/id": eid}
    return fields


def resolve_enum(db, field, value_name, staging_enums, counters, token=None):
    """Staging enum value id by name; create the value in staging if missing."""
    emap = staging_enums[(db, field)]
    if value_name in emap["values"]:
        return emap["values"][value_name]
    if token:
        # Enum values are entities of the (staging) enum type — creating one is
        # a staging-only write and goes through the guarded create.
        try:
            res = create_entity(token, emap["type"], {"enum/name": value_name})
            emap["values"][value_name] = res["fibery/id"]
            print(f"  created staging enum value {value_name!r} on {emap['type']}")
            return res["fibery/id"]
        except Exception as e:
            print(f"  WARNING: could not create enum value {value_name!r} on "
                  f"{emap['type']}: {e}")
    counters.manual_enums.append((db, field, value_name))
    return None


def mirror(token, src, dst, src_docs, do_update, counters):
    """Create-missing / update pass. Mutates staging only. Returns fresh dst maps."""
    enum_types = fetch_enum_types(token)
    staging_enums = {}
    for db, spec in SPECS.items():
        for fld in spec["singles"] + spec["multis"]:
            etype = enum_types[(DST_SPACE, db, fld)]
            guard_dst(etype)
            staging_enums[(db, fld)] = {
                "type": etype,
                "values": fetch_enum_values(token, etype),
            }

    for db in DB_ORDER:
        spec = SPECS[db]
        dst_type = f"{DST_SPACE}/{db}"
        print(f"\n[{db}] source {len(src[db])}, staging {len(dst[db])}")

        # 1. create missing / 2. update primitives
        for name, s_ent in src[db].items():
            if name not in dst[db]:
                fields = build_create_fields(token, db, s_ent, staging_enums, counters)
                create_entity(token, dst_type, fields)
                counters.creates += 1
                print(f"  created: {name}")
            elif do_update:
                d_ent = dst[db][name]
                changed = {}
                for p in spec["prims"]:
                    if s_ent.get(p) != d_ent.get(p):
                        changed[f"{DST_SPACE}/{p}"] = s_ent.get(p)
                for sf in spec["singles"]:
                    if s_ent.get(sf) != d_ent.get(sf):
                        eid = resolve_enum(db, sf, s_ent.get(sf), staging_enums,
                                           counters, token=token) if s_ent.get(sf) else None
                        changed[f"{DST_SPACE}/{sf}"] = {"fibery/id": eid} if eid else None
                if changed:
                    update_entity(token, dst_type, d_ent["id"], changed)
                    counters.field_updates += 1
                    print(f"  updated fields: {name} ({len(changed)})")

        # Re-fetch staging DB: new entities need their doc secrets / ids
        dst[db] = fetch_db(token, DST_SPACE, db)

        # 3. multi-enum collections (add missing values only)
        for m in spec["multis"]:
            for name, s_ent in src[db].items():
                d_ent = dst[db].get(name)
                if not d_ent:
                    continue
                want = set(rel_names(s_ent, "multi_" + m))
                have = set(rel_names(d_ent, "multi_" + m))
                missing = want - have
                ids = []
                for v in sorted(missing):
                    eid = resolve_enum(db, m, v, staging_enums, counters, token=token)
                    if eid:
                        ids.append(eid)
                if ids:
                    add_collection_items(token, dst_type, f"{DST_SPACE}/{m}",
                                         d_ent["id"], ids)
                    counters.enum_links += len(ids)

        # 4. rich text: write doc when normalized content differs
        if spec["doc"]:
            allowed = {e.get("doc_secret") for e in dst[db].values() if e.get("doc_secret")}
            dst_docs = read_docs(token, list(allowed))
            for name, s_ent in src[db].items():
                d_ent = dst[db].get(name)
                if not d_ent or not d_ent.get("doc_secret"):
                    continue
                src_md = src_docs.get(s_ent.get("doc_secret"), "")
                dst_md = dst_docs.get(d_ent["doc_secret"], "")
                if md_hash(src_md) != md_hash(dst_md):
                    write_doc(token, d_ent["doc_secret"], src_md, allowed)
                    counters.doc_writes += 1
                    print(f"  doc written: {name}")

        # 5. files: upload any (name, size) missing from the target collection
        for fcol in spec["files"]:
            for name, s_ent in src[db].items():
                d_ent = dst[db].get(name)
                if not d_ent:
                    continue
                have = file_set(d_ent, fcol)
                for f in (s_ent.get("files_" + fcol) or []):
                    if (f.get("name"), f.get("size")) in have:
                        continue
                    path = cache_file(token, f)
                    attach_file(f"{DST_SPACE}/{db}", d_ent["id"],
                                f"{DST_SPACE}/{fcol}", path)
                    counters.file_uploads += 1
                    print(f"  file attached: {name} <- {f.get('name')}")

    # 6. second pass: Pages.Integrations relation
    dst["Pages"] = fetch_db(token, DST_SPACE, "Pages")
    integ_ids = {name: e["id"] for name, e in dst["Integrations"].items()}
    for name, s_ent in src["Pages"].items():
        d_ent = dst["Pages"].get(name)
        if not d_ent:
            continue
        want = set(rel_names(s_ent, "rel_integrations"))
        have = set(rel_names(d_ent, "rel_integrations"))
        missing = sorted(want - have)
        ids = [integ_ids[n] for n in missing if n in integ_ids]
        unmatched = [n for n in missing if n not in integ_ids]
        if unmatched:
            print(f"  WARNING: page {name!r} links unknown integrations: {unmatched}")
        if ids:
            add_collection_items(token, f"{DST_SPACE}/Pages",
                                 f"{DST_SPACE}/{PAGE_REL_FIELD}", d_ent["id"], ids)
            counters.relation_links += len(ids)
            print(f"  linked integrations: {name} += {missing}")

    return dst


def cache_file(token, f):
    """Download a source file to the local cache; return the local path.

    Path is .mirror-file-cache/<sha16(secret)>/<original-name> so the attach
    upload preserves the exact file name.
    """
    name = f.get("name") or "unnamed"
    if "," in name:
        raise RuntimeError(f"file name contains a comma (breaks CLI --paths): {name!r}")
    d = os.path.join(CACHE_DIR, hashlib.sha256(f["secret"].encode()).hexdigest()[:16])
    path = os.path.join(d, name)
    if not os.path.isfile(path):
        os.makedirs(d, exist_ok=True)
        data = download_file(f["secret"], token)
        with open(path, "wb") as fh:
            fh.write(data)
    return path


# ---------------------------------------------------------------------------
# Dry run / verify
# ---------------------------------------------------------------------------


def plan(src, dst, src_docs, dst_docs):
    """Print the per-DB plan (what a real run would do). No writes."""
    for db in DB_ORDER:
        spec = SPECS[db]
        creates = [n for n in src[db] if n not in dst[db]]
        doc_writes = 0
        file_uploads = 0
        for name, s_ent in src[db].items():
            d_ent = dst[db].get(name)
            if spec["doc"]:
                src_md = src_docs.get(s_ent.get("doc_secret"), "")
                if d_ent is None:
                    doc_writes += 1 if norm_md(src_md) else 0
                elif md_hash(src_md) != md_hash(dst_docs.get(d_ent.get("doc_secret"), "")):
                    doc_writes += 1
            for fcol in spec["files"]:
                want = file_set(s_ent, fcol)
                have = file_set(d_ent, fcol) if d_ent else set()
                file_uploads += len(want - have)
        print(f"PLAN {db}: create {len(creates)} (source {len(src[db])}, "
              f"staging {len(dst[db])}) | doc writes {doc_writes} | "
              f"file uploads {file_uploads}")
        for n in creates:
            print(f"  + {n}")
    links = 0
    for name, s_ent in src["Pages"].items():
        d_ent = dst["Pages"].get(name)
        want = set(rel_names(s_ent, "rel_integrations"))
        have = set(rel_names(d_ent, "rel_integrations")) if d_ent else set()
        links += len(want - have)
    print(f"PLAN Pages.Integrations: link {links} relation pairs")


def verify(token, src, dst, src_docs, dst_docs):
    """Parity report. Returns number of mismatches."""
    rows = []  # (check, source, staging, ok)

    def add(check, s, d):
        rows.append((check, str(s), str(d), s == d))

    for db in DB_ORDER:
        spec = SPECS[db]
        add(f"{db} count", len(src[db]), len(dst[db]))
        for name, s_ent in sorted(src[db].items()):
            d_ent = dst[db].get(name)
            if d_ent is None:
                rows.append((f"{db}/{name} exists", "yes", "MISSING", False))
                continue
            if spec["doc"]:
                add(f"{db}/{name} doc sha256",
                    md_hash(src_docs.get(s_ent.get("doc_secret"), ""))[:16],
                    md_hash(dst_docs.get(d_ent.get("doc_secret"), ""))[:16])
            for fcol in spec["files"]:
                add(f"{db}/{name} files[{fcol}]",
                    sorted(file_set(s_ent, fcol)), sorted(file_set(d_ent, fcol)))
        # extra staging-only entities are a mismatch too
        for name in sorted(set(dst[db]) - set(src[db])):
            rows.append((f"{db}/{name} extra in staging", "absent", "present", False))

    for name, s_ent in sorted(src["Pages"].items()):
        d_ent = dst["Pages"].get(name)
        if d_ent:
            add(f"Pages/{name} -> integrations",
                rel_names(s_ent, "rel_integrations"),
                rel_names(d_ent, "rel_integrations"))

    leads = len(entity_query(token, {
        "q/from": f"{DST_SPACE}/Website Leads",
        "q/select": {"id": ["fibery/id"]}, "q/limit": 300}))
    rows.append((f"{DST_SPACE}/Website Leads count == 0", "0", str(leads), leads == 0))
    deploys = len(entity_query(token, {
        "q/from": f"{DST_SPACE}/Deployments",
        "q/select": {"id": ["fibery/id"]}, "q/limit": 300}))
    # Informational only: the mirror never writes Deployments, but staging
    # deploy-reports legitimately populate it once the dev pipeline points
    # at staging, so a non-zero count is not a parity failure.
    print(f"  info: {DST_SPACE}/Deployments count = {deploys} "
          "(not mirrored; populated by deploy-report)")

    bad = [r for r in rows if not r[3]]
    print(f"\nVERIFY: {len(rows)} checks, {len(rows) - len(bad)} ok, {len(bad)} mismatched")
    if bad:
        w = max(len(r[0]) for r in bad)
        print(f"\n{'check'.ljust(w)} | source | staging")
        print("-" * (w + 24))
        for check, s, d, _ in bad:
            print(f"{check.ljust(w)} | {s} | {d}")
    return len(bad)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    do_dry = "--dry-run" in sys.argv
    do_update = "--update" in sys.argv
    do_verify = "--verify" in sys.argv

    print(f"CMS -> CMS Staging mirror  [{WORKSPACE}]")
    for db, why in EXCLUDED:
        print(f"EXCLUDED: {SRC_SPACE}/{db} — {why}")

    token = get_token()

    def fetch_state():
        s = {db: fetch_db(token, SRC_SPACE, db) for db in DB_ORDER}
        d = {db: fetch_db(token, DST_SPACE, db) for db in DB_ORDER}
        s_docs = read_docs(token, [e.get("doc_secret") for m in s.values() for e in m.values()])
        d_docs = read_docs(token, [e.get("doc_secret") for m in d.values() for e in m.values()])
        return s, d, s_docs, d_docs

    print("\nFetching source + staging state...")
    src, dst, src_docs, dst_docs = fetch_state()
    for db in DB_ORDER:
        print(f"  {SRC_SPACE}/{db}: {len(src[db])}  |  {DST_SPACE}/{db}: {len(dst[db])}")

    if do_verify:
        sys.exit(1 if verify(token, src, dst, src_docs, dst_docs) else 0)

    if do_dry:
        plan(src, dst, src_docs, dst_docs)
        print("\nDRY RUN: no writes performed")
        return

    counters = Counters()
    mirror(token, src, dst, src_docs, do_update, counters)

    if counters.manual_enums:
        print("\nMANUAL ENUM VALUES NEEDED (could not auto-create in staging):")
        for db, fld, val in counters.manual_enums:
            print(f"  {DST_SPACE}/{db} field {fld}: missing value {val!r}")

    print(f"\n{counters.summary()}")


if __name__ == "__main__":
    main()
