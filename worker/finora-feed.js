// FINORA data proxy: a tiny Cloudflare Worker (free plan is enough).
// /yf/*  ->  https://query1.finance.yahoo.com/*   (NSE/BSE quotes and candles)
// /mf/*  ->  https://api.mfapi.in/*               (AMFI mutual fund NAVs)
// It only adds CORS headers and a short cache. It never alters the data.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': '*' };
export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url);
    let target, ttl;
    if (u.pathname.startsWith('/yf/')) { target = 'https://query1.finance.yahoo.com/' + u.pathname.slice(4) + u.search; ttl = 15; }
    else if (u.pathname.startsWith('/mf/')) { target = 'https://api.mfapi.in/' + u.pathname.slice(4) + u.search; ttl = 1800; }
    else return new Response('FINORA feed proxy', { headers: CORS });
    const r = await fetch(target, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; FINORA)' }, cf: { cacheTtl: ttl, cacheEverything: true } });
    const h = new Headers(r.headers); Object.entries(CORS).forEach(([k, v]) => h.set(k, v)); h.set('cache-control', 'public, max-age=' + ttl);
    return new Response(r.body, { status: r.status, headers: h });
  },
};
