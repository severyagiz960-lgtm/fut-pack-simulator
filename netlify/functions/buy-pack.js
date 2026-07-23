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

function parseBody(event) {
  try {
    const s = typeof event.body === 'string' ? event.body : JSON.stringify(event.body || '{}');
    return JSON.parse(s);
  } catch { return {}; }
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

    const body = parseBody(event);
    const packId = parseInt(body.packId);
    const packs = {
      1: { name: 'Bronz Paket', price: 50, minOverall: 50, maxOverall: 70 },
      2: { name: 'Gümüş Paket', price: 300, minOverall: 70, maxOverall: 75 },
      3: { name: 'Altın Paket', price: 1000, minOverall: 75, maxOverall: 80 },
      4: { name: 'Seçkin Paket', price: 3000, minOverall: 80, maxOverall: 85 },
      5: { name: 'Efsane Paket', price: 10000, minOverall: 85, maxOverall: 99 }
    };
    const pack = packs[packId];
    if (!pack) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Geçersiz paket' }) };

    const userResp = await fetch(`${url}/rest/v1/users?id=eq.${payload.userId}&select=coins`, { headers });
    const userData = await userResp.json().catch(() => []);
    const currentCoins = Array.isArray(userData) && userData[0] ? (userData[0].coins || 0) : 0;
    if (currentCoins < pack.price) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Yetersiz altın!' }) };

    const playersResp = await fetch(`${url}/rest/v1/players?select=*`, { headers });
    const allPlayers = await playersResp.json().catch(() => []);
    if (!Array.isArray(allPlayers) || allPlayers.length === 0) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Sistemde oyuncu bulunamadı!' }) };

    let candidates = allPlayers.filter(p => p.overall >= pack.minOverall && p.overall <= pack.maxOverall);
    if (candidates.length === 0) candidates = allPlayers;

    let totalWeight = 0;
    const weightedCandidates = candidates.map(p => {
      const diff = 100 - p.overall;
      const weight = Math.max(1, diff * diff);
      totalWeight += weight;
      return { player: p, weight };
    });

    let randomValue = Math.random() * totalWeight;
    let selectedPlayer = null;
    for (const item of weightedCandidates) {
      randomValue -= item.weight;
      if (randomValue <= 0) { selectedPlayer = item.player; break; }
    }
    if (!selectedPlayer) selectedPlayer = candidates[Math.floor(Math.random() * candidates.length)];

    const newCoins = currentCoins - pack.price;
    await fetch(`${url}/rest/v1/users?id=eq.${payload.userId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ coins: newCoins })
    });

    const isSpecial = Math.random() < 0.1 ? 1 : 0;
    await fetch(`${url}/rest/v1/user_cards`, {
      method: 'POST', headers,
      body: JSON.stringify({ user_id: payload.userId, player_id: selectedPlayer.id, is_special: isSpecial })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, coins: newCoins, player: selectedPlayer, isSpecial }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e?.message || 'Server error' }) };
  }
};
