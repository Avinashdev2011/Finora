// FINORA engine: state, persistence, order matching, margin, charges, GTT, baskets, funds, mutual funds, IPOs.
// Everything is virtual money. No order reaches a broker or exchange.
import { useSyncExternalStore } from 'react';
import { M, META, UNIVERSE, tick as marketTick, bs, yrs, marketOpen, setForceOpen, SESSIONS } from './market.js';
import { FUND, navNow, navOn } from './mfdata.js';
import { dlab, ymd, mulberry, hash, dayNum } from './util.js';

const KEY = 'finora.react.v2';
export const START = 1000000;
const DEF_WL = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'ITC'];

const fresh = () => ({
  v: 2, name: 'Trader', start: START, cash: START, ipoBlocked: 0, holdings: {}, positions: {}, orders: [], trades: [], gtts: [], baskets: [],
  wls: { 'Watchlist 1': DEF_WL.slice(), 'Commodities and FX': ['GOLD', 'SILVER', 'CRUDEOIL', 'USDINR'] }, wl: 'Watchlist 1',
  alerts: [], journal: [], eq: [], nid: 1, realized: 0, charges: 0, dayStart: null, theme: 'dark',
  ledger: [{ ts: Date.now(), type: 'OPENING', amt: START, note: 'Opening virtual balance', bal: START }],
  mf: { h: {}, sips: [], tx: [] }, ipo: { bids: [] }, notifs: [], simClosed: false,
});
function load() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (r && r.v === 2) { const f = fresh(); return { ...f, ...r, mf: { ...f.mf, ...r.mf }, ipo: { ...f.ipo, ...r.ipo } }; }
  } catch (e) { /* ignore */ }
  return fresh();
}
let S = load();
setForceOpen(S.simClosed);
export const getS = () => S;
export const isOpenFor = (i) => marketOpen(i.u.seg);
export const setSimClosed = (v) => { S.simClosed = !!v; setForceOpen(v); commit(); };
export const closedMsg = (i) => `Market is closed (${(SESSIONS[i.u.seg] || SESSIONS.EQ)[2]}, Monday to Friday). Orders can be placed when it opens.`;

