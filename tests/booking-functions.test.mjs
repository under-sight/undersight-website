// Pages Function handlers for /api/booking/slots and /api/booking/book, with
// Google's token, freeBusy and events endpoints stubbed at globalThis.fetch.
// Run: node --test tests/booking-functions.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as slotsFn from '../functions/api/booking/slots.js';
import * as bookFn from '../functions/api/booking/book.js';
import { resetTokenCache } from '../functions/api/booking/_google.mjs';

const ORIGIN = 'https://undersight.ai';
const ENV = {
  GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'csec', GOOGLE_REFRESH_TOKEN: 'rtok',
  BOOKING_CALENDAR_ID: 'kyle@undersight.ai',
  BOOKING_BUSY_CALENDARS: 'kyle@undersight.ai,kyle.adriany@gmail.com',
  BOOKING_NOW: '2026-09-01T12:00:00Z', // test clock; never set in production
};

class FakeKV {
  constructor() { this.store = new Map(); }
  async get(k) { return this.store.has(k) ? this.store.get(k) : null; }
  async put(k, v) { this.store.set(k, v); }
}

let calls;
let busy;
let insertStatus;
let inserted;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  busy = {};
  insertStatus = 200;
  inserted = null;
  resetTokenCache();
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith('https://oauth2.googleapis.com/token')) {
      return Response.json({ access_token: 'at-1', expires_in: 3599, token_type: 'Bearer' });
    }
    if (u.includes('/calendar/v3/freeBusy')) {
      const body = JSON.parse(init.body);
      const calendars = {};
      for (const item of body.items) calendars[item.id] = { busy: busy[item.id] || [] };
      return Response.json({ kind: 'calendar#freeBusy', calendars });
    }
    if (u.includes('/calendar/v3/calendars/') && u.includes('/events')) {
      inserted = JSON.parse(init.body);
      if (insertStatus !== 200) return new Response('{"error":"boom"}', { status: insertStatus });
      return Response.json({ id: 'evt1', hangoutLink: 'https://meet.google.com/abc-defg-hij', htmlLink: 'https://calendar.google.com/event?eid=1', ...inserted });
    }
    throw new Error('unexpected fetch ' + u);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

