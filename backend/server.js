// FINORA verification backend: email and mobile OTP. Zero dependencies (Node 18+).
// Endpoints: POST /api/otp/send, POST /api/otp/verify, POST /api/verify/check, GET /health
'use strict';
const http = require('http');
const crypto = require('crypto');

const env = process.env;
const PROD = env.NODE_ENV === 'production';
const SECRET = env.OTP_SECRET || (PROD ? '' : crypto.randomBytes(32).toString('hex'));
if (!SECRET || SECRET.length < 24) { console.error('OTP_SECRET (24+ chars) is required in production.'); process.exit(1); }
const CFG = {
  port: +env.PORT || 8787,
  origins: (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean),
  devEcho: env.DEV_ECHO === '1' && !PROD,
  trustProxy: env.TRUST_PROXY === '1',
  ttl: 10 * 60 * 1000, cooldown: 30 * 1000, maxAttempts: 5, tokenTtl: 30 * 60 * 1000,
  perTargetHour: 5, perIpHour: 20,
  emailProvider: env.EMAIL_PROVIDER || 'console', smsProvider: env.SMS_PROVIDER || 'console',
};

/* ---------- helpers ---------- */
const hmac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest();
const b64u = (b) => Buffer.from(b).toString('base64url');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(a, b);
const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');
const okEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
function normPhone(p) { // Indian mobile: 10 digits starting 6-9, optional +91 / 91 / 0 prefix. Returns E.164 or ''.
  if (typeof p !== 'string') return '';
  let d = p.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (/^91\d{10}$/.test(d)) d = d.slice(2); else if (/^0\d{10}$/.test(d)) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? '+91' + d : '';
}
const mask = (ch, t) => (ch === 'email' ? t.replace(/^(.).*(@.*)$/, '$1***$2') : t.slice(0, 3) + '******' + t.slice(-2));

/* ---------- storage (in memory; use one instance, or swap for Redis for several) ---------- */
const otps = new Map();   // key -> {h, exp, tries, sent}
const hits = new Map();   // rate key -> [timestamps]
function rate(key, limit) {
  const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < 3600e3);
  if (a.length >= limit) { hits.set(key, a); return false; }
  a.push(now); hits.set(key, a); return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otps) if (v.exp < now) otps.delete(k);
  for (const [k, a] of hits) { const f = a.filter((t) => now - t < 3600e3); f.length ? hits.set(k, f) : hits.delete(k); }
}, 60e3).unref();

