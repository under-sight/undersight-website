#!/usr/bin/env node
// =============================================================================
// Rate-limit unit/integration tests for functions/api/whitepaper-lead.js
// =============================================================================
// Run: node tests/test-whitepaper-rate-limit.mjs
//
// Root cause this guards against (see /Users/kyle/Documents/queue/ report for
// the full write-up): the old handler called the KV rate limiter as the very
// first thing in onRequestPost — before Content-Type/size checks, JSON
// parsing, email validation, and the whitepaper allowlist check. That meant
// a typo'd email, an unknown-asset probe, or a bad Turnstile token silently
// burned the same 3-per-60s budget a legitimate retry needed, so a first-time
// UAT user correcting a mistake could trip 429 without ever completing a
// valid submission. The fix moves the check to *after* schema validation
// (only ACCEPTED submissions count) and loosens the budget to 5/min, 30/day.
//
// No test framework: uses node:assert + a hand-rolled runner, per the repo's
// bash test-suite.sh pass/fail convention. The Pages Function file has no
// package.json declaring it ESM (Cloudflare always treats functions/ as ESM
// regardless), so plain `import` of a bare .js here would hit Node's
// CommonJS default and throw on the `export` keyword. We sidestep that by
// reading the source and importing it as a data: URL — no repo files touched,
// no framework installed.
// =============================================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(__dirname, '..', 'functions', 'api', 'whitepaper-lead.js');

async function loadModule() {
  const src = fs.readFileSync(SOURCE_PATH, 'utf8');
  const dataUrl = `data:text/javascript;base64,${Buffer.from(src, 'utf8').toString('base64')}`;
  return import(dataUrl);
}

// ---- Mock Workers KV (get/put with expirationTtl, driven by a fake clock) --
class MockKV {
  constructor() {
    this.store = new Map(); // key -> { value, expiresAt }
    this.now = 0; // ms
  }
  advanceSeconds(seconds) {
    this.now += seconds * 1000;
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.now >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  async put(key, value, opts = {}) {
    const ttlMs = (opts.expirationTtl || 0) * 1000;
    this.store.set(key, { value, expiresAt: this.now + ttlMs });
  }
}

// ---- Mock Request (only the surface whitepaper-lead.js touches) ----------
function makeRequest({ ip = '203.0.113.1', origin = 'https://undersight.ai', body, contentType = 'application/json' } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const headerMap = new Map([
    ['CF-Connecting-IP', ip],
    ['Origin', origin],
    ['Content-Type', contentType],
    ['Content-Length', String(Buffer.byteLength(text, 'utf8'))],
  ]);
  return {
    headers: { get: (name) => headerMap.get(name) ?? null },
    text: async () => text,
  };
}

// ---- Mock fetch for the downstream Fibery calls a schema-valid, accepted --
// submission triggers (suppression check, blog lookup, lead create). Only
// installed for tests that need a request to actually complete end-to-end.
function installFetchStub({ blogFound = true, suppressed = false } = {}) {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const parsed = JSON.parse(init.body)[0];
    if (parsed.command === 'fibery.entity/query') {
      const from = parsed.args.query['q/from'];
      if (from.endsWith('/Website Leads')) {
        return { ok: true, json: async () => [{ result: suppressed ? [{ 'fibery/id': 'lead-1' }] : [] }] };
      }
      if (from.endsWith('/Blog')) {
        return { ok: true, json: async () => [{ result: blogFound ? [{ 'fibery/id': 'blog-1' }] : [] }] };
      }
    }
    if (parsed.command === 'fibery.entity/create') {
      return { ok: true, json: async () => ({}), text: async () => '' };
    }
    return { ok: false, status: 500, text: async () => '' };
  };
  return () => { globalThis.fetch = original; };
}

const KNOWN_WHITEPAPER = 'Chat Advance Case Study';
function validBody(overrides = {}) {
  return { email: 'uat-tester@example.com', whitepaper: KNOWN_WHITEPAPER, ...overrides };
}

// ---- Tiny test runner ------------------------------------------------------
const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

const mod = await loadModule();
const {
  onRequestPost,
  onRequestOptions,
  checkRateLimit,
  RATE_LIMIT_MINUTE,
  RATE_LIMIT_MINUTE_WINDOW,
  RATE_LIMIT_DAY,
  RATE_LIMIT_DAY_WINDOW,
} = mod;

console.log('functions/api/whitepaper-lead.js — rate limit tests\n');

// ---------------------------------------------------------------------------
await test('per-IP isolation: two IPs do not share a bucket', async () => {
  const kv = new MockKV();
  for (let i = 0; i < RATE_LIMIT_MINUTE; i++) {
    const r = await checkRateLimit(kv, 'ip-a');
    assert.equal(r.ok, true, `ip-a request ${i + 1} should be allowed`);
  }
  const ipABlocked = await checkRateLimit(kv, 'ip-a');
  assert.equal(ipABlocked.ok, false, 'ip-a should be blocked after exhausting its budget');

  // ip-b has never made a request — must be fully independent of ip-a's usage.
  const ipBFirst = await checkRateLimit(kv, 'ip-b');
  assert.equal(ipBFirst.ok, true, 'ip-b should be unaffected by ip-a exhausting its bucket');
});

// ---------------------------------------------------------------------------
await test('minute threshold: exactly RATE_LIMIT_MINUTE allowed, next blocked with scope=minute', async () => {
  const kv = new MockKV();
  const ip = 'threshold-minute';
  for (let i = 0; i < RATE_LIMIT_MINUTE; i++) {
    const r = await checkRateLimit(kv, ip);
    assert.equal(r.ok, true, `request ${i + 1}/${RATE_LIMIT_MINUTE} should be allowed`);
  }
  const blocked = await checkRateLimit(kv, ip);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.scope, 'minute');
  assert.equal(blocked.retryAfter, RATE_LIMIT_MINUTE_WINDOW);
});

