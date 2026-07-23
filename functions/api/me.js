// Cloudflare Pages Function - Me (Token verify)
// Endpoint: /api/me

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function verifyJwt(token, secret) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;
    const data = `${headerB64}.${bodyB64}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );
    
    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    
    if (!valid) return null;
    return JSON.parse(base64urlDecode(bodyB64));
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const parts = cookie.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const token = getCookie(request, 'token');
    const jwtSecret = env.JWT_SECRET || 'cloudflare_secret_change_me';
    
    if (!token) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const payload = await verifyJwt(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    return new Response(JSON.stringify({ ok: true, username: payload.username, isAdmin: !!payload.isAdmin, coins: payload.coins || 0 }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

