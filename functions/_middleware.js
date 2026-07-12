// Free "Markdown for Agents" — Cloudflare Pages Function (runs on the Workers
// free tier). Serves the build-time per-page Markdown when a request either
// asks for it via `Accept: text/markdown` (1:1 with Cloudflare's Pro feature)
// or targets a `.md` URL directly. Everything else passes through untouched, so
// browsers keep getting the normal HTML SPA.
import {
  acceptsMarkdown,
  markdownAssetPath,
  isHtmlDocument,
} from "./_md-negotiation.mjs";

export async function onRequest(context) {
  const { request, env, next } = context;

  // Only GET/HEAD are candidates; POSTs (e.g. /api/*) pass straight through.
  if (request.method !== "GET" && request.method !== "HEAD") return next();

  const url = new URL(request.url);
  const explicitMdUrl = url.pathname.endsWith(".md");
  const wantsMd = explicitMdUrl || acceptsMarkdown(request.headers.get("Accept"));
  if (!wantsMd) return next();

  // Fetch the built markdown asset directly from the static store. This applies
  // _redirects, so an unknown path resolves to the index.html SPA shell at
  // status 200 (typed text/markdown from the .md request path — so we detect it
  // by body, not content-type).
  const assetUrl = new URL(markdownAssetPath(url.pathname), url.origin);
  const res = await env.ASSETS.fetch(new Request(assetUrl, { headers: request.headers }));
  const body = res.ok ? await res.text() : "";

  if (!res.ok || isHtmlDocument(body)) {
    // A direct .md URL with no backing file is a real 404; an Accept-negotiated
    // request just falls back to the normal HTML response.
    return explicitMdUrl ? new Response("Not found", { status: 404 }) : next();
  }

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "all",
      "cache-control": "public, max-age=300",
      vary: "Accept",
    },
  });
}