// ---------------------------------------------------------------------------
await test('day threshold: blocked with scope=day once the day bucket is full', async () => {
  const kv = new MockKV();
  const ip = 'threshold-day';
  // Seed the day counter directly at the cap; leave the minute bucket empty
  // so the day-specific branch is what trips (minute check runs first).
  await kv.put(`rl:day:${ip}`, String(RATE_LIMIT_DAY), { expirationTtl: RATE_LIMIT_DAY_WINDOW });
  const blocked = await checkRateLimit(kv, ip);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.scope, 'day');
  assert.equal(blocked.retryAfter, RATE_LIMIT_DAY_WINDOW);
});

// ---------------------------------------------------------------------------
await test('window expiry: minute bucket resets once the TTL elapses', async () => {
  const kv = new MockKV();
  const ip = 'expiry-ip';
  for (let i = 0; i < RATE_LIMIT_MINUTE; i++) {
    await checkRateLimit(kv, ip);
  }
  const blocked = await checkRateLimit(kv, ip);
  assert.equal(blocked.ok, false, 'should be blocked immediately after exhausting budget');

  kv.advanceSeconds(RATE_LIMIT_MINUTE_WINDOW); // simulate the full window elapsing
  const afterExpiry = await checkRateLimit(kv, ip);
  assert.equal(afterExpiry.ok, true, 'bucket must reset once the window has elapsed — not a fixed window that never resets');
});

// ---------------------------------------------------------------------------
await test('KV-missing fallback: rate limiting disabled, no throw', async () => {
  const r = await checkRateLimit(undefined, 'any-ip');
  assert.equal(r.ok, true);
});

// ---------------------------------------------------------------------------
await test('CORS preflight never touches the rate limit KV', async () => {
  const kv = new MockKV();
  const env = { FIBERY_TOKEN: 'test-token', RATE_LIMIT_KV: kv };
  for (let i = 0; i < RATE_LIMIT_MINUTE + 5; i++) {
    await onRequestOptions({ request: makeRequest(), env });
  }
  assert.equal(kv.store.size, 0, 'OPTIONS must never write a rate-limit key');
});

// ---------------------------------------------------------------------------
await test('validation failures (invalid email) do not increment the counter', async () => {
  const kv = new MockKV();
  const env = { FIBERY_TOKEN: 'test-token', RATE_LIMIT_KV: kv };
  const ip = 'bad-email-ip';
  for (let i = 0; i < RATE_LIMIT_MINUTE + 3; i++) {
    const resp = await onRequestPost({ request: makeRequest({ ip, body: validBody({ email: 'not-an-email' }) }), env });
    assert.equal(resp.status, 422, `attempt ${i + 1} should be rejected as invalid, not rate-limited`);
  }
  const minuteKey = await kv.get(`rl:minute:${ip}`);
  assert.equal(minuteKey, null, 'invalid-email submissions must never appear in the rate-limit bucket');
});

// ---------------------------------------------------------------------------
await test('validation failures (unknown whitepaper) do not increment the counter', async () => {
  const kv = new MockKV();
  const env = { FIBERY_TOKEN: 'test-token', RATE_LIMIT_KV: kv };
  const ip = 'unknown-wp-ip';
  for (let i = 0; i < RATE_LIMIT_MINUTE + 3; i++) {
    const resp = await onRequestPost({ request: makeRequest({ ip, body: validBody({ whitepaper: 'Not A Real Asset' }) }), env });
    assert.equal(resp.status, 422);
  }
  const minuteKey = await kv.get(`rl:minute:${ip}`);
  assert.equal(minuteKey, null, 'unknown-whitepaper probes must never appear in the rate-limit bucket');
});

// ---------------------------------------------------------------------------
await test('accepted (schema-valid) submissions DO increment the counter', async () => {
  const kv = new MockKV();
  const env = { FIBERY_TOKEN: 'test-token', RATE_LIMIT_KV: kv };
  const ip = 'accepted-ip';
  const restoreFetch = installFetchStub();
  try {
    const resp = await onRequestPost({ request: makeRequest({ ip, body: validBody() }), env });
    assert.equal(resp.status, 200);
  } finally {
    restoreFetch();
  }
  const minuteKey = await kv.get(`rl:minute:${ip}`);
  assert.equal(minuteKey, '1', 'a fully accepted submission must increment the minute bucket');
});

// ---------------------------------------------------------------------------
await test('429 response body shape includes retryAfter, header mirrors it', async () => {
  const kv = new MockKV();
  const env = { FIBERY_TOKEN: 'test-token', RATE_LIMIT_KV: kv };
  const ip = 'tripped-ip';
  const restoreFetch = installFetchStub();
  try {
    for (let i = 0; i < RATE_LIMIT_MINUTE; i++) {
      const resp = await onRequestPost({ request: makeRequest({ ip, body: validBody() }), env });
      assert.equal(resp.status, 200, `accepted submission ${i + 1}/${RATE_LIMIT_MINUTE} should succeed`);
    }
    const tripped = await onRequestPost({ request: makeRequest({ ip, body: validBody() }), env });
    assert.equal(tripped.status, 429);
    assert.equal(tripped.headers.get('Retry-After'), String(RATE_LIMIT_MINUTE_WINDOW));
    const payload = await tripped.json();
    assert.equal(payload.error, 'Too many requests');
    assert.equal(payload.retryAfter, RATE_LIMIT_MINUTE_WINDOW);
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log(`${failed.length} FAILED:`);
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
