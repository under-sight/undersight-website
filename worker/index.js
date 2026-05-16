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

// Input validation constants
const MAX_BODY_BYTES = 4096;
const EMAIL_MIN = 5;
const EMAIL_MAX = 254;
const WHITEPAPER_MIN = 1;
const WHITEPAPER_MAX = 200;
// Strict email regex: 2+ char TLD, allowed local characters only
const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

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

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env);
    }

    // Body size cap — check Content-Length header first
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413, env);
    }

    let rawText;
    try {
      rawText = await request.text();
    } catch {
      return json({ error: 'Invalid request' }, 400, env);
    }
    if (rawText.length > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413, env);
    }

    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return json({ error: 'Invalid request' }, 400, env);
    }

    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request' }, 422, env);
    }

    const email = (body.email || '').trim();
    if (!isValidEmail(email)) {
      return json({ error: 'Invalid request' }, 422, env);
    }

    const whitepaperName = (body.whitepaper || 'Chat Advance Case Study').trim();
    if (!isValidWhitepaper(whitepaperName)) {
      return json({ error: 'Invalid request' }, 422, env);
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

      // 2. Create the lead, linking to the blog post if found
      const leadEntity = {
        'Website/Email': email,
      };
      if (wpId) leadEntity['Website/Blog Post'] = { 'fibery/id': wpId };

      const fiberyResp = await fetch('https://subscript.fibery.io/api/commands', {
        method: 'POST',
        headers: fiberyHeaders,
        body: JSON.stringify([{
          command: 'fibery.entity/create',
          args: { type: 'Website/Blog Leads', entity: leadEntity },
        }]),
      });

      if (!fiberyResp.ok) {
        console.error('Fibery API error:', fiberyResp.status, await fiberyResp.text());
        return json({ error: 'Failed to save' }, 502, env);
      }

      return json({ ok: true }, 200, env);
    } catch (err) {
      console.error('Fibery request failed:', err);
      return json({ error: 'Internal error' }, 500, env);
    }
  },
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://undersight.ai',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}
