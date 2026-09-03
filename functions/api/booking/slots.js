/**
 * Cloudflare Pages Function — open booking slots
 *
 * Route: GET /api/booking/slots?from=<ISO>&to=<ISO>
 * Returns { timeZone, durationMinutes, slots: [ISO start, ...] } for the
 * window (default: now → booking horizon; max 62 days). Availability is the
 * host's working hours (functions/api/booking/_slots.mjs) minus Google
 * Calendar free/busy across BOOKING_BUSY_CALENDARS.
 *
 * Environment (Cloudflare Pages → Settings → Environment variables):
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN — secrets
 *   BOOKING_CALENDAR_ID      — calendar that owns the events (default: primary)
 *   BOOKING_BUSY_CALENDARS   — comma-separated extra calendars to treat as busy
 *   BOOKING_*                — optional rule overrides, see rulesFromEnv()
 */
import { generateSlots, rulesFromEnv } from './_slots.mjs';
import { googleConfigured, getAccessToken, queryFreeBusy } from './_google.mjs';
import { json, preflight, nowFromEnv, busyCalendars } from './_http.mjs';

export const MAX_RANGE_DAYS = 62;
const METHODS = 'GET, OPTIONS';

export async function onRequestOptions({ request }) {
  return preflight(request, METHODS);
}

export async function onRequestGet({ request, env }) {
  const rules = rulesFromEnv(env);
  const now = nowFromEnv(env);
  const url = new URL(request.url);
  const fromRaw = url.searchParams.get('from');
  const toRaw = url.searchParams.get('to');
  const from = fromRaw ? Date.parse(fromRaw) : now.getTime();
  const to = toRaw ? Date.parse(toRaw) : now.getTime() + rules.horizonDays * 86400000;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > MAX_RANGE_DAYS * 86400000) {
    return json({ error: 'invalid_range' }, 400, request, { methods: METHODS });
  }
  if (!googleConfigured(env)) {
    return json({ error: 'booking_not_configured' }, 503, request, { methods: METHODS });
  }
  try {
    const token = await getAccessToken(env, now.getTime());
    const busy = await queryFreeBusy({
      token,
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      calendarIds: busyCalendars(env),
    });
    const slots = generateSlots({ from, to, now, busy, rules });
    return json(
      { timeZone: rules.timeZone, durationMinutes: rules.durationMinutes, slots: slots.map((s) => s.start) },
      200, request, { methods: METHODS, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('booking slots failed:', err && err.message, err && err.detail);
    return json({ error: 'calendar_unavailable' }, 502, request, { methods: METHODS });
  }
}