/* ---------- store ---------- */
let ver = 0, pending = false, dirty = false, toasts = [];
const subs = new Set();
export const subscribe = (cb) => { subs.add(cb); return () => subs.delete(cb); };
const getVer = () => ver;
export const useLive = () => useSyncExternalStore(subscribe, getVer);
export function emit() { if (pending) return; pending = true; queueMicrotask(() => { pending = false; ver++; subs.forEach((f) => f()); }); }
export function commit() { dirty = true; emit(); }
export function mutate(fn) { fn(S); commit(); }
function persist() { if (!dirty) return; dirty = false; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
export const getToasts = () => toasts;
export function notify(msg, kind = '', keep = true) {
  const t = { id: Math.random(), msg, kind };
  toasts = [...toasts, t]; emit();
  setTimeout(() => { toasts = toasts.filter((x) => x !== t); emit(); }, 4500);
  if (keep) { S.notifs.unshift({ ts: Date.now(), msg, kind }); S.notifs.length = Math.min(S.notifs.length, 100); dirty = true; }
}
export const toastErr = (m) => notify(m, 'bad', false);

/* ---------- instruments ---------- */
const exOf = (u) => (u.seg === 'IDX' ? u.ex || 'NFO' : u.seg === 'COM' ? 'MCX' : u.seg === 'CUR' ? 'CDS' : 'NFO');
export function inst(id) {
  const p = id.split('|'), u = META.get(p[0]);
  if (!u) return null;
  if (p.length === 1) {
    if (u.seg === 'EQ' || u.seg === 'ETF') return { id, kind: 'EQ', und: id, u, name: u.name, label: id, lot: 1, ex: 'NSE', ltp: () => M[id].ltp };
    return { id, kind: 'SPOT', und: id, u, name: u.name, label: id, lot: 1, ex: u.seg === 'IDX' ? 'NSE' : exOf(u), ltp: () => M[id].ltp };
  }
  const carry = u.seg === 'CUR' ? 0.02 : u.seg === 'COM' ? 0.03 : 0.065;
  if (p[1] === 'FUT') return { id, kind: 'FUT', und: p[0], u, name: u.name + ' Futures', label: `${p[0]} FUT ${dlab(p[2])}`, lot: u.lot, exp: p[2], ex: exOf(u), ltp: () => M[p[0]].ltp * (1 + carry * yrs(p[2])) };
  const k = +p[1], t = p[2], e = p[3];
  return { id, kind: 'OPT', und: p[0], u, name: `${p[0]} ${k} ${t}`, label: `${p[0]} ${dlab(e)} ${k} ${t}`, lot: u.lot, exp: e, k, type: t, ex: exOf(u), ltp: () => bs(M[p[0]].ltp, k, yrs(e), t, u.iv || 0.13) };
}
const spr = (i) => Math.max(i.kind === 'OPT' ? 0.05 : 0.01, i.ltp() * (i.u.seg === 'CUR' ? 0.00003 : 0.00004));
export const bid = (i) => Math.max(0.01, i.ltp() - spr(i) / 2);
export const ask = (i) => i.ltp() + spr(i) / 2;
export const px = (i, side) => (side === 'BUY' ? ask(i) : bid(i));
export const prodOf = (i) => (i.kind === 'EQ' ? 'INTRADAY' : 'NRML');
export const isExpired = (i) => i.exp && new Date(i.exp + 'T15:30:00') < new Date();

/* ---------- charges and margin (estimates) ---------- */
export function charges(i, side, units, price, product) {
  const v = units * price, buy = side === 'BUY', seg = i.u ? i.u.seg : 'EQ';
  let br = 0, stt = 0, ex = 0, st = 0;
  if (i.kind === 'EQ' && product === 'DELIVERY') { stt = v * 0.001; ex = v * 0.0000297; st = buy ? v * 0.00015 : 0; }
  else if (i.kind === 'EQ') { br = Math.min(20, v * 0.0003); stt = buy ? 0 : v * 0.00025; ex = v * 0.0000297; st = buy ? v * 0.00003 : 0; }
  else if (i.kind === 'FUT') { br = Math.min(20, v * 0.0003); stt = seg === 'CUR' ? 0 : buy ? 0 : v * (seg === 'COM' ? 0.0001 : 0.0002); ex = v * (seg === 'CUR' ? 0.0000035 : 0.0000173); st = buy ? v * 0.00002 : 0; }
  else { br = 20; stt = buy ? 0 : v * 0.001; ex = v * 0.0003503; st = buy ? v * 0.00003 : 0; }
  const sebi = v * 0.000001, gst = (br + ex + sebi) * 0.18;
  return { brokerage: br, stt, exch: ex, gst, sebi, stamp: st, total: br + stt + ex + gst + sebi + st };
}
export function posMargin(i, qty, avg) {
  if (!qty) return 0;
  const n = Math.abs(qty), seg = i.u.seg;
  if (i.kind === 'EQ') return 0.2 * n * avg;
  if (i.kind === 'FUT') return (seg === 'COM' ? 0.08 : seg === 'CUR' ? 0.03 : 0.12) * n * avg;
  return qty > 0 ? n * avg : (seg === 'EQ' ? 0.2 : 0.15) * M[i.und].ltp * n;
}
export const blocked = () => Object.values(S.positions).reduce((a, p) => { const i = inst(p.id); return i ? a + posMargin(i, p.qty, p.avg) : a; }, 0);
export const available = () => S.cash - blocked();
export const holdMV = () => Object.entries(S.holdings).reduce((a, [s, h]) => a + h.qty * M[s].ltp, 0);
export const holdCost = () => Object.values(S.holdings).reduce((a, h) => a + h.qty * h.avg, 0);
export const unreal = () => Object.values(S.positions).reduce((a, p) => { const i = inst(p.id); return i ? a + (i.ltp() - p.avg) * p.qty : a; }, 0);
export const mfValue = () => Object.entries(S.mf.h).reduce((a, [id, h]) => a + h.units * navNow(FUND[id]), 0);
export const mfInvested = () => Object.values(S.mf.h).reduce((a, h) => a + h.invested, 0);
export const equity = () => S.cash + holdMV() + unreal() + mfValue() + S.ipoBlocked;
export const dayPnl = () => equity() - (S.dayStart ? S.dayStart.v : equity());

export function marginDelta(i, side, units, price, product) {
  if (i.kind === 'EQ' && product === 'DELIVERY') return side === 'BUY' ? units * price : 0;
  const p = S.positions[i.id + '|' + prodOf(i)] || { qty: 0, avg: 0 }, sgn = side === 'BUY' ? 1 : -1, nq = p.qty + sgn * units;
  let navg = p.avg;
  if (nq === 0) navg = 0;
  else if (p.qty === 0 || (Math.sign(nq) !== Math.sign(p.qty))) navg = price;
  else if (Math.abs(nq) > Math.abs(p.qty)) navg = (p.avg * Math.abs(p.qty) + price * units) / Math.abs(nq);
  return posMargin(i, nq, navg) - posMargin(i, p.qty, p.avg);
}

/* ---------- order engine ---------- */
function applyFill(i, side, units, price, product, ord) {
  const cb = charges(i, side, units, price, product), buy = side === 'BUY';
  let real = 0;
  if (i.kind === 'EQ' && product === 'DELIVERY') {
    const h = S.holdings[i.id] || { qty: 0, avg: 0, since: Date.now() };
    if (buy) { h.avg = (h.avg * h.qty + price * units) / (h.qty + units); h.qty += units; S.cash -= units * price; S.holdings[i.id] = h; }
    else { real = (price - h.avg) * units; h.qty -= units; S.cash += units * price; if (h.qty <= 0) delete S.holdings[i.id]; else S.holdings[i.id] = h; }
  } else {
    const key = i.id + '|' + product, p = S.positions[key] || { id: i.id, product, qty: 0, avg: 0 }, sgn = buy ? 1 : -1;
    let rem = units;
    if (p.qty !== 0 && Math.sign(p.qty) !== sgn) { const c = Math.min(Math.abs(p.qty), rem); real = (price - p.avg) * c * Math.sign(p.qty); p.qty += sgn * c; rem -= c; S.cash += real; }
    if (rem > 0) { const nq = p.qty + sgn * rem; p.avg = p.qty === 0 ? price : (p.avg * Math.abs(p.qty) + price * rem) / Math.abs(nq); p.qty = nq; }
    if (p.qty === 0) delete S.positions[key]; else S.positions[key] = p;
  }
  S.cash -= cb.total; S.charges += cb.total; S.realized += real;
  S.trades.unshift({ id: S.nid++, ts: Date.now(), iid: i.id, label: i.label, side, qty: units, price, product, charges: cb.total, cb, realized: real, orderId: ord ? ord.id : 0 });
  if (S.trades.length > 800) S.trades.length = 800;
}
export function validate(i, side, units, price, product) {
  if (!i || i.kind === 'SPOT') return 'This instrument cannot be traded directly. Trade its futures or options.';
  if (isExpired(i)) return 'This contract has expired.';
  if (!isOpenFor(i)) return closedMsg(i);
  if (!(units > 0) || !Number.isInteger(units)) return 'Enter a whole quantity above zero.';
  if (!(price > 0)) return 'Enter a valid price.';
  if (i.kind === 'EQ' && product === 'DELIVERY' && side === 'SELL') { const h = S.holdings[i.id]; if (!h || h.qty < units) return `You hold ${h ? h.qty : 0} units of ${i.id}. Delivery sells cannot exceed holdings.`; }
  const need = marginDelta(i, side, units, price, product) + (i.kind === 'EQ' && product === 'DELIVERY' && side === 'BUY' ? charges(i, side, units, price, product).total : 0);
  if (need > available() + 0.005) return `Not enough virtual funds. Needs ${'₹' + need.toLocaleString('en-IN', { maximumFractionDigits: 2 })}, available ${'₹' + available().toLocaleString('en-IN', { maximumFractionDigits: 2 })}.`;
  return null;
}
function fillOrder(ord, i, price) {
  const err = validate(i, ord.side, ord.qty, price, ord.product);
  if (err) { ord.status = 'REJECTED'; ord.note = err; return; }
  ord.fill = price; ord.status = 'EXECUTED'; applyFill(i, ord.side, ord.qty, price, ord.product, ord);
}
function tryOrder(ord, i) {
  const buy = ord.side === 'BUY', p = px(i, ord.side), l = i.ltp();
  if (ord.type === 'LIMIT') { if (buy ? p <= ord.price : p >= ord.price) fillOrder(ord, i, p); }
  else if (ord.type === 'SL') { if (buy ? l >= ord.trig : l <= ord.trig) fillOrder(ord, i, p); }
  else if (ord.type === 'SL-L') { if (buy ? l >= ord.trig : l <= ord.trig) ord.trigd = true; if (ord.trigd && (buy ? p <= ord.price : p >= ord.price)) fillOrder(ord, i, p); }
}
export function placeOrder(o) {
  const i = inst(o.iid);
  if (!i) return { ok: false, msg: 'Unknown instrument.' };
  const units = o.qty * (i.kind === 'EQ' ? 1 : i.lot);
  const ord = { id: S.nid++, ts: Date.now(), iid: o.iid, label: i.label, side: o.side, qty: units, product: o.product, type: o.type, price: o.price || 0, trig: o.trig || 0, status: 'OPEN', fill: 0, note: '', src: o.src || '' };
  const ref = o.type === 'MARKET' ? px(i, o.side) : o.price || 0;
  const err = validate(i, o.side, units, ref, o.product)
    || ((o.type === 'SL' || o.type === 'SL-L') && !(o.trig > 0) ? 'Enter a trigger price.' : null)
    || ((o.type === 'LIMIT' || o.type === 'SL-L') && !(o.price > 0) ? 'Enter a limit price.' : null);
  S.orders.unshift(ord);
  if (S.orders.length > 500) S.orders.length = 500;
  if (err) { ord.status = 'REJECTED'; ord.note = err; commit(); return { ok: false, msg: err, order: ord }; }
  if (o.type === 'MARKET') fillOrder(ord, i, px(i, o.side)); else tryOrder(ord, i);
  commit();
  const done = ord.status === 'EXECUTED';
  return { ok: ord.status !== 'REJECTED', order: ord, msg: done ? `Executed ${o.side} ${units} ${i.label} at ${ord.fill.toFixed(2)}` : ord.status === 'REJECTED' ? ord.note : 'Order accepted and waiting for its trigger or limit price.' };
}
export function cancelOrder(id) { const o = S.orders.find((x) => x.id === id); if (o && o.status === 'OPEN') { o.status = 'CANCELLED'; commit(); notify('Order #' + id + ' cancelled'); } }
export function squareOff(key) {
  const p = S.positions[key]; if (!p) return;
  const i = inst(p.id), r = placeOrder({ iid: p.id, side: p.qty > 0 ? 'SELL' : 'BUY', qty: Math.abs(p.qty) / (i.kind === 'EQ' ? 1 : i.lot), product: p.product, type: 'MARKET' });
  r.ok ? notify(r.msg, 'ok') : toastErr(r.msg);
}
export function squareOffAll() { Object.keys(S.positions).forEach(squareOff); }
function processOrders() {
  S.orders.forEach((o) => {
    if (o.status !== 'OPEN') return;
    const i = inst(o.iid); if (!i || !isOpenFor(i)) return;
    tryOrder(o, i);
    if (o.status !== 'OPEN') notify(`${o.status === 'EXECUTED' ? 'Executed' : 'Rejected'}: ${o.side} ${o.qty} ${o.label}${o.status === 'EXECUTED' ? ' at ' + o.fill.toFixed(2) : ''}`, o.status === 'EXECUTED' ? 'ok' : 'bad');
  });
}

/* ---------- GTT (good till triggered) and baskets ---------- */
export function createGTT(g) {
  const i = inst(g.iid); if (!i || i.kind === 'SPOT') return { ok: false, msg: 'Pick a tradable instrument.' };
  const l0 = i.ltp(), legs = g.legs.map((x) => ({ trig: +x.trig, price: +x.price || 0, label: x.label }));
  if (legs.some((x) => !(x.trig > 0))) return { ok: false, msg: 'Enter a trigger price.' };
  if (!(g.qty > 0)) return { ok: false, msg: 'Enter a quantity.' };
  legs.forEach((x) => { x.dir = x.trig > l0 ? 'up' : 'down'; });
  S.gtts.unshift({ id: S.nid++, ts: Date.now(), iid: g.iid, label: i.label, side: g.side, qty: g.qty, product: g.product, kind: legs.length > 1 ? 'OCO' : 'SINGLE', legs, status: 'ACTIVE', ref: l0 });
  commit(); notify('GTT created for ' + i.label, 'ok'); return { ok: true };
}
export function cancelGTT(id) { const g = S.gtts.find((x) => x.id === id); if (g && g.status === 'ACTIVE') { g.status = 'CANCELLED'; commit(); } }
function processGTT() {
  S.gtts.forEach((g) => {
    if (g.status !== 'ACTIVE') return;
    const i = inst(g.iid); if (!i || !isOpenFor(i)) return;
    const l = i.ltp(), hit = g.legs.find((x) => (x.dir === 'up' ? l >= x.trig : l <= x.trig));
    if (!hit) return;
    const r = placeOrder({ iid: g.iid, side: g.side, qty: g.qty, product: g.product, type: hit.price > 0 ? 'LIMIT' : 'MARKET', price: hit.price, src: 'GTT' });
    g.status = r.ok ? 'TRIGGERED' : 'FAILED'; g.orderId = r.order ? r.order.id : 0; g.note = r.ok ? '' : r.msg;
    notify(`GTT ${g.status.toLowerCase()}: ${g.side} ${g.label} at trigger ${hit.trig}`, r.ok ? 'ok' : 'bad');
  });
}
export const createBasket = (name) => { S.baskets.unshift({ id: S.nid++, name: name || 'Basket ' + (S.baskets.length + 1), items: [] }); commit(); };
export const deleteBasket = (id) => { S.baskets = S.baskets.filter((b) => b.id !== id); commit(); };
export const addBasketItem = (id, it) => { const b = S.baskets.find((x) => x.id === id); if (b) { b.items.push({ ...it, k: Math.random() }); commit(); } };
export const removeBasketItem = (id, k) => { const b = S.baskets.find((x) => x.id === id); if (b) { b.items = b.items.filter((x) => x.k !== k); commit(); } };
export function execBasket(id) {
  const b = S.baskets.find((x) => x.id === id); if (!b || !b.items.length) return;
  let ok = 0, bad = 0;
  b.items.forEach((it) => { const r = placeOrder({ ...it, src: 'BASKET' }); r.ok && r.order.status !== 'REJECTED' ? ok++ : bad++; });
  notify(`Basket "${b.name}": ${ok} order(s) placed${bad ? ', ' + bad + ' rejected' : ''}`, bad ? 'bad' : 'ok');
}

/* ---------- alerts ---------- */
function checkAlerts() {
  S.alerts.forEach((a) => {
    if (a.done || !M[a.sym] || !marketOpen(META.get(a.sym).seg)) return;
    const l = M[a.sym].ltp;
    if (a.cond === 'above' ? l >= a.price : l <= a.price) { a.done = true; a.at = Date.now(); notify(`Alert: ${a.sym} is ${a.cond} ${a.price} (now ${l.toFixed(2)})`, 'ok'); dirty = true; }
  });
}

/* ---------- funds ---------- */
function ledger(type, amt, note) { S.ledger.unshift({ ts: Date.now(), type, amt, note, bal: S.cash }); if (S.ledger.length > 600) S.ledger.length = 600; }
export function addFunds(amt) {
  if (!(amt > 0) || amt > 1e8) return { ok: false, msg: 'Enter an amount between ₹1 and ₹10 crore.' };
  S.cash += amt; S.start += amt; if (S.dayStart) S.dayStart.v += amt; ledger('DEPOSIT', amt, 'Added virtual funds'); commit(); notify('Added ₹' + amt.toLocaleString('en-IN') + ' virtual funds', 'ok'); return { ok: true };
}
export function withdrawFunds(amt) {
  if (!(amt > 0)) return { ok: false, msg: 'Enter an amount.' };
  if (amt > available()) return { ok: false, msg: 'You can withdraw up to your available margin.' };
  S.cash -= amt; S.start -= amt; if (S.dayStart) S.dayStart.v -= amt; ledger('WITHDRAWAL', -amt, 'Withdrew virtual funds'); commit(); notify('Withdrew ₹' + amt.toLocaleString('en-IN'), 'ok'); return { ok: true };
}

/* ---------- mutual funds ---------- */
export function mfBuy(fid, amt, note = 'Lumpsum') {
  const f = FUND[fid]; if (!f) return { ok: false, msg: 'Unknown fund.' };
  if (!(amt >= 100)) return { ok: false, msg: 'Minimum investment is ₹100.' };
  if (amt > available()) return { ok: false, msg: 'Not enough available funds.' };
  const nav = navNow(f), units = amt / nav, h = S.mf.h[fid] || { units: 0, invested: 0 };
  h.units += units; h.invested += amt; S.mf.h[fid] = h; S.cash -= amt;
  S.mf.tx.unshift({ ts: Date.now(), fid, type: 'BUY', amt, units, nav, note }); ledger('MF BUY', -amt, f.name);
  commit(); return { ok: true, msg: `Invested ₹${amt.toLocaleString('en-IN')} in ${f.name}: ${units.toFixed(3)} units at NAV ${nav.toFixed(2)}` };
}
export function mfRedeem(fid, units) {
  const f = FUND[fid], h = S.mf.h[fid]; if (!f || !h) return { ok: false, msg: 'No holding.' };
  if (!(units > 0) || units > h.units + 1e-9) return { ok: false, msg: 'Enter units up to your holding.' };
  const nav = navNow(f), amt = units * nav, frac = units / h.units;
  h.invested -= h.invested * frac; h.units -= units; if (h.units < 1e-6) delete S.mf.h[fid];
  S.cash += amt; S.mf.tx.unshift({ ts: Date.now(), fid, type: 'SELL', amt, units, nav, note: 'Redemption' }); ledger('MF REDEEM', amt, f.name);
  commit(); return { ok: true, msg: `Redeemed ${units.toFixed(3)} units for ₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` };
}
export function createSIP(fid, amt, day) {
  if (!FUND[fid]) return { ok: false, msg: 'Unknown fund.' };
  if (!(amt >= 100)) return { ok: false, msg: 'Minimum SIP is ₹100.' };
  S.mf.sips.unshift({ id: S.nid++, fid, amt, day: Math.min(28, Math.max(1, day | 0)), start: ymd(new Date()), active: true, done: [] });
  commit(); processSIPs(); return { ok: true, msg: 'SIP created.' };
}
export const toggleSIP = (id) => { const s = S.mf.sips.find((x) => x.id === id); if (s) { s.active = !s.active; commit(); } };
export const deleteSIP = (id) => { S.mf.sips = S.mf.sips.filter((x) => x.id !== id); commit(); };
export function processSIPs() {
  const today = ymd(new Date()), now = new Date();
  S.mf.sips.forEach((s) => {
    if (!s.active) return;
    const st = new Date(s.start + 'T12:00:00');
    for (let y = st.getFullYear(), m = st.getMonth(); y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth()); m++) {
      if (m > 11) { m = 0; y++; }
      const due = `${y}-${String(m + 1).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`, key = due.slice(0, 7);
      if (due < s.start || due > today || s.done.includes(key)) { if (y === now.getFullYear() && m >= now.getMonth()) break; continue; }
      s.done.push(key);
      const r = mfBuy(s.fid, s.amt, 'SIP ' + key);
      notify(r.ok ? `SIP installment: ${r.msg}` : `SIP skipped for ${FUND[s.fid].name}: ${r.msg}`, r.ok ? 'ok' : 'bad');
      if (y === now.getFullYear() && m >= now.getMonth()) break;
    }
  });
}

