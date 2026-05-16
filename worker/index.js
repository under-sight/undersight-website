/**
 * Cloudflare Worker — Whitepaper lead capture relay
 *
 * Accepts POST { email, whitepaper } from undersight.ai,
 * creates a "Whitepaper Leads" entity in Fibery, and returns JSON.
 *
 * Secrets (set via `wrangler secret put`):
 *   FIBERY_TOKEN — Fibery API token for subscript.fibery.io
 *
 * Environment variables (set in wrangler.toml):
 *   ALLOWED_ORIGIN — e.g. https://undersight.ai
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, env);
    }

    const email = (body.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 422, env);
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
              'q/from': 'Website/Whitepapers',
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
      const leadEntity = {
        'Website/Email': email,
      };
      if (wpId) leadEntity['Website/Whitepaper'] = { 'fibery/id': wpId };

      const fiberyResp = await fetch('https://subscript.fibery.io/api/commands', {
        method: 'POST',
        headers: fiberyHeaders,
        body: JSON.stringify([{
          command: 'fibery.entity/create',
          args: { type: 'Website/Whitepaper Leads', entity: leadEntity },
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
