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

    if (!u || !p) return res.status(400).json({ ok: false, message: 'Kullanıcı adı ve parola gerekli' });
    if (u.length < 3) return res.status(400).json({ ok: false, message: 'Kullanıcı adı en az 3 karakter' });
    if (p.length < 4) return res.status(400).json({ ok: false, message: 'Parola en az 4 karakter' });

    const fetch = global.fetch;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Supabase yoksa veya boşsa hata dön (localStorage fallback'e düşsün)
    if (!url || !key) {
      return res.status(503).json({ ok: false, message: 'Sunucu veritabanı yapılandırması eksik' });
    }

    // Kullanıcı var mı kontrol et
    const checkEndpoint = `${url}/rest/v1/users?username=eq.${encodeURIComponent(u)}&select=id`;
    const checkResp = await fetch(checkEndpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    const checkData = await checkResp.json().catch(() => []);
    if (Array.isArray(checkData) && checkData.length > 0) {
      return res.status(409).json({ ok: false, message: 'Bu kullanıcı adı zaten alınmış' });
    }

    const password_hash = sha256(p);

    // Supabase'e ekle
    const endpoint = `${url}/rest/v1/users`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        username: u,
        password_hash: password_hash,
        coins: 0
      })
    });

    const rawText = await resp.text().catch(() => '');
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch { data = null; }

    if (!resp.ok) {
      const message = data?.message || data?.error || 'Kayıt başarısız';
      return res.status(resp.status || 500).json({ ok: false, message });
    }

    return res.status(200).json({ ok: true, message: 'Kayıt başarılı' });
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ ok: false, message: 'Sunucu hatası' });
  }
};

