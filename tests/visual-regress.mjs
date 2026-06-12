#!/usr/bin/env node
// =============================================================================
// undersight.ai Visual Regression Capture
// =============================================================================
//
// Builds the static site (python3 build.py --env dev), serves dist/ on a free
// port, and captures per-section + full-page screenshots across:
//   colorScheme: light | dark
//   viewport:    1440x900 | 390x844
//   motion:      no-preference | reduce   (reduce: 1440x900 only)
//
// Usage:
//   node tests/visual-regress.mjs [outDir]        # default tests/visual-baselines/run-<ts>/
//   SKIP_BUILD=1 node tests/visual-regress.mjs .. # reuse existing dist/
//
// Screenshots use Playwright's { animations: 'disabled' } for determinism
// (infinite animations canceled, finite ones fast-forwarded).
// =============================================================================

import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.resolve(
  ROOT,
  process.argv[2] || path.join('tests', 'visual-baselines', `run-${new Date().toISOString().replace(/[:.]/g, '-')}`)
);

const SECTIONS = [
  '.hero', '.serve-grid', '.stats-bar', '.how-section', '.case-study',
  '.testimonial-section', '.cta-section', 'footer',
];

const CONTEXTS = [];
for (const scheme of ['light', 'dark']) {
  CONTEXTS.push({ scheme, vp: { width: 1440, height: 900 }, motion: 'no-preference' });
  CONTEXTS.push({ scheme, vp: { width: 390, height: 844 }, motion: 'no-preference' });
  CONTEXTS.push({ scheme, vp: { width: 1440, height: 900 }, motion: 'reduce' });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function main() {
  if (!process.env.SKIP_BUILD || !existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.log('[visual-regress] building site: python3 build.py --env dev');
    const build = spawnSync('python3', ['build.py', '--env', 'dev'], { cwd: ROOT, stdio: 'inherit' });
    if (build.status !== 0) throw new Error(`build.py failed with exit ${build.status}`);
  } else {
    console.log('[visual-regress] SKIP_BUILD set — reusing existing dist/');
  }

  const port = await freePort();
  console.log(`[visual-regress] serving dist/ on http://127.0.0.1:${port}`);
  const server = spawn('python3', ['-m', 'http.server', String(port), '-d', 'dist'], {
    cwd: ROOT, stdio: 'ignore',
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let captured = 0, skipped = 0;

  try {
    // Give the server a beat to bind.
    await new Promise((r) => setTimeout(r, 500));

    for (const ctxSpec of CONTEXTS) {
      const label = `${ctxSpec.scheme}-${ctxSpec.vp.width}x${ctxSpec.vp.height}` +
        (ctxSpec.motion === 'reduce' ? '-reduced' : '');
      const context = await browser.newContext({
        viewport: ctxSpec.vp,
        colorScheme: ctxSpec.scheme,
        reducedMotion: ctxSpec.motion,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 30000 });

      // Sweep-scroll to trigger IntersectionObserver reveals, then settle at top.
      await page.evaluate(async () => {
        const step = window.innerHeight / 2;
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(700);

      for (const sel of SECTIONS) {
        const slug = sel.replace(/^\./, '');
        const file = path.join(OUT_DIR, `${label}--${slug}.png`);
        // First *visible* match — the SPA keeps inactive pages and skeleton
        // wrappers in the DOM with display:none.
        const loc = page.locator(`${sel} >> visible=true`).first();
        try {
          if (await loc.count() === 0) { console.log(`  skip (absent)    ${label} ${sel}`); skipped++; continue; }
          await loc.scrollIntoViewIfNeeded();
          await page.waitForTimeout(250);
          await loc.screenshot({ path: file, animations: 'disabled' });
          console.log(`  captured         ${label} ${sel}`);
          captured++;
        } catch (err) {
          console.log(`  skip (error)     ${label} ${sel}: ${String(err).split('\n')[0]}`);
          skipped++;
        }
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      await page.screenshot({
        path: path.join(OUT_DIR, `${label}--full-page.png`),
        fullPage: true,
        animations: 'disabled',
      });
      console.log(`  captured         ${label} full-page`);
      captured++;

      await context.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log(`\n[visual-regress] done: ${captured} captured, ${skipped} skipped -> ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
