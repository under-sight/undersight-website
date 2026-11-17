import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSiteServer } from "../serve.mjs";

let server;
let base;

before(async () => {
  const root = mkdtempSync(join(tmpdir(), "serve-test-"));
  mkdirSync(join(root, "blog", "post-a"), { recursive: true });
  mkdirSync(join(root, "resources"), { recursive: true });
  writeFileSync(join(root, "index.html"), "<!DOCTYPE html><html><body>shell</body></html>");
  writeFileSync(join(root, "index.md"), "# Home");
  writeFileSync(join(root, "underscore.md"), "# underscore");
  writeFileSync(join(root, "blog", "post-a", "index.html"), "<!DOCTYPE html><html>post a</html>");
  writeFileSync(join(root, "resources", "cash-flow-underwriting.html"), "<!DOCTYPE html><html>cfu</html>");
  writeFileSync(join(root, "llms.txt"), "llms");
  writeFileSync(join(root, "app.js"), "x".repeat(4000));
  writeFileSync(
    join(root, "_redirects"),
    [
      "/docs https://documentation.underchat.ai/ 302",
      "/book  https://cal.com/adriany/quick-connect  302",
      "/cash-flow-underwriting  /resources/cash-flow-underwriting.html  200",
      "/*  /index.html  200",
    ].join("\n"),
  );
  writeFileSync(join(root, "_headers"), "# c\n/llms.txt\n  X-Robots-Tag: all\n\n/*.md\n  X-Robots-Tag: all\n");
  server = createSiteServer(root);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const get = (path, headers = {}) => fetch(base + path, { headers, redirect: "manual" });

test("root serves index.html as html", async () => {
  const r = await get("/");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/html/);
  assert.match(await r.text(), /shell/);
});

test("external redirects from _redirects", async () => {
  const docs = await get("/docs");
  assert.equal(docs.status, 302);
  assert.equal(docs.headers.get("location"), "https://documentation.underchat.ai/");
  const book = await get("/book");
  assert.equal(book.status, 302);
  assert.equal(book.headers.get("location"), "https://cal.com/adriany/quick-connect");
});

test("200 rewrite serves the target file", async () => {
  const r = await get("/cash-flow-underwriting");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /cfu/);
});

test("directory path serves its index.html", async () => {
  for (const p of ["/blog/post-a", "/blog/post-a/"]) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.match(await r.text(), /post a/);
  }
});

test("unknown path falls back to the SPA shell", async () => {
  const r = await get("/underchat");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /shell/);
});

test("Accept text/markdown gets the page markdown", async () => {
  const r = await get("/underscore", { Accept: "text/markdown" });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/markdown/);
  assert.equal(r.headers.get("vary"), "Accept");
  assert.equal(await r.text(), "# underscore");
});

test("Accept markdown with no backing file falls back to html", async () => {
  const r = await get("/nothing-here", { Accept: "text/markdown" });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/html/);
});

test("explicit .md url with no file is a 404", async () => {
  const r = await get("/nothing-here.md");
  assert.equal(r.status, 404);
});

test("_headers rules apply", async () => {
  const r = await get("/llms.txt");
  assert.equal(r.headers.get("x-robots-tag"), "all");
  const md = await get("/index.md");
  assert.equal(md.headers.get("x-robots-tag"), "all");
});

test("path traversal stays inside the root", async () => {
  const r = await get("/..%2f..%2fetc%2fpasswd");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /shell/);
});

test("non-GET methods are refused", async () => {
  const r = await fetch(base + "/", { method: "POST" });
  assert.equal(r.status, 405);
});

test("text responses are gzipped when asked", async () => {
  const { request } = await import("node:http");
  const body = await new Promise((resolve, reject) => {
    request(base + "/app.js", { headers: { "Accept-Encoding": "gzip" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ enc: res.headers["content-encoding"], buf: Buffer.concat(chunks) }));
    }).on("error", reject).end();
  });
  assert.equal(body.enc, "gzip");
  assert.equal(gunzipSync(body.buf).toString(), "x".repeat(4000));
});

test("health endpoint answers ok", async () => {
  const r = await get("/healthz");
  assert.equal(r.status, 200);
});
