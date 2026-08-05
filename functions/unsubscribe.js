/**
 * Cloudflare Pages Function — Unsubscribe flow
 *
 * Routes: GET  /unsubscribe?e=<email>&t=<token>   → confirm page (no side effects)
 *         POST /unsubscribe (form-encoded or JSON) → mark all leads for the
 *              address Unsubscribed=true + Unsubscribed At, in Fibery.
 *
 * Fibery is the suppression source of truth: /api/whitepaper-lead checks the
 * Unsubscribed flag before creating a lead, so suppressed addresses never
 * trigger the dispatch automation again. The token (generated at lead
 * creation) proves the caller holds the original email — one-click path.
 * Without a valid token the caller has still confirmed via the POST form;
 * suppression is low-harm and CAN-SPAM favors frictionless opt-out, so we
 * honor it either way.
 *
 * POST additionally flags matching rows in the Macy campaign tracker
 * (ChatAdvance feedback-email recipients) — best-effort, never blocks the
 * unsubscribe response. See flagMacyTracker() below.
 *
 * Mirrors undersight-serve.py (dev). Keep both in sync.
 */

const MAX_BODY_BYTES = 4096;

// Macy campaign tracker. DB name verified against the live schema API
// 2026-08-05 (rename Macy Outreach -> Macy Feedback complete). The CRM space
// name is fixed — never derived from FIBERY_SPACE. Default applies in prod
// (FIBERY_SPACE === 'CMS') only; any other space skips the step unless
// MACY_TRACKER_TYPE is set explicitly (tests point it at the
// "CMS Staging/Macy Feedback" fixture). Empty MACY_TRACKER_TYPE disables the
// step everywhere.
const DEFAULT_MACY_TRACKER_TYPE = 'CRM/Macy Feedback';
const MACY_STATUS_UNSUBSCRIBED = 'Unsubscribed';
const EMAIL_MIN = 5;
const EMAIL_MAX = 254;
const EMAIL_REGEX = /^(?![.])[A-Za-z0-9._%+\-]{1,64}(?<![.])@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

