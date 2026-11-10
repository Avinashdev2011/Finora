import { useEffect, useMemo, useRef, useState } from 'react';
import { FiHome, FiBarChart2, FiStar, FiActivity, FiLayers, FiDroplet, FiDollarSign, FiPieChart, FiZap, FiList, FiBriefcase, FiCreditCard, FiFileText, FiFilter, FiBell, FiBookOpen, FiTool, FiSettings, FiMoreHorizontal, FiSearch, FiMoon, FiSun, FiX, FiChevronDown } from 'react-icons/fi';
import { useLive, getS, mutate, available, getToasts, notify } from '../lib/engine.js';
import { searchSyms, marketOpen, SESSIONS, M, chg, chgp, feed } from '../lib/market.js';
import DataGate from './DataGate.jsx';
import { inr, dt, fmt, sg, pc, cl, arrow } from '../lib/util.js';
import { useUI, setUI } from '../lib/ui.js';
import { Link, go, useRoute } from '../lib/router.jsx';
import { useAuth, logout } from '../lib/auth.js';
import { Logo } from './Site.jsx';
import { Modal } from './ui.jsx';
import Ticket from './Ticket.jsx';
import GttDialog from './GttDialog.jsx';

export const NAV = [
  { g: 'Trade', items: [['/', 'Home', FiHome], ['/markets', 'Markets', FiBarChart2], ['/watchlist', 'Watchlists', FiStar], ['/charts', 'Charts', FiActivity]] },
  { g: 'Invest', items: [['/currency', 'Currency', FiDollarSign], ['/mutual-funds', 'Mutual funds', FiPieChart]] },
  { g: 'Account', items: [['/orders', 'Orders', FiList], ['/portfolio', 'Portfolio', FiBriefcase], ['/funds', 'Funds', FiCreditCard], ['/reports', 'Reports', FiFileText]] },
  { g: 'Discover', items: [['/scanner', 'Scanner', FiFilter], ['/alerts', 'Alerts', FiBell], ['/learn', 'Learn', FiBookOpen], ['/tools', 'Tools', FiTool], ['/settings', 'Settings', FiSettings]] },
];
const ALL = NAV.flatMap((g) => g.items);
const TOP = [['/', 'Home'], ['/markets', 'Markets'], ['/charts', 'Charts'], ['/portfolio', 'Portfolio'], ['/orders', 'Orders'], ['/mutual-funds', 'Mutual funds']];
const BOTTOM = [['/', 'Home', FiHome], ['/markets', 'Markets', FiBarChart2], ['/charts', 'Charts', FiActivity], ['/orders', 'Orders', FiList], ['/portfolio', 'Portfolio', FiBriefcase]];
const NEEDS = (p) => p === '/' || ['/markets', '/watchlist', '/charts', '/currency', '/scanner', '/portfolio', '/alerts', '/orders'].includes(p) || p.startsWith('/stock');
const isActive = (path, k) => (k === '/' ? path === '/' : path === k || path.startsWith(k + '/') || (k === '/markets' && path.startsWith('/stock')));

function Palette() {
  const [q, setQ] = useState(''), [hi, setHi] = useState(0), ref = useRef();
  useEffect(() => ref.current && ref.current.focus(), []);
  const pages = ALL.filter(([, n]) => q && n.toLowerCase().includes(q.toLowerCase())).map(([k, n]) => ({ t: 'page', k, n }));
  const syms = searchSyms(q, 8).map((u) => ({ t: 'sym', k: u.id, n: u.name, s: u.sec }));
  const res = [...pages, ...syms];
  const pick = (r) => { setUI({ palette: false }); go(r.t === 'page' ? r.k : '/stock/' + r.k); };
  return (
    <Modal title="Search" onClose={() => setUI({ palette: false })}>
      <div className="picker big"><FiSearch className="pi" /><input ref={ref} value={q} placeholder="Search stocks, ETFs, indices or pages" aria-label="Search"
        onChange={(e) => { setQ(e.target.value); setHi(0); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, res.length - 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); } else if (e.key === 'Enter' && res[hi]) pick(res[hi]); }} /></div>
      <div className="results">
        {q && !res.length && <div className="empty">No match</div>}
        {!q && <div className="empty">Type a symbol such as RELIANCE or NIFTY, or a page such as Orders. Shortcut: Ctrl+K.</div>}
        {res.map((r, i) => <button key={r.t + r.k} className={i === hi ? 'on' : ''} onClick={() => pick(r)}><span><b>{r.k || r.n}</b> <span className="mut">{r.t === 'page' ? 'Page' : r.n}</span></span><span className="mut">{r.t === 'page' ? '' : r.s}</span></button>)}
      </div>
    </Modal>
  );
}

