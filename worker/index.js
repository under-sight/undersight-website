// DEPRECATED — see functions/api/whitepaper-lead.js for canonical implementation.
// Production `/api/whitepaper-lead` traffic is handled by the Cloudflare Pages
// Function. This standalone Worker is kept in the tree as a safety-net /
// alternative deployment target only; it is NOT deployed by default. If you
// ever revive it (`wrangler deploy` from worker/), keep it in sync with the
// Pages Function — security, validation, rate limit, and Turnstile logic
// must match. Do not delete without explicit user permission.

/**
 * Cloudflare Worker — Whitepaper lead capture relay
 *
 * SAFETY-NET DUPLICATE: production traffic flows through
 * functions/api/whitepaper-lead.js (Cloudflare Pages Function).
 * This worker is preserved as a fallback / standalone deployment option.
 * Keep the two implementations in sync until this is formally retired.
 *
 * Accepts POST { email, whitepaper } from undersight.ai,
 * creates a "Blog Leads" entity in Fibery, and returns JSON.
 *
 * Secrets (set via `wrangler secret put`):
 *   FIBERY_TOKEN — Fibery API token for subscript.fibery.io
 *
 * Environment variables (set in wrangler.toml):
 *   ALLOWED_ORIGIN — e.g. https://undersight.ai
 */

// Allowed CORS origins. Matches functions/api/whitepaper-lead.js.
const ALLOWED_ORIGINS = [
  'https://undersight.ai',
  'https://www.undersight.ai',
  'https://undersight-website.pages.dev',
  'https://dev.undersight-website.pages.dev',
  'http://localhost:8088',
];

// Hardcoded whitelist of asset names. Mirrors functions/api/whitepaper-lead.js.
const KNOWN_WHITEPAPERS = [
  'Chat Advance Case Study',
  'From Deterministic Scorecards to Agentic Credit Assessments',
  'Unlocking Institutional Capital for Mid-Tier MCA Funds',
];

// Input validation constants
const MAX_BODY_BYTES = 4096;
const EMAIL_MIN = 5;
const EMAIL_MAX = 254;
const WHITEPAPER_MIN = 1;
const WHITEPAPER_MAX = 200;
// Strict email regex: local part 1-64 chars (alphanumerics + ._%+-), no leading
// or trailing dot in the local part; domain has at least one label + a 2+ char
// alpha TLD. Consecutive-dot rejection is enforced separately in isValidEmail.
const EMAIL_REGEX = /^(?![.])[A-Za-z0-9._%+\-]{1,64}(?<![.])@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < EMAIL_MIN || trimmed.length > EMAIL_MAX) return false;
  if (/[<>"']/.test(trimmed)) return false;
  if (trimmed.includes('..')) return false;
  return EMAIL_REGEX.test(trimmed);
}

function isValidWhitepaper(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < WHITEPAPER_MIN || trimmed.length > WHITEPAPER_MAX) return false;
  if (/[<>]/.test(trimmed)) return false;
  return true;
}

/**
 * Per-IP rate limit using Workers KV. Returns { ok, retryAfter }.
 * Requires KV binding RATE_LIMIT_KV; no-ops with a warning when missing.
 */
const RATE_LIMIT_MINUTE = 3;
const RATE_LIMIT_MINUTE_WINDOW = 60;
const RATE_LIMIT_DAY = 20;
const RATE_LIMIT_DAY_WINDOW = 86400;

async function rateLimit(env, request) {
  const kv = env.RATE_LIMIT_KV;
  if (!kv) {
    console.warn('RATE_LIMIT_KV binding missing; rate limiting disabled');
    return { ok: true };
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const minuteKey = `rl:minute:${ip}`;
  const dayKey = `rl:day:${ip}`;
  try {
    const [minuteRaw, dayRaw] = await Promise.all([
      kv.get(minuteKey),
      kv.get(dayKey),
    ]);
    const minuteCount = parseInt(minuteRaw || '0', 10);
    const dayCount = parseInt(dayRaw || '0', 10);
    if (minuteCount >= RATE_LIMIT_MINUTE) {
      return { ok: false, retryAfter: RATE_LIMIT_MINUTE_WINDOW };
    }
    if (dayCount >= RATE_LIMIT_DAY) {
      return { ok: false, retryAfter: RATE_LIMIT_DAY_WINDOW };
    }
    await Promise.all([
      kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: RATE_LIMIT_MINUTE_WINDOW }),
      kv.put(dayKey, String(dayCount + 1), { expirationTtl: RATE_LIMIT_DAY_WINDOW }),
    ]);
    return { ok: true };
  } catch (err) {
    console.error('Rate limit KV error:', err);
    return { ok: true };
  }
}

/**
 * Verify a Cloudflare Turnstile token. Returns { ok, skipped }.
 * If CF_TURNSTILE_SECRET_KEY is unset, verification is skipped (deploy-safe).
 */
