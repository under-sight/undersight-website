// Pure helpers of the <undersight-booking> widget (resources/booking-widget.js).
// The module guards its customElements registration, so Node can import it.
// Run: node --test tests/booking-widget.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupByDay, monthCells, monthRange, addMonths, fmtTime, fmtDayLabel, fmtLong, tzLabel, timeZoneChoices,
} from '../resources/booking-widget.js';

const LA = 'America/Los_Angeles';
const SLOTS = ['2026-09-09T16:00:00.000Z', '2026-09-09T23:30:00.000Z', '2026-09-10T16:00:00.000Z'];

test('groupByDay buckets slot starts by the local day of the chosen zone', () => {
  const la = groupByDay(SLOTS, LA);
  assert.deepEqual([...la.keys()], ['2026-09-09', '2026-09-10']);
  assert.deepEqual(la.get('2026-09-09'), ['2026-09-09T16:00:00.000Z', '2026-09-09T23:30:00.000Z']);
  const tokyo = groupByDay(SLOTS, 'Asia/Tokyo'); // 23:30Z is already the 10th in Tokyo
  assert.deepEqual([...tokyo.keys()], ['2026-09-10', '2026-09-11']);
  assert.equal(tokyo.get('2026-09-10').length, 2);
});

test('monthCells pads the first week and keys every day', () => {
  const cells = monthCells(2026, 9); // September 2026 starts on a Tuesday
  assert.equal(cells.length, 32);
  assert.equal(cells[0], null);
  assert.equal(cells[1], null);
  assert.deepEqual(cells[2], { key: '2026-09-01', day: 1 });
  assert.deepEqual(cells[31], { key: '2026-09-30', day: 30 });
  assert.deepEqual(monthCells(2026, 11)[0], { key: '2026-11-01', day: 1 }); // November starts on a Sunday
});

test('monthRange covers the whole month with a day of slack on each side', () => {
  const r = monthRange(2026, 9);
  assert.ok(Date.parse(r.from) <= Date.parse('2026-09-01T00:00:00Z'));
  assert.ok(Date.parse(r.to) >= Date.parse('2026-10-01T00:00:00Z'));
});

test('addMonths wraps years', () => {
  assert.deepEqual(addMonths({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
  assert.deepEqual(addMonths({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
  assert.deepEqual(addMonths({ year: 2026, month: 9 }, 0), { year: 2026, month: 9 });
});

test('formatting helpers render in the visitor zone', () => {
  assert.equal(fmtTime('2026-09-09T16:00:00.000Z', LA), '9:00 am');
  assert.equal(fmtTime('2026-09-09T16:00:00.000Z', 'America/New_York'), '12:00 pm');
  assert.equal(fmtDayLabel('2026-09-09'), 'Wed, Sep 9');
  assert.equal(fmtLong('2026-09-09T16:00:00.000Z', LA), 'Wednesday, September 9, 2026 at 9:00 am');
  assert.match(tzLabel(LA, '2026-09-09T16:00:00.000Z'), /^(PDT|GMT-7)$/);
  assert.match(tzLabel(LA, '2026-11-04T17:00:00.000Z'), /^(PST|GMT-8)$/);
});

test('timeZoneChoices leads with the visitor zone and never repeats it', () => {
  const c = timeZoneChoices('America/New_York');
  assert.equal(c[0], 'America/New_York');
  assert.equal(new Set(c).size, c.length);
  assert.ok(c.includes('America/Los_Angeles'));
  assert.equal(timeZoneChoices('Europe/Berlin')[0], 'Europe/Berlin');
});
