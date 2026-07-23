const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function verifyJwt(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sig] = parts;
    const data = `${headerB64}.${bodyB64}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (expected !== sig) return null;
    return JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function getCookie(event, name) {
  const header = event.headers?.cookie || event.headers?.Cookie || '';
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

exports.handler = async (event) => {
  try {
    const token = getCookie(event, 'token');
    const payload = verifyJwt(token);
    if (!payload) return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Unauthorized' }) };
    if (!payload.isAdmin) return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Forbidden' }) };

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');

    const fetch = global.fetch;
    const endpoint = `${url}/rest/v1/users?select=id,username,created_at,is_admin&order=id.desc`;

    const resp = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    const rows = await resp.json().catch(() => ([]));
    if (!resp.ok) {
      return { statusCode: resp.status || 500, body: JSON.stringify({ ok: false, message: 'Failed to load users' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, users: rows }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Server error' }) };
  }
};

