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

function verifyJwt(token) {
  try {
    const [headerB64, bodyB64, sig] = String(token).split('.');
    const data = `${headerB64}.${bodyB64}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (expected !== sig) return null;
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

function parseBody(event) {
  return new Promise((resolve) => {
    let body = event.body;
    if (!body) return resolve({});
    try {
      body = typeof body === 'string' ? body : JSON.stringify(body);
      resolve(JSON.parse(body));
    } catch {
      resolve({});
    }
  });
}

function getCookies(event) {
  const header = event.headers?.cookie || event.headers?.Cookie || '';
  const out = {};
  header.split(';').forEach((kv) => {
    const [k, ...rest] = kv.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('='));
  });
  return out;
}

async function supabaseAdminInsertUser({ username, passwordHash }) {
  const fetch = global.fetch;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');

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
        username,
        password_hash: passwordHash,
        coins: 0
      })
    });

  const rawText = await resp.text().catch(() => '');

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!resp.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.hint ||
      data?.details ||
      data?.constraint ||
      data?.code ||
      (rawText ? rawText : 'Insert failed');

    return {
      ok: false,
      message,
      code: resp.status,
      details: {
        error: data?.error,
        hint: data?.hint,
        details: data?.details,
        constraint: data?.constraint,
        postgres_code: data?.code,
        raw: data,
        raw_text: rawText
      }
    };
  }

  return { ok: true, data };
}

exports.handler = async (event) => {
  try {
    const { username, password } = await parseBody(event);
    const u = String(username || '').trim();
    const p = String(password || '');

    if (!u || !p) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Username and password required' }) };
    if (u.length < 3) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Username too short' }) };
    if (p.length < 4) return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Password too short' }) };

    const fetch = global.fetch;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');

    const checkEndpoint = `${url}/rest/v1/users?username=eq.${encodeURIComponent(u)}&select=id`;
    const checkResp = await fetch(checkEndpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    const checkData = await checkResp.json().catch(() => ([]));
    if (Array.isArray(checkData) && checkData.length > 0) {
      return { statusCode: 409, body: JSON.stringify({ ok: false, message: 'Username already exists' }) };
    }

    const password_hash = sha256(p);
    const ins = await supabaseAdminInsertUser({ username: u, passwordHash: password_hash });
    if (!ins.ok) {
      return {
        statusCode: ins.code || 500,
        body: JSON.stringify({ ok: false, message: ins.message, details: ins.details || null })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Server error' }) };
  }
};
