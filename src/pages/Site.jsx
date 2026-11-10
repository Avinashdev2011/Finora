import { useEffect, useState } from 'react';
import { FiBarChart2, FiDollarSign, FiPieChart, FiActivity, FiFilter, FiBell, FiList, FiFileText, FiTool, FiCheck, FiArrowRight, FiMonitor, FiSmartphone, FiDownload, FiShield, FiTrendingUp, FiBookOpen, FiDatabase, FiClock, FiLock, FiStar } from 'react-icons/fi';
import { Link } from '../lib/router.jsx';
import { UNIVERSE, M, chgp, isLive, asOf, feed } from '../lib/market.js';
import { useLive } from '../lib/engine.js';
import { fmt, pc, cl } from '../lib/util.js';
import { useAuth } from '../lib/auth.js';
import { Reveal, CountUp, Tilt, HeroCanvas, MiniChart, Marquee, FAQ } from '../components/Site.jsx';

const PRODUCTS = [
  ['stocks', FiBarChart2, 'Stocks and ETFs', 'Equity', 'Practise with real NSE prices using market, limit, stop-loss and SL-limit orders, in intraday or delivery.', ['GTT and OCO orders', 'Baskets of orders', 'Margin and charges preview']],
  ['mf', FiPieChart, 'Mutual funds and SIP', 'Invest', 'Search real AMFI schemes with their published NAVs and past returns. Buy lumpsum or start a monthly SIP with virtual money.', ['Every AMFI-listed scheme', '1M to 5Y returns', 'Monthly SIP automation']],
  ['cur', FiDollarSign, 'Currency rates', 'Invest', 'Live USD, EUR, GBP and JPY rates against the rupee. View only, with sparklines and day range.', ['Four rupee pairs', 'Day high and low', 'View only, not tradable']],
  ['charts', FiActivity, 'Pro charts', 'Terminal', 'Fast canvas charts of real candles with indicators, drawing tools, pinch and zoom.', ['EMA, SMA, RSI, MACD, Bollinger', 'Trendline, fib, rectangle', 'Shows last close when closed']],
  ['scan', FiFilter, 'Scanner', 'Discover', 'Preset and custom scans on gainers, losers, RSI and technical signals, computed from real daily candles.', ['Preset scans', 'Price and signal filters', 'One-tap buy']],
  ['alert', FiBell, 'Alerts', 'Stay informed', 'Price alerts that check real prices while the market is open, with a notification history.', ['Above or below triggers', 'Notification centre', 'Paused when closed']],
  ['ord', FiList, 'Orders and portfolio', 'Account', 'Order book, trade book, holdings, positions, equity curve and allocation.', ['Square-off in one tap', 'Day and overall P&L', 'Equity curve']],
  ['rep', FiFileText, 'Reports', 'Account', 'P&L by instrument, charges breakdown, illustrative tax estimate and CSV export.', ['Charges split', 'Ledger', 'CSV downloads']],
  ['tool', FiTool, 'Calculators and learning', 'Learn', 'SIP, EMI, brokerage, position size and CAGR calculators, a trading journal and beginner lessons.', ['Eight tools', 'Trading journal', 'Beginner lessons']],
];

const FAQS = [
  ['Is FINORA real money trading?', 'Not yet. Phase 1 is a practice platform with ₹10,00,000 of virtual money. No order is sent to a broker or exchange. Real-money trading is planned for a later phase and needs regulatory approvals.'],
  ['Are the prices real?', 'Yes. Stock, ETF and index prices are real NSE and BSE quotes from a public market data feed, and mutual fund NAVs are the ones AMFI publishes. Public feeds are usually delayed by a few minutes, so FINORA labels each price as Live or Close with its timestamp.'],
  ['What do I see when the market is closed?', 'The last closing price, clearly marked Close with its date and time. Orders are blocked until the market opens, just like the real exchange.'],
  ['What if the data feed is not reachable?', 'FINORA never fills the gap with made-up numbers. It shows that market data is not connected and lets you retry or set your own data proxy in Settings.'],
  ['Do I need to give bank or KYC details?', 'No. A practice account needs only a name, email and password. Nothing in Phase 1 connects to a bank, UPI or a depository.'],
  ['Where is my data stored?', 'In your own browser. Account details and trades stay on your device. Export a backup from Settings before clearing browser data.'],
  ['Can I use it on my phone?', 'Yes. FINORA is a responsive web app that installs on Android, iOS and desktop from your browser.'],
  ['Why can I not trade options, futures, commodities or IPOs?', 'There is no free, reliable public source for option chains, MCX prices or live IPO data, and FINORA will not show invented numbers. These return when a licensed data feed is connected.'],
];

