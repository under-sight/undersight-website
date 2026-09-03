// Response helpers shared by the booking Functions.

// Mirrors functions/api/whitepaper-lead.js. Only allowlisted origins get the
// CORS header; unknown origins get none, which the browser treats as denial.
// ponytail: lift both lists into one module when a third endpoint needs it.
export const ALLOWED_ORIGINS = [
  'https://undersight.ai',
  'https://www.undersight.ai',
  'https://undersight-website.pages.dev',
  'https://dev.undersight-website.pages.dev',
  'http://localhost:8088',
  'http://localhost:8788',
];

export function corsHeaders(request, methods) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(data, status, request, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, extra.methods || 'GET, POST, OPTIONS'), ...extra.headers },
  });
}

export function preflight(request, methods) {
  return new Response(null, { status: 204, headers: corsHeaders(request, methods) });
}

/** Wall clock for the request. BOOKING_NOW is a test hook and must stay unset in production. */
export function nowFromEnv(env) {
  const ms = env && env.BOOKING_NOW ? Date.parse(env.BOOKING_NOW) : NaN;
  return Number.isFinite(ms) ? new Date(ms) : new Date();
}

/** Calendars whose busy time blocks a slot: the host calendar plus any BOOKING_BUSY_CALENDARS. */
export function busyCalendars(env) {
  const ids = new Set([hostCalendar(env)]);
  for (const id of String(env.BOOKING_BUSY_CALENDARS || '').split(',')) {
    const t = id.trim();
    if (t) ids.add(t);
  }
  return [...ids];
}

export function hostCalendar(env) {
  return (env && env.BOOKING_CALENDAR_ID) || 'primary';
}