/* ---------- providers ---------- */
async function post(url, headers, body, asForm) {
  const r = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': asForm ? 'application/x-www-form-urlencoded' : 'application/json' }, body: asForm ? new URLSearchParams(body) : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('provider HTTP ' + r.status);
}
const emailBody = (code) => ({
  subject: `${code} is your FINORA verification code`,
  text: `Your FINORA verification code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email. FINORA never asks for this code by phone or chat.`,
  html: `<div style="font-family:Arial,sans-serif;max-width:420px"><h2 style="margin:0 0 8px">FINORA</h2><p>Your verification code:</p><p style="font-size:30px;letter-spacing:6px;font-weight:700;margin:8px 0">${code}</p><p style="color:#555">It expires in 10 minutes. If you did not request it, ignore this email. FINORA never asks for this code by phone or chat.</p></div>`,
});
const senders = {
  email: {
    console: async (to, code) => { console.log(`[email OTP -> ${to}] ${code}`); },
    resend: async (to, code) => { const b = emailBody(code); await post('https://api.resend.com/emails', { authorization: 'Bearer ' + env.RESEND_API_KEY }, { from: env.EMAIL_FROM, to: [to], ...b }); },
  },
  sms: {
    console: async (to, code) => { console.log(`[sms OTP -> ${to}] ${code}`); },
    twilio: async (to, code) => { await post(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`, { authorization: 'Basic ' + Buffer.from(env.TWILIO_SID + ':' + env.TWILIO_TOKEN).toString('base64') }, { To: to, From: env.TWILIO_FROM, Body: `${code} is your FINORA verification code. Valid for 10 minutes. Do not share it.` }, true); },
    // MSG91 OTP flow (India, needs a DLT approved template with a ##OTP## variable)
    msg91: async (to, code) => { await post('https://control.msg91.com/api/v5/otp?' + new URLSearchParams({ template_id: env.MSG91_TEMPLATE_ID, mobile: to.replace('+', ''), otp: code }), { authkey: env.MSG91_AUTHKEY }, {}); },
  },
};
if (PROD && (CFG.emailProvider === 'console' || CFG.smsProvider === 'console')) console.warn('WARNING: a console provider is active in production. Codes are only logged, not delivered.');

/* ---------- handlers ---------- */
const bad = (res, code, msg, extra) => send(res, code, { ok: false, error: msg, ...extra });
async function otpSend(req, res, body, ip) {
  const ch = body.channel === 'email' ? 'email' : body.channel === 'phone' ? 'phone' : '';
  if (!ch) return bad(res, 400, 'channel must be "email" or "phone".');
  const target = ch === 'email' ? normEmail(body.target) : normPhone(String(body.target || ''));
  if (!target || (ch === 'email' && !okEmail(target))) return bad(res, 400, ch === 'email' ? 'Enter a valid email address.' : 'Enter a valid 10 digit Indian mobile number.');
  if (!rate('ip:' + ip, CFG.perIpHour)) return bad(res, 429, 'Too many requests. Try again later.');
  const key = ch + ':' + target, cur = otps.get(key), now = Date.now();
  if (cur && now - cur.sent < CFG.cooldown) return bad(res, 429, 'Please wait before requesting another code.', { retryIn: Math.ceil((CFG.cooldown - (now - cur.sent)) / 1000) });
  if (!rate('t:' + key, CFG.perTargetHour)) return bad(res, 429, 'Too many codes sent to this ' + (ch === 'email' ? 'email' : 'number') + '. Try again in an hour.');
  const code = String(crypto.randomInt(100000, 1000000));
  otps.set(key, { h: hmac(key + '|' + code), exp: now + CFG.ttl, tries: 0, sent: now });
  try { await senders[ch === 'email' ? 'email' : 'sms'][ch === 'email' ? CFG.emailProvider : CFG.smsProvider](target, code); }
  catch (e) { otps.delete(key); console.error('send failed', ch, e.message); return bad(res, 502, 'Could not send the code right now. Try again shortly.'); }
  send(res, 200, { ok: true, channel: ch, sentTo: mask(ch === 'email' ? 'email' : 'phone', target), expiresIn: CFG.ttl / 1000, resendIn: CFG.cooldown / 1000, ...(CFG.devEcho ? { devCode: code } : {}) });
}
function sign(payload) { const p = b64u(JSON.stringify(payload)); return p + '.' + b64u(hmac('tok|' + p)); }
function otpVerify(req, res, body) {
  const ch = body.channel === 'email' ? 'email' : body.channel === 'phone' ? 'phone' : '';
  const target = ch === 'email' ? normEmail(body.target) : normPhone(String(body.target || ''));
  const code = String(body.code || '').trim();
  if (!ch || !target || !/^\d{6}$/.test(code)) return bad(res, 400, 'Enter the 6 digit code.');
  const key = ch + ':' + target, rec = otps.get(key), now = Date.now();
  if (!rec || rec.exp < now) { otps.delete(key); return bad(res, 400, 'This code has expired. Request a new one.', { expired: true }); }
  if (++rec.tries > CFG.maxAttempts) { otps.delete(key); return bad(res, 429, 'Too many wrong attempts. Request a new code.', { expired: true }); }
  if (!safeEq(hmac(key + '|' + code), rec.h)) return bad(res, 400, 'That code is not correct.', { attemptsLeft: CFG.maxAttempts - rec.tries });
  otps.delete(key);
  send(res, 200, { ok: true, verified: true, channel: ch, token: sign({ c: ch, t: target, exp: now + CFG.tokenTtl }) });
}
function verifyToken(token, ch, target) {
  if (typeof token !== 'string') return false;
  const [p, s] = token.split('.'); if (!p || !s) return false;
  if (!safeEq(Buffer.from(s), Buffer.from(b64u(hmac('tok|' + p))))) return false;
  try { const d = JSON.parse(Buffer.from(p, 'base64url')); return d.exp > Date.now() && d.c === ch && d.t === (ch === 'email' ? normEmail(target) : normPhone(String(target))); } catch (e) { return false; }
}

/* ---------- http ---------- */
function cors(req, res) {
  const o = req.headers.origin;
  if (o && (CFG.origins.includes('*') || CFG.origins.includes(o))) { res.setHeader('access-control-allow-origin', CFG.origins.includes('*') ? '*' : o); res.setHeader('vary', 'origin'); }
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS'); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('access-control-max-age', '600');
}
function send(res, code, obj) { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(obj)); }
const readBody = (req) => new Promise((ok, no) => { let n = 0; const c = []; req.on('data', (d) => { n += d.length; if (n > 2048) { no(new Error('big')); req.destroy(); } else c.push(d); }); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch (e) { no(new Error('json')); } }); req.on('error', no); });
const clientIp = (req) => (CFG.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'x';

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const path = new URL(req.url, 'http://x').pathname;
  if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, email: CFG.emailProvider, sms: CFG.smsProvider });
  if (req.method !== 'POST') return bad(res, 404, 'Not found.');
  if (!String(req.headers['content-type'] || '').includes('application/json')) return bad(res, 415, 'Send JSON.');
  let body; try { body = await readBody(req); } catch (e) { return bad(res, 400, 'Invalid request.'); }
  try {
    if (path === '/api/otp/send') return await otpSend(req, res, body, clientIp(req));
    if (path === '/api/otp/verify') return otpVerify(req, res, body);
    if (path === '/api/verify/check') return send(res, 200, { ok: true, valid: verifyToken(body.token, body.channel, body.target) });
    bad(res, 404, 'Not found.');
  } catch (e) { console.error(e); bad(res, 500, 'Server error.'); }
});
if (require.main === module) server.listen(CFG.port, () => console.log(`FINORA verification API on :${CFG.port} (email: ${CFG.emailProvider}, sms: ${CFG.smsProvider})`));
module.exports = { server, normPhone, CFG };
