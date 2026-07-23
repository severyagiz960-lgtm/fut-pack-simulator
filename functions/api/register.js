// Cloudflare Pages Function - Register (Supabase)
// Endpoint: /api/register

function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    const bytes = Array.from(new Uint8Array(buf));
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  });
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

  // CORS preflight
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
      return new Response(JSON.stringify({ ok: false, message: 'Kullanıcı adı ve parola gerekli' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }
    if (u.length < 3) {
      return new Response(JSON.stringify({ ok: false, message: 'Kullanıcı adı en az 3 karakter' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }
    if (p.length < 4) {
      return new Response(JSON.stringify({ ok: false, message: 'Parola en az 4 karakter' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ ok: false, message: 'Veritabanı yapılandırması eksik' }), {
        status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const fetch = globalThis.fetch;

    // Check if user exists
    const checkUrl = `${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(u)}&select=id`;
    const checkResp = await fetch(checkUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    const checkData = await checkResp.json().catch(() => []);
    if (Array.isArray(checkData) && checkData.length > 0) {
      return new Response(JSON.stringify({ ok: false, message: 'Bu kullanıcı adı zaten alınmış' }), {
        status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const password_hash = await sha256(p);

    // Insert user
    const insertUrl = `${supabaseUrl}/rest/v1/users`;
    const insertResp = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        username: u,
        password_hash: password_hash,
        coins: 0
      })
    });

    const rawText = await insertResp.text().catch(() => '');
    let data = null;
    try { data = rawText ? JSON.parse(rawText) : null; } catch { data = null; }

    if (!insertResp.ok) {
      const msg = data?.message || data?.error || 'Kayıt başarısız';
      return new Response(JSON.stringify({ ok: false, message: msg }), {
        status: insertResp.status || 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  } catch (e) {
    console.error('Register error:', e);
    return new Response(JSON.stringify({ ok: false, message: 'Sunucu hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