/* ---------- IPO (demo, fictional companies) ---------- */
const H = 36e5, D = 864e5, t0 = new Date(); t0.setHours(10, 0, 0, 0);
const ipo = (id, name, sector, lo, hi, lot, size, off, subs, gain) => ({ id, name, sector, lo, hi, lot, size, open: t0.getTime() + off * D, close: t0.getTime() + (off + 3) * D + 7 * H, subs, gain });
export const IPOS = [
  ipo('AARAV', 'Aarav Solar Systems', 'Renewable energy', 182, 192, 78, 640, -1, 18.4, 21),
  ipo('BHAVYA', 'Bhavya Foods Ltd', 'Packaged food', 410, 432, 34, 1120, 0, 4.2, 9),
  ipo('COBALT', 'Cobalt Logistics', 'Logistics', 96, 102, 144, 380, 2, 1.1, -4),
  ipo('DELTALINE', 'Deltaline Semiconductors', 'Electronics', 520, 548, 27, 2450, 5, 32.5, 38),
  ipo('EVERGREEN', 'Evergreen Care Hospitals', 'Healthcare', 301, 318, 47, 1560, -5, 0.8, -6),
  ipo('FINTRAIL', 'Fintrail Payments', 'Fintech', 244, 258, 58, 900, -8, 51.2, 44),
];
export const ipoStatus = (x) => { const n = Date.now(); return n < x.open ? 'UPCOMING' : n < x.close ? 'OPEN' : 'CLOSED'; };
export const ipoSubs = (x) => { const n = Date.now(); if (n < x.open) return 0; const p = Math.min(1, (n - x.open) / (x.close - x.open)); return x.subs * (0.15 + 0.85 * p * p); };
export function ipoBid(id, lots) {
  const x = IPOS.find((i) => i.id === id); if (!x || ipoStatus(x) !== 'OPEN') return { ok: false, msg: 'This IPO is not open for bids.' };
  if (!(lots >= 1 && lots <= 13 && Number.isInteger(lots))) return { ok: false, msg: 'Retail bids are 1 to 13 lots.' };
  if (S.ipo.bids.some((b) => b.ipo === id && b.status === 'APPLIED')) return { ok: false, msg: 'You already have an active bid on this IPO.' };
  const amt = lots * x.lot * x.hi;
  if (amt > 200000) return { ok: false, msg: 'Retail bids are capped at ₹2,00,000.' };
  if (amt > available()) return { ok: false, msg: 'Not enough available funds to block for this bid.' };
  S.cash -= amt; S.ipoBlocked += amt;
  S.ipo.bids.unshift({ id: S.nid++, ipo: id, lots, price: x.hi, amt, ts: Date.now(), status: 'APPLIED' });
  ledger('IPO BID', -amt, x.name + ' (funds blocked)'); commit(); return { ok: true, msg: `Bid placed for ${lots} lot(s). ₹${amt.toLocaleString('en-IN')} blocked until allotment.` };
}
export function ipoCancel(bidId) {
  const b = S.ipo.bids.find((x) => x.id === bidId); if (!b || b.status !== 'APPLIED') return;
  const x = IPOS.find((i) => i.id === b.ipo); if (x && ipoStatus(x) !== 'OPEN') return;
  b.status = 'CANCELLED'; S.ipoBlocked -= b.amt; S.cash += b.amt; ledger('IPO REFUND', b.amt, 'Bid cancelled'); commit();
}
function processIPO() {
  S.ipo.bids.forEach((b) => {
    if (b.status !== 'APPLIED') return;
    const x = IPOS.find((i) => i.id === b.ipo); if (!x || ipoStatus(x) !== 'CLOSED') return;
    S.ipoBlocked -= b.amt;
    const win = mulberry(hash('allot' + b.id))() < Math.min(1, 1 / x.subs);
    if (win) {
      const listPx = x.hi * (1 + x.gain / 100), shares = x.lot, credit = shares * listPx, refund = b.amt - shares * x.hi;
      S.cash += refund + credit; b.status = 'ALLOTTED'; b.shares = shares; b.listPx = listPx; b.pnl = shares * (listPx - x.hi);
      ledger('IPO ALLOTMENT', refund + credit, `${x.name}: ${shares} shares sold at simulated listing price ${listPx.toFixed(2)}`);
      notify(`IPO allotted: ${x.name}, ${shares} shares. Simulated listing gain ${b.pnl >= 0 ? '+' : ''}₹${b.pnl.toFixed(0)}`, 'ok');
    } else {
      S.cash += b.amt; b.status = 'NOT ALLOTTED'; ledger('IPO REFUND', b.amt, x.name + ': not allotted'); notify(`IPO not allotted: ${x.name}. Funds returned.`);
    }
    dirty = true;
  });
}

