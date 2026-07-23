const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

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

exports.handler = async (event) => {
  try {
    const token = getCookie(event, 'token');
    const payload = token ? verifyJwt(token) : null;
    if (!payload) return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Forbidden' }) };

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Missing Supabase env' }) };
    const fetch = global.fetch;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

    const resp = await fetch(`${url}/rest/v1/user_cards?select=*,player:player_id(*)&user_id=eq.${payload.userId}&order=opened_at.desc`, { headers });
    const data = await resp.json().catch(() => []);
    return { statusCode: 200, body: JSON.stringify({ ok: true, cards: Array.isArray(data) ? data : [] }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e?.message || 'Server error' }) };
  }
};
