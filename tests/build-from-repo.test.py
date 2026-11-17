#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS = []


def check(cond, msg):
    print(f"  {'PASS' if cond else 'FAIL'}  {msg}")
    if not cond:
        FAILS.append(msg)


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


content = json.loads(read("content/content.json"))
blogs = content.get("_blogs", {}).get("_data", [])
check(len(blogs) >= 9, f"content.json carries the blog catalog ({len(blogs)} posts)")
check(len(content.get("_integrations", {}).get("_data", [])) >= 12, "content.json carries integrations")

missing = []
for entity in content.values():
    lists = [entity.get("files") or []]
    for item in entity.get("_data") or []:
        if isinstance(item, dict):
            lists.append(item.get("files") or [])
    for files in lists:
        for f in files:
            url = f.get("url", "")
            if url and not os.path.isfile(os.path.join(ROOT, url)):
                missing.append(url)
check(not missing, f"every content file url exists in the repo ({len(missing)} missing)")

raw = read("content/content.json")
check("fibery" not in raw.lower(), "content.json has no fibery reference")
check("calendly" not in raw.lower(), "content.json has no calendly link")
check("/api/file/" not in raw, "content.json has no /api/file/ urls")

src = read("build.py")
check("fibery" not in src.lower(), "build.py has no fibery reference")
check("FIBERY_TOKEN" not in src, "build.py needs no FIBERY_TOKEN")

env = {k: v for k, v in os.environ.items() if not k.startswith("FIBERY")}
env["PATH"] = os.environ.get("PATH", "")
run = subprocess.run(
    [sys.executable, "build.py", "--env=production", "--verify"],
    cwd=ROOT, env=env, capture_output=True, text=True,
)
check(run.returncode == 0, f"build exits 0 offline (got {run.returncode})")
if run.returncode != 0:
    print(run.stdout[-2000:], run.stderr[-2000:])

dist_index = os.path.join(ROOT, "dist", "index.html")
html = open(dist_index, encoding="utf-8").read() if os.path.isfile(dist_index) else ""
check(all(b["slug"] in html for b in blogs), "every blog slug is baked into dist/index.html")
check("under construction" not in html.lower(), "production build is the live site")
check(not os.path.exists(os.path.join(ROOT, "dist", "functions")), "dist ships no functions")
check(not re.search(r"cal\.com/(?!adriany/quick-connect)", html), "only the quick-connect cal.com link is used")

print(f"\n{len(FAILS)} failure(s)")
sys.exit(1 if FAILS else 0)