/* Real index snapshot for the landing page. Shows a clear connecting state instead of placeholder numbers. */
function Snapshot() {
  useLive();
  const ids = ['NIFTY', 'BANKNIFTY', 'SENSEX'].filter((k) => M[k] && M[k].ok);
  if (!ids.length) return <div className="snapnote">{feed.status === 'error' ? 'Market data is not connected right now.' : 'Connecting to NSE and BSE market data'}</div>;
  return <div className="snap">{ids.map((k) => <div key={k} className="snapc"><small>{k}</small><b className="mono">{fmt(M[k].ltp)}</b><span className={'mono ' + cl(chgp(k))}>{pc(chgp(k))}</span><em>{isLive(k) ? 'Live' : 'Close'} · {asOf(k)}</em></div>)}</div>;
}

export function Landing() {
  const user = useAuth();
  useLive();
  const words = 'Trade beyond limits.'.split(' '), live = M.NIFTY && M.NIFTY.ok;
  const wl = ['RELIANCE', 'TCS', 'HDFCBANK'].filter((k) => M[k] && M[k].ok);
  const traded = UNIVERSE.filter((u) => u.trade).length;
  return (
    <>
      <section className="hero2">
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <HeroCanvas />
        <div className="sw hgrid">
          <div className="hcopy">
            <div className="eyebrow rv-up in" style={{ '--d': '0ms' }}><i className={'dot' + (live && isLive('NIFTY') ? ' on' : '')} /> Real NSE and BSE prices · Virtual money</div>
            <h1 className="hh">{words.map((w, i) => <span key={i} className="word" style={{ '--i': i }}><span>{w}</span></span>)}</h1>
            <p className="lead rv-up in" style={{ '--d': '400ms' }}>Practise investing in Indian stocks, ETFs and mutual funds on a pro terminal with real market prices, ₹10,00,000 of virtual capital and zero risk.</p>
            <div className="row wrapr rv-up in" style={{ '--d': '500ms', gap: 12 }}>
              {user ? <Link to="/" className="btn pri big2">Open dashboard <FiArrowRight /></Link> : <><Link to="/signup" className="btn pri big2">Open free account <FiArrowRight /></Link><Link to="/login" className="btn big2">Log in</Link></>}
            </div>
            <div className="row wrapr proof rv-up in" style={{ '--d': '600ms' }}><span><FiCheck /> No bank or KYC needed</span><span><FiCheck /> Real prices, no fake data</span><span><FiCheck /> Installable app</span></div>
          </div>
          <div className="device rv-up in" style={{ '--d': '300ms' }} aria-hidden={!live}>
            <div className="dframe">
              <div className="dbar"><i /><i /><i /><b>FINORA · NIFTY 50</b><span className="chip sim">{live ? (isLive('NIFTY') ? 'LIVE' : 'CLOSE') : 'CONNECTING'}</span></div>
              {live ? <div className="dtop"><div><small>NIFTY</small><b className="mono">{fmt(M.NIFTY.ltp)}</b></div><span className={'mono ' + cl(chgp('NIFTY'))}>{pc(chgp('NIFTY'))}</span><span className="grow" /><span className="mut sm">{asOf('NIFTY')}</span></div> : <div className="dtop"><span className="mut sm">Waiting for market data</span></div>}
              <MiniChart id="NIFTY" />
              {wl.length > 0 && <div className="dwl">{wl.map((k) => <div key={k}><b>{k}</b><span className="mono">{fmt(M[k].ltp)}</span><span className={'mono ' + cl(chgp(k))}>{pc(chgp(k))}</span></div>)}</div>}
            </div>
            <div className="fchip c1"><FiTrendingUp /> Live P&L tracking</div>
            <div className="fchip c2"><FiShield /> Virtual money</div>
          </div>
        </div>
      </section>
      <Marquee />
      <section className="sec sw statsrow">
        {[[10, '₹', ' Lakh', 'virtual starting capital'], [traded, '', '+', 'NSE stocks and ETFs'], [2, '', '', 'exchanges: NSE and BSE'], [PRODUCTS.length, '', '', 'modules in one app']].map(([n, p, s, l], i) => (
          <Reveal key={l} d={i * 60} className="stat2"><b><CountUp to={n} prefix={p} suffix={s} /></b><span>{l}</span></Reveal>))}
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">Markets right now</span><h2>Today's indices, straight from the exchange feed.</h2><p className="mut">Shown as Live while the market is open and as the last close when it is not. Public feeds can be delayed by a few minutes.</p></Reveal>
        <Reveal><Snapshot /></Reveal>
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">Everything in one place</span><h2>One platform to learn investing the real way.</h2><p className="mut">Every module below is built into the app. Open an account and try it.</p></Reveal>
        <div className="pgrid">{PRODUCTS.map(([k, I, t, tag, d], i) => (
          <Reveal key={k} d={(i % 3) * 50}><Tilt className="pcard"><div className="pico"><I /></div><span className="ptag">{tag}</span><h3>{t}</h3><p className="mut">{d}</p></Tilt></Reveal>))}
        </div>
        <Reveal className="center"><Link to="/products" className="btn big2">See all product details <FiArrowRight /></Link></Reveal>
      </section>
      <section className="sec sw feature">
        <Reveal kind="l" className="fcopy"><span className="kick">Charts</span><h2>A terminal that feels like TradingView.</h2><p className="mut">Candles, bars, lines and areas built from real price history. EMA, SMA, Bollinger, RSI and MACD. Draw trendlines, fib levels and rectangles. Pinch to zoom on your phone.</p><ul className="ticks2"><li><FiCheck /> Watchlist, chart, order ticket and positions on one screen</li><li><FiCheck /> Buy and sell straight from the chart</li><li><FiCheck /> Shows the last close when the market is closed, like the real exchange</li></ul></Reveal>
        <Reveal kind="r" className="fvis"><div className="dframe wide"><MiniChart id="RELIANCE" n={70} /></div></Reveal>
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">How the data works</span><h2>Real numbers, labelled honestly.</h2></Reveal>
        <div className="pgrid three">{[[FiDatabase, 'Real prices', 'Stocks, ETFs, indices and rupee rates come from a public market data feed. Mutual fund NAVs come from AMFI via mfapi.in.'], [FiClock, 'Live or Close', 'Every price shows whether it is Live or the last Close, with its timestamp. Public data can be a few minutes delayed.'], [FiShield, 'Nothing invented', 'If a price or a chart cannot be loaded, FINORA says so. It never fills the screen with generated numbers.']].map(([I, t, d], i) => <Reveal key={t} d={i * 70}><Tilt className="pcard"><div className="pico"><I /></div><h3>{t}</h3><p className="mut">{d}</p></Tilt></Reveal>)}</div>
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">Trading hours</span><h2>Follows the real market clock.</h2></Reveal>
        <Reveal className="card"><div className="scroll"><table className="tbl"><thead><tr><th className="l">Market</th><th className="l">Hours (IST)</th><th className="l">In FINORA</th></tr></thead><tbody>
          {[['Stocks and ETFs (NSE, BSE)', '9:15 AM to 3:30 PM, Monday to Friday', 'Orders open only while the exchange is open'], ['Indices', 'Same as equity', 'View only'], ['Currency rates', 'Nearly 24 hours on weekdays', 'View only'], ['Mutual funds', 'NAV published once a day', 'Orders fill at the latest published NAV']].map((r) => <tr key={r[0]}><td className="l"><b>{r[0]}</b></td><td className="l">{r[1]}</td><td className="l">{r[2]}</td></tr>)}</tbody></table></div></Reveal>
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">How it works</span><h2>Start practising in three steps.</h2></Reveal>
        <div className="steps">{[['1', 'Create a free account', 'Name, email and password. No bank, no KYC, no payment.'], ['2', 'Get ₹10,00,000 virtual', 'Place orders at real prices, set GTTs, build baskets and watch your P&L move.'], ['3', 'Review and improve', 'Use reports, the journal and lessons to learn from every trade.']].map(([n, t, d], i) => (
          <Reveal key={n} d={i * 90} className="step"><span className="num">{n}</span><h3>{t}</h3><p className="mut">{d}</p></Reveal>))}</div>
      </section>
      <section className="sec sw road">
        <Reveal className="shd"><span className="kick">Roadmap</span><h2>Honest about where we are.</h2></Reveal>
        <div className="rgrid">{[['Phase 1 · Now', 'Virtual money with real, delayed NSE/BSE prices and AMFI NAVs. Trading, charts, funds and reports.', 'now'], ['Phase 2 · Next', 'Licensed real-time data, options, futures and commodities, server-side accounts.', ''], ['Phase 3 · Later', 'Real-money trading through a regulated broking partner, subject to approvals. Insurance, loans and more.', '']].map(([t, d, c], i) => (
          <Reveal key={t} d={i * 80} className={'rcard ' + c}><h3>{t}</h3><p className="mut">{d}</p></Reveal>))}</div>
      </section>
      <section className="sec sw narrow"><Reveal className="shd"><span className="kick">FAQ</span><h2>Questions, answered plainly.</h2></Reveal><Reveal><FAQ items={FAQS} /></Reveal></section>
      <section className="sec sw"><Reveal kind="s" className="cta"><div className="aurora small" aria-hidden="true"><i /><i /></div><h2>Ready to trade beyond limits?</h2><p>Open a free practice account in under a minute.</p><Link to={user ? '/' : '/signup'} className="btn pri big2">{user ? 'Open dashboard' : 'Open free account'} <FiArrowRight /></Link></Reveal></section>
    </>
  );
}

