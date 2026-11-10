// Run: node backend/test.js  (starts the server in dev mode with DEV_ECHO and checks the flow)
process.env.DEV_ECHO = '1'; process.env.PORT = '0';
const { server } = require('./server.js'); const assert = require('assert');
server.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = async (p, b) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return [r.status, await r.json()]; };
  let [s, j] = await call('/api/otp/send', { channel: 'email', target: 'A@B.com' }); assert.equal(s, 200); const code = j.devCode; assert(/^\d{6}$/.test(code)); assert.equal(j.sentTo, 'a***@b.com');
  [s, j] = await call('/api/otp/send', { channel: 'email', target: 'a@b.com' }); assert.equal(s, 429, 'cooldown');
  [s, j] = await call('/api/otp/verify', { channel: 'email', target: 'a@b.com', code: code === '000000' ? '111111' : '000000' }); assert.equal(s, 400); assert.equal(j.attemptsLeft, 4);
  [s, j] = await call('/api/otp/verify', { channel: 'email', target: 'a@b.com', code }); assert.equal(s, 200); assert(j.token);
  const tok = j.token;
  [s, j] = await call('/api/verify/check', { token: tok, channel: 'email', target: 'a@b.com' }); assert.equal(j.valid, true);
  [s, j] = await call('/api/verify/check', { token: tok, channel: 'email', target: 'x@b.com' }); assert.equal(j.valid, false);
  [s, j] = await call('/api/verify/check', { token: tok.slice(0, -2) + 'xx', channel: 'email', target: 'a@b.com' }); assert.equal(j.valid, false);
  [s, j] = await call('/api/otp/verify', { channel: 'email', target: 'a@b.com', code }); assert.equal(s, 400, 'code is single use');
  [s, j] = await call('/api/otp/send', { channel: 'phone', target: '98765 43210' }); assert.equal(s, 200); assert.equal(j.sentTo, '+91******10');
  const pc = j.devCode; for (let i = 0; i < 5; i++) await call('/api/otp/verify', { channel: 'phone', target: '9876543210', code: pc === '123456' ? '654321' : '123456' });
  [s, j] = await call('/api/otp/verify', { channel: 'phone', target: '9876543210', code: pc }); assert.equal(s, 429, 'locked after 5 wrong tries');
  [s, j] = await call('/api/otp/send', { channel: 'phone', target: '1234567890' }); assert.equal(s, 400);
  [s, j] = await call('/api/otp/send', { channel: 'sms', target: 'x' }); assert.equal(s, 400);
  console.log('all backend tests passed'); server.close();
});