const RATE_LIMIT_MINUTE = 3;
const RATE_LIMIT_MINUTE_WINDOW = 60; // seconds

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < EMAIL_MIN || trimmed.length > EMAIL_MAX) return false;
  if (/[<>"']/.test(trimmed)) return false;
  if (trimmed.includes('..')) return false;
  return EMAIL_REGEX.test(trimmed);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${title} — undersight</title>
<style>
:root { color-scheme: light dark; }
body { margin:0; background:#f2f2ef; color:#23262c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif; line-height:1.5; }
.card { max-width:480px; margin:64px auto; background:#fff; border-radius:14px; overflow:hidden; }
.head { background:#23262c; padding:24px 28px; }
.head .brand { font-size:11px; font-weight:600; letter-spacing:.16em; color:#6b9e8c; text-transform:uppercase; }
.body { padding:28px; }
h1 { font-size:20px; margin:0 0 10px; }
p { font-size:14px; color:#3a3f47; margin:0 0 16px; }
.addr { font-weight:600; color:#23262c; }
button { background:#c97a54; color:#fff; border:0; font-size:14px; font-weight:600; padding:12px 30px; border-radius:8px; cursor:pointer; }
.foot { padding:0 28px 24px; font-size:11px; color:#9ba0a6; }
a { color:#6b9e8c; }
@media (prefers-color-scheme: dark) {
body { background:#191b1f; }
.card { background:#23262c; }
h1, .addr { color:#f2f2ef; }
p { color:#c9cdd3; }
.foot { color:#7d838b; }
}
</style>
</head>
<body>
<div class="card">
<div class="head"><span class="brand">undersight</span></div>
<div class="body">${body}</div>
<div class="foot">undersight, 1032 E Brandon Blvd #2048, Brandon, FL 33511 · <a href="https://legal.undersight.ai/privacy">Privacy Policy</a></div>
</div>
</body>
</html>`;
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

async function rateLimit(env, request) {
  const kv = env.RATE_LIMIT_KV;
  if (!kv) {
    console.warn('RATE_LIMIT_KV binding missing; rate limiting disabled');
    return { ok: true };
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rl:unsub:${ip}`;
  try {
    const count = parseInt((await kv.get(key)) || '0', 10);
    if (count >= RATE_LIMIT_MINUTE) return { ok: false, retryAfter: RATE_LIMIT_MINUTE_WINDOW };
    await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_MINUTE_WINDOW });
    return { ok: true };
  } catch (err) {
    console.error('Rate limit KV error:', err);
    return { ok: true };
  }
}

function macyTrackerType(env, fiberySpace) {
  if (env.MACY_TRACKER_TYPE !== undefined) {
    return (env.MACY_TRACKER_TYPE || '').trim() || null;
  }
  return fiberySpace === 'CMS' ? DEFAULT_MACY_TRACKER_TYPE : null;
}

/**
 * Best-effort: mark Macy tracker rows for this email unsubscribed.
 *
 * Returns count updated. NEVER throws — the unsubscribe response must not
 * depend on the tracker DB existing or the update succeeding (Website Leads
 * flagging is the contractual part; this is additive suppression). Fibery
 * reports missing-DB errors as HTTP 200 + success:false, so both layers are
 * checked.
 */
async function flagMacyTracker(env, fiberySpace, email, fiberyHeaders) {
  const tracker = macyTrackerType(env, fiberySpace);
  if (!tracker) return 0;
  try {
    const space = tracker.split('/')[0];
    const queryResp = await fetch('https://subscript.fibery.io/api/commands', {
      method: 'POST',
      headers: fiberyHeaders,
      body: JSON.stringify([{
        command: 'fibery.entity/query',
        args: {
          query: {
            'q/from': tracker,
            'q/select': ['fibery/id'],
            'q/where': ['=', [`${space}/Email`], '$email'],
            'q/limit': 100,
          },
          params: { '$email': email },
        },
      }]),
    });
    if (!queryResp.ok) throw new Error('tracker query status=' + queryResp.status);
    const queryData = await queryResp.json();
    if (queryData[0]?.success === false) throw new Error('tracker query rejected');
    const rows = queryData[0]?.result || [];
    if (!rows.length) return 0;

    // Single-selects need the enum entity ref, not a plain string — resolve
    // the "Unsubscribed" option id by name. Enum type name follows Fibery's
    // convention: "<Space>/Status_<full type name>". If the lookup fails,
    // flag + timestamp alone still suppress; Status is best-effort.
    let statusId = null;
    try {
      const optResp = await fetch('https://subscript.fibery.io/api/commands', {
        method: 'POST',
        headers: fiberyHeaders,
        body: JSON.stringify([{
          command: 'fibery.entity/query',
          args: {
            query: {
              'q/from': `${space}/Status_${tracker}`,
              'q/select': ['fibery/id'],
              'q/where': ['=', ['enum/name'], '$name'],
              'q/limit': 1,
            },
            params: { '$name': MACY_STATUS_UNSUBSCRIBED },
          },
        }]),
      });
      if (optResp.ok) {
        const optData = await optResp.json();
        if (optData[0]?.success !== false && optData[0]?.result?.length) {
          statusId = optData[0].result[0]['fibery/id'];
        }
      }
    } catch { /* Status stays best-effort */ }

    const now = new Date().toISOString();
    const commands = rows.map(row => {
      const entity = {
        'fibery/id': row['fibery/id'],
        [`${space}/Unsubscribed`]: true,
        [`${space}/Unsubscribed At`]: now,
      };
      if (statusId) entity[`${space}/Status`] = { 'fibery/id': statusId };
      return { command: 'fibery.entity/update', args: { type: tracker, entity } };
    });
    const updateResp = await fetch('https://subscript.fibery.io/api/commands', {
      method: 'POST',
      headers: fiberyHeaders,
      body: JSON.stringify(commands),
    });
    if (!updateResp.ok) throw new Error('tracker update status=' + updateResp.status);
    const updateData = await updateResp.json();
    if (updateData.some?.(r => r?.success === false)) throw new Error('tracker update rejected');
    return rows.length;
  } catch (err) {
    console.warn('Macy tracker flagging failed (non-blocking):', err && err.message ? err.message : err);
    return 0;
  }
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const email = (url.searchParams.get('e') || '').trim();
  const token = (url.searchParams.get('t') || '').trim();

  if (!isValidEmail(email)) {
    return htmlResponse(page('Invalid link',
      "<h1>Something's missing</h1><p>This unsubscribe link is incomplete or invalid. Use the link from the email you received, or contact <a href='mailto:contact@undersight.ai'>contact@undersight.ai</a>.</p>"
    ), 400);
  }

  const escEmail = escapeHtml(email);
  const escToken = escapeHtml(token);
  // Confirm via POST — GET must stay side-effect-free (mail client prefetchers)
  const body =
    '<h1>Unsubscribe</h1>' +
    `<p>Stop receiving emails at <span class='addr'>${escEmail}</span>?</p>` +
    '<form method="post" action="/unsubscribe">' +
    `<input type="hidden" name="e" value="${escEmail}">` +
    `<input type="hidden" name="t" value="${escToken}">` +
    '<button type="submit">Unsubscribe</button>' +
    '</form>';
  return htmlResponse(page('Unsubscribe', body));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const FIBERY_SPACE = env.FIBERY_SPACE || 'CMS';

  if (!env.FIBERY_TOKEN) {
    console.error('FIBERY_TOKEN not set');
    return htmlResponse(page('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'), 500);
  }

  const rl = await rateLimit(env, request);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter || 60) },
    });
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }

  let rawText;
  try {
    rawText = await request.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }

  const rawContentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  let email = '', token = '';
  if (rawContentType === 'application/json') {
    try {
      const body = JSON.parse(rawText);
      email = ((body && (body.e || body.email)) || '').trim();
      token = ((body && (body.t || body.token)) || '').trim();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } else {
    const params = new URLSearchParams(rawText);
    email = (params.get('e') || '').trim();
    token = (params.get('t') || '').trim();
  }

  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
  }

  const fiberyHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Token ${env.FIBERY_TOKEN}`,
  };

  try {
    // 1. Find every lead for this address
    const queryResp = await fetch('https://subscript.fibery.io/api/commands', {
      method: 'POST',
      headers: fiberyHeaders,
      body: JSON.stringify([{
        command: 'fibery.entity/query',
        args: {
          query: {
            'q/from': `${FIBERY_SPACE}/Website Leads`,
            'q/select': ['fibery/id'],
            'q/where': ['=', [`${FIBERY_SPACE}/Email`], '$email'],
            'q/limit': 100,
          },
          params: { '$email': email },
        },
      }]),
    });
    if (!queryResp.ok) {
      console.error('Fibery query error: status=' + queryResp.status);
      return htmlResponse(page('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'), 502);
    }
    const queryData = await queryResp.json();
    const leads = queryData[0]?.result || [];

    // 2. Mark them all unsubscribed (millisecond precision + Z — Fibery's
    // date-time parser rejects microseconds/offsets)
    if (leads.length) {
      const now = new Date().toISOString();
      const commands = leads.map(lead => ({
        command: 'fibery.entity/update',
        args: {
          type: `${FIBERY_SPACE}/Website Leads`,
          entity: {
            'fibery/id': lead['fibery/id'],
            [`${FIBERY_SPACE}/Unsubscribed`]: true,
            [`${FIBERY_SPACE}/Unsubscribed At`]: now,
          },
        },
      }));
      const updateResp = await fetch('https://subscript.fibery.io/api/commands', {
        method: 'POST',
        headers: fiberyHeaders,
        body: JSON.stringify(commands),
      });
      if (!updateResp.ok) {
        console.error('Fibery update error: status=' + updateResp.status);
        return htmlResponse(page('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'), 502);
      }
    }

    // 3. Flag Macy campaign tracker rows (ChatAdvance feedback recipients).
    // Best-effort: never throws, never blocks the response.
    await flagMacyTracker(env, FIBERY_SPACE, email, fiberyHeaders);

    // Same confirmation whether or not leads existed — do not leak which
    // addresses are in the database.
    const body =
      "<h1>You're unsubscribed</h1>" +
      `<p><span class='addr'>${escapeHtml(email)}</span> won't receive emails from undersight anymore.</p>` +
      "<p>Unsubscribed by mistake? Just request a download again on <a href='https://undersight.ai'>undersight.ai</a>.</p>";
    return htmlResponse(page('Unsubscribed', body));
  } catch (err) {
    console.error('Fibery request failed:', err && err.name ? err.name : 'Error');
    return htmlResponse(page('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'), 500);
  }
}
