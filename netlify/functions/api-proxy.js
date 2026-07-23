// Netlify Function — /api/players, /api/admin/players
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

const methods = { GET: 'GET', POST: 'POST', PUT: 'PUT', DELETE: 'DELETE' };

exports.handler = async (event) => {
  try {
    const path = event.path.replace(/^\/\.netlify\/functions\/api-proxy/, '').replace(/^\/api/, '');
    const method = event.httpMethod;
    const body = parseBody(event);
    const token = getCookie(event, 'token');
    const payload = token ? verifyJwt(token) : null;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Missing Supabase env' }) };
    const fetch = global.fetch;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

    function requireAdmin() {
      if (!payload || !payload.isAdmin) throw new Error('Unauthorized');
    }

    // GET /players
    if (method === methods.GET && (path === '/players' || path === '/players/')) {
      const resp = await fetch(`${url}/rest/v1/players?select=*&order=overall.desc`, { headers });
      const data = await resp.json().catch(() => []);
      return { statusCode: 200, body: JSON.stringify({ ok: true, players: Array.isArray(data) ? data : [] }) };
    }

    // GET /players/:id
    const playerMatch = path.match(/^\/players\/(\d+)$/);
    if (method === methods.GET && playerMatch) {
      const resp = await fetch(`${url}/rest/v1/players?id=eq.${playerMatch[1]}&select=*`, { headers });
      const data = await resp.json().catch(() => []);
      return { statusCode: 200, body: JSON.stringify({ ok: true, player: Array.isArray(data) ? data[0] : null }) };
    }

    // POST /admin/players
    if (method === methods.POST && path === '/admin/players') {
      requireAdmin();
      const allowed = ['name', 'pos', 'role', 'overall', 'value', 'pac', 'pys', 'drb', 'pas', 'sho', 'def', 'div', 'han', 'kic', 'ref', 'spe', 'pos_stat', 'goals', 'assists', 'matches'];
      const insert = {};
      allowed.forEach(f => { if (body[f] !== undefined) insert[f] = body[f]; });
      const resp = await fetch(`${url}/rest/v1/players`, {
        method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(insert)
      });
      const d = await resp.json().catch(() => ({}));
      if (!resp.ok) return { statusCode: resp.status, body: JSON.stringify({ ok: false, message: d?.message || 'Insert failed' }) };
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // PUT /admin/players/:id
    const putMatch = path.match(/^\/admin\/players\/(\d+)$/);
    if (method === methods.PUT && putMatch) {
      requireAdmin();
      const allowed = ['name', 'pos', 'role', 'overall', 'value', 'pac', 'pys', 'drb', 'pas', 'sho', 'def', 'div', 'han', 'kic', 'ref', 'spe', 'pos_stat', 'goals', 'assists', 'matches'];
      const update = {};
      allowed.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });
      const resp = await fetch(`${url}/rest/v1/players?id=eq.${putMatch[1]}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(update)
      });
      if (!resp.ok) return { statusCode: resp.status, body: JSON.stringify({ ok: false, message: 'Update failed' }) };
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // DELETE /admin/players/:id
    const delMatch = path.match(/^\/admin\/players\/(\d+)$/);
    if (method === methods.DELETE && delMatch) {
      requireAdmin();
      await fetch(`${url}/rest/v1/players?id=eq.${delMatch[1]}`, { method: 'DELETE', headers });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 404, body: JSON.stringify({ ok: false, message: 'Not found: ' + path }) };
  } catch (e) {
    const msg = e?.message || 'Server error';
    if (msg === 'Unauthorized') return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Forbidden' }) };
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: msg }) };
  }
};
