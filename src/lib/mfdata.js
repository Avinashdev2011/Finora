// Real mutual fund NAVs from AMFI data via mfapi.in (public, free). NAV is the last published end-of-day NAV.
import { getJSON, getProxy } from './market.js';

const cache = new Map(); // code -> { code, name, house, cat, navs:[{t,n}] oldest first, at }
let notifier = () => {};
export const setMfNotifier = (f) => { notifier = f; };
const pd = (s) => { const [d, m, y] = s.split('-'); return Date.UTC(+y, +m - 1, +d); };

export async function searchFunds(q) {
  const j = await getJSON('mf', '/mf/search?q=' + encodeURIComponent(q));
  return (Array.isArray(j) ? j : []).slice(0, 40).map((x) => ({ code: String(x.schemeCode), name: x.schemeName }));
}
export async function loadFund(code, force) {
  const c = cache.get(code);
  if (c && !force && Date.now() - c.at < 6 * 36e5) return c;
  const j = await getJSON('mf', '/mf/' + code, 20000);
  if (!j || !Array.isArray(j.data) || !j.data.length) throw new Error('No NAV data');
  const navs = j.data.map((x) => ({ t: pd(x.date), n: parseFloat(x.nav) })).filter((x) => x.n > 0).reverse();
  const m = j.meta || {}, f = { code, name: m.scheme_name || 'Fund ' + code, house: m.fund_house || '', cat: m.scheme_category || '', type: m.scheme_type || '', navs, at: Date.now() };
  cache.set(code, f); notifier(); return f;
}
export const fundInfo = (code) => cache.get(code) || null;
export const navNow = (code) => { const f = cache.get(code); return f ? f.navs[f.navs.length - 1].n : 0; };
export const navDate = (code) => { const f = cache.get(code); return f ? new Date(f.navs[f.navs.length - 1].t).toISOString().slice(0, 10) : ''; };
export function returns(code) {
  const f = cache.get(code); if (!f) return null;
  const last = f.navs[f.navs.length - 1], out = {};
  [['1M', 30], ['6M', 182], ['1Y', 365], ['3Y', 1095], ['5Y', 1826]].forEach(([k, d]) => {
    const t = last.t - d * 864e5; if (f.navs[0].t > t + 5 * 864e5) { out[k] = null; return; }
    let p = f.navs[0]; for (const x of f.navs) { if (x.t <= t) p = x; else break; }
    const yrs = d / 365; out[k] = d >= 365 ? (Math.pow(last.n / p.n, 1 / yrs) - 1) * 100 : (last.n / p.n - 1) * 100;
  });
  return out;
}
export const mfProxyNote = () => (getProxy() ? 'via your data proxy' : 'direct from mfapi.in');