export function Products() {
  const [f, setF] = useState('all');
  const groups = ['all', 'Equity', 'Invest', 'Terminal', 'Account', 'Learn'];
  const list = PRODUCTS.filter((p) => f === 'all' || p[3] === f || (f === 'Learn' && ['Discover', 'Stay informed', 'Learn'].includes(p[3])));
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">Products</span><h1>Every module, built in.</h1><p className="lead mut">Nine modules, one login. Filter by what you want to practise.</p></div></section>
      <section className="sec sw">
        <div className="pills" role="group" aria-label="Filter products">{groups.map((g) => <button key={g} className="pill" aria-pressed={f === g} onClick={() => setF(g)}>{g === 'all' ? 'All' : g}</button>)}</div>
        <div className="plist">{list.map(([k, I, t, tag, d, b], i) => (
          <Reveal key={k} d={(i % 3) * 70}><div className="prow"><div className="pico big"><I /></div><div><span className="ptag">{tag}</span><h3>{t}</h3><p className="mut">{d}</p><ul className="ticks2">{b.map((x) => <li key={x}><FiCheck /> {x}</li>)}</ul></div></div></Reveal>))}</div>
        <Reveal className="center"><p className="mut">Not included yet: options, futures, commodities, IPOs, insurance, loans, pledge, KYC and real payments. Options, futures and commodities need a licensed data feed, and FINORA will not show invented numbers in their place.</p></Reveal>
      </section>
    </>
  );
}

