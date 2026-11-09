# FINORA: Trade Beyond Limits

React app: public website + login + paper-trading terminal for Indian markets (NSE, BSE, MCX, currency).
Phase 1 uses virtual money (₹10,00,000) and a built-in price simulator. No order reaches a broker or exchange.

## Pages
Website (public): `/welcome`, `/products`, `/pricing`, `/platforms`, `/about`, `/support`, `/legal/terms|privacy|risk`, `/login`, `/signup`
App (login required, redirects back to your last page): Home, Markets, Watchlists, Charts, F&O, Commodities, Currency, Mutual funds, IPO, Orders (book, trades, GTT, baskets), Portfolio, Funds, Reports, Scanner, Alerts, Learn, Tools, Settings, Stock detail.

## Build and run
    npm install          # react, react-dom, react-icons, esbuild
    npm run build        # outputs dist/ (static site + PWA) and dist/single.html
    npm run dev          # watch + local server on http://localhost:5173

## Host free (static hosting, no server needed)
Upload the `dist/` folder to Netlify Drop, Cloudflare Pages, GitHub Pages or Vercel. Routing uses the URL hash, so no rewrite rules are required.

## Market hours (IST, Monday to Friday, no holiday calendar yet)
Equity, ETF, index 9:15 to 15:30. MCX 9:00 to 23:30. Currency 9:00 to 17:00.
When a segment is closed, prices freeze and orders, alerts and GTTs do not run. Settings has a clearly labelled Demo mode to simulate while closed.

## Auth (demo)
Accounts are stored in the browser (localStorage) with a salted SHA-256 hash. There is no password reset. Replace `src/lib/auth.js` with real backend auth in Phase 2 (see `backend/`).

## Going live later
Real live charts need a licensed market data feed. Replace `tick()` and candle generation in `src/lib/market.js` with a feed adapter. Real-money trading needs a regulated broker partner. Insurance, loans, pledge, MTF, KYC and payments are not built.
