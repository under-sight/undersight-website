// Body validation for POST /api/booking/book. Returns either
// { ok: true, value } with a normalised payload or { ok: false, error }.

export const LIMITS = Object.freeze({ name: 120, email: 254, note: 1000, timeZone: 64, bodyBytes: 4096 });

// Same shape as functions/api/whitepaper-lead.js: local part 1-64 chars with no
// leading/trailing dot, domain labels plus a 2+ letter TLD. Consecutive dots
// are rejected separately.
const EMAIL_REGEX = /^(?![.])[A-Za-z0-9._%+\-]{1,64}(?<![.])@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

const fail = (error) => ({ ok: false, error });

function cleanText(v) {
  return typeof v === 'string' ? v.replace(CONTROL_CHARS, ' ').trim() : null;
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length < 5 || email.length > LIMITS.email) return false;
  if (email.includes('..')) return false;
  return EMAIL_REGEX.test(email);
}

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone || timeZone.length > LIMITS.timeZone) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone }); return true; } catch { return false; }
}

export function validateBookingBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_body');
  if (body.website) return fail('spam'); // honeypot: real visitors never see the field

  const name = cleanText(body.name);
  if (!name || name.length > LIMITS.name) return fail('invalid_name');

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return fail('invalid_email');

  let note = '';
  if (body.note !== undefined && body.note !== null) {
    note = cleanText(body.note);
    if (note === null || note.length > LIMITS.note) return fail('invalid_note');
  }

  const startMs = typeof body.start === 'string' && ISO_INSTANT.test(body.start) ? Date.parse(body.start) : NaN;
  if (!Number.isFinite(startMs)) return fail('invalid_start');

  let timeZone;
  if (body.timeZone !== undefined && body.timeZone !== null && body.timeZone !== '') {
    if (!isValidTimeZone(body.timeZone)) return fail('invalid_time_zone');
    timeZone = body.timeZone;
  }

  return { ok: true, value: { name, email, note, start: new Date(startMs).toISOString(), timeZone } };
}
