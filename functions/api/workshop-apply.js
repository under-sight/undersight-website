/**
 * Cloudflare Pages Function — AI Implementation Workshop request
 *
 * Route: POST /api/workshop-apply (form on /workshop, resources/workshop.html)
 *
 * Creates a `GTM/Challenge Submission` entity in subscript.fibery.io with
 * Offer = "funder-workshop", the same row the standalone
 * undersight-ai-funder-workshop.pages.dev page wrote. The Fibery rule
 * "New Challenge Submission -> Email Kyle+Sajit" fires on every row, so
 * never exercise this against Fibery with a real payload; the honeypot
 * (`website`) and a missing-field body both return before any Fibery call.
 *
 * Environment (Cloudflare Pages dashboard → Settings → Environment variables):
 *   FIBERY_TOKEN   — required, same token the whitepaper lead function uses
 *   RATE_LIMIT_KV  — optional; per-IP budget shared with whitepaper-lead, and
 *                    the dead-letter store when Fibery rejects a row
 */

import { checkRateLimit } from './whitepaper-lead.js';

const FIBERY_HOST = 'https://subscript.fibery.io';
const TYPE = 'GTM/Challenge Submission';
const OFFER = 'funder-workshop';
const MAX_BODY_BYTES = 8192;
const EMAIL_REGEX = /^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']+$/;

export const REQUIRED = [
  'company', 'address', 'volume',
  'data_systems', 'basic_counts', 'repayment_history', 'refresh_access',
  'signer_name', 'signer_title', 'signer_email', 'onsite_week',
];

// Every field is a plain single-line string, capped so a hostile body cannot
// stuff a Fibery text field.
const MAX_FIELD = 500;
const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_FIELD) : '');

/** Returns null when the body is acceptable, else { error, missing? }. */
export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'Invalid request' };
  const missing = REQUIRED.filter((k) => !clean(data[k]));
  if (missing.length) return { error: 'Missing fields', missing };
  if (!EMAIL_REGEX.test(clean(data.signer_email))) return { error: 'Invalid email' };
  return null;
}

export function buildEntity(data, now = new Date()) {
  const F = (name) => `GTM/${name}`;
  return {
    'GTM/name': `WORKSHOP: ${clean(data.company)}`.slice(0, 200),
    [F('Signer Name')]: clean(data.signer_name),
    [F('Signer Title')]: clean(data.signer_title),
    [F('Signer Email')]: clean(data.signer_email),
    [F('Signer Phone')]: clean(data.signer_phone),
    [F('Address')]: clean(data.address),
    [F('Volume')]: clean(data.volume),
    [F('Current Vendor')]: clean(data.vendor),
    [F('Data Systems')]: clean(data.data_systems),
    [F('Basic Counts')]: clean(data.basic_counts),
    [F('Repayment History')]: clean(data.repayment_history),
    [F('Refresh Access')]: clean(data.refresh_access),
    [F('Onsite Week')]: clean(data.onsite_week),
    [F('Offer')]: OFFER,
    [F('Received At')]: now.toISOString(),
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.FIBERY_TOKEN) {
    console.error('FIBERY_TOKEN not set');
    return json({ error: 'Server misconfigured' }, 500);
  }
  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') return json({ error: 'Unsupported Media Type' }, 415);

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Payload too large' }, 413);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Honeypot: bots fill the hidden `website` field. Say OK, write nothing.
  if (data && data.website) return json({ ok: true });

  const problem = validate(data);
  if (problem) return json(problem, 422);

  // Only schema-valid submissions spend the per-IP budget (no-op without KV).
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await checkRateLimit(env.RATE_LIMIT_KV, ip);
  if (!rl.ok) {
    return json({ error: 'Too many requests', retryAfter: rl.retryAfter }, 429,
      { 'Retry-After': String(rl.retryAfter || 60) });
  }

  const entity = buildEntity(data);
  try {
    const r = await fetch(`${FIBERY_HOST}/api/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${env.FIBERY_TOKEN}` },
      body: JSON.stringify([{ command: 'fibery.entity/create', args: { type: TYPE, entity } }]),
    });
    const body = await r.json();
    const ok = r.ok && Array.isArray(body) && body[0]?.success !== false;
    if (!ok) throw new Error(`fibery rejected: ${JSON.stringify(body).slice(0, 500)}`);
    return json({ ok: true });
  } catch (err) {
    console.error('Workshop request failed to reach Fibery:', err);
    // Dead-letter to KV when it is bound so the lead survives a CRM hiccup;
    // without KV, tell the browser so the page shows the email fallback.
    if (env.RATE_LIMIT_KV) {
      const key = `deadletter:workshop:${Date.now()}:${crypto.randomUUID()}`;
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({ entity, error: String(err) }));
      return json({ ok: true, queued: true });
    }
    return json({ error: 'Not sent' }, 502);
  }
}