async function verifyTurnstile(env, request, token) {
  const secret = env.CF_TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('CF_TURNSTILE_SECRET_KEY not set; skipping Turnstile verification');
    return { ok: true, skipped: true };
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, skipped: false };
  }
  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) params.append('remoteip', ip);
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();
    if (data && data.success === true) return { ok: true, skipped: false };
    console.warn('Turnstile verification failed:', data && data['error-codes']);
    return { ok: false, skipped: false };
  } catch (err) {
    console.error('Turnstile verify request failed:', err);
    return { ok: false, skipped: false };
  }
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, request);
    }

    // Per-IP rate limit (no-op when RATE_LIMIT_KV binding is absent)
    const rl = await rateLimit(env, request);
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfter || 60),
          ...corsHeaders(request),
        },
      });
    }

    // Content-Type guard — only accept JSON. Tolerate parameters like
    // `; charset=utf-8`. Reject early to avoid parsing form-encoded or
    // multipart bodies as JSON (defence vs. content-type confusion).
    const rawContentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (rawContentType !== 'application/json') {
      return json({ error: 'Unsupported Media Type' }, 415, request);
    }

    // Body size cap — check Content-Length header first
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413, request);
    }

    let rawText;
    try {
      rawText = await request.text();
    } catch {
      return json({ error: 'Invalid request' }, 400, request);
    }
    if (rawText.length > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413, request);
    }

    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return json({ error: 'Invalid request' }, 400, request);
    }

    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request' }, 422, request);
    }

    const email = (body.email || '').trim();
    if (!isValidEmail(email)) {
      return json({ error: 'Invalid request' }, 422, request);
    }

    const whitepaperName = (body.whitepaper || 'Chat Advance Case Study').trim();
    if (!isValidWhitepaper(whitepaperName)) {
      return json({ error: 'Invalid request' }, 422, request);
    }
    if (!KNOWN_WHITEPAPERS.includes(whitepaperName)) {
      return json({ error: 'Unknown content' }, 422, request);
    }

    // Verify Turnstile (skipped automatically when secret is unset — deploy-safe)
    const turnstileResult = await verifyTurnstile(env, request, body.turnstile_token);
    if (!turnstileResult.ok) {
      return json({ error: 'Verification failed' }, 403, request);
    }

    const fiberyHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${env.FIBERY_TOKEN}`,
    };

    try {
      // 1. Look up the Blog entity by name
      const wpResp = await fetch('https://subscript.fibery.io/api/commands', {
        method: 'POST',
        headers: fiberyHeaders,
        body: JSON.stringify([{
          command: 'fibery.entity/query',
          args: {
            query: {
              'q/from': 'Website/Blog',
              'q/select': ['fibery/id'],
              'q/where': ['=', ['Website/name'], '$name'],
              'q/limit': 1,
            },
            params: { '$name': whitepaperName },
          },
        }]),
      });

      let wpId = null;
      if (wpResp.ok) {
        const wpData = await wpResp.json();
        const matches = wpData[0]?.result || [];
        if (matches.length) wpId = matches[0]['fibery/id'];
      }

      // Reject if the asset name passed the allowlist but no matching Fibery
      // entity exists. Creating an unlinked lead causes the dispatch automation
      // to build a malformed `To` header — fail fast instead of producing an
      // orphan record that will silently break delivery.
      if (!wpId) {
        console.error('Whitepaper not found in Fibery:', whitepaperName);
        return json({ error: 'Whitepaper not found' }, 422, request);
      }

      // 2. Create the lead, linking to the blog post
      const leadEntity = {
        'Website/Email': email,
        'Website/Blog Post': { 'fibery/id': wpId },
      };

      const fiberyResp = await fetch('https://subscript.fibery.io/api/commands', {
        method: 'POST',
        headers: fiberyHeaders,
        body: JSON.stringify([{
          command: 'fibery.entity/create',
          args: { type: 'Website/Blog Leads', entity: leadEntity },
        }]),
      });

      if (!fiberyResp.ok) {
        // Log status + body length only. Fibery error bodies may contain field
        // names, internal IDs, or token-prefix hints — do not write them to
        // the Cloudflare log stream.
        let bodyLen = 0;
        try { bodyLen = (await fiberyResp.text()).length; } catch { /* ignore */ }
        console.error('Fibery API error: status=' + fiberyResp.status + ' body_len=' + bodyLen);
        return json({ error: 'Failed to save' }, 502, request);
      }

      return json({ ok: true }, 200, request);
    } catch (err) {
      // Log only the error name/type, never the message or stack — Fibery
      // client errors can embed URLs and field names.
      console.error('Fibery request failed:', err && err.name ? err.name : 'Error');
      return json({ error: 'Internal error' }, 500, request);
    }
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  // Only echo allowlisted origins. Unknown origins get no CORS header at all
  // (browsers reject the response — exactly what we want).
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  });
}