export function Pricing() {
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">Pricing</span><h1>Free while we are in Phase 1.</h1><p className="lead mut">Practice accounts cost nothing. Real brokerage will be announced before real-money trading opens.</p></div></section>
      <section className="sec sw">
        <div className="plans">
          <Reveal><Tilt className="plan hot"><span className="ptag">Available now</span><h3>Practice</h3><div className="price">₹0<small> forever in Phase 1</small></div><ul className="ticks2">{['₹10,00,000 virtual capital', 'All nine modules', 'Real NSE and BSE prices and AMFI mutual fund NAVs', 'Installable web app', 'Export and import backups'].map((x) => <li key={x}><FiCheck /> {x}</li>)}</ul><Link to="/signup" className="btn pri big shimmer">Open free account</Link></Tilt></Reveal>
          <Reveal d={120}><Tilt className="plan"><span className="ptag">Planned</span><h3>Live</h3><div className="price">To be announced</div><ul className="ticks2">{['Licensed real-time market data', 'Server-side accounts', 'Price and brokerage published before launch', 'Subject to regulatory approvals'].map((x) => <li key={x}><FiCheck /> {x}</li>)}</ul><button className="btn big" disabled>Coming later</button></Tilt></Reveal>
        </div>
        <Reveal className="card chg"><h3>Charges used in the practice account</h3><p className="mut">The practice account estimates costs the way Indian brokers typically do, so your P&L is realistic. These are practice settings, not a price list.</p>
          <div className="scroll"><table className="tbl"><thead><tr><th className="l">Segment</th><th>Brokerage</th><th>Other charges modelled</th></tr></thead><tbody>
            {[['Equity delivery', '₹0 in practice', 'STT 0.1%, exchange, GST, SEBI, stamp duty'], ['Equity intraday', '₹20 or 0.03%, lower', 'STT on sell, exchange, GST, SEBI, stamp duty'], ['Mutual funds', '₹0', 'No charges modelled']].map((r) => <tr key={r[0]}><td className="l"><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div></Reveal>
      </section>
    </>
  );
}

export function About() {
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">About FINORA</span><h1>Learn markets without losing money.</h1><p className="lead mut">Most new investors learn by losing real money. FINORA gives them a realistic terminal and virtual capital to build skill and confidence first.</p></div></section>
      <section className="sec sw">
        <div className="pgrid three">{[[FiShield, 'Honest data', 'Every price is real and labelled Live or Close with its time. If data is unavailable we say so, and we never invent prices or fundamentals.'], [FiBookOpen, 'Learning first', 'Charges, margin and reports are shown so you understand the full cost and risk of every trade.'], [FiSmartphone, 'Everywhere', 'One responsive app for phone, tablet and desktop, installable like a native app.']].map(([I, t, d], i) => <Reveal key={t} d={i * 100}><Tilt className="pcard"><div className="pico"><I /></div><h3>{t}</h3><p className="mut">{d}</p></Tilt></Reveal>)}</div>
      </section>
      <section className="sec sw narrow">
        <Reveal className="shd"><span className="kick">Journey</span><h2>What we are building, in order.</h2></Reveal>
        <div className="timeline">{[['Phase 1', 'Complete practice platform with virtual money and real delayed prices.', 'Now'], ['Phase 2', 'Licensed real-time data, options, futures and commodities, server accounts, email alerts.', 'Next'], ['Phase 3', 'Real-money trading with a regulated broking partner, plus insurance, loans and pledge modules.', 'Later']].map(([t, d, s], i) => <Reveal key={t} d={i * 100} className="tl"><i /><div><b>{t}</b><span className="tag">{s}</span><p className="mut">{d}</p></div></Reveal>)}</div>
      </section>
    </>
  );
}

