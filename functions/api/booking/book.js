/**
 * Cloudflare Pages Function — confirm a booking
 *
 * Route: POST /api/booking/book
 * Body:  { name, email, note?, start (ISO), timeZone? (guest's IANA zone), website: '' }
 * Flow:  validate → slot is one the engine offers → per-IP rate limit →
 *        re-check free/busy for the slot → insert a Google Calendar event on
 *        the host calendar with a Meet link, emailing the guest the invite.
 * Reply: 200 { ok, start, end, timeZone, meetLink }
 *        400 { error } invalid input · 409 slot_taken · 413/415 · 429 rate_limited
 *        502 calendar_unavailable · 503 booking_not_configured
 *
 * Environment: see slots.js. RATE_LIMIT_KV (optional) shares the whitepaper
 * lead limiter's budgets.
 * ponytail: Turnstile (CF_TURNSTILE_SECRET_KEY, as in whitepaper-lead.js) is
 * the upgrade path if the honeypot + rate limit stop being enough.
 */
import { rulesFromEnv, isValidSlotStart, overlaps } from './_slots.mjs';
import { validateBookingBody, LIMITS } from './_validate.mjs';
import { googleConfigured, getAccessToken, queryFreeBusy, insertEvent, buildEvent } from './_google.mjs';
import { json, preflight, nowFromEnv, busyCalendars, hostCalendar } from './_http.mjs';
import { checkRateLimit } from '../whitepaper-lead.js';

const METHODS = 'POST, OPTIONS';
const iso = (ms) => new Date(ms).toISOString();

export async function onRequestOptions({ request }) {
  return preflight(request, METHODS);
}

export async function onRequestPost({ request, env }) {
  const reply = (data, status, headers) => json(data, status, request, { methods: METHODS, headers });
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.includes('application/json')) return reply({ error: 'unsupported_media_type' }, 415);

  const raw = await request.text();
  if (raw.length > LIMITS.bodyBytes) return reply({ error: 'payload_too_large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return reply({ error: 'invalid_body' }, 400); }

  const checked = validateBookingBody(body);
  if (!checked.ok) return reply({ error: checked.error }, 400);

  const rules = rulesFromEnv(env);
  const now = nowFromEnv(env);
  const booking = checked.value;
  if (!isValidSlotStart(booking.start, { now, rules })) return reply({ error: 'invalid_start' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const limit = await checkRateLimit(env.RATE_LIMIT_KV, ip);
  if (!limit.ok) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': String(limit.retryAfter) });

  if (!googleConfigured(env)) return reply({ error: 'booking_not_configured' }, 503);

  const startMs = Date.parse(booking.start);
  const endMs = startMs + rules.durationMinutes * 60000;
  const buffer = rules.bufferMinutes * 60000;
  try {
    const token = await getAccessToken(env, now.getTime());
    const busy = await queryFreeBusy({
      token, timeMin: iso(startMs - buffer), timeMax: iso(endMs + buffer), calendarIds: busyCalendars(env),
    });
    if (busy.some((b) => overlaps(startMs - buffer, endMs + buffer, b.start, b.end))) {
      return reply({ error: 'slot_taken' }, 409);
    }
    const event = buildEvent({
      name: booking.name, email: booking.email, note: booking.note,
      start: iso(startMs), end: iso(endMs), timeZone: rules.timeZone,
      guestTimeZone: booking.timeZone, requestId: crypto.randomUUID(),
    });
    const created = await insertEvent({ token, calendarId: hostCalendar(env), event });
    return reply({ ok: true, start: iso(startMs), end: iso(endMs), timeZone: rules.timeZone, meetLink: created.hangoutLink || null }, 200);
  } catch (err) {
    console.error('booking insert failed:', err && err.message, err && err.detail);
    return reply({ error: 'calendar_unavailable' }, 502);
  }
}
