// SIMULATED market. Base prices are illustrative and every price here is generated, never real exchange data.
// To go live, replace tick() and build() with a licensed feed adapter (see backend/main.py and README).
import { mulberry, hash, gauss, clamp, ymd } from './util.js';

const E = (id, name, sec, base, o = {}) => ({ id, name, sec, seg: 'EQ', base, vol: 0.0006, ...o });
const F = (lot, step) => ({ fo: 1, lot, step, iv: 0.26 });

export const UNIVERSE = [
  E('RELIANCE', 'Reliance Industries', 'Energy', 1412.6, F(250, 10)),
  E('TCS', 'Tata Consultancy Services', 'IT', 4105.25, F(175, 20)),
  E('INFY', 'Infosys', 'IT', 1788.4, F(400, 20)),
  E('WIPRO', 'Wipro', 'IT', 312.45),
  E('HDFCBANK', 'HDFC Bank', 'Banking', 1742.15, F(550, 20)),
  E('ICICIBANK', 'ICICI Bank', 'Banking', 1284.7, F(700, 10)),
  E('SBIN', 'State Bank of India', 'Banking', 842.3, F(750, 10)),
  E('AXISBANK', 'Axis Bank', 'Banking', 1160.5, F(625, 10)),
  E('KOTAKBANK', 'Kotak Mahindra Bank', 'Banking', 2010.2),
  E('BAJFINANCE', 'Bajaj Finance', 'Financials', 6900),
  E('ITC', 'ITC', 'FMCG', 468.85, F(1600, 5)),
  E('HINDUNILVR', 'Hindustan Unilever', 'FMCG', 2480),
  E('LT', 'Larsen & Toubro', 'Infra', 3640, F(175, 20)),
  E('ADANIPORTS', 'Adani Ports', 'Infra', 1420),
  E('ULTRACEMCO', 'UltraTech Cement', 'Infra', 11200),
  E('BHARTIARTL', 'Bharti Airtel', 'Telecom', 1905.3, F(475, 20)),
  E('MARUTI', 'Maruti Suzuki', 'Auto', 12600, { vol: 0.0008 }),
  E('TATAMOTORS', 'Tata Motors', 'Auto', 962.1, { vol: 0.0008, ...F(1425, 10) }),
  E('M&M', 'Mahindra & Mahindra', 'Auto', 3150, { vol: 0.0008 }),
  E('SUNPHARMA', 'Sun Pharma', 'Pharma', 1780),
  E('DRREDDY', 'Dr Reddys Laboratories', 'Pharma', 1290),
  E('TATASTEEL', 'Tata Steel', 'Metals', 158.4, { vol: 0.0008 }),
  E('JSWSTEEL', 'JSW Steel', 'Metals', 1035, { vol: 0.0008 }),
  E('ONGC', 'ONGC', 'Energy', 262),
  E('NTPC', 'NTPC', 'Energy', 365),
  E('POWERGRID', 'Power Grid', 'Energy', 305),
  E('COALINDIA', 'Coal India', 'Energy', 410),
  E('ASIANPAINT', 'Asian Paints', 'Consumer', 2380),
  E('TITAN', 'Titan Company', 'Consumer', 3400),
  { id: 'NIFTYBEES', name: 'Nippon Nifty 50 BeES', sec: 'ETF', seg: 'ETF', base: 262.4, vol: 0.0003 },
  { id: 'BANKBEES', name: 'Nippon Bank BeES', sec: 'ETF', seg: 'ETF', base: 540.1, vol: 0.0004 },
  { id: 'GOLDBEES', name: 'Nippon Gold BeES', sec: 'ETF', seg: 'ETF', base: 68.2, vol: 0.0004 },
  { id: 'ITBEES', name: 'Nippon IT BeES', sec: 'ETF', seg: 'ETF', base: 42.3, vol: 0.0005 },
  { id: 'LIQUIDBEES', name: 'Nippon Liquid BeES', sec: 'ETF', seg: 'ETF', base: 1000, vol: 0.00002 },
  { id: 'NIFTY', name: 'NIFTY 50', sec: 'Index', seg: 'IDX', base: 24812.35, vol: 0.00028, fo: 1, lot: 75, step: 50, iv: 0.13 },
  { id: 'BANKNIFTY', name: 'BANK NIFTY', sec: 'Index', seg: 'IDX', base: 53240.1, vol: 0.00034, fo: 1, lot: 30, step: 100, iv: 0.16 },
  { id: 'FINNIFTY', name: 'FIN NIFTY', sec: 'Index', seg: 'IDX', base: 23650.4, vol: 0.0003, fo: 1, lot: 65, step: 50, iv: 0.14 },
  { id: 'SENSEX', name: 'SENSEX', sec: 'Index', seg: 'IDX', base: 81305.62, vol: 0.00028, fo: 1, lot: 20, step: 100, iv: 0.13, ex: 'BFO' },
  { id: 'GOLD', name: 'Gold', sec: 'Commodity', seg: 'COM', base: 78500, vol: 0.0004, fo: 1, lot: 100, unit: '10 g' },
  { id: 'SILVER', name: 'Silver', sec: 'Commodity', seg: 'COM', base: 92000, vol: 0.0007, fo: 1, lot: 30, unit: 'kg' },
  { id: 'CRUDEOIL', name: 'Crude Oil', sec: 'Commodity', seg: 'COM', base: 6200, vol: 0.0009, fo: 1, lot: 100, unit: 'bbl' },
  { id: 'NATURALGAS', name: 'Natural Gas', sec: 'Commodity', seg: 'COM', base: 250, vol: 0.0013, fo: 1, lot: 1250, unit: 'mmBtu' },
  { id: 'COPPER', name: 'Copper', sec: 'Commodity', seg: 'COM', base: 850, vol: 0.0006, fo: 1, lot: 2500, unit: 'kg' },
  { id: 'USDINR', name: 'US Dollar / Rupee', sec: 'Currency', seg: 'CUR', base: 84.2, vol: 0.00006, fo: 1, lot: 1000 },
  { id: 'EURINR', name: 'Euro / Rupee', sec: 'Currency', seg: 'CUR', base: 91.0, vol: 0.00008, fo: 1, lot: 1000 },
  { id: 'GBPINR', name: 'Pound / Rupee', sec: 'Currency', seg: 'CUR', base: 108.5, vol: 0.00008, fo: 1, lot: 1000 },
  { id: 'JPYINR', name: 'Yen / Rupee', sec: 'Currency', seg: 'CUR', base: 0.56, vol: 0.0001, fo: 1, lot: 100000 },
];
export const META = new Map(UNIVERSE.map((u) => [u.id, u]));
export const ids = (seg) => UNIVERSE.filter((u) => u.seg === seg).map((u) => u.id);
export const M = {};
export const NB = 4000, DAY = 375;
export const TF = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '1D': DAY };

