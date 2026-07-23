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
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    return payload;
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
    if (!token) return { statusCode: 401, body: JSON.stringify({ ok: false }) };
    const payload = verifyJwt(token);
    if (!payload) return { statusCode: 401, body: JSON.stringify({ ok: false }) };
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, username: payload.username, isAdmin: !!payload.isAdmin, coins: payload.coins || 0 })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};

