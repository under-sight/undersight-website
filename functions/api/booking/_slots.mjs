// Slot engine for the booking API. Pure: no network, no clock of its own.
// Every instant is a UTC ms number or ISO string; every "local" value is
// expressed in the host's IANA zone through Intl, so DST is handled by the
// runtime rather than by hand-rolled offset tables.

export const DEFAULT_RULES = Object.freeze({
  timeZone: 'America/Los_Angeles',
  weekdays: Object.freeze([1, 2, 3, 4, 5]), // Mon–Fri, getDay() numbering
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 17 * 60,
  durationMinutes: 30,
  stepMinutes: 30,
  minNoticeMinutes: 4 * 60,
  horizonDays: 45,
  bufferMinutes: 0,
});

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map();

function formatter(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try { formatter(timeZone); return true; } catch { return false; }
}

const toMs = (v) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v));
const pad2 = (n) => String(n).padStart(2, '0');

/** Calendar parts of a UTC instant as seen in `timeZone`. */
export function utcToZoned(date, timeZone) {
  const parts = {};
  for (const p of formatter(timeZone).formatToParts(date)) parts[p.type] = p.value;
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour, minute, second: Number(parts.second), minutes: hour * 60 + minute,
    weekday: WEEKDAY_INDEX[parts.weekday],
  };
}

/** Minutes east of UTC for `timeZone` at the given instant (PDT = -420). */
export function tzOffsetMinutes(date, timeZone) {
  const z = utcToZoned(date, timeZone);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** The UTC instant of a wall-clock time (`minutes` after local midnight) on a local date. */
export function zonedToUtc({ year, month, day, minutes }, timeZone) {
  const naive = Date.UTC(year, month - 1, day) + minutes * 60000;
  const offset = tzOffsetMinutes(new Date(naive), timeZone);
  let utc = naive - offset * 60000;
  const offsetAtResult = tzOffsetMinutes(new Date(utc), timeZone);
  if (offsetAtResult !== offset) utc = naive - offsetAtResult * 60000; // crossed a DST edge
  return new Date(utc);
}

export function dayKey(date, timeZone) {
  const z = utcToZoned(date, timeZone);
  return `${z.year}-${pad2(z.month)}-${pad2(z.day)}`;
}

/** Local calendar days ({year, month, day}) touched by the half-open window [from, to). */
export function daysBetween(from, to, timeZone) {
  const fromMs = toMs(from);
  const toMsV = toMs(to);
  if (!(fromMs < toMsV)) return [];
  const first = utcToZoned(new Date(fromMs), timeZone);
  const last = utcToZoned(new Date(toMsV - 1), timeZone);
  const out = [];
  let cursor = Date.UTC(first.year, first.month - 1, first.day);
  const end = Date.UTC(last.year, last.month - 1, last.day);
  while (cursor <= end) {
    const d = new Date(cursor);
    out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
    cursor += 86400000;
  }
  return out;
}

/** Flatten Google's freeBusy `calendars` map into sorted {start, end} ms pairs. */
export function mergeBusy(calendars) {
  const out = [];
  for (const cal of Object.values(calendars || {})) {
    for (const b of cal.busy || []) {
      const start = Date.parse(b.start);
      const end = Date.parse(b.end);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) out.push({ start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

function weekdayOf({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Open slots inside [from, to), clipped by the notice window and the horizon,
 * minus anything that collides with `busy` (padded by bufferMinutes).
 */
export function generateSlots({ from, to, now = new Date(), busy = [], rules = DEFAULT_RULES }) {
  const nowMs = toMs(now);
  const windowStart = Math.max(toMs(from), nowMs + rules.minNoticeMinutes * 60000);
  const windowEnd = Math.min(toMs(to), nowMs + rules.horizonDays * 86400000);
  if (!(windowStart < windowEnd)) return [];
  const duration = rules.durationMinutes * 60000;
  const buffer = rules.bufferMinutes * 60000;
  const out = [];
  for (const day of daysBetween(windowStart, windowEnd, rules.timeZone)) {
    if (!rules.weekdays.includes(weekdayOf(day))) continue;
    for (let m = rules.dayStartMinutes; m + rules.durationMinutes <= rules.dayEndMinutes; m += rules.stepMinutes) {
      const start = zonedToUtc({ ...day, minutes: m }, rules.timeZone).getTime();
      if (start < windowStart || start >= windowEnd) continue;
      const end = start + duration;
      if (busy.some((b) => overlaps(start - buffer, end + buffer, b.start, b.end))) continue;
      out.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return out;
}

/** True when `startISO` is a slot the engine itself would have offered (busy state aside). */
export function isValidSlotStart(startISO, { now = new Date(), rules = DEFAULT_RULES } = {}) {
  const ms = typeof startISO === 'string' ? Date.parse(startISO) : NaN;
  if (!Number.isFinite(ms) || ms % 60000 !== 0) return false;
  const nowMs = toMs(now);
  if (ms < nowMs + rules.minNoticeMinutes * 60000) return false;
  if (ms > nowMs + rules.horizonDays * 86400000) return false;
  const z = utcToZoned(new Date(ms), rules.timeZone);
  if (!rules.weekdays.includes(z.weekday)) return false;
  if (z.minutes < rules.dayStartMinutes || z.minutes + rules.durationMinutes > rules.dayEndMinutes) return false;
  return (z.minutes - rules.dayStartMinutes) % rules.stepMinutes === 0;
}

const ENV_NUMBERS = [
  ['BOOKING_DAY_START_MINUTES', 'dayStartMinutes'],
  ['BOOKING_DAY_END_MINUTES', 'dayEndMinutes'],
  ['BOOKING_DURATION_MINUTES', 'durationMinutes'],
  ['BOOKING_STEP_MINUTES', 'stepMinutes'],
  ['BOOKING_MIN_NOTICE_MINUTES', 'minNoticeMinutes'],
  ['BOOKING_HORIZON_DAYS', 'horizonDays'],
  ['BOOKING_BUFFER_MINUTES', 'bufferMinutes'],
];

/** DEFAULT_RULES with any well-formed BOOKING_* overrides from the Pages env. */
export function rulesFromEnv(env = {}) {
  const rules = { ...DEFAULT_RULES };
  if (isValidTimeZone(env.BOOKING_TIME_ZONE)) rules.timeZone = env.BOOKING_TIME_ZONE;
  for (const [key, field] of ENV_NUMBERS) {
    const n = parseInt(env[key], 10);
    if (Number.isFinite(n) && n >= 0) rules[field] = n;
  }
  if (rules.stepMinutes <= 0) rules.stepMinutes = DEFAULT_RULES.stepMinutes;
  if (rules.durationMinutes <= 0) rules.durationMinutes = DEFAULT_RULES.durationMinutes;
  return rules;
}