export default function Shell({ children, fill, title }) {
  useLive();
  const S = getS(), ui = useUI(), { path } = useRoute();
  const toasts = getToasts(), [tools, setTools] = useState(false), [acct, setAcct] = useState(false), user = useAuth();
  const dark = document.documentElement.getAttribute('data-theme') ? document.documentElement.getAttribute('data-theme') === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setUI({ palette: true }); } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); setUI({ palette: true }); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);
  useEffect(() => { setUI({ more: false, notifs: false }); document.getElementById('main') && (document.getElementById('main').scrollTop = 0); }, [path]);
  const toggleTheme = () => mutate((s) => { s.theme = dark ? 'light' : 'dark'; applyTheme(s.theme); });
  const open = marketOpen('EQ');
  const unread = S.notifs.length;
  return (
    <div className="shell">
      <header className="top">
        <Link to="/" className="brand" aria-label="FINORA home"><Logo /><span className="bname">FINORA</span></Link>
        <div className="ticks" aria-label="Index prices">{['NIFTY', 'SENSEX', 'BANKNIFTY'].filter((k) => M[k].ok).map((k) => <Link key={k} to={'/stock/' + k} className="tickr"><b>{k}</b><span className={'mono ' + cl(chgp(k))}>{fmt(M[k].ltp)} {arrow(chgp(k))} {sg(chg(k))} ({pc(chgp(k))})</span></Link>)}</div>
        <button className="searchbtn" onClick={() => setUI({ palette: true })} aria-label="Search"><FiSearch /><span>Search for anything [Ctrl + K]</span></button>
        <nav className="tnav" aria-label="Primary">
          {TOP.map(([k, n]) => <Link key={k + n} to={k} className={isActive(path, k) ? 'on' : ''} aria-current={isActive(path, k) ? 'page' : undefined}>{n}</Link>)}
          <div className="menuwrap"><button className={'tlink' + (tools ? ' on' : '')} onClick={() => setTools(!tools)} aria-expanded={tools}>Tools <FiChevronDown aria-hidden="true" /></button>
            {tools && <div className="menu big" onMouseLeave={() => setTools(false)}>{ALL.filter(([k]) => !TOP.some((t) => t[0] === k)).map(([k, n, I]) => <Link key={k} to={k} onClick={() => setTools(false)}><I aria-hidden="true" /> {n}</Link>)}</div>}
          </div>
        </nav>
        <span className="grow" />
        <span className="chip hide-s" title={SESSIONS.EQ + '. Prices come from a public delayed feed.'}><i className={'dot' + (feed.status === 'ok' && open ? ' on' : '')} />{feed.status !== 'ok' ? 'Data not connected' : open ? 'Market open · live' : 'Market closed · last close'}</span>
        <span className="chip sim hide-s" title="Trading uses virtual money. No real orders are placed.">VIRTUAL MONEY</span>
        <div className="bal"><small>Available</small><b className="mono">{inr(available())}</b></div>
        <div className="pop">
          <button className="iconbtn" aria-label="Notifications" onClick={() => setUI({ notifs: !ui.notifs })}><FiBell />{unread > 0 && <i className="badge">{Math.min(unread, 9)}</i>}</button>
          {ui.notifs && <div className="popbody"><div className="row between pad"><b>Notifications</b><button className="btn sm" onClick={() => mutate((s) => { s.notifs = []; })}>Clear</button></div>
            {S.notifs.length ? S.notifs.slice(0, 20).map((n, i) => <div key={i} className="nitem"><div>{n.msg}</div><small className="mut">{dt(n.ts)}</small></div>) : <div className="empty">No notifications yet.</div>}</div>}
        </div>
        <button className="iconbtn" onClick={toggleTheme} aria-label="Toggle theme">{dark ? <FiSun /> : <FiMoon />}</button>
        <div className="menuwrap"><button className="avatar" aria-label="Account" aria-expanded={acct} onClick={() => setAcct(!acct)}>{(user?.name || 'T').trim()[0].toUpperCase()}</button>
          {acct && <div className="menu" onMouseLeave={() => setAcct(false)}><div className="mhead"><b>{user?.name || 'Trader'}</b><small className="mut">{user?.email}</small></div><Link to="/settings" onClick={() => setAcct(false)}>Settings</Link><Link to="/funds" onClick={() => setAcct(false)}>Funds</Link><Link to="/welcome" onClick={() => setAcct(false)}>Website</Link><button onClick={() => { logout(); go('/welcome'); }}>Log out</button></div>}</div>
      </header>
      <main id="main" className={'main' + (fill ? ' fill' : '')}><div className="route">{NEEDS(path) && feed.status !== 'ok' ? <DataGate /> : children}</div></main>
      <nav className="bnav" aria-label="Primary mobile">
        {BOTTOM.map(([k, n, I]) => <Link key={k} to={k} className={isActive(path, k) ? 'on' : ''}><I aria-hidden="true" /><span>{n}</span></Link>)}
        <button className={ui.more ? 'on' : ''} onClick={() => setUI({ more: !ui.more })} aria-expanded={ui.more}><FiMoreHorizontal aria-hidden="true" /><span>More</span></button>
      </nav>
      {ui.more && (
        <div className="sheetbg" onClick={() => setUI({ more: false })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row between"><b>All modules</b><button className="iconbtn" onClick={() => setUI({ more: false })} aria-label="Close"><FiX /></button></div>
            <div className="mgrid">{ALL.map(([k, n, I]) => <Link key={k} to={k} className={isActive(path, k) ? 'on' : ''}><I aria-hidden="true" /><span>{n}</span></Link>)}</div>
          </div>
        </div>
      )}
      {ui.palette && <Palette />}
      {ui.ticket && <Modal title="Place order" onClose={() => setUI({ ticket: null })}><Ticket iid={ui.ticket.iid} side={ui.ticket.side} onClose={() => setUI({ ticket: null })} /></Modal>}
      {ui.gtt && <GttDialog iid={ui.gtt.iid} side={ui.gtt.side} onClose={() => setUI({ gtt: null })} />}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.msg}</div>)}</div>
    </div>
  );
}

export function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', (t === 'light' || (t !== 'dark' && matchMedia('(prefers-color-scheme: light)').matches)) ? '#F2F5F9' : '#070A10');
}
export { notify };
