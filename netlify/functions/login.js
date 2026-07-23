const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function signJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

async function parseBody(event) {
  let body = event.body;
  if (!body) return {};
  try {
    body = typeof body === 'string' ? body : JSON.stringify(body);
    return JSON.parse(body);
  } catch {
    return {};
  }
}

exports.handler = async (event) => {
  try {
    const { username, password } = await parseBody(event);
    const u = String(username || '').trim();
    const p = String(password || '');

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');

    const fetch = global.fetch;

    if (!u || !p) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Invalid credentials' }) };
    }






    const endpoint = `${url}/rest/v1/users?username=eq.${encodeURIComponent(u)}&select=id,username,password_hash,is_admin,coins`;


    const resp = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    const rows = await resp.json().catch(() => ([]));
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Invalid credentials' }) };

    const password_hash = sha256(p);
    if (password_hash !== user.password_hash) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Invalid credentials' }) };
    }

    const token = signJwt({ userId: user.id, username: user.username, isAdmin: !!user.is_admin, coins: user.coins || 0 });

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`
      },
      body: JSON.stringify({ ok: true, username: user.username, isAdmin: !!user.is_admin, coins: user.coins || 0 })
    };
  } catch (e) {
    console.error(e);
    const msg = (e && e.message) ? String(e.message) : 'Unknown error';
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Server error', detail: msg, supabase_url_present: !!process.env.SUPABASE_URL, supabase_key_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY }) };
  }
};

