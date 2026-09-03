// Slot engine for /api/booking — pure functions, no network.
// Run: node --test tests/booking-slots.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RULES, tzOffsetMinutes, zonedToUtc, utcToZoned, dayKey, daysBetween,
  mergeBusy, overlaps, generateSlots, isValidSlotStart, rulesFromEnv,
} from '../functions/api/booking/_slots.mjs';

const TZ = 'America/Los_Angeles';
const NOW = new Date('2026-09-01T12:00:00Z'); // 5am PDT, well before every window below
const starts = (slots) => slots.map((s) => s.start);

test('tzOffsetMinutes follows DST: PDT is -420, PST is -480', () => {
  assert.equal(tzOffsetMinutes(new Date('2026-09-09T16:00:00Z'), TZ), -420);
  assert.equal(tzOffsetMinutes(new Date('2026-11-04T17:00:00Z'), TZ), -480);
});

test('zonedToUtc maps 09:00 local to the right instant on both sides of DST', () => {
  assert.equal(zonedToUtc({ year: 2026, month: 9, day: 9, minutes: 540 }, TZ).toISOString(), '2026-09-09T16:00:00.000Z');
  assert.equal(zonedToUtc({ year: 2026, month: 11, day: 4, minutes: 540 }, TZ).toISOString(), '2026-11-04T17:00:00.000Z');
  // Friday before and Monday after the March 2026 spring-forward
  assert.equal(zonedToUtc({ year: 2026, month: 3, day: 6, minutes: 540 }, TZ).toISOString(), '2026-03-06T17:00:00.000Z');
  assert.equal(zonedToUtc({ year: 2026, month: 3, day: 9, minutes: 540 }, TZ).toISOString(), '2026-03-09T16:00:00.000Z');
});

test('utcToZoned and dayKey read local calendar parts', () => {
  const z = utcToZoned(new Date('2026-09-10T02:30:00Z'), TZ); // 19:30 PDT on Sep 9
  assert.deepEqual({ year: z.year, month: z.month, day: z.day, minutes: z.minutes, weekday: z.weekday },
    { year: 2026, month: 9, day: 9, minutes: 19 * 60 + 30, weekday: 3 });
  assert.equal(dayKey(new Date('2026-09-10T02:30:00Z'), TZ), '2026-09-09');
});

test('daysBetween lists the local days touched by a window', () => {
  const days = daysBetween(new Date('2026-09-09T20:00:00Z'), new Date('2026-09-11T03:00:00Z'), TZ);
  assert.deepEqual(days.map((d) => `${d.year}-${d.month}-${d.day}`), ['2026-9-9', '2026-9-10']);
});

test('mergeBusy flattens a Google freeBusy response and skips errored calendars', () => {
  const busy = mergeBusy({
    'b@x': { busy: [{ start: '2026-09-09T18:00:00Z', end: '2026-09-09T19:00:00Z' }] },
    'a@x': { busy: [{ start: '2026-09-09T17:00:00Z', end: '2026-09-09T17:30:00Z' }] },
    'c@x': { errors: [{ domain: 'global', reason: 'notFound' }] },
  });
  assert.deepEqual(busy, [
    { start: Date.parse('2026-09-09T17:00:00Z'), end: Date.parse('2026-09-09T17:30:00Z') },
    { start: Date.parse('2026-09-09T18:00:00Z'), end: Date.parse('2026-09-09T19:00:00Z') },
  ]);
});

test('overlaps is strict: touching intervals do not overlap', () => {
  assert.equal(overlaps(0, 10, 10, 20), false);
  assert.equal(overlaps(0, 10, 9, 20), true);
  assert.equal(overlaps(5, 6, 0, 10), true);
});

test('a weekday yields sixteen 30-minute slots from 09:00 to 16:30 Pacific', () => {
  const slots = generateSlots({ from: '2026-09-09T00:00:00Z', to: '2026-09-10T08:00:00Z', now: NOW });
  assert.equal(slots.length, 16);
  assert.equal(slots[0].start, '2026-09-09T16:00:00.000Z');
  assert.equal(slots[0].end, '2026-09-09T16:30:00.000Z');
  assert.equal(slots[15].start, '2026-09-09T23:30:00.000Z');
  assert.equal(slots[15].end, '2026-09-10T00:00:00.000Z');
});

test('the same weekday after DST ends shifts an hour later in UTC', () => {
  // window = the local day Nov 4 (00:00–24:00 PST); UTC-midnight windows would catch the previous day's 16:00/16:30 PST slots
  const slots = generateSlots({ from: '2026-11-04T08:00:00Z', to: '2026-11-05T08:00:00Z', now: new Date('2026-10-20T12:00:00Z') });
  assert.equal(slots.length, 16);
  assert.equal(slots[0].start, '2026-11-04T17:00:00.000Z');
  assert.equal(slots[15].start, '2026-11-05T00:30:00.000Z');
});

test('weekends produce no slots', () => {
  const slots = generateSlots({ from: '2026-09-05T00:00:00Z', to: '2026-09-07T08:00:00Z', now: NOW });
  assert.deepEqual(slots, []);
});

