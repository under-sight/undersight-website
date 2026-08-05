#!/usr/bin/env bash
# =============================================================================
# generate-webp-attachments.sh — webp compression variants for CMS images
# =============================================================================
#
# For every PNG image attached to <space>/Pages "Assets" or <space>/Blog
# "Assets" that has no same-basename .webp sibling, download it, convert it
# (smaller of cwebp lossy -q 82 and lossless; dimensions verified), and attach
# the .webp next to its PNG on the same entity. index.html's pictureTag()
# then serves <picture> with a webp <source> and the PNG <img> fallback.
#
# Idempotent: entities whose PNGs already have webp siblings are skipped, so
# re-running after adding a new PNG converts only the new file.
#
# og-image.png is exempt: it is referenced from og:image/twitter:image meta
# tags, and social scrapers require PNG/JPEG.
#
# Usage:
#   bash scripts/generate-webp-attachments.sh "CMS Staging"   # safe space
#   bash scripts/generate-webp-attachments.sh "CMS"           # PRODUCTION
#
# CAUTION (production): the prod cron build (deploy-production.yml, every
# minute, builds main + CMS) picks attachments up within ~15 minutes. Run
# against "CMS" only when main's index.html is webp-aware AND excludes webp
# variants from imageFiles()/solFileList — i.e. dev commits b8f03ac/9a66a23
# have been merged to main. Without them, webp siblings render as duplicate
# blog companion images on production.
#
# Requires: fibery CLI (authed for subscript), cwebp (brew install webp).
# =============================================================================
set -euo pipefail

SPACE="${1:?usage: generate-webp-attachments.sh \"<CMS|CMS Staging>\"}"
command -v cwebp >/dev/null || { echo "ERROR: cwebp not found (brew install webp)"; exit 1; }
WORK="$(mktemp -d /tmp/webp-attach.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

if [ "$SPACE" = "CMS" ]; then
  echo "PRODUCTION space selected. Prod cron deploys attachments within ~15 min."
  echo "Confirm main's index.html filters .webp variants (commits b8f03ac/9a66a23 merged)."
  read -r -p "Type 'cms' to continue: " ANSWER
  [ "$ANSWER" = "cms" ] || { echo "Aborted."; exit 1; }
fi

# Blog's name field is lowercase 'name'; Pages uses 'Name'.
query_db() { # query_db <db> <namefield>
  fibery subscript query "$SPACE/$1" --json-query "{
    \"q/from\": \"$SPACE/$1\",
    \"q/select\": {
      \"Name\": \"$SPACE/$2\",
      \"Id\": \"fibery/id\",
      \"Files\": {\"q/from\": \"$SPACE/Assets\", \"q/select\": {\"name\": \"fibery/name\", \"type\": \"fibery/content-type\", \"secret\": \"fibery/secret\"}, \"q/limit\": 20}
    },
    \"q/limit\": 100
  }"
}
query_db Pages Name > "$WORK/pages.json"
query_db Blog name  > "$WORK/blog.json"

SPACE="$SPACE" WORK="$WORK" python3 - <<'PY'
import json, os, subprocess, sys

space, work = os.environ["SPACE"], os.environ["WORK"]
todo = []
for db, path in (("Pages", "pages.json"), ("Blog", "blog.json")):
    for e in json.load(open(f"{work}/{path}")):
        files = e.get("Files") or []
        names = {(f["name"] or "").lower() for f in files}
        for f in files:
            n = f["name"] or ""
            low = n.lower()
            if not low.endswith(".png") or low == "og-image.png":
                continue
            if low[:-4] + ".webp" in names:
                continue
            todo.append((db, e["Name"], e["Id"], n, f["secret"]))

if not todo:
    print(f"Nothing to do: every PNG in {space} already has a webp sibling.")
    sys.exit(0)

print(f"{len(todo)} PNG(s) need webp variants in {space}:")
by_entity = {}
for db, ename, eid, png, secret in todo:
    png_path = f"{work}/{png}"
    webp_path = f"{work}/{png[:-4]}.webp"
    if not os.path.exists(webp_path):
        subprocess.run(["fibery", "subscript", "file", "download", secret, "--out", png_path],
                       check=True, capture_output=True)
        lossy, lossless = webp_path + ".q82", webp_path + ".ll"
        subprocess.run(["cwebp", "-quiet", "-q", "82", "-m", "6", png_path, "-o", lossy], check=True)
        subprocess.run(["cwebp", "-quiet", "-lossless", png_path, "-o", lossless], check=True)
        pick = lossy if os.path.getsize(lossy) <= os.path.getsize(lossless) else lossless
        os.replace(pick, webp_path)
        for t in (lossy, lossless):
            if os.path.exists(t):
                os.remove(t)
        def dims(p):
            out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", p],
                                 check=True, capture_output=True, text=True).stdout
            return [l.split()[-1] for l in out.splitlines() if "pixel" in l]
        if dims(png_path) != dims(webp_path):
            print(f"FATAL: dimension mismatch for {png}", file=sys.stderr)
            sys.exit(1)
        ps, ws = os.path.getsize(png_path), os.path.getsize(webp_path)
        print(f"  {png}: {ps:,}B -> {ws:,}B ({100*(ps-ws)//ps}% smaller)")
        if ws >= ps:
            print(f"FATAL: webp not smaller than PNG for {png} — investigate before attaching",
                  file=sys.stderr)
            sys.exit(1)
    by_entity.setdefault((db, eid, ename), []).append(webp_path)

for (db, eid, ename), paths in by_entity.items():
    subprocess.run(
        ["fibery", "subscript", "file", "attach",
         "--paths", ",".join(paths),
         "--type", f"{space}/{db}",
         "--entity-id", eid,
         "--field", f"{space}/Assets"],
        check=True, capture_output=True, text=True)
    print(f"  attached {len(paths)} webp -> {db} / {ename}")
print("Done. Verify with: bash tests/test-suite.sh (webp sibling consistency test)")
PY