const SUP = [['Why does it say market data is not connected?', 'The public data feed may be blocked by your network or browser. Press Retry, or deploy the small data proxy from the worker folder and paste its address in Settings under Data source.'], ['Do I need to log in to practise?', 'Yes. Create a free account with an email and password. There is no guest login, so your practice portfolio is always yours.'], ['I forgot my password. What now?', 'Phase 1 accounts live only in your browser and there is no email reset yet. Create a new practice account. Server-side accounts with reset arrive in Phase 2.'], ['Why are orders rejected?', 'The most common reasons are a closed market, no live price, not enough margin, or an invalid price or quantity. The order ticket shows the exact reason.'], ['Why are prices not moving?', 'When a market is closed, FINORA shows the last close and the price stays put until the next session, like the real exchange. Equity runs 9:15 AM to 3:30 PM IST, Monday to Friday. Public data can also be a few minutes delayed.'], ['How do I reset my account?', 'Go to Settings, then Reset virtual account, enter your starting capital and confirm.'], ['How do I move my data to another device?', 'In Settings use Export backup, then Import backup on the other device.'], ['How do I install the app?', 'Open FINORA in Chrome, Edge or Safari and use Install app or Add to Home Screen. See the Platforms page for steps.']];
export function Support() {
  const [q, setQ] = useState('');
  const list = SUP.filter(([a, b]) => !q || (a + b).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">Support</span><h1>How can we help?</h1><div className="ssearch"><input placeholder="Search help articles" aria-label="Search help" value={q} onChange={(e) => setQ(e.target.value)} /></div></div></section>
      <section className="sec sw narrow">{list.length ? <FAQ key={q} items={list} /> : <div className="empty">No article matches. Try another word.</div>}
        <Reveal className="card" style={{ marginTop: 24 }}><h3>Need something else?</h3><p className="mut">Live chat and phone support start with real-money trading. In Phase 1 the help articles above and the Learn section inside the app cover the common questions.</p></Reveal></section>
    </>
  );
}

