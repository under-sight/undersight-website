// Thin Google Calendar client for the booking Functions. Uses the global
// fetch (Workers runtime) so tests can stub it. Credentials come from the
// Pages environment: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
// (an OAuth "authorized user" refresh token for the host's Google Workspace
// account, scoped to calendar + calendar.events).

import { mergeBusy } from './_slots.mjs';

export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

let tokenCache = { token: null, expiresAt: 0 };

export function resetTokenCache() {
  tokenCache = { token: null, expiresAt: 0 };
}

export function googleConfigured(env) {
  return Boolean(env && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}

export class GoogleError extends Error {
  constructor(stage, status, detail) {
    super(`google ${stage} failed: ${status}`);
    this.name = 'GoogleError';
    this.stage = stage;
    this.status = status;
    this.detail = detail;
  }
}

async function bodyText(res) {
  try { return (await res.text()).slice(0, 500); } catch { return ''; }
}

/** Access token via the refresh-token grant, cached per isolate until a minute before expiry. */
export async function getAccessToken(env, now = Date.now()) {
  if (tokenCache.token && tokenCache.expiresAt - 60000 > now) return tokenCache.token;
  const form = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw new GoogleError('token', res.status, await bodyText(res));
  const data = await res.json();
  if (!data.access_token) throw new GoogleError('token', res.status, 'no access_token in response');
  tokenCache = { token: data.access_token, expiresAt: now + (Number(data.expires_in) || 3600) * 1000 };
  return tokenCache.token;
}

/** Busy intervals (ms) across `calendarIds` between two ISO instants. */
export async function queryFreeBusy({ token, timeMin, timeMax, calendarIds }) {
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin, timeMax, timeZone: 'UTC', items: calendarIds.map((id) => ({ id })) }),
  });
  if (!res.ok) throw new GoogleError('freeBusy', res.status, await bodyText(res));
  const data = await res.json();
  return mergeBusy(data.calendars);
}

/** Create the event on `calendarId`, minting a Meet link and emailing the guest. */
export async function insertEvent({ token, calendarId, event, sendUpdates = 'all' }) {
  const url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=${encodeURIComponent(sendUpdates)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new GoogleError('insert', res.status, await bodyText(res));
  return res.json();
}

/** The Calendar event body for a confirmed booking. */
export function buildEvent({ name, email, note, start, end, timeZone, requestId, guestTimeZone, title = 'Discovery Call' }) {
  const lines = ['Booked via undersight.ai/book', '', `Guest: ${name} <${email}>`];
  if (note) lines.push('', `What we're looking at: ${note}`);
  return {
    summary: `${title} — ${name}`,
    description: lines.join('\n'),
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
    attendees: [{ email, displayName: name }],
    conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    guestsCanModify: false,
    guestsCanInviteOthers: false,
    reminders: { useDefault: true },
    extendedProperties: { private: { source: 'undersight-booking', guestTimeZone: guestTimeZone || '' } },
  };
}
