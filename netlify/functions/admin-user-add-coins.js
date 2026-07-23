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
    const payload = verifyJwt(token);
    if (!payload) return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Unauthorized' }) };
    if (!payload.isAdmin) return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Forbidden' }) };

    // Path'ten ID'yi çıkar: /api/admin/users/123/add-coins
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

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');

    const fetch = global.fetch;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

    // Mevcut altını al
    const userResp = await fetch(`${url}/rest/v1/users?id=eq.${userId}&select=coins`, { headers });
    const userData = await userResp.json().catch(() => []);
    const user = Array.isArray(userData) ? userData[0] : null;
    if (!user) return { statusCode: 404, body: JSON.stringify({ ok: false, message: 'Kullanıcı bulunamadı' }) };

    let amount = 100;
    if (event.body) {
      try {
        const bodyData = JSON.parse(event.body);
        if (bodyData && typeof bodyData.amount === 'number') {
          amount = bodyData.amount;
        }
      } catch (e) {}
    }

    const currentCoins = user.coins || 0;
    const newCoins = currentCoins + amount;

    const resp = await fetch(`${url}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ coins: newCoins })
    });

    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ ok: false, message: 'Güncelleme hatası' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, coins: newCoins }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Server error' }) };
  }
};
