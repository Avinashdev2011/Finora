// FINORA market data. REAL prices only, nothing is generated.
// Source: Yahoo Finance public chart data for NSE/BSE symbols, delayed by the source and unofficial. It needs a browser-reachable
// route: either direct (if the source allows it) or your own proxy (see worker/finora-feed.js and Settings, Data source).
// When data cannot be loaded the app shows no prices at all and blocks trading, it never falls back to made-up numbers.
const S = (id, y, name, sec, seg = 'EQ', trade = true) => ({ id, y, name, sec, seg, trade });
const eq = (id, name, sec) => S(id, id + '.NS', name, sec);
export const UNIVERSE = [
  S('NIFTY', '^NSEI', 'NIFTY 50', 'Index', 'IDX', false), S('BANKNIFTY', '^NSEBANK', 'NIFTY Bank', 'Index', 'IDX', false), S('SENSEX', '^BSESN', 'S&P BSE SENSEX', 'Index', 'IDX', false),
  eq('RELIANCE', 'Reliance Industries', 'Energy'), eq('TCS', 'Tata Consultancy Services', 'IT'), eq('INFY', 'Infosys', 'IT'), eq('HCLTECH', 'HCL Technologies', 'IT'), eq('WIPRO', 'Wipro', 'IT'), eq('TECHM', 'Tech Mahindra', 'IT'),
  eq('HDFCBANK', 'HDFC Bank', 'Banking'), eq('ICICIBANK', 'ICICI Bank', 'Banking'), eq('SBIN', 'State Bank of India', 'Banking'), eq('AXISBANK', 'Axis Bank', 'Banking'), eq('KOTAKBANK', 'Kotak Mahindra Bank', 'Banking'), eq('INDUSINDBK', 'IndusInd Bank', 'Banking'),
  eq('BAJFINANCE', 'Bajaj Finance', 'Financials'), eq('BAJAJFINSV', 'Bajaj Finserv', 'Financials'),
  eq('ITC', 'ITC', 'FMCG'), eq('HINDUNILVR', 'Hindustan Unilever', 'FMCG'), eq('NESTLEIND', 'Nestle India', 'FMCG'), eq('BRITANNIA', 'Britannia Industries', 'FMCG'),
  eq('LT', 'Larsen & Toubro', 'Infra'), eq('ADANIPORTS', 'Adani Ports', 'Infra'), eq('ULTRACEMCO', 'UltraTech Cement', 'Infra'), eq('GRASIM', 'Grasim Industries', 'Infra'), eq('ADANIENT', 'Adani Enterprises', 'Infra'),
  eq('BHARTIARTL', 'Bharti Airtel', 'Telecom'),
  eq('MARUTI', 'Maruti Suzuki', 'Auto'), eq('M&M', 'Mahindra & Mahindra', 'Auto'), eq('EICHERMOT', 'Eicher Motors', 'Auto'), eq('HEROMOTOCO', 'Hero MotoCorp', 'Auto'), eq('BAJAJ-AUTO', 'Bajaj Auto', 'Auto'),
  eq('SUNPHARMA', 'Sun Pharma', 'Pharma'), eq('DRREDDY', 'Dr Reddys Laboratories', 'Pharma'), eq('CIPLA', 'Cipla', 'Pharma'), eq('DIVISLAB', 'Divis Laboratories', 'Pharma'), eq('APOLLOHOSP', 'Apollo Hospitals', 'Healthcare'),
  eq('TATASTEEL', 'Tata Steel', 'Metals'), eq('JSWSTEEL', 'JSW Steel', 'Metals'), eq('HINDALCO', 'Hindalco Industries', 'Metals'),
  eq('ONGC', 'ONGC', 'Energy'), eq('NTPC', 'NTPC', 'Energy'), eq('POWERGRID', 'Power Grid', 'Energy'), eq('COALINDIA', 'Coal India', 'Energy'), eq('BPCL', 'Bharat Petroleum', 'Energy'),
  eq('ASIANPAINT', 'Asian Paints', 'Consumer'), eq('TITAN', 'Titan Company', 'Consumer'),
  S('NIFTYBEES', 'NIFTYBEES.NS', 'Nippon Nifty 50 BeES', 'ETF', 'ETF'), S('BANKBEES', 'BANKBEES.NS', 'Nippon Bank BeES', 'ETF', 'ETF'), S('GOLDBEES', 'GOLDBEES.NS', 'Nippon Gold BeES', 'ETF', 'ETF'), S('ITBEES', 'ITBEES.NS', 'Nippon IT BeES', 'ETF', 'ETF'),
  S('USDINR', 'USDINR=X', 'US Dollar / Rupee', 'Currency', 'CUR', false), S('EURINR', 'EURINR=X', 'Euro / Rupee', 'Currency', 'CUR', false), S('GBPINR', 'GBPINR=X', 'Pound / Rupee', 'Currency', 'CUR', false), S('JPYINR', 'JPYINR=X', 'Yen / Rupee', 'Currency', 'CUR', false),
];
export const META = new Map(UNIVERSE.map((u) => [u.id, u]));
export const M = {};
UNIVERSE.forEach((u) => { M[u.id] = { ltp: 0, prev: 0, open: 0, hi: 0, lo: 0, v: 0, t: 0, ok: false, spark: [], sess: null, fetched: 0 }; });
export const ids = (seg) => UNIVERSE.filter((u) => u.seg === seg && M[u.id].ok).map((u) => u.id);
export const DAY = 375;
export const TF = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '1D': DAY };
const CFG = { 1: ['1m', '5d'], 5: ['5m', '1mo'], 15: ['15m', '1mo'], 60: ['60m', '6mo'], 375: ['1d', '2y'] };

