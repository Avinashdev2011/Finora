import { useEffect, useState } from 'react';
import { FiBarChart2, FiLayers, FiDroplet, FiDollarSign, FiPieChart, FiZap, FiActivity, FiFilter, FiBell, FiList, FiFileText, FiTool, FiCheck, FiArrowRight, FiMonitor, FiSmartphone, FiDownload, FiShield, FiTrendingUp, FiBookOpen } from 'react-icons/fi';
import { Link } from '../lib/router.jsx';
import { UNIVERSE, M, chgp } from '../lib/market.js';
import { fmt, pc, cl } from '../lib/util.js';
import { useAuth } from '../lib/auth.js';
import { Reveal, CountUp, Tilt, HeroCanvas, MiniChart, Marquee, FAQ } from '../components/Site.jsx';

const PRODUCTS = [
  ['stocks', FiBarChart2, 'Stocks and ETFs', 'Equity', 'Practise with market, limit, stop-loss and SL-limit orders in intraday or delivery.', ['GTT and OCO orders', 'Baskets of orders', 'Margin and charges preview']],
  ['fno', FiLayers, 'Futures and options', 'Derivatives', 'Option chain with Greeks, open interest view, futures and a payoff strategy builder.', ['Black-Scholes Greeks', 'Multi-leg strategies', 'Lot-size aware orders']],
  ['com', FiDroplet, 'Commodities', 'MCX hours', 'Trade gold, silver and crude style contracts across the long MCX session.', ['9:00 AM to 11:30 PM', 'Futures and options', 'Per-unit margin']],
  ['cur', FiDollarSign, 'Currency', 'Forex', 'USD, EUR, GBP and JPY against the rupee, with currency session timings.', ['9:00 AM to 5:00 PM', 'Low-margin contracts', 'Live simulated quotes']],
  ['mf', FiPieChart, 'Mutual funds and SIP', 'Invest', 'Explore demo funds, buy lumpsum, start SIPs and track NAV-based returns.', ['10 demo funds', 'Monthly SIP automation', 'Returns by period']],
  ['ipo', FiZap, 'IPO', 'Primary market', 'Bid in fictional demo IPOs with blocked funds, allotment lottery and listing result.', ['Cut-off bidding', 'Allotment simulation', 'Refund of unallotted funds']],
  ['charts', FiActivity, 'Pro charts', 'Terminal', 'Fast canvas charts with candles, indicators, drawing tools, pinch and zoom.', ['EMA, SMA, RSI, MACD, Bollinger', 'Trendline, fib, rectangle', 'Frozen when market is closed']],
  ['scan', FiFilter, 'Scanner', 'Discover', 'Preset and custom scans on gainers, losers, RSI and technical signals.', ['6 preset scans', 'Price and signal filters', 'One-tap buy']],
  ['alert', FiBell, 'Alerts', 'Stay informed', 'Price alerts that fire only while the market is open, with a notification history.', ['Above or below triggers', 'Notification centre', 'Paused when closed']],
  ['ord', FiList, 'Orders and portfolio', 'Account', 'Order book, trade book, holdings, positions, equity curve and allocation.', ['Square-off in one tap', 'Day and overall P&L', 'Equity curve']],
  ['rep', FiFileText, 'Reports', 'Account', 'P&L by instrument, charges breakdown, illustrative tax estimate and CSV export.', ['Charges split', 'Ledger', 'CSV downloads']],
  ['tool', FiTool, 'Calculators and learning', 'Learn', 'SIP, EMI, brokerage, position size and CAGR calculators, a trading journal and lessons.', ['8 tools', 'Trading journal', 'Beginner lessons']],
];

