// /api/workshop-apply — validation, entity shape, and the Fibery round trip
// with fetch stubbed. Nothing here touches the network.
// Run: node --test tests/workshop-apply.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { validate, buildEntity, onRequestPost, REQUIRED } from '../functions/api/workshop-apply.js';

const GOOD = {
  company: 'Acme Capital', address: 'Miami, FL', volume: '50 to 250', vendor: 'Ocrolus',
  data_systems: 'CRM, spreadsheets', basic_counts: 'No', repayment_history: 'Partly, some deals or some systems',
  refresh_access: 'No', signer_name: 'Jo Funder', signer_title: 'COO', signer_email: 'jo@acme.example',
  signer_phone: '305 555 0100', onsite_week: 'Week of Sep 14 (2026)',
};

const realFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify([{ success: true, result: { 'fibery/id': 'x' } }]), { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const post = (body, env = { FIBERY_TOKEN: 't' }, headers = {}) => onRequestPost({
  request: new Request('https://undersight.ai/api/workshop-apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }),
  env,
});

test('validate: every required field must be present and non-blank', () => {
  assert.equal(validate(GOOD), null);
  for (const k of REQUIRED) {
    const r = validate({ ...GOOD, [k]: '  ' });
    assert.deepEqual(r, { error: 'Missing fields', missing: [k] }, k);
  }
  assert.deepEqual(validate(null), { error: 'Invalid request' });
  assert.deepEqual(validate([]), { error: 'Invalid request' });
});

test('validate: signer email must look like an address', () => {
  assert.deepEqual(validate({ ...GOOD, signer_email: 'not-an-email' }), { error: 'Invalid email' });
  assert.deepEqual(validate({ ...GOOD, signer_email: '<jo@acme.example>' }), { error: 'Invalid email' });
});

test('buildEntity: GTM row tagged funder-workshop, optional fields default to empty', () => {
  const now = new Date('2026-09-11T16:00:00Z');
  const e = buildEntity({ ...GOOD, vendor: undefined, signer_phone: undefined }, now);
  assert.equal(e['GTM/name'], 'WORKSHOP: Acme Capital');
  assert.equal(e['GTM/Offer'], 'funder-workshop');
  assert.equal(e['GTM/Received At'], '2026-09-11T16:00:00.000Z');
  assert.equal(e['GTM/Current Vendor'], '');
  assert.equal(e['GTM/Signer Phone'], '');
  assert.equal(e['GTM/Onsite Week'], GOOD.onsite_week);
  assert.equal(e['GTM/Signer Email'], 'jo@acme.example');
  assert.equal(buildEntity({ ...GOOD, company: 'x'.repeat(400) })['GTM/name'].length, 200);
});

test('POST: honeypot returns ok without touching Fibery', async () => {
  const r = await post({ ...GOOD, website: 'http://spam.example' });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 0);
});

test('POST: missing fields -> 422 and no Fibery call', async () => {
  const r = await post({ ...GOOD, company: '' });
  assert.equal(r.status, 422);
  assert.deepEqual(await r.json(), { error: 'Missing fields', missing: ['company'] });
  assert.equal(calls.length, 0);
});

test('POST: wrong content type -> 415, bad JSON -> 400, missing token -> 500', async () => {
  assert.equal((await post(GOOD, { FIBERY_TOKEN: 't' }, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('{nope')).status, 400);
  assert.equal((await post(GOOD, {})).status, 500);
  assert.equal(calls.length, 0);
});

test('POST: a valid request creates one GTM/Challenge Submission', async () => {
  const r = await post(GOOD);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://subscript.fibery.io/api/commands');
  const [cmd] = calls[0].body;
  assert.equal(cmd.command, 'fibery.entity/create');
  assert.equal(cmd.args.type, 'GTM/Challenge Submission');
  assert.equal(cmd.args.entity['GTM/Offer'], 'funder-workshop');
  assert.equal(cmd.args.entity['GTM/Signer Name'], 'Jo Funder');
});

test('POST: Fibery rejection without KV -> 502 so the page shows the email fallback', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify([{ success: false, result: { name: 'bad' } }]), { status: 200 });
  const r = await post(GOOD);
  assert.equal(r.status, 502);
});

test('POST: Fibery rejection with KV -> dead-letter and ok', async () => {
  globalThis.fetch = async () => new Response('down', { status: 503 });
  const store = new Map();
  const kv = { get: async () => null, put: async (k, v) => { store.set(k, v); } };
  const r = await post(GOOD, { FIBERY_TOKEN: 't', RATE_LIMIT_KV: kv });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, queued: true });
  const dead = [...store.keys()].filter((k) => k.startsWith('deadletter:workshop:'));
  assert.equal(dead.length, 1);
  assert.equal(JSON.parse(store.get(dead[0])).entity['GTM/name'], 'WORKSHOP: Acme Capital');
});
