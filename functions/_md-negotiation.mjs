// Pure helpers for serving Markdown to AI agents on the free Cloudflare tier —
// a self-hosted equivalent of Cloudflare's Pro "Markdown for Agents" feature.
// No Workers-runtime APIs here, so these are unit-testable with `node --test`
// (see tests/md-negotiation.test.mjs). Consumed by functions/_middleware.js.

// True only when the client explicitly asks for markdown. `*/*` (the browser
// default) must NOT match — browsers get HTML.
export function acceptsMarkdown(acceptHeader) {
  if (!acceptHeader) return false;
  return /\btext\/(x-)?markdown\b/i.test(acceptHeader);
}

// Map a request path to its built markdown asset:
//   "/"               -> "/index.md"
//   "/underscore"     -> "/underscore.md"
//   "/underscore/"    -> "/underscore.md"
//   "/blog/my-post"   -> "/blog/my-post.md"
//   already-".md"     -> unchanged
export function markdownAssetPath(pathname) {
  let p = pathname || "/";
  if (p.endsWith(".md")) return p;
  if (p === "/") return "/index.md";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return `${p}.md`;
}

// The `/* /index.html 200` SPA fallback returns the HTML shell at status 200
// for unknown paths. Content-Type is NOT reliable here — the asset server keys
// it off the request path's `.md` extension (so the fallback comes back typed
// text/markdown). The body is the reliable tell: our markdown always starts
// with content (e.g. "#"), never an HTML document opener.
export function isHtmlDocument(text) {
  if (!text) return false;
  const head = text.replace(/^﻿/, "").trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}
