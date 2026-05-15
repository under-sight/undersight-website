/**
 * Cloudflare Pages Function — Blog lead capture
 *
 * Route: POST /api/whitepaper-lead
 * Deployed automatically with Cloudflare Pages (lives in functions/ dir).
 *
 * Accepts { email, whitepaper } and creates a Blog Leads entity in Fibery,
 * linked to the matching Blog entity. The Fibery automation
 * "undersight research dispatch" then sends the PDF via email.
 *
 * Environment variable (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   FIBERY_TOKEN — Fibery API token for subscript.fibery.io
 */

const ALLOWED_ORIGINS = [
  'https://undersight.ai',
  'https://www.undersight.ai',
  'https://undersight-website.pages.dev',
  'http://localhost:8088',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.FIBERY_TOKEN) {
    console.error('FIBERY_TOKEN not set');
    return json({ error: 'Server misconfigured' }, 500, request);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, request);
  }

  const email = (body.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email' }, 422, request);
  }

  const whitepaperName = body.whitepaper || 'Chat Advance Case Study';
  const fiberyHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Token ${env.FIBERY_TOKEN}`,
  };

  try {
    // 1. Look up the Whitepaper entity by name
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

    // 2. Create the lead, linking to whitepaper if found
    const leadEntity = { 'Website/Email': email };
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
      return json({ error: 'Failed to save' }, 502, request);
    }

    return json({ ok: true }, 200, request);
  } catch (err) {
    console.error('Fibery request failed:', err);
    return json({ error: 'Internal error' }, 500, request);
  }
}
