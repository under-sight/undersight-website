#!/usr/bin/env python3
"""Unit tests for build.py's _normalize_doc_markdown — applied to CMS/Blog
Description bodies now that they hold plain markdown (the migration-era JSON
envelopes were repaired at rest, Fibery #408). Fibery's markdown export
escapes literal * and ~ characters (e.g. "\\~8 sponsors"), which must not
surface as visible backslashes in site copy.

Run: python3 tests/normalize-doc.test.py
"""
import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "build", Path(__file__).resolve().parent.parent / "build.py"
)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

failures = []


def check(cond, label):
    status = "PASS" if cond else "FAIL"
    print(f"  {status}  {label}")
    if not cond:
        failures.append(label)


norm = build._normalize_doc_markdown

# Plain markdown untouched
plain = "**Date:** 2026-05-08\n\n---\n\nBody paragraph with *emphasis*.\n"
check(norm(plain) == plain, "plain markdown passes through")
check(norm("") == "", "empty string passes through")
check(norm(None) == "", "None becomes empty string")

# Fibery export escaping of literal ~ and * is stripped
check(norm(r"* \~8 unique sponsors") == "* ~8 unique sponsors",
      "escaped tilde unwrapped")
check(norm(r"* \~$6B addressable market") == "* ~$6B addressable market",
      "escaped tilde before $ unwrapped")
check(norm(r"5 \* 3 = 15") == "5 * 3 = 15", "escaped asterisk unwrapped")
check(norm(r"doubly \\~ escaped") == "doubly ~ escaped",
      "multi-backslash runs collapse")

# Migration-era unicode escapes decode
check(norm("em\\u2014dash") == "em—dash", "unicode escape decoded")

# Trailing-backslash soft-break residue dropped
check(norm("line one\\\nline two") == "line one\nline two",
      "trailing backslash before newline dropped")

# Fibery <br> soft-break export becomes a newline (2026-08: Fibery joins
# consecutive meta lines with <br>, which leaks literally into parseMeta
# values — e.g. "**Label:** X<br>**Heading:** Y" rendered the heading junk
# inside the label on the home case studies)
check(norm("**Label:** X<br>**Heading:** Y") == "**Label:** X\n**Heading:** Y",
      "<br> between meta lines becomes newline")
check(norm("**Tag:** Risk Scoring<br>**Icon:** S") == "**Tag:** Risk Scoring\n**Icon:** S",
      "<br> in solution meta becomes newline")
check(norm("a<br/>b<BR />c") == "a\nb\nc", "self-closing and uppercase br variants")

print()
if failures:
    print(f"{len(failures)} failure(s)")
    sys.exit(1)
print("All normalize-doc tests passed")