export function Platforms() {
  const [ev, setEv] = useState(null), [done, setDone] = useState(false);
  useEffect(() => { const f = (e) => { e.preventDefault(); setEv(e); }; addEventListener('beforeinstallprompt', f); addEventListener('appinstalled', () => setDone(true)); return () => removeEventListener('beforeinstallprompt', f); }, []);
  const install = async () => { if (!ev) return; ev.prompt(); await ev.userChoice; setEv(null); };
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">Platforms</span><h1>One app. Every screen.</h1><p className="lead mut">FINORA runs in your browser and installs like a native app, with no app store needed.</p></div></section>
      <section className="sec sw">
        <div className="pgrid three">
          <Reveal><Tilt className="pcard"><div className="pico"><FiMonitor /></div><h3>Web terminal</h3><p className="mut">Full multi-panel terminal for desktop. Shortcuts: Ctrl+K to search, / to focus search.</p><Link to="/signup" className="btn sm">Open web app</Link></Tilt></Reveal>
          <Reveal d={100}><Tilt className="pcard"><div className="pico"><FiSmartphone /></div><h3>Mobile app</h3><p className="mut">Bottom navigation, touch charts with pinch zoom, and safe-area support for modern phones.</p>{ev ? <button className="btn pri sm" onClick={install}><FiDownload /> Install app</button> : <span className="mut sm">{done ? 'Installed.' : 'Use your browser menu: Install app or Add to Home Screen.'}</span>}</Tilt></Reveal>
          <Reveal d={200}><Tilt className="pcard"><div className="pico"><FiDownload /></div><h3>Works offline</h3><p className="mut">After the first visit the app shell is cached, so pages you opened still load without a connection.</p></Tilt></Reveal>
        </div>
        <Reveal className="card" style={{ marginTop: 20 }}><h3>Install steps</h3><div className="grid g3" style={{ marginTop: 10 }}>{[['Android (Chrome)', 'Menu, then Install app or Add to Home screen.'], ['iPhone and iPad (Safari)', 'Share button, then Add to Home Screen.'], ['Windows, Mac, Linux', 'Click the install icon in the address bar of Chrome or Edge.']].map(([a, b]) => <div key={a}><b>{a}</b><p className="mut sm">{b}</p></div>)}</div></Reveal>
      </section>
    </>
  );
}

const LEGAL = {
  terms: ['Terms of use', [['Virtual money only', 'FINORA Phase 1 is a paper-trading platform. All balances, orders, trades and returns are virtual and have no monetary value. No order is sent to any broker, exchange or bank.'], ['Your account', 'You are responsible for the details you enter and for keeping your device secure. Phase 1 accounts are stored in your browser, so clearing site data removes them unless you exported a backup.'], ['No advice', 'Content, scans, signals, calculators and lessons are educational. They are not investment, tax or legal advice and FINORA is not a SEBI registered intermediary.'], ['Changes', 'Features and data sources can change or be removed as the platform develops.']]],
  privacy: ['Privacy policy', [['What we store', 'Your name, email, hashed password, settings, watchlists, orders and journal are stored in your own browser using local storage.'], ['What we do not collect', 'Phase 1 has no server. We do not receive your account details, trades or any bank or identity information, and we do not use advertising trackers.'], ['Third-party data and fonts', 'Your browser requests prices from a public market data feed (Yahoo Finance) and mutual fund NAVs from mfapi.in, and typefaces from Google Fonts. These services may log a standard request, such as your IP address.'], ['Your control', 'Use Settings to export, reset, or clear your data at any time. Clearing your browser site data removes everything.']]],
  risk: ['Risk disclosure', [['Market risk', 'Investments in securities markets are subject to market risk. Read all related documents carefully before investing real money.'], ['Practice results', 'Results in a practice account do not guarantee similar results with real money. Practice fills use the last traded price and ignore liquidity, slippage, queue position and exchange rejections.'], ['Data accuracy', 'Prices come from a public feed that is unofficial, can be delayed and may contain errors or gaps. Do not use FINORA prices for real trading decisions.'], ['Not a recommendation', 'Nothing in FINORA recommends any security, strategy or trade.']]],
};
export function Legal({ k }) {
  const [t, secs] = LEGAL[k] || LEGAL.terms;
  return (
    <>
      <section className="phead"><div className="sw"><span className="kick">Legal</span><h1>{t}</h1><p className="mut">Last updated November 2026</p></div></section>
      <section className="sec sw narrow legal">{secs.map(([h, p]) => <Reveal key={h}><h3>{h}</h3><p className="mut">{p}</p></Reveal>)}
        <div className="pills" style={{ marginTop: 16 }}>{Object.entries(LEGAL).map(([key, [n]]) => <Link key={key} to={'/legal/' + key} className="pill" aria-pressed={key === k}>{n}</Link>)}</div></section>
    </>
  );
}