/* ---------- connection ---------- */
const FRESH = 20 * 60 * 1000; // a price older than 20 minutes during a session counts as not live
let proxy = '';
try { proxy = localStorage.getItem('finora.feed') || (window.FINORA_FEED && window.FINORA_FEED.proxy) || ''; } catch (e) { /* ignore */ }
export const getProxy = () => proxy;
export const feed = { status: 'connecting', err: '', lastOk: 0, loaded: 0 };
let notifier = () => {};
export const setNotifier = (f) => { notifier = f; };
const HOSTS = { yf: ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'], mf: ['https://api.mfapi.in'] };
export async function getJSON(kind, path, ms = 12000) {
  const urls = proxy ? [proxy.replace(/\/+$/, '') + '/' + kind + path] : HOSTS[kind].map((h) => h + path);
  let last;
  for (const u of urls) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try { const r = await fetch(u, { signal: ac.signal, cache: 'no-store' }); clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { clearTimeout(t); last = e.name === 'AbortError' ? new Error('timed out') : e; }
  }
  throw last || new Error('failed');
}
export function setProxy(v) { proxy = (v || '').trim(); try { proxy ? localStorage.setItem('finora.feed', proxy) : localStorage.removeItem('finora.feed'); } catch (e) { /* ignore */ } series.clear(); feed.status = 'connecting'; notifier(); refreshAll(true); }

const num = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
function parseCandles(r) {
  const ts = r.timestamp || [], q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {}, out = [];
  for (let i = 0; i < ts.length; i++) {
    const c = num(q.close && q.close[i]), o = num(q.open && q.open[i]) ?? c; if (c == null) continue;
    out.push({ t: ts[i] * 1000, o, h: Math.max(num(q.high && q.high[i]) ?? c, o, c), l: Math.min(num(q.low && q.low[i]) ?? c, o, c), c, v: num(q.volume && q.volume[i]) || 0 });
  }
  return out;
}
const chartPath = (y, interval, range) => `/v8/finance/chart/${encodeURIComponent(y)}?interval=${interval}&range=${range}&includePrePost=false`;

function applyQuote(id, meta, cs) {
  const m = M[id], price = num(meta.regularMarketPrice), prev = num(meta.chartPreviousClose) ?? num(meta.previousClose);
  if (!(price > 0) || !(prev > 0)) return false;
  m.ltp = price; m.prev = prev; m.t = (num(meta.regularMarketTime) || 0) * 1000;
  m.hi = num(meta.regularMarketDayHigh) ?? (cs.length ? Math.max(...cs.map((x) => x.h)) : price); m.lo = num(meta.regularMarketDayLow) ?? (cs.length ? Math.min(...cs.map((x) => x.l)) : price);
  m.v = num(meta.regularMarketVolume) ?? cs.reduce((a, x) => a + x.v, 0); m.open = cs.length ? cs[0].o : price;
  if (cs.length) m.spark = cs.map((x) => x.c);
  const p = meta.currentTradingPeriod && meta.currentTradingPeriod.regular; m.sess = p ? [p.start * 1000, p.end * 1000] : null;
  m.fetched = Date.now(); if (!m.ok) { m.ok = true; feed.loaded++; }
  patchSeries(id, price, m.t); return true;
}
async function loadQuote(u) {
  const j = await getJSON('yf', chartPath(u.y, '5m', '1d')), r = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r || !r.meta) throw new Error('no data');
  return applyQuote(u.id, r.meta, parseCandles(r));
}
let running = false, failStreak = 0;
export async function refreshAll(force) {
  if (running && !force) return; running = true;
  const q = UNIVERSE.slice(); let okN = 0, errMsg = '';
  await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const u = q.shift(); try { if (await loadQuote(u)) okN++; } catch (e) { errMsg = e.message || 'failed'; } } }));
  running = false;
  if (okN > 0) { feed.status = 'ok'; feed.err = ''; feed.lastOk = Date.now(); failStreak = 0; }
  else if (!feed.loaded) { feed.status = 'error'; feed.err = errMsg || 'unreachable'; failStreak++; }
  notifier();
}
let focusId = null;
export const focusSymbol = (id) => { focusId = id; };
export function startFeed() {
  refreshAll();
  setInterval(() => { const live = isLive('NIFTY') || isLive('RELIANCE'); if (feed.status !== 'ok' || document.hidden) { if (feed.status !== 'ok') refreshAll(); return; } if (Date.now() - feed.lastOk > (live ? 20000 : 300000)) refreshAll(); }, 5000);
  setInterval(async () => { const u = focusId && META.get(focusId); if (!u || document.hidden || feed.status !== 'ok' || !isLive(focusId)) return; try { await loadQuote(u); notifier(); } catch (e) { /* keep last */ } }, 5000);
  addEventListener('online', () => refreshAll(true));
}

