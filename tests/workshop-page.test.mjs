// /workshop — the AI Implementation Workshop offer page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const html = readFileSync(join(root, 'resources/workshop.html'), 'utf8');
const redirects = readFileSync(join(root, '_redirects'), 'utf8');
const build = readFileSync(join(root, 'build.py'), 'utf8');
const ENTITY = 'Offer - AI Implementation Workshop';
const slots = [...html.matchAll(/data-cms="([^"]+)"/g)].map((m) => m[1]);
const hrefSlots = [...html.matchAll(/data-cms-href="([^"]+)"/g)].map((m) => m[1]);

test('routes: /workshop serves the resource page ahead of the SPA catch-all', () => {
  const lines = redirects.split('\n');
  const ws = lines.findIndex((l) => /^\/workshop\s+\/resources\/workshop\.html\s+200/.test(l));
  const all = lines.findIndex((l) => /^\/\*\s+/.test(l));
  assert.ok(ws >= 0, '_redirects has /workshop');
  assert.ok(ws < all, '/workshop precedes the catch-all');
});

test('build: the page is baked from the CMS entity and gets agent markdown', () => {
  assert.match(build, /resources", "workshop\.html"/, 'build.py bakes resources/workshop.html');
  assert.match(build, new RegExp(`\\("/workshop",\\s*\\["${ENTITY}"\\]\\)`), 'MD_PAGE_ROUTES has /workshop');
});

test('content-first: no hardcoded copy in a data-cms slot, and the render loop exists', () => {
  for (const m of html.matchAll(/<([a-z0-9]+)[^>]*data-cms="[^"]+"[^>]*>([^<]*)</g)) {
    assert.equal(m[2].trim(), '', `slot ships with hardcoded text: ${m[0].slice(0, 80)}`);
  }
  assert.ok(slots.length >= 38, `expected a slot per copy string, got ${slots.length}`);
  assert.equal(new Set(slots).size, slots.length, 'each slot key appears once');
  assert.match(html, /async function loadContent\(\) \{/, 'loadContent() exists for build.py to bake');
  assert.match(html, /fetch\('\/api\/content'\)/, 'dev server content endpoint');
  assert.match(html, new RegExp(`CMS_ENTITY = '${ENTITY}'`), 'renders the named entity');
  assert.match(html, /<body class="loading">/, 'skeleton state until render');
  assert.ok(!/contact@undersight\.ai/.test(html), 'contact@ bounces; support@ is the advertised address');
});

test('page: noindex, canonical /workshop, site assets, headshot from /images', () => {
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/undersight\.ai\/workshop">/);
  assert.match(html, /href="\/favicon\.svg\?v=2"/);
  assert.match(html, /src="\/images\/sajit\.png"/);
  assert.ok(!/src="sajit\.png"/.test(html), 'no document-relative asset refs');
  assert.match(html, /<link rel="stylesheet" href="\/css\/fonts\.css">/, 'Inter + DM Sans loaded from self-hosted fonts.css');
});

test('booking: the claim card links to cal.com quick-connect, with no form and no backend call', () => {
  const claim = html.slice(html.indexOf('<section id="claim">'), html.indexOf('</section>', html.indexOf('<section id="claim">')));
  assert.ok(claim.length > 0, 'claim section present');
  const cta = claim.match(/<a\b[^>]*>/g) || [];
  assert.equal(cta.length, 1, 'one call to action in the claim card');
  assert.match(cta[0], /href="https:\/\/cal\.com\/adriany\/quick-connect"/);
  assert.match(cta[0], /target="_blank"/);
  assert.match(cta[0], /rel="noopener"/);
  assert.match(cta[0], /data-cms="Form Button"/);
  assert.doesNotMatch(html, /<form\b|<input\b|<select\b|<textarea\b/, 'no form controls');
  assert.doesNotMatch(html, /workshop-apply|calendly|turnstile|\/unsubscribe/i);
  assert.deepEqual([...html.matchAll(/fetch\('([^']+)'/g)].map((m) => m[1]), ['/api/content'], 'only the build-time content fetch');
  for (const gone of ['Form Consent', 'Done Heading', 'Done Body']) {
    assert.ok(!slots.includes(gone), `form-only slot removed: ${gone}`);
  }
  assert.equal((html.match(/>Booked</g) || []).length, 5, 'five booked tiles in the hero strip');
  assert.ok(!/spot left/i.test(html), 'weeks are booked or open, never counted');
  assert.ok((html.match(/<svg/g) || []).length >= 4, 'the process is carried by diagrams');
});

test('cms copy: every slot has a value and the copy holds house style', () => {
  const data = JSON.parse(readFileSync(join(root, 'content/content.json'), 'utf8'));
  const md = (data[ENTITY] || {}).content || '';
  assert.ok(md, `entity "${ENTITY}" missing from content/content.json`);
  const meta = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\*\*(.+?):\*\*\s*(.+)/);
    if (m) meta[m[1].trim()] = m[2].trim();
    else if (line.startsWith('# ')) meta._title = line.replace(/^#+\s*/, '');
  }
  for (const k of [...slots, ...hrefSlots, 'Page Title', 'Meta Description']) {
    assert.ok(meta[k], `CMS entity lacks "${k}"`);
  }
  assert.match(meta['Engineer LinkedIn'], /^https:\/\/www\.linkedin\.com\//);

  const copy = Object.values(meta).join(' ');
  // Kyle's anchors (2026-08-24/25): the workshop, the deliverable, the promise, the audience.
  for (const a of [/AI Implementation Workshop/i, /one week/i, /five days/i, /playbook/i, /Keep the playbook/i,
    /readiness/i, /find and fund better deals/i, /MCA funders and syndicators/i, /\$10M and \$50M/,
    /never lived up to the pitch/i, /no visibility to the goal line/i, /heavy lifting/i, /This is not a sales pitch/]) {
    assert.match(copy, a, `anchor missing: ${a}`);
  }
  assert.ok(!copy.includes('—'), 'no em dashes');
  assert.ok(!/contact@undersight\.ai/.test(copy), 'contact@ bounces; use support@');
  // 'bespoke' stays: Kyle wrote it into the H1 himself.
  for (const w of ['delve', 'robust', 'holistic', 'synergy', 'utilize', 'foster', 'paramount', 'seamlessly',
    'transformative', 'cutting-edge', 'revolutionary', 'empower', 'supercharge', 'game-changer', 'harness the power']) {
    assert.ok(!new RegExp(`\\b${w}`, 'i').test(copy), `banned word: ${w}`);
  }
  assert.ok(!/\bleverage\b/i.test(copy), 'leverage is banned as a verb');
  assert.ok(!/not only .* but also/i.test(copy), 'binary contrast');
  // Prose sentences (headings and the form's question labels are exempt by design).
  const prose = Object.entries(meta).filter(([k]) => !/Heading|Title|Button|Kicker|_title/.test(k)).map(([, v]) => v).join(' ');
  for (const s of prose.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)) {
    assert.ok(!/^(What|When|Where|Which|Who|Why|How)\b/.test(s), `wh- starter: ${s}`);
    assert.ok(!/^(People|Nobody|Everyone|Most \w+)\s+(tend|don't|do not|never|always)/i.test(s), `distant narrator: ${s}`);
  }
  // Register: third person, sparing on bare you/we.
  const pronouns = prose.match(/\b(you|your|we|us|our)\b/gi) || [];
  const teamed = (prose.match(/\b(your|our) team\b/gi) || []).length;
  assert.ok(pronouns.length - teamed <= 6, `too personal: ${pronouns.length - teamed} bare pronouns`);
  const words = copy.split(/\s+/).filter(Boolean).length;
  assert.ok(words < 760, `copy ceiling, got ${words}`);
});
