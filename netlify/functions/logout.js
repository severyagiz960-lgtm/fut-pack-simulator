exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': 'token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    },
    body: JSON.stringify({ ok: true })
  };
};
