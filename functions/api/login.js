// Cloudflare Pages Function - Login (Supabase + JWT)
// Endpoint: /api/login

function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    const bytes = Array.from(new Uint8Array(buf));
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function base64url(str) {
  const bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signJwt(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return `${data}.${sigB64}`;
}

async function jsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }

  try {
    const { username, password } = await jsonBody(request);
    const u = String(username || '').trim();
    const p = String(password || '');

    if (!u || !p) {
      return new Response(JSON.stringify({ ok: false, message: 'Kullanıcı adı veya parola hatalı' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const jwtSecret = env.JWT_SECRET || 'cloudflare_secret_change_me';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ ok: false, message: 'Veritabanı yapılandırması eksik' }), {
        status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const fetch = globalThis.fetch;
    const endpoint = `${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(u)}&select=id,username,password_hash,is_admin,coins`;

    const resp = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    const rows = await resp.json().catch(() => []);
    const user = Array.isArray(rows) ? rows[0] : null;

    if (!user) {
      return new Response(JSON.stringify({ ok: false, message: 'Kullanıcı adı veya parola hatalı' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const password_hash = await sha256(p);
    if (password_hash !== user.password_hash) {
      return new Response(JSON.stringify({ ok: false, message: 'Kullanıcı adı veya parola hatalı' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const token = await signJwt(
      { userId: user.id, username: user.username, isAdmin: !!user.is_admin, coins: user.coins || 0 },
      jwtSecret
    );

    const cookie = `token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Secure`;

    return new Response(JSON.stringify({ ok: true, username: user.username, isAdmin: !!user.is_admin, coins: user.coins || 0 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
        'Set-Cookie': cookie
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    return new Response(JSON.stringify({ ok: false, message: 'Sunucu hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