function build(u) {
  const r = mulberry(hash(u.id));
  let p = u.base * 0.97;
  const t0 = Date.now() - NB * 60000;
  const cs = [];
  for (let i = 0; i < NB; i++) {
    const o = p, c = o * (1 + u.vol * gauss(r) + 0.00001);
    const h = Math.max(o, c) * (1 + Math.abs(gauss(r)) * u.vol * 0.4);
    const l = Math.min(o, c) * (1 - Math.abs(gauss(r)) * u.vol * 0.4);
    cs.push({ t: t0 + i * 60000, o, h, l, c, v: Math.round(800 + r() * 6000) });
    p = c;
  }
  const k = u.base / cs[NB - 1].c;
  cs.forEach((x) => { x.o *= k; x.h *= k; x.l *= k; x.c *= k; });
  const day = cs.slice(NB - DAY);
  M[u.id] = {
    c: cs, shifted: 0, vol: u.vol, ltp: cs[NB - 1].c, prev: cs[NB - 1 - DAY].c, open: day[0].o,
    hi: Math.max(...day.map((x) => x.h)), lo: Math.min(...day.map((x) => x.l)), v: day.reduce((a, x) => a + x.v, 0),
    rangeHi: Math.max(...cs.map((x) => x.h)), rangeLo: Math.min(...cs.map((x) => x.l)),
  };
}
UNIVERSE.forEach(build);

/* ---------- trading sessions (IST, Monday to Friday; exchange holidays are not included) ---------- */
let force = false;
export const setForceOpen = (v) => { force = !!v; };
export const forced = () => force;
function ist() {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()), o = {};
  f.forEach((p) => (o[p.type] = p.value));
  return { wd: o.weekday, m: (+o.hour % 24) * 60 + +o.minute };
}
export const SESSIONS = { EQ: [555, 930, 'NSE and BSE 9:15 AM to 3:30 PM'], ETF: [555, 930, 'NSE and BSE 9:15 AM to 3:30 PM'], IDX: [555, 930, 'NSE and BSE 9:15 AM to 3:30 PM'], COM: [540, 1410, 'MCX 9:00 AM to 11:30 PM'], CUR: [540, 1020, 'Currency 9:00 AM to 5:00 PM'] };
export function sessionOpen(seg) {
  const { wd, m } = ist(), s = SESSIONS[seg] || SESSIONS.EQ;
  return !['Sat', 'Sun'].includes(wd) && m >= s[0] && m < s[1];
}
export const marketOpen = (seg) => force || sessionOpen(seg);

