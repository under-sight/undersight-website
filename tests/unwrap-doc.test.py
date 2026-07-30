#!/usr/bin/env python3
"""Unit tests for build.py's _unwrap_doc_content — the shim that rescues
CMS/Blog Description docs still storing the migration-era JSON envelope
{"secret": ..., "content": ...} instead of plain markdown.

Covers both Fibery markdown export formats:
  - legacy: soft line breaks exported as backslash-newline continuations
  - 2026-07-28+: soft line breaks exported as literal <br> tags (this one
    silently took down undersight.ai — see fixtures/blog-envelope-br.md,
    captured live 2026-07-30)

Run: python3 tests/unwrap-doc.test.py
Exit 0 = all pass, 1 = failure.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")

FAILS = []


def check(cond, msg):
    if cond:
        print(f"  PASS  {msg}")
    else:
        FAILS.append(msg)
        print(f"  FAIL  {msg}")


# --- Plain markdown passes through untouched (no envelope) ---
plain = "# A heading\n\nSome **bold** text."
check(build._unwrap_doc_content(plain) == plain, "plain markdown passes through")
check(build._unwrap_doc_content("") == "", "empty string passes through")
check(build._unwrap_doc_content(None) == "", "None becomes empty string")

# --- Legacy export: backslash-newline continuations ---
legacy = (
    '{\\\n"secret": "019e0000-0000-7000-8000-000000000000",\\\n'
    '"content": "# Title\\n\\nBody line one.\\n"\\\n}'
)
out = build._unwrap_doc_content(legacy)
check(not out.lstrip().startswith("{"), "legacy envelope: unwrapped")
check("# Title" in out and "Body line one." in out, "legacy envelope: inner markdown recovered")
check(not UUID_RE.search(out), "legacy envelope: no secret UUID leaks")

# --- 2026-07-28+ export: <br> soft breaks (live-captured fixture) ---
with open(os.path.join(FIXTURES, "blog-envelope-br.md")) as f:
    br_envelope = f.read()
out = build._unwrap_doc_content(br_envelope)
check(not out.lstrip().startswith("{"), "<br> envelope: unwrapped")
check(not UUID_RE.search(out), "<br> envelope: no secret UUID leaks")
check("\\n" not in out, "<br> envelope: no escaped-newline artifacts remain")
check(
    "# How Chat Advance funded a declined deal in 5 minutes" in out,
    "<br> envelope: post heading recovered",
)
check(
    "the same agentic workflow runs" in out.lower(),
    "<br> envelope: post tail recovered",
)

print()
if FAILS:
    print(f"FAILED: {len(FAILS)} test(s)")
    sys.exit(1)
print("All unwrap-doc tests passed")