/* ---------- sessions and freshness ---------- */
export const SESSIONS = { EQ: 'NSE and BSE 9:15 AM to 3:30 PM IST, Monday to Friday', ETF: 'NSE and BSE 9:15 AM to 3:30 PM IST, Monday to Friday', IDX: 'NSE and BSE 9:15 AM to 3:30 PM IST, Monday to Friday', CUR: 'Forex rates, nearly 24 hours on weekdays' };
export function isLive(id) {
  const m = M[id]; if (!m || !m.ok) return false; const n = Date.now();
  return (!m.sess || (n >= m.sess[0] && n <= m.sess[1])) && n - m.t < FRESH;
}
export const marketOpen = (seg) => UNIVERSE.some((u) => u.seg === seg && isLive(u.id)) ;
export const priceMode = (id) => (isLive(id) ? 'Live' : 'Close');
export const asOf = (id) => { const t = M[id] && M[id].t; return t ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(t) + ' IST' : ''; };
export const ltp = (id) => M[id].ltp;
export const chg = (id) => (M[id].prev ? M[id].ltp - M[id].prev : 0);
export const chgp = (id) => (M[id].prev ? ((M[id].ltp - M[id].prev) / M[id].prev) * 100 : 0);

/* ---------- candle series (real, loaded on demand) ---------- */
const series = new Map(), EMPTY = []; let inflight = 0;
function want(id, k) {
  const key = id + '|' + k, s = series.get(key), n = Date.now();
  if (s && (s.loading || n - s.at < (isLive(id) ? 300000 : 1800000))) return;
  if (inflight >= 5) return;
  const cur = s || { c: [], at: 0, loading: false }; cur.loading = true; series.set(key, cur); inflight++;
  const [iv, rg] = CFG[k] || CFG[15];
  getJSON('yf', chartPath(META.get(id).y, iv, rg)).then((j) => {
    const r = j.chart.result[0]; cur.c = parseCandles(r); cur.at = Date.now(); cur.loading = false; cur.err = ''; inflight--; notifier();
  }).catch((e) => { inflight--; cur.loading = false; cur.at = Date.now() - 270000; cur.err = e.message; });
}
export function agg(id, k) { if (!META.get(id)) return EMPTY; want(id, k); const s = series.get(id + '|' + k); return s ? s.c : EMPTY; }
export const seriesState = (id, k) => { const s = series.get(id + '|' + k); return s ? (s.loading ? 'loading' : s.err && !s.c.length ? 'error' : s.c.length ? 'ok' : 'loading') : 'loading'; };
export const preload = (id, k) => { want(id, k); };
function patchSeries(id, price, t) {
  for (const [key, s] of series) {
    if (!key.startsWith(id + '|') || !s.c.length) continue;
    const k = +key.split('|')[1], ms = (k === DAY ? 864e5 : k * 6e4), last = s.c[s.c.length - 1];
    if (t >= last.t + ms) { const nt = last.t + Math.floor((t - last.t) / ms) * ms; s.c.push({ t: nt, o: price, h: price, l: price, c: price, v: 0 }); }
    else { last.c = price; if (price > last.h) last.h = price; if (price < last.l) last.l = price; }
  }
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
  const d = agg(id, DAY); if (d.length < 30) return null;
  const cs = d.map((x) => x.c), last = cs[cs.length - 1];
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
  return UNIVERSE.filter((u) => M[u.id].ok && (u.id.includes(v) || u.name.toUpperCase().includes(v))).sort((a, b) => (b.id.startsWith(v) ? 1 : 0) - (a.id.startsWith(v) ? 1 : 0)).slice(0, limit);
}
