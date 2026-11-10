# FINORA · Trade Beyond Limits

Paper-trading and investing web app for Indian markets (React + esbuild, installable PWA).
Phase 1 uses **virtual money (₹10,00,000)** with **real market data**. No order ever reaches a broker.

## Data sources (no generated prices)
- Stocks, ETFs, indices (NIFTY, BANKNIFTY, SENSEX) and INR currency rates: Yahoo Finance public chart endpoint. Unofficial and usually delayed a few minutes.
- Mutual funds: AMFI NAVs through mfapi.in.
- Each price is labelled **Live** (inside the session and fresh) or **Close** (last close) with its timestamp. When closed, orders are blocked.
- If the feed cannot be reached the app shows "not connected". It never substitutes made-up numbers.
- Not available (no free reliable source, so removed): options, futures, MCX commodities, IPOs, fundamentals (P/E, market cap). These need a licensed feed or a broker API.

## Run
    npm install react react-dom react-icons esbuild
    node build.mjs          # outputs dist/ (static site + PWA) and dist/single.html
    cd dist && python3 -m http.server 8080

## Data proxy (recommended for hosting)
Browsers may block the Yahoo endpoint (CORS). Deploy `worker/finora-feed.js` as a free Cloudflare Worker, then either
paste its URL in **Settings → Data source** or set it in `public/config.js`:

    window.FINORA_FEED = { proxy: 'https://your-worker.workers.dev' };

The worker only adds CORS headers and a short cache. It does not change the data.

## Free hosting
Upload `dist/` to Cloudflare Pages, Netlify, Vercel or GitHub Pages (hash routing, no server rules needed).

## Notes
- Accounts and trades live in the browser only (localStorage). Demo-grade password hashing; do not reuse real passwords.
- Brand assets: `public/favicon.svg`, `favicon.ico`, `icons/`.
