// Unit tests for the content-negotiation pure functions used by
// functions/_middleware.js. Run: node --test tests/md-negotiation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptsMarkdown,
  markdownAssetPath,
  isHtmlDocument,
} from "../functions/_md-negotiation.mjs";

test("acceptsMarkdown: explicit text/markdown wins", () => {
  assert.equal(acceptsMarkdown("text/markdown"), true);
  assert.equal(acceptsMarkdown("text/markdown, text/html"), true);
  assert.equal(acceptsMarkdown("text/html, text/markdown;q=0.9"), true);
  assert.equal(acceptsMarkdown("Text/Markdown"), true); // case-insensitive
  assert.equal(acceptsMarkdown("text/x-markdown"), true); // common alias
});

test("acceptsMarkdown: HTML / wildcard / empty do NOT trigger", () => {
  // A browser must never be handed markdown. */* is the browser default.
  assert.equal(acceptsMarkdown("text/html,application/xhtml+xml,*/*"), false);
  assert.equal(acceptsMarkdown("*/*"), false);
  assert.equal(acceptsMarkdown("text/html"), false);
  assert.equal(acceptsMarkdown(""), false);
  assert.equal(acceptsMarkdown(null), false);
  assert.equal(acceptsMarkdown(undefined), false);
});

test("markdownAssetPath: routes map to built .md assets", () => {
  assert.equal(markdownAssetPath("/"), "/index.md");
  assert.equal(markdownAssetPath("/underscore"), "/underscore.md");
  assert.equal(markdownAssetPath("/underscore/"), "/underscore.md"); // trailing slash
  assert.equal(markdownAssetPath("/underscore.md"), "/underscore.md"); // idempotent
  assert.equal(markdownAssetPath("/blog"), "/blog.md");
  assert.equal(markdownAssetPath("/blog/my-post"), "/blog/my-post.md");
  assert.equal(markdownAssetPath("/blog/my-post.md"), "/blog/my-post.md");
});

test("isHtmlDocument: detects the SPA shell by body, not content-type", () => {
  // The `/* /index.html 200` fallback returns the HTML shell at status 200,
  // typed text/markdown (from the .md request path) — so the body is the only
  // reliable tell. Markdown pages always start with content like "#".
  assert.equal(isHtmlDocument("<!DOCTYPE html>\n<html lang=\"en\">"), true);
  assert.equal(isHtmlDocument("<html><head></head></html>"), true);
  assert.equal(isHtmlDocument("  \n  <!doctype html>"), true); // leading whitespace
  assert.equal(isHtmlDocument("﻿<!DOCTYPE html>"), true); // BOM
  assert.equal(isHtmlDocument("# underscore\n\nAPI-first scoring."), false);
  assert.equal(isHtmlDocument("Plain text page."), false);
  assert.equal(isHtmlDocument(""), false);
  assert.equal(isHtmlDocument(null), false);
});
