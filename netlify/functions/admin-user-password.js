const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function verifyJwt(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const [h, b, sig] = parts;
    const data = `${h}.${b}`;
    if (crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url') !== sig) return null;
    return JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
  } catch { return null; }
}

function getCookie(event, name) {
  const h = event.headers?.cookie || event.headers?.Cookie || '';
  for (const part of h.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function parseBody(event) {
  try {
    const s = typeof event.body === 'string' ? event.body : JSON.stringify(event.body || '{}');
    return JSON.parse(s);
  } catch { return {}; }
}

exports.handler = async (event) => {
  try {
    const token = getCookie(event, 'token');
    const payload = verifyJwt(token);
    if (!payload) return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Unauthorized' }) };
    if (!payload.isAdmin) return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Forbidden' }) };

    // Path'ten ID'yi çıkar: /api/admin/users/123/password
    const path = event.path || '';
    const parts = path.split('/').filter(Boolean);
    let userId = null;
    for (let i = 0; i < parts.length; i++) {
      const num = parseInt(parts[i]);
      if (!isNaN(num) && num > 0) { userId = num; break; }
    }
    if (!userId || userId <= 0) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Geçersiz ID' }) };
    }

    const { password } = parseBody(event);
    const p = String(password || '');
    if (p.length < 4) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Şifre çok kısa' }) };

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');

    const fetch = global.fetch;
    const password_hash = sha256(p);

    const resp = await fetch(`${url}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password_hash })
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { statusCode: resp.status, body: JSON.stringify({ ok: false, message: data?.message || 'Güncelleme hatası' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Server error' }) };
  }
};