let tickN = 0;
export function tick() {
  tickN++;
  for (const id in M) {
    if (!marketOpen(META.get(id).seg)) continue;
    const m = M[id], cs = m.c, last = cs[cs.length - 1];
    const p = clamp(last.c * (1 + m.vol * gauss(Math.random) * 0.9), m.prev * 0.9, m.prev * 1.1);
    last.c = p; last.h = Math.max(last.h, p); last.l = Math.min(last.l, p);
    const dv = Math.round(Math.random() * 400); last.v += dv;
    m.ltp = p; m.hi = Math.max(m.hi, p); m.lo = Math.min(m.lo, p); m.v += dv;
    m.rangeHi = Math.max(m.rangeHi, p); m.rangeLo = Math.min(m.rangeLo, p);
    if (tickN % 20 === 0) {
      cs.push({ t: last.t + 60000, o: p, h: p, l: p, c: p, v: 0 });
      if (cs.length > NB + 800) { cs.shift(); m.shifted++; }
    }
  }
}
export const ltp = (id) => M[id].ltp;
export const chg = (id) => M[id].ltp - M[id].prev;
export const chgp = (id) => ((M[id].ltp - M[id].prev) / M[id].prev) * 100;

const cache = new Map();
export function agg(id, k) {
  const m = M[id], cs = m.c;
  if (k === 1) return cs;
  const last = cs[cs.length - 1], key = id + k, c = cache.get(key);
  if (c && c.len === cs.length && c.lc === last.c && c.sh === m.shifted) return c.out;
  const out = [];
  let g = -1, cur = null;
  for (let i = 0; i < cs.length; i++) {
    const gi = Math.floor((i + m.shifted) / k), x = cs[i];
    if (gi !== g) { if (cur) out.push(cur); g = gi; cur = { t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v }; }
    else { if (x.h > cur.h) cur.h = x.h; if (x.l < cur.l) cur.l = x.l; cur.c = x.c; cur.v += x.v; }
  }
  if (cur) out.push(cur);
  cache.set(key, { len: cs.length, lc: last.c, sh: m.shifted, out });
  return out;
}

