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

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};
    const u = String(username || '').trim();
    const p = String(password || '');

    if (!u || !p) {
      return res.status(401).json({ ok: false, message: 'Kullanıcı adı veya parola hatalı' });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(503).json({ ok: false, message: 'Sunucu veritabanı yapılandırması eksik' });
    }

    const fetch = global.fetch;
    const endpoint = `${url}/rest/v1/users?username=eq.${encodeURIComponent(u)}&select=id,username,password_hash,is_admin,coins`;

    const resp = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    const rows = await resp.json().catch(() => []);
    const user = Array.isArray(rows) ? rows[0] : null;

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Kullanıcı adı veya parola hatalı' });
    }

    const password_hash = sha256(p);
    if (password_hash !== user.password_hash) {
      return res.status(401).json({ ok: false, message: 'Kullanıcı adı veya parola hatalı' });
    }

    const token = signJwt({ userId: user.id, username: user.username, isAdmin: !!user.is_admin, coins: user.coins || 0 });

    // Set cookie
    res.setHeader('Set-Cookie', `token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`);

    return res.status(200).json({ ok: true, username: user.username, isAdmin: !!user.is_admin, coins: user.coins || 0 });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ ok: false, message: 'Sunucu hatası' });
  }
};

