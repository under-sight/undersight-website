#!/usr/bin/env node
// tests/nav-e2e.mjs
//
// Playwright E2E coverage for the SPA client-side router's back/forward
// behavior (index.html navigate()/openPost()/popstate handler).
//
// Regression test for: "click a blog post, press browser Back, the blog
// listing is blank" — root cause was a race between the async page-fade
// wrapper around navigate() (setTimeout(...,150)) and openPost()'s own
// synchronous history.replaceState() call, which clobbered the blog
// listing's history entry with the post's entry. See CLAUDE.md / commit
// history around this file for the fix (navigate() now takes {url, state}
// opts so the final URL is written exactly once, atomically).
//
// Usage:
//   node tests/nav-e2e.mjs                       # against http://localhost:8088
//   BASE=http://localhost:8088 node tests/nav-e2e.mjs
//
// Prereqs:
//   - A dev server must already be running at BASE, e.g.:
//       FIBERY_SPACE="CMS Staging" python3 undersight-serve.py
//   - The `playwright` package (with chromium) must be resolvable. It does
//     not need to be a project devDependency; this script also looks in
//     ~/node_modules and NODE_PATH so a machine-global Playwright install
//     works too.
//
// Exit code 0 = all assertions passed, 1 = at least one failed/crashed.

import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);

function resolvePlaywright() {
  try {
    return require('playwright');
  } catch (firstErr) {
    const extraDirs = [
      path.join(os.homedir(), 'node_modules'),
      ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    ].filter(Boolean);
    for (const dir of extraDirs) {
      try {
        return require(require.resolve('playwright', { paths: [dir] }));
      } catch (_) {
        // try next candidate directory
      }
    }
    console.error(
      'Could not resolve the "playwright" package (checked project deps, ' +
      extraDirs.join(', ') + '). Install it with `npm i -D playwright` or ' +
      'make it available on NODE_PATH.'
    );
    throw firstErr;
  }
}

const { chromium } = resolvePlaywright();
const BASE = process.env.BASE || 'http://localhost:8088';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('PASS:', msg);
  } else {
    failures++;
    console.error('FAIL:', msg);
  }
}

async function activePageInfo(page) {
  return page.evaluate(() => {
    const active = document.querySelector('.page.active');
    return {
      path: location.pathname,
      activeId: active ? active.id : null,
      blogCardCount: document.querySelectorAll('.blog-card').length,
      bodyLength: document.body.innerText.trim().length,
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // ---- Flow A: home -> blog (nav click) -> post -> back(blog) -> back(home) ----
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#page-home.active', { timeout: 10000 });
  await page.waitForFunction(() => document.readyState === 'complete');
  // Give the Fibery-backed content fetch time to populate nav + blog grid.
  await page.waitForTimeout(1200);

  await page.click('a[href="/blog"]');
  await page.waitForSelector('#page-blog.active', { timeout: 10000 });
  await page.waitForFunction(() => document.querySelectorAll('.blog-card').length > 0, { timeout: 10000 });

  const firstPostTitle = await page.locator('.blog-card h3').first().innerText();
  await page.locator('.blog-card').first().click();
  await page.waitForSelector('#page-post.active', { timeout: 10000 });
  await page.waitForTimeout(300);

  let info = await activePageInfo(page);
  assert(info.activeId === 'page-post', `post page renders after opening "${firstPostTitle}" (got activeId=${info.activeId})`);

  await page.goBack();
  await page.waitForTimeout(400);
  info = await activePageInfo(page);
  assert(info.activeId === 'page-blog', `BUG1: back from post shows the blog listing (got activeId=${info.activeId}, path=${info.path})`);
  assert(info.blogCardCount > 0, `BUG1: blog listing is non-empty after back (got ${info.blogCardCount} cards)`);

  await page.goBack();
  await page.waitForTimeout(400);
  info = await activePageInfo(page);
  assert(info.activeId === 'page-home', `BUG1: back from blog listing shows home (got activeId=${info.activeId}, path=${info.path})`);

  // ---- Flow B: direct /blog/<slug> deep link -> back ----
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.click('a[href="/blog"]');
  await page.waitForFunction(() => document.querySelectorAll('.blog-card').length > 0, { timeout: 10000 });
  const slug = await page.evaluate(() => Object.keys(window._blogPostsBySlug || {})[0] || null);
  assert(!!slug, 'found a real blog post slug to deep-link to');

  if (slug) {
    await page.goto(BASE + '/blog/' + slug, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#page-post.active', { timeout: 10000 });
    await page.waitForTimeout(300);
    info = await activePageInfo(page);
    assert(info.activeId === 'page-post', `direct deep link /blog/${slug} opens the post (got activeId=${info.activeId})`);

    await page.goBack();
    await page.waitForTimeout(400);
    info = await activePageInfo(page);
    // There is no prior in-app history before a fresh deep link, so Back
    // may legitimately leave the SPA entirely (browser default). If it
    // stays on the site, it must never land on a truly blank page (no
    // active .page section and no visible text).
    const stillOnSite = info.path.startsWith('/');
    assert(
      !stillOnSite || (info.activeId !== null && info.bodyLength > 0),
      `deep-link back never shows a blank page (stillOnSite=${stillOnSite}, activeId=${info.activeId}, bodyLength=${info.bodyLength})`
    );
  }

  // The lead-capture Turnstile mount (#wpTurnstile) is rendered explicitly on
  // modal open and must never be auto-scanned at page load (no cf-turnstile
  // class, no empty data-sitekey — see index.html). A load-time TurnstileError
  // is therefore a real regression now and is NOT filtered out.
  const routingErrors = pageErrors;
  assert(routingErrors.length === 0, `no uncaught page errors during navigation${routingErrors.length ? ': ' + routingErrors.join(' | ') : ''}`);

  await browser.close();

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('nav-e2e crashed:', err);
  process.exit(1);
});