/* ---------- indicators ---------- */
export function ema(a, n) { const k = 2 / (n + 1), o = []; let e = a[0]; for (let i = 0; i < a.length; i++) { e = i ? a[i] * k + e * (1 - k) : a[i]; o.push(e); } return o; }
export function sma(a, n) { const o = []; let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; o.push(i < n - 1 ? null : s / n); } return o; }
export function rsi(a, n = 14) {
  const o = Array(a.length).fill(null); if (a.length <= n) return o;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = a[i] - a[i - 1]; d >= 0 ? (g += d) : (l -= d); }
  g /= n; l /= n; o[n] = 100 - 100 / (1 + g / (l || 1e-9));
  for (let i = n + 1; i < a.length; i++) { const d = a[i] - a[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
  return o;
}
export function macd(a) { const e12 = ema(a, 12), e26 = ema(a, 26), m = e12.map((v, i) => v - e26[i]), s = ema(m, 9); return { m, s, h: m.map((v, i) => v - s[i]) }; }
export function boll(a, n = 20, k = 2) {
  const mid = sma(a, n);
  const up = mid.map((v, i) => { if (v == null) return null; let s = 0; for (let j = i - n + 1; j <= i; j++) s += (a[j] - v) ** 2; return v + k * Math.sqrt(s / n); });
  return { mid, up, lo: mid.map((v, i) => (v == null ? null : 2 * v - up[i])) };
}

export function technicals(id) {
  const cs = agg(id, 15).map((x) => x.c), last = cs[cs.length - 1];
  const R = rsi(cs)[cs.length - 1], MC = macd(cs).h[cs.length - 1];
  const E20 = ema(cs, 20).pop(), E50 = ema(cs, 50).pop(), S50 = sma(cs, 50).pop(), S200 = sma(cs, 200).pop(), B = boll(cs);
  const bu = B.up[cs.length - 1], bl = B.lo[cs.length - 1];
  const rows = [
    { name: 'RSI (14)', value: R.toFixed(1), signal: R < 30 ? 'Buy' : R > 70 ? 'Sell' : 'Neutral' },
    { name: 'MACD histogram', value: MC.toFixed(3), signal: MC > 0 ? 'Buy' : 'Sell' },
    { name: 'EMA 20', value: E20.toFixed(2), signal: last > E20 ? 'Buy' : 'Sell' },
    { name: 'EMA 50', value: E50.toFixed(2), signal: last > E50 ? 'Buy' : 'Sell' },
    { name: 'SMA 50', value: S50 == null ? 'n/a' : S50.toFixed(2), signal: S50 == null ? 'Neutral' : last > S50 ? 'Buy' : 'Sell' },
    { name: 'SMA 200', value: S200 == null ? 'n/a' : S200.toFixed(2), signal: S200 == null ? 'Neutral' : last > S200 ? 'Buy' : 'Sell' },
    { name: 'Bollinger (20, 2)', value: bu == null ? 'n/a' : `${bl.toFixed(1)} to ${bu.toFixed(1)}`, signal: bu == null ? 'Neutral' : last < bl ? 'Buy' : last > bu ? 'Sell' : 'Neutral' },
  ];
  const b = rows.filter((r) => r.signal === 'Buy').length, s = rows.filter((r) => r.signal === 'Sell').length;
  const score = (b - s) / rows.length;
  return { rows, buy: b, sell: s, neutral: rows.length - b - s, verdict: score > 0.5 ? 'Strong buy' : score > 0.15 ? 'Buy' : score < -0.5 ? 'Strong sell' : score < -0.15 ? 'Sell' : 'Neutral', rsi: R };
}

export function searchSyms(q, limit = 8) {
  const v = q.trim().toUpperCase(); if (!v) return [];
  return UNIVERSE.filter((u) => u.id.includes(v) || u.name.toUpperCase().includes(v)).sort((a, b) => (b.id.startsWith(v) ? 1 : 0) - (a.id.startsWith(v) ? 1 : 0)).slice(0, limit);
}

/* ---------- derivatives helpers ---------- */
export function ncdf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x) / Math.SQRT2; const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return 0.5 * (1 + s * y); }
export function bs(S0, K, T, type, iv = 0.13) {
  const lm = Math.log(K / S0), sig = iv + 1.5 * lm * lm, r = 0.065, sq = sig * Math.sqrt(T);
  const d1 = (Math.log(S0 / K) + (r + (sig * sig) / 2) * T) / sq, d2 = d1 - sq;
  return Math.max(0.05, type === 'CE' ? S0 * ncdf(d1) - K * Math.exp(-r * T) * ncdf(d2) : K * Math.exp(-r * T) * ncdf(-d2) - S0 * ncdf(-d1));
}
export function greeks(S0, K, T, type, iv = 0.13) {
  const lm = Math.log(K / S0), sig = iv + 1.5 * lm * lm, r = 0.065, sq = sig * Math.sqrt(T);
  const d1 = (Math.log(S0 / K) + (r + (sig * sig) / 2) * T) / sq;
  const pdf = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
  return { delta: type === 'CE' ? ncdf(d1) : ncdf(d1) - 1, gamma: pdf / (S0 * sq), vega: (S0 * pdf * Math.sqrt(T)) / 100, iv: sig * 100 };
}
export const yrs = (e) => Math.max((new Date(e + 'T15:30:00').getTime() - Date.now()) / (365 * 864e5), 1 / (365 * 24));
export function expiriesFor(u) {
  const out = [], now = new Date();
  if (u.seg === 'IDX') {
    const d = new Date(now); d.setHours(15, 30, 0, 0);
    while (out.length < 3) { d.setDate(d.getDate() + 1); if (d.getDay() === 4) out.push(ymd(d)); }
  } else {
    for (let m = 0; out.length < 3 && m < 6; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m + 1, 0, 15, 30);
      while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
      if (d > now) out.push(ymd(d));
    }
  }
  return out;
}
export const optId = (u, k, t, e) => [u, k, t, e].join('|');
export const futId = (u, e) => u + '|FUT|' + e;
export function oiFor(und, k, type, spot, step) {
  const d = Math.abs(k - spot) / step;
  return 6 + mulberry(hash(und + k + type))() * 40 * Math.exp(-d / 8) + (type === 'CE' ? (k > spot ? 10 : 0) : k < spot ? 10 : 0);
}