/* ---------- account ---------- */
export function resetAccount(amount) {
  const f = fresh(); const keep = { name: S.name, theme: S.theme };
  S = { ...f, ...keep, start: amount, cash: amount, ledger: [{ ts: Date.now(), type: 'OPENING', amt: amount, note: 'Account reset', bal: amount }] };
  S.dayStart = { d: ymd(new Date()), v: amount }; commit();
}
export const exportData = () => JSON.stringify(S);
export function importData(txt) {
  try { const r = JSON.parse(txt); if (!r || r.v !== 2 || typeof r.cash !== 'number') return false; const f = fresh(); S = { ...f, ...r, mf: { ...f.mf, ...r.mf }, ipo: { ...f.ipo, ...r.ipo } }; commit(); return true; } catch (e) { return false; }
}
export function setWatch(fn) { fn(S); commit(); }
export function activeList() { return S.wls[S.wl] || (S.wl = Object.keys(S.wls)[0], S.wls[S.wl]); }
export const MFNAV = { navNow, navOn };

/* ---------- loop ---------- */
let started = false, n = 0;
export function startEngine() {
  if (started) return; started = true;
  const today = ymd(new Date());
  if (!S.dayStart || S.dayStart.d !== today) S.dayStart = { d: today, v: equity() };
  processSIPs(); processIPO();
  setInterval(() => {
    n++; marketTick(); processOrders(); processGTT(); checkAlerts();
    if (n % 10 === 0) { S.eq.push({ t: Date.now(), v: equity() }); if (S.eq.length > 600) S.eq.shift(); dirty = true; }
    if (n % 30 === 0) processIPO();
    if (n % 3600 === 0) processSIPs();
    emit();
  }, 1000);
  setInterval(persist, 3000);
  addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
}
export { UNIVERSE, dayNum, marketOpen };