function ctx(request, env = ENV) {
  return { request, env, waitUntil() {}, next() {}, params: {}, data: {} };
}
const getSlots = (qs, env) => slotsFn.onRequestGet(ctx(new Request(`${ORIGIN}/api/booking/slots${qs}`, { headers: { Origin: ORIGIN } }), env));
const postBook = (body, env, headers = {}) => bookFn.onRequestPost(ctx(new Request(`${ORIGIN}/api/booking/book`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.7', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}), env));

// ---------------------------------------------------------------- slots ----

test('GET slots returns open starts for the window, in the host zone, uncached', async () => {
  busy['kyle@undersight.ai'] = [{ start: '2026-09-09T17:00:00Z', end: '2026-09-09T18:00:00Z' }];
  const res = await getSlots('?from=2026-09-09T00:00:00Z&to=2026-09-10T08:00:00Z');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const body = await res.json();
  assert.equal(body.timeZone, 'America/Los_Angeles');
  assert.equal(body.durationMinutes, 30);
  assert.equal(body.slots.length, 14);
  assert.equal(body.slots[0], '2026-09-09T16:00:00.000Z');
  assert.ok(!body.slots.includes('2026-09-09T17:30:00.000Z'));
  // token refresh used the refresh-token grant, freeBusy asked about every busy calendar
  const tokenCall = calls.find((c) => c.url.startsWith('https://oauth2.googleapis.com/token'));
  assert.match(String(tokenCall.init.body), /grant_type=refresh_token/);
  assert.match(String(tokenCall.init.body), /refresh_token=rtok/);
  const fb = JSON.parse(calls.find((c) => c.url.includes('freeBusy')).init.body);
  assert.deepEqual(fb.items.map((i) => i.id).sort(), ['kyle.adriany@gmail.com', 'kyle@undersight.ai']);
  assert.equal(calls.find((c) => c.url.includes('freeBusy')).init.headers.Authorization, 'Bearer at-1');
});

test('GET slots rejects bad or oversized ranges', async () => {
  assert.equal((await getSlots('?from=nope&to=2026-09-10T00:00:00Z')).status, 400);
  assert.equal((await getSlots('?from=2026-09-10T00:00:00Z&to=2026-09-09T00:00:00Z')).status, 400);
  assert.equal((await getSlots('?from=2026-09-01T00:00:00Z&to=2026-12-01T00:00:00Z')).status, 400);
  assert.equal(calls.length, 0);
});

test('GET slots defaults the window to now..horizon when no range is given', async () => {
  const res = await getSlots('');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.slots.length > 100);
  assert.equal(body.slots[0], '2026-09-01T16:00:00.000Z'); // Tue Sep 1, 09:00 PDT (now is 05:00 PDT + 4h notice)
});

test('GET slots is 503 when Google credentials are missing and 502 when Google fails', async () => {
  const res = await getSlots('?from=2026-09-09T00:00:00Z&to=2026-09-10T08:00:00Z', { ...ENV, GOOGLE_REFRESH_TOKEN: '' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'booking_not_configured');
  globalThis.fetch = async () => new Response('nope', { status: 500 });
  const res2 = await getSlots('?from=2026-09-09T00:00:00Z&to=2026-09-10T08:00:00Z');
  assert.equal(res2.status, 502);
  assert.equal((await res2.json()).error, 'calendar_unavailable');
});

test('OPTIONS preflight answers with CORS headers and no body', async () => {
  const res = await slotsFn.onRequestOptions(ctx(new Request(`${ORIGIN}/api/booking/slots`, { method: 'OPTIONS', headers: { Origin: ORIGIN } })));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const foreign = await bookFn.onRequestOptions(ctx(new Request(`${ORIGIN}/api/booking/book`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } })));
  assert.equal(foreign.headers.get('Access-Control-Allow-Origin'), null);
});

// ----------------------------------------------------------------- book ----

const GOOD = { name: 'Dana Reyes', email: 'dana@example.com', note: 'One live MCA file', start: '2026-09-09T16:00:00Z', timeZone: 'America/New_York' };

test('POST book re-checks free/busy, inserts a Meet event with the guest, and confirms', async () => {
  const kv = new FakeKV();
  const res = await postBook(GOOD, { ...ENV, RATE_LIMIT_KV: kv });
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json();
  assert.deepEqual(body, {
    ok: true, start: '2026-09-09T16:00:00.000Z', end: '2026-09-09T16:30:00.000Z',
    timeZone: 'America/Los_Angeles', meetLink: 'https://meet.google.com/abc-defg-hij',
  });
  // freeBusy window brackets the slot
  const fb = JSON.parse(calls.find((c) => c.url.includes('freeBusy')).init.body);
  assert.equal(fb.timeMin, '2026-09-09T16:00:00.000Z');
  assert.equal(fb.timeMax, '2026-09-09T16:30:00.000Z');
  // event shape
  const insertCall = calls.find((c) => c.url.includes('/events'));
  assert.ok(insertCall.url.includes('/calendars/kyle%40undersight.ai/events'));
  assert.match(insertCall.url, /conferenceDataVersion=1/);
  assert.match(insertCall.url, /sendUpdates=all/);
  assert.equal(inserted.summary, 'Discovery Call — Dana Reyes');
  assert.deepEqual(inserted.start, { dateTime: '2026-09-09T16:00:00.000Z', timeZone: 'America/Los_Angeles' });
  assert.deepEqual(inserted.end, { dateTime: '2026-09-09T16:30:00.000Z', timeZone: 'America/Los_Angeles' });
  assert.deepEqual(inserted.attendees, [{ email: 'dana@example.com', displayName: 'Dana Reyes' }]);
  assert.equal(inserted.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
  assert.ok(inserted.conferenceData.createRequest.requestId);
  assert.match(inserted.description, /One live MCA file/);
  assert.match(inserted.description, /undersight\.ai\/book/);
  assert.equal(inserted.extendedProperties.private.source, 'undersight-booking');
  // rate limiter counted the accepted booking
  assert.equal(kv.store.get('rl:minute:203.0.113.7'), '1');
});

test('POST book is 409 when the slot filled up between render and submit', async () => {
  busy['kyle@undersight.ai'] = [{ start: '2026-09-09T16:00:00Z', end: '2026-09-09T16:30:00Z' }];
  const res = await postBook(GOOD);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, 'slot_taken');
  assert.equal(inserted, null);
});

test('POST book validates before touching Google', async () => {
  for (const [body, error] of [
    [{ ...GOOD, email: 'nope' }, 'invalid_email'],
    [{ ...GOOD, name: '' }, 'invalid_name'],
    [{ ...GOOD, start: '2026-09-09T16:10:00Z' }, 'invalid_start'], // off-grid
    [{ ...GOOD, start: '2026-09-05T16:00:00Z' }, 'invalid_start'], // Saturday
    [{ ...GOOD, website: 'x' }, 'spam'],
    ['{not json', 'invalid_body'],
  ]) {
    calls = [];
    const res = await postBook(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal((await res.json()).error, error);
    assert.equal(calls.length, 0, 'no Google calls for ' + error);
  }
});

test('POST book refuses oversized bodies and non-JSON content types', async () => {
  const big = await postBook({ ...GOOD, note: 'x'.repeat(5000) });
  assert.equal(big.status, 413);
  const wrong = await postBook(GOOD, ENV, { 'Content-Type': 'text/plain' });
  assert.equal(wrong.status, 415);
});

test('POST book is rate limited per IP once the KV budget is spent', async () => {
  const kv = new FakeKV();
  kv.store.set('rl:minute:203.0.113.7', '5');
  const res = await postBook(GOOD, { ...ENV, RATE_LIMIT_KV: kv });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '60');
  assert.equal(inserted, null);
});

test('POST book surfaces Google failures as 502 and missing config as 503', async () => {
  insertStatus = 500;
  const res = await postBook(GOOD);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'calendar_unavailable');
  const res2 = await postBook(GOOD, { ...ENV, GOOGLE_CLIENT_ID: undefined });
  assert.equal(res2.status, 503);
});
