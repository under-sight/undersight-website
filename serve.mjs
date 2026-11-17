import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { join, normalize, extname, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { acceptsMarkdown, markdownAssetPath, isHtmlDocument } from "./md-negotiation.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest)|image\/svg)/;

function readOptional(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function toPattern(path) {
  const escaped = path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function parseRedirects(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [from, to, status = "301"] = l.split(/\s+/);
      return { match: toPattern(from), to, status: Number(status) };
    });
}

export function parseHeaders(text) {
  const rules = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ match: toPattern(line.trim()), headers: {} });
    } else if (rules.length) {
      const i = line.indexOf(":");
      rules.at(-1).headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

export function createSiteServer(root) {
  const base = resolve(root);
  const redirects = parseRedirects(readOptional(join(base, "_redirects")));
  const headerRules = parseHeaders(readOptional(join(base, "_headers")));

  const fileAt = (urlPath) => {
    const full = normalize(join(base, urlPath));
    if (full !== base && !full.startsWith(base + sep)) return null;
    for (const candidate of [full, join(full, "index.html"), `${full}.html`]) {
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {}
    }
    return null;
  };

  const send = (req, res, status, body, type, urlPath, extra = {}) => {
    const headers = { "content-type": type, "cache-control": "public, max-age=0, must-revalidate", ...extra };
    for (const rule of headerRules) if (rule.match.test(urlPath)) Object.assign(headers, rule.headers);
    if (COMPRESSIBLE.test(type) && body.length > 1024 && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      body = gzipSync(body);
      headers["content-encoding"] = "gzip";
      headers.vary = headers.vary ? `${headers.vary}, Accept-Encoding` : "Accept-Encoding";
    }
    headers["content-length"] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  };

  const serveFile = (req, res, file, urlPath, status = 200) =>
    send(req, res, status, readFileSync(file), TYPES[extname(file).toLowerCase()] || "application/octet-stream", urlPath);

  return createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD" });
      return res.end();
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (urlPath === "/healthz") return send(req, res, 200, Buffer.from("ok"), TYPES[".txt"], urlPath);

    for (const r of redirects) {
      if (r.status >= 300 && r.status < 400 && r.match.test(urlPath)) {
        res.writeHead(r.status, { location: r.to });
        return res.end();
      }
    }

    const explicitMd = urlPath.endsWith(".md");
    if (explicitMd || acceptsMarkdown(req.headers.accept)) {
      const mdFile = fileAt(markdownAssetPath(urlPath));
      const body = mdFile && mdFile.endsWith(".md") ? readFileSync(mdFile) : null;
      if (body && !isHtmlDocument(body.toString("utf8"))) {
        return send(req, res, 200, body, TYPES[".md"], urlPath, {
          "x-robots-tag": "all",
          "cache-control": "public, max-age=300",
          vary: "Accept",
        });
      }
      if (explicitMd) return send(req, res, 404, Buffer.from("Not found"), TYPES[".txt"], urlPath);
    }

    const file = fileAt(urlPath);
    if (file) return serveFile(req, res, file, urlPath);

    for (const r of redirects) {
      if (r.status === 200 && r.match.test(urlPath)) {
        const target = fileAt(r.to);
        if (target) return serveFile(req, res, target, urlPath);
      }
    }
    return send(req, res, 404, Buffer.from("Not found"), TYPES[".txt"], urlPath);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.env.SITE_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "dist");
  const port = Number(process.env.PORT || 8080);
  createSiteServer(root).listen(port, "0.0.0.0", () => console.log(`serving ${root} on :${port}`));
}