const FAQS = [
  ['Is FINORA real money trading?', 'Not yet. Phase 1 is a paper-trading platform with ₹10,00,000 of virtual money. No order is sent to a broker or exchange. Real-money trading is planned for a later phase and will need regulatory approvals.'],
  ['Are the prices live?', 'No. Prices in Phase 1 come from a built-in simulator and are labelled as simulated everywhere. When a market is closed they freeze and orders are blocked. Real live data needs a licensed feed and is part of the next phase.'],
  ['Do I need to give bank or KYC details?', 'No. Creating a practice account needs only a name, email and password. Nothing in Phase 1 connects to a bank, UPI or a depository.'],
  ['Where is my data stored?', 'In your own browser. Account details and trades stay on your device. Export a backup from Settings before clearing browser data.'],
  ['Can I use it on my phone?', 'Yes. FINORA is a responsive web app that you can install on Android, iOS and desktop from your browser, and it keeps working offline for the pages you already opened.'],
  ['What about insurance, loans and pledge?', 'Those modules are on the roadmap for after the trading core is complete. They are not in Phase 1.'],
];

export function Landing() {
  const user = useAuth();
  const words = 'Trade beyond limits.'.split(' ');
  return (
    <>
      <section className="hero2">
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <HeroCanvas />
        <div className="sw hgrid">
          <div className="hcopy">
            <div className="eyebrow rv-up in" style={{ '--d': '0ms' }}><i className="dot on" /> Phase 1 · Virtual money · Simulated market</div>
            <h1 className="hh">{words.map((w, i) => <span key={i} className="word" style={{ '--i': i }}><span>{w}</span></span>)}</h1>
            <p className="lead rv-up in" style={{ '--d': '700ms' }}>Practise stocks, futures, options, commodities, currency, mutual funds and IPOs on a terminal that feels like the real thing, with ₹10,00,000 of virtual capital and zero risk.</p>
            <div className="row wrapr rv-up in" style={{ '--d': '850ms', gap: 12 }}>
              {user ? <Link to="/" className="btn pri big2 shimmer">Open dashboard <FiArrowRight /></Link> : <><Link to="/signup" className="btn pri big2 shimmer">Open free account <FiArrowRight /></Link><Link to="/login" className="btn big2">Try demo login</Link></>}
            </div>
            <div className="row wrapr proof rv-up in" style={{ '--d': '1000ms' }}><span><FiCheck /> No bank or KYC needed</span><span><FiCheck /> Works on phone and desktop</span><span><FiCheck /> Installable app</span></div>
          </div>
          <div className="device rv-up in" style={{ '--d': '500ms' }} aria-hidden="true">
            <div className="dframe">
              <div className="dbar"><i /><i /><i /><b>FINORA · NIFTY</b><span className="chip sim">SIMULATED</span></div>
              <div className="dtop"><div><small>NIFTY</small><b className="mono">{fmt(M.NIFTY.ltp)}</b></div><span className={'mono ' + cl(chgp('NIFTY'))}>{pc(chgp('NIFTY'))}</span><span className="grow" /><button className="btn buy sm">BUY</button><button className="btn sell sm">SELL</button></div>
              <MiniChart id="NIFTY" />
              <div className="dwl">{['RELIANCE', 'TCS', 'HDFCBANK'].map((s) => <div key={s}><b>{s}</b><span className="mono">{fmt(M[s].ltp)}</span><span className={'mono ' + cl(chgp(s))}>{pc(chgp(s))}</span></div>)}</div>
            </div>
            <div className="fchip c1"><FiTrendingUp /> Live P&L tracking</div>
            <div className="fchip c2"><FiShield /> Virtual money</div>
          </div>
        </div>
      </section>
      <Marquee />
      <section className="sec sw statsrow">
        {[[10, '₹', ' Lakh', 'virtual starting capital'], [UNIVERSE.length, '', '+', 'instruments to trade'], [5, '', '', 'market segments'], [12, '', '', 'modules in one app']].map(([n, p, s, l], i) => (
          <Reveal key={l} d={i * 90} className="stat2"><b><CountUp to={n} prefix={p} suffix={s} /></b><span>{l}</span></Reveal>))}
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">Everything in one place</span><h2>One platform, every market you want to learn.</h2><p className="mut">Each module below is already built into the app. Open an account and try it.</p></Reveal>
        <div className="pgrid">{PRODUCTS.map(([k, I, t, tag, d], i) => (
          <Reveal key={k} d={(i % 4) * 80}><Tilt className="pcard"><div className="pico"><I /></div><span className="ptag">{tag}</span><h3>{t}</h3><p className="mut">{d}</p></Tilt></Reveal>))}
        </div>
        <Reveal className="center"><Link to="/products" className="btn big2">See all product details <FiArrowRight /></Link></Reveal>
      </section>
      <section className="sec sw feature">
        <Reveal kind="l" className="fcopy"><span className="kick">Charts</span><h2>A terminal that feels like TradingView.</h2><p className="mut">Candles, bars, lines and areas. EMA, SMA, Bollinger, RSI and MACD. Draw trendlines, fib levels and rectangles. Pinch to zoom on your phone.</p><ul className="ticks2"><li><FiCheck /> Watchlist, chart, order ticket and positions on one screen</li><li><FiCheck /> Buy and sell straight from the chart</li><li><FiCheck /> Charts freeze when the market is closed, like the real exchange</li></ul></Reveal>
        <Reveal kind="r" className="fvis"><div className="dframe wide"><MiniChart id="RELIANCE" n={70} /></div></Reveal>
      </section>
      <section className="sec sw feature flip">
        <Reveal kind="r" className="fcopy"><span className="kick">Derivatives</span><h2>Option chain, Greeks and strategy payoffs.</h2><p className="mut">See calls and puts side by side with open interest, then combine legs into a strategy and watch the payoff curve update.</p><ul className="ticks2"><li><FiCheck /> Delta, gamma, theta and vega from a Black-Scholes model</li><li><FiCheck /> Futures with exchange-style lot sizes</li><li><FiCheck /> Margin shown before you place the order</li></ul></Reveal>
        <Reveal kind="l" className="fvis"><div className="dframe wide chainmock">{[18, 22, 30, 24, 14, 9].map((w, i) => <div key={i} className="crow"><i style={{ width: w * 3 + '%' }} /><b className="mono">{24400 + i * 100}</b><i className="pe" style={{ width: (30 - w) * 3 + 30 + '%' }} /></div>)}</div></Reveal>
      </section>
      <section className="sec sw">
        <Reveal className="shd"><span className="kick">How it works</span><h2>Start practising in three steps.</h2></Reveal>
        <div className="steps">{[['1', 'Create a free account', 'Name, email and password. No bank, no KYC, no payment.'], ['2', 'Get ₹10,00,000 virtual', 'Place orders, set GTTs, build baskets and watch your P&L move.'], ['3', 'Review and improve', 'Use reports, the journal and lessons to learn from every trade.']].map(([n, t, d], i) => (
          <Reveal key={n} d={i * 140} className="step"><span className="num">{n}</span><h3>{t}</h3><p className="mut">{d}</p></Reveal>))}</div>
      </section>
      <section className="sec sw road">
        <Reveal className="shd"><span className="kick">Roadmap</span><h2>Honest about where we are.</h2></Reveal>
        <div className="rgrid">{[['Phase 1 · Now', 'Virtual money, simulated prices, complete trading, charts, funds and reports.', 'now'], ['Phase 2 · Next', 'Licensed live market data feed and server-side accounts.', ''], ['Phase 3 · Later', 'Real-money trading after broker partnership and regulatory approvals. Insurance, loans and more modules.', '']].map(([t, d, c], i) => (
          <Reveal key={t} d={i * 120} className={'rcard ' + c}><h3>{t}</h3><p className="mut">{d}</p></Reveal>))}</div>
      </section>
      <section className="sec sw narrow"><Reveal className="shd"><span className="kick">FAQ</span><h2>Questions, answered plainly.</h2></Reveal><Reveal><FAQ items={FAQS} /></Reveal></section>
      <section className="sec sw"><Reveal kind="s" className="cta"><div className="aurora small" aria-hidden="true"><i /><i /></div><h2>Ready to trade beyond limits?</h2><p>Open a free practice account in under a minute.</p><Link to={user ? '/' : '/signup'} className="btn pri big2 shimmer">{user ? 'Open dashboard' : 'Open free account'} <FiArrowRight /></Link></Reveal></section>
    </>
  );
}

