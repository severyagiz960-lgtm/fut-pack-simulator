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

    const cntResp = await fetch(`${url}/rest/v1/players?select=id`, { headers });
    const allPlayers = await cntResp.json().catch(() => []);
    if (!Array.isArray(allPlayers) || allPlayers.length === 0) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Hiç oyuncu yok' }) };

    const random = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    const isSpecial = Math.random() < 0.08 ? 1 : 0;

    const pResp = await fetch(`${url}/rest/v1/players?id=eq.${random.id}&select=*`, { headers });
    const pData = await pResp.json().catch(() => []);
    const player = Array.isArray(pData) ? pData[0] : null;

    await fetch(`${url}/rest/v1/user_cards`, {
      method: 'POST', headers,
      body: JSON.stringify({ user_id: payload.userId, player_id: random.id, is_special: isSpecial })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, card: { ...player, is_special: isSpecial } }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e?.message || 'Server error' }) };
  }
};
