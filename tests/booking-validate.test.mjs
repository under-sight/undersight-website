// Request validation for POST /api/booking/book.
// Run: node --test tests/booking-validate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBookingBody, LIMITS } from '../functions/api/booking/_validate.mjs';

const good = { name: '  Dana Reyes ', email: 'Dana@Example.com', note: 'One live MCA file', start: '2026-09-09T16:00:00Z', timeZone: 'America/New_York' };

test('a well-formed body is normalised', () => {
  const r = validateBookingBody(good);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    name: 'Dana Reyes', email: 'dana@example.com', note: 'One live MCA file',
    start: '2026-09-09T16:00:00.000Z', timeZone: 'America/New_York',
  });
});

test('note and timeZone are optional', () => {
  const r = validateBookingBody({ name: 'D', email: 'd@x.io', start: '2026-09-09T16:00:00Z' });
  assert.equal(r.ok, true);
  assert.equal(r.value.note, '');
  assert.equal(r.value.timeZone, undefined);
});

test('non-object bodies are rejected', () => {
  for (const body of [null, undefined, 'x', 42, []]) {
    assert.deepEqual(validateBookingBody(body), { ok: false, error: 'invalid_body' });
  }
});

test('the honeypot field rejects bots', () => {
  assert.deepEqual(validateBookingBody({ ...good, website: 'http://spam' }), { ok: false, error: 'spam' });
  assert.equal(validateBookingBody({ ...good, website: '' }).ok, true);
});

test('name must be 1..120 printable characters', () => {
  assert.deepEqual(validateBookingBody({ ...good, name: '   ' }), { ok: false, error: 'invalid_name' });
  assert.deepEqual(validateBookingBody({ ...good, name: 'x'.repeat(LIMITS.name + 1) }), { ok: false, error: 'invalid_name' });
  assert.deepEqual(validateBookingBody({ ...good, name: 7 }), { ok: false, error: 'invalid_name' });
  assert.equal(validateBookingBody({ ...good, name: 'Ann ' }).value.name, 'Ann');
});

test('email is validated strictly and lowercased', () => {
  for (const email of ['nope', 'a@b', 'a..b@x.io', '.a@x.io', 'a@' + 'x'.repeat(250) + '.io']) {
    assert.equal(validateBookingBody({ ...good, email }).ok, false, email);
  }
  assert.equal(validateBookingBody({ ...good, email: 'First.Last+tag@Sub.Example.co' }).value.email, 'first.last+tag@sub.example.co');
});

test('note is capped', () => {
  assert.deepEqual(validateBookingBody({ ...good, note: 'x'.repeat(LIMITS.note + 1) }), { ok: false, error: 'invalid_note' });
  assert.deepEqual(validateBookingBody({ ...good, note: ['a'] }), { ok: false, error: 'invalid_note' });
});

test('start must be an ISO-8601 instant', () => {
  for (const start of ['2026-09-09', 'tomorrow', '2026-13-40T16:00:00Z', 1757433600000, '2026-09-09T16:00:00']) {
    assert.deepEqual(validateBookingBody({ ...good, start }), { ok: false, error: 'invalid_start' }, String(start));
  }
  assert.equal(validateBookingBody({ ...good, start: '2026-09-09T09:00:00-07:00' }).value.start, '2026-09-09T16:00:00.000Z');
});

test('timeZone must be a real IANA zone when present', () => {
  assert.deepEqual(validateBookingBody({ ...good, timeZone: 'Mars/Olympus' }), { ok: false, error: 'invalid_time_zone' });
  assert.deepEqual(validateBookingBody({ ...good, timeZone: 'x'.repeat(LIMITS.timeZone + 1) }), { ok: false, error: 'invalid_time_zone' });
  assert.equal(validateBookingBody({ ...good, timeZone: 'Europe/London' }).value.timeZone, 'Europe/London');
});