export function Products() {
  const [f, setF] = useState('all');
  const groups = ['all', 'Equity', 'Derivatives', 'Invest', 'Terminal', 'Account', 'Learn'];
  const list = PRODUCTS.filter((p) => f === 'all' || p[3] === f || (f === 'Derivatives' && ['MCX hours', 'Forex'].includes(p[3])) || (f === 'Invest' && p[3] === 'Primary market') || (f === 'Learn' && ['Discover', 'Stay informed', 'Learn'].includes(p[3])));
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">Products</span><h1>Every module, built in.</h1><p className="lead mut">Twelve modules, one login. Filter by what you want to practise.</p></div></section>
      <section className="sec sw">
        <div className="pills" role="group" aria-label="Filter products">{groups.map((g) => <button key={g} className="pill" aria-pressed={f === g} onClick={() => setF(g)}>{g === 'all' ? 'All' : g}</button>)}</div>
        <div className="plist">{list.map(([k, I, t, tag, d, b], i) => (
          <Reveal key={k} d={(i % 3) * 70}><div className="prow"><div className="pico big"><I /></div><div><span className="ptag">{tag}</span><h3>{t}</h3><p className="mut">{d}</p><ul className="ticks2">{b.map((x) => <li key={x}><FiCheck /> {x}</li>)}</ul></div></div></Reveal>))}</div>
        <Reveal className="center"><p className="mut">Not included yet: insurance, loans, pay-later, pledge, margin trading facility, KYC and real payments. They come after the trading core.</p></Reveal>
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
          <Reveal><Tilt className="plan hot"><span className="ptag">Available now</span><h3>Practice</h3><div className="price">₹0<small> forever in Phase 1</small></div><ul className="ticks2">{['₹10,00,000 virtual capital', 'All 12 modules', 'Simulated NSE, BSE, MCX and currency instruments', 'Installable web app', 'Export and import backups'].map((x) => <li key={x}><FiCheck /> {x}</li>)}</ul><Link to="/signup" className="btn pri big shimmer">Open free account</Link></Tilt></Reveal>
          <Reveal d={120}><Tilt className="plan"><span className="ptag">Planned</span><h3>Live</h3><div className="price">To be announced</div><ul className="ticks2">{['Licensed real-time market data', 'Server-side accounts', 'Price and brokerage published before launch', 'Subject to regulatory approvals'].map((x) => <li key={x}><FiCheck /> {x}</li>)}</ul><button className="btn big" disabled>Coming later</button></Tilt></Reveal>
        </div>
        <Reveal className="card chg"><h3>Charges used in the simulator</h3><p className="mut">The practice account estimates costs the way Indian brokers typically do, so your P&L is realistic. These are simulation settings, not a price list.</p>
          <div className="scroll"><table className="tbl"><thead><tr><th className="l">Segment</th><th>Brokerage</th><th>Other charges modelled</th></tr></thead><tbody>
            {[['Equity delivery', '₹0 in simulator', 'STT 0.1%, exchange, GST, SEBI, stamp duty'], ['Equity intraday', '₹20 or 0.03%, lower', 'STT on sell, exchange, GST, SEBI, stamp duty'], ['Futures', '₹20 or 0.03%, lower', 'STT or CTT, exchange, GST, SEBI, stamp duty'], ['Options', '₹20 per order', 'STT on sell, exchange, GST, SEBI, stamp duty']].map((r) => <tr key={r[0]}><td className="l"><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div></Reveal>
      </section>
    </>
  );
}

export function About() {
  return (
    <>
      <section className="phead"><div className="aurora small" aria-hidden="true"><i /><i /></div><div className="sw"><span className="kick">About FINORA</span><h1>Learn markets without losing money.</h1><p className="lead mut">Most new investors learn by losing real money. FINORA gives them a realistic terminal and virtual capital to build skill and confidence first.</p></div></section>
      <section className="sec sw">
        <div className="pgrid three">{[[FiShield, 'Honest data', 'Simulated prices are always labelled. We never present generated numbers as real market data, and we never invent fundamentals.'], [FiBookOpen, 'Learning first', 'Charges, margin, Greeks and reports are shown so you understand the full cost and risk of every trade.'], [FiSmartphone, 'Everywhere', 'One responsive app for phone, tablet and desktop, installable like a native app.']].map(([I, t, d], i) => <Reveal key={t} d={i * 100}><Tilt className="pcard"><div className="pico"><I /></div><h3>{t}</h3><p className="mut">{d}</p></Tilt></Reveal>)}</div>
      </section>
      <section className="sec sw narrow">
        <Reveal className="shd"><span className="kick">Journey</span><h2>What we are building, in order.</h2></Reveal>
        <div className="timeline">{[['Phase 1', 'Complete practice platform with virtual money.', 'Now'], ['Phase 2', 'Real-time licensed data, server accounts, and alerts by email.', 'Next'], ['Phase 3', 'Real-money trading with a regulated broking partner, plus insurance, loans and pledge modules.', 'Later']].map(([t, d, s], i) => <Reveal key={t} d={i * 100} className="tl"><i /><div><b>{t}</b><span className="tag">{s}</span><p className="mut">{d}</p></div></Reveal>)}</div>
      </section>
    </>
  );
}

const SUP = [['Do I need to log in to practise?', 'Yes, but only with an email and password, or use the guest demo login on the login page.'], ['I forgot my password. What now?', 'Phase 1 accounts live only in your browser and there is no email reset yet. Create a new practice account, or use the guest demo. Server-side accounts with reset arrive in Phase 2.'], ['Why are orders rejected?', 'The most common reasons are a closed market, not enough margin, an invalid price or quantity, or an expired contract. The order ticket shows the exact reason.'], ['Why are prices not moving?', 'When a market is closed prices freeze, like the real exchange. Equity runs 9:15 AM to 3:30 PM IST, Monday to Friday. To practise outside hours turn on Demo mode in Settings.'], ['How do I reset my account?', 'Go to Settings, then Reset virtual account, enter your starting capital and confirm.'], ['How do I move my data to another device?', 'In Settings use Export backup, then Import backup on the other device.'], ['How do I install the app?', 'Open FINORA in Chrome, Edge or Safari and use Install app or Add to Home Screen. See the Platforms page for steps.']];
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
  terms: ['Terms of use', [['Simulation only', 'FINORA Phase 1 is a paper-trading simulator. All balances, orders, trades and returns are virtual and have no monetary value. No order is sent to any broker, exchange or bank.'], ['Your account', 'You are responsible for the details you enter and for keeping your device secure. Phase 1 accounts are stored in your browser, so clearing site data removes them unless you exported a backup.'], ['No advice', 'Content, scans, signals, calculators and lessons are educational. They are not investment, tax or legal advice and FINORA is not a SEBI registered intermediary.'], ['Changes', 'Features, simulated prices and demo products can change or be removed as the platform develops.']]],
  privacy: ['Privacy policy', [['What we store', 'Your name, email, hashed password, settings, watchlists, orders and journal are stored in your own browser using local storage.'], ['What we do not collect', 'Phase 1 has no server. We do not receive your account details, trades or any bank or identity information, and we do not use advertising trackers.'], ['Fonts', 'Pages load typefaces from Google Fonts, which may log a standard request from your browser.'], ['Your control', 'Use Settings to export, reset, or clear your data at any time. Clearing your browser site data removes everything.']]],
  risk: ['Risk disclosure', [['Market risk', 'Investments in securities markets are subject to market risk. Read all related documents carefully before investing real money.'], ['Simulated results', 'Results in a simulator do not guarantee similar results with real money. Simulated fills ignore liquidity, slippage, queue position and exchange rejections.'], ['Derivatives', 'Futures and options are leveraged and can lead to losses larger than the capital deployed. Practise with small sizes and defined risk.'], ['Not a recommendation', 'Nothing in FINORA recommends any security, strategy or trade.']]],
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
