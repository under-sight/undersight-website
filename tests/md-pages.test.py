#!/usr/bin/env python3
"""Unit tests for build.py's per-page Markdown generation (free Markdown for
Agents). Pure functions, fixture content_map — no Fibery/network needed.

Run: python3 tests/md-pages.test.py
Exit 0 = all pass, 1 = failure.
"""
import os
import sys
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build  # noqa: E402

FAILS = []


def check(cond, msg):
    if cond:
        print(f"  PASS  {msg}")
    else:
        FAILS.append(msg)
        print(f"  FAIL  {msg}")


FIXTURE = {
    "Home - Hero": {"content": "AI underwriting infrastructure for private credit."},
    "Home - Metrics": {"content": "- 30% faster screening"},
    "Home - New Section": {"content": "an extra home section"},  # not in MD_HOME_ORDER
    "Site Config": {"content": "brand colors, nav"},   # config -> excluded
    "SEO": {"content": "meta description"},             # config -> excluded
    "Footer": {"content": "footer links"},             # config -> excluded
    "Solutions - underscore": {"content":
        "# underscore\n\nAPI-first risk scoring.\n\n**Tag:** Risk Scoring\n**Icon:** S"},
    "Solutions - underchat agent": {"content": "Conversational intake agent Macy."},
    "Solutions - AI Underwriting Copilot": {"content": "Single-pane workspace."},
    "Solutions - copilot - Scoring Engine": {"content": "Embedded scoring engine."},
    "Contact Page": {"content": "Get in touch: hello@undersight.ai"},
    "_blogs": {"_data": [
        {"name": "First Post", "slug": "first-post",
         "body": "**Date:** 2026-01-01\n# First Post\n---\nReal body text here.",
         "post_date": "2026-01-02", "author": "Kyle", "type": "News",
         "subtitle": "A subtitle"},
        {"name": "No Slug Post", "slug": "", "body": "should be skipped"},
    ]},
}


def main():
    targets = build.markdown_targets(FIXTURE)

    # --- routes present / absent ---
    expected = {"/index", "/underscore", "/underchat", "/copilot",
                "/contact", "/blog", "/blog/first-post"}
    check(expected.issubset(targets.keys()),
          f"all expected routes present (got {sorted(targets)})")
    check("/blog/" not in targets and not any(k.endswith("/") for k in targets),
          "blog post with empty slug is skipped")

    # --- home composition & config exclusion ---
    home = targets["/index"]
    check("AI underwriting infrastructure" in home and "30% faster" in home,
          "/index composes multiple Home - * sections")
    check("an extra home section" in home,
          "/index includes un-ordered Home - * sections (no silent drop)")
    check(all(x not in home for x in ("brand colors", "meta description", "footer links")),
          "/index excludes config entities (Site Config/SEO/Footer)")
    # ordering: Hero before Metrics before the appended extra
    check(home.index("AI underwriting") < home.index("30% faster")
          < home.index("an extra home section"),
          "/index respects MD_HOME_ORDER then alpha extras")

    # --- multi-entity page ---
    copilot = targets["/copilot"]
    check("Single-pane workspace." in copilot and "Embedded scoring engine." in copilot,
          "/copilot merges both copilot entities")

    # --- solution + contact single-entity pages ---
    underscore = targets["/underscore"]
    check(underscore.startswith("# underscore")
          and "API-first risk scoring." in underscore,
          "/underscore keeps its own heading + body (no synthetic dup title)")
    check("**Tag:** Risk Scoring" in underscore,
          "/underscore keeps structured **Key:** value content")
    check("**Icon:**" not in underscore, "/underscore drops UI-only **Icon:** line")
    check("hello@undersight.ai" in targets["/contact"], "/contact has body")

    # --- blog post markdown ---
    post = targets["/blog/first-post"]
    check(post.startswith("# First Post"), "blog post starts with # title")
    check("Kyle" in post and "News" in post, "blog post has meta line")
    check("A subtitle" in post, "blog post includes subtitle")
    check("Real body text here." in post, "blog post includes body")
    check("**Date:**" not in post,
          "blog post strips legacy front-matter (**Date:**)")

    # --- blog index ---
    check("First Post" in targets["/blog"] and "/blog/first-post" in targets["/blog"],
          "/blog index links posts")

    # --- write_markdown_pages: files + manifest on disk ---
    with tempfile.TemporaryDirectory() as tmp:
        orig = build.DIST_DIR
        build.DIST_DIR = tmp
        try:
            manifest = build.write_markdown_pages(FIXTURE)
        finally:
            build.DIST_DIR = orig
        check(os.path.isfile(os.path.join(tmp, "index.md")), "writes dist/index.md")
        check(os.path.isfile(os.path.join(tmp, "underscore.md")),
              "writes dist/underscore.md")
        check(os.path.isfile(os.path.join(tmp, "blog", "first-post.md")),
              "writes dist/blog/first-post.md (nested dir created)")
        mf_path = os.path.join(tmp, "_md-manifest.json")
        check(os.path.isfile(mf_path), "writes dist/_md-manifest.json")
        disk_manifest = json.load(open(mf_path))
        check(disk_manifest == manifest and "/index.md" in disk_manifest
              and "/blog/first-post.md" in disk_manifest,
              "manifest lists .md asset paths")

    print()
    if FAILS:
        print(f"FAILED ({len(FAILS)}): " + "; ".join(FAILS))
        sys.exit(1)
    print("All markdown-pages tests passed.")


if __name__ == "__main__":
    main()