test('busy blocks remove overlapping slots only', () => {
  const day = { from: '2026-09-09T00:00:00Z', to: '2026-09-10T08:00:00Z', now: NOW };
  const full = generateSlots({ ...day, busy: [{ start: Date.parse('2026-09-09T17:00:00Z'), end: Date.parse('2026-09-09T18:00:00Z') }] });
  assert.equal(full.length, 14);
  assert.ok(!starts(full).includes('2026-09-09T17:00:00.000Z'));
  assert.ok(!starts(full).includes('2026-09-09T17:30:00.000Z'));
  const partial = generateSlots({ ...day, busy: [{ start: Date.parse('2026-09-09T17:15:00Z'), end: Date.parse('2026-09-09T17:20:00Z') }] });
  assert.equal(partial.length, 15);
  assert.ok(!starts(partial).includes('2026-09-09T17:00:00.000Z'));
  const touching = generateSlots({ ...day, busy: [{ start: Date.parse('2026-09-09T17:00:00Z'), end: Date.parse('2026-09-09T17:30:00Z') }] });
  assert.equal(touching.length, 15);
  assert.ok(starts(touching).includes('2026-09-09T16:30:00.000Z'));
});

test('bufferMinutes pads busy blocks on both sides', () => {
  const slots = generateSlots({
    from: '2026-09-09T00:00:00Z', to: '2026-09-10T08:00:00Z', now: NOW,
    busy: [{ start: Date.parse('2026-09-09T17:00:00Z'), end: Date.parse('2026-09-09T18:00:00Z') }],
    rules: { ...DEFAULT_RULES, bufferMinutes: 15 },
  });
  assert.equal(slots.length, 12);
  for (const s of ['2026-09-09T16:30:00.000Z', '2026-09-09T17:00:00.000Z', '2026-09-09T17:30:00.000Z', '2026-09-09T18:00:00.000Z']) {
    assert.ok(!starts(slots).includes(s), `${s} should be padded out`);
  }
});

test('minimum notice hides slots that start too soon', () => {
  const slots = generateSlots({ from: '2026-09-09T00:00:00Z', to: '2026-09-10T08:00:00Z', now: new Date('2026-09-09T15:00:00Z') });
  assert.equal(slots.length, 10);
  assert.equal(slots[0].start, '2026-09-09T19:00:00.000Z');
});

test('nothing past the booking horizon', () => {
  const slots = generateSlots({ from: '2026-10-19T00:00:00Z', to: '2026-10-24T08:00:00Z', now: NOW });
  assert.deepEqual(slots, []);
});

test('custom rules: 45-minute meetings on a 15-minute grid until noon', () => {
  const rules = { ...DEFAULT_RULES, dayEndMinutes: 12 * 60, stepMinutes: 15, durationMinutes: 45 };
  const slots = generateSlots({ from: '2026-09-09T00:00:00Z', to: '2026-09-10T08:00:00Z', now: NOW, rules });
  assert.equal(slots.length, 10);
  assert.equal(slots[9].end, '2026-09-09T19:00:00.000Z');
});

test('isValidSlotStart accepts only grid-aligned, in-hours, future starts', () => {
  const opts = { now: NOW };
  assert.equal(isValidSlotStart('2026-09-09T16:00:00.000Z', opts), true);
  assert.equal(isValidSlotStart('2026-09-09T16:00:00Z', opts), true);
  assert.equal(isValidSlotStart('2026-09-09T23:30:00.000Z', opts), true);
  assert.equal(isValidSlotStart('2026-09-10T00:00:00.000Z', opts), false); // 17:00 PT, past the day end
  assert.equal(isValidSlotStart('2026-09-09T16:10:00.000Z', opts), false); // off-grid
  assert.equal(isValidSlotStart('2026-09-09T15:30:00.000Z', opts), false); // 08:30 PT
  assert.equal(isValidSlotStart('2026-09-05T16:00:00.000Z', opts), false); // Saturday
  assert.equal(isValidSlotStart('2026-08-20T16:00:00.000Z', opts), false); // past
  assert.equal(isValidSlotStart('2026-12-09T17:00:00.000Z', opts), false); // beyond horizon
  assert.equal(isValidSlotStart('not a date', opts), false);
  assert.equal(isValidSlotStart('2026-09-09T16:00:00.000Z', { now: new Date('2026-09-09T13:00:00Z') }), false); // inside the notice window
});

test('rulesFromEnv overrides numeric rules and ignores garbage', () => {
  const rules = rulesFromEnv({
    BOOKING_TIME_ZONE: 'America/New_York', BOOKING_DAY_START_MINUTES: '600', BOOKING_DAY_END_MINUTES: 'nope',
    BOOKING_DURATION_MINUTES: '45', BOOKING_MIN_NOTICE_MINUTES: '60', BOOKING_HORIZON_DAYS: '30', BOOKING_BUFFER_MINUTES: '10',
  });
  assert.equal(rules.timeZone, 'America/New_York');
  assert.equal(rules.dayStartMinutes, 600);
  assert.equal(rules.dayEndMinutes, DEFAULT_RULES.dayEndMinutes);
  assert.equal(rules.durationMinutes, 45);
  assert.equal(rules.minNoticeMinutes, 60);
  assert.equal(rules.horizonDays, 30);
  assert.equal(rules.bufferMinutes, 10);
  assert.deepEqual(rulesFromEnv({}), DEFAULT_RULES);
  assert.deepEqual(rulesFromEnv({ BOOKING_TIME_ZONE: 'Mars/Olympus' }).timeZone, DEFAULT_RULES.timeZone);
});
