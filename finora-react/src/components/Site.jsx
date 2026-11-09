import { useEffect, useRef, useState } from 'react';
import { FiMenu, FiX, FiArrowRight, FiChevronDown } from 'react-icons/fi';
import { Link, go, useRoute } from '../lib/router.jsx';
import { useAuth, lastPage } from '../lib/auth.js';
import { M, agg, UNIVERSE, chgp } from '../lib/market.js';
import { fmt, pc, cl, clamp } from '../lib/util.js';

export const Logo = ({ s = 30 }) => <svg width={s} height={s} viewBox="0 0 72 72" role="img" aria-label="FINORA"><rect width="72" height="72" rx="18" fill="#6B5BF5" /><path d="M22 54V20h26v8H31v6h12v8H31v12z" fill="#fff" /></svg>;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll reveal: adds .in when the element enters the viewport. */
export function Reveal({ as: T = 'div', d = 0, kind = 'up', className = '', children, ...r }) {
  const ref = useRef(), [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduce() || !('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <T ref={ref} className={`rv rv-${kind}${on ? ' in' : ''} ${className}`} style={{ '--d': d + 'ms' }} {...r}>{children}</T>;
}

/* Count up when scrolled into view. */
export function CountUp({ to, prefix = '', suffix = '', dec = 0, ms = 1600 }) {
  const ref = useRef(), [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduce()) { setV(to); return; }
    let raf, t0;
    const run = () => { const step = (t) => { t0 = t0 || t; const p = clamp((t - t0) / ms, 0, 1); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el); return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);
  return <span ref={ref}>{prefix}{dec ? v.toFixed(dec) : fmt(Math.round(v), 0)}{suffix}</span>;
}

/* Tilt-on-hover card with a moving highlight. */
export function Tilt({ children, className = '', ...r }) {
  const ref = useRef();
  const mv = (e) => { const el = ref.current, b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height; el.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg'); el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); };
  const lv = () => { const el = ref.current; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
  return <div ref={ref} className={'tilt ' + className} onPointerMove={mv} onPointerLeave={lv} {...r}>{children}</div>;
}

/* Hero background: drifting candlestick field drawn on canvas. Pauses off screen. */
export function HeroCanvas() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d'); let raf, W, H, t = 0, vis = true;
    const N = 46, bars = Array.from({ length: N }, (_, i) => ({ x: i / N, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.9, h: 0.05 + Math.random() * 0.12 }));
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    const css = getComputedStyle(document.documentElement), up = css.getPropertyValue('--up').trim() || '#17B88C', dn = css.getPropertyValue('--dn').trim() || '#F05B6B';
    const draw = () => {
      g.clearRect(0, 0, W, H); t += 0.012;
      g.strokeStyle = 'rgba(140,150,200,.07)'; g.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const y = (H / 12) * i + ((t * 12) % (H / 12)); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      let prev = null;
      bars.forEach((b, i) => {
        const x = b.x * W, base = H * 0.62 - Math.sin(t * 0.7 + i * 0.28) * H * 0.12 - i * (H * 0.004), o = Math.sin(t * b.sp + b.ph) * H * b.h, cl = o > 0 ? up : dn, w = Math.max(3, W / N * 0.46);
        g.globalAlpha = 0.34; g.strokeStyle = cl; g.fillStyle = cl; g.beginPath(); g.moveTo(x, base - Math.abs(o) - 14); g.lineTo(x, base + Math.abs(o) + 14); g.stroke(); g.fillRect(x - w / 2, o > 0 ? base - o : base, w, Math.abs(o) || 2);
        if (prev) { g.globalAlpha = 0.5; g.strokeStyle = '#8E9CFF'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(x, base); g.stroke(); g.lineWidth = 1; } prev = [x, base];
      });
      g.globalAlpha = 1;
    };
    const loop = () => { if (vis && !document.hidden) draw(); raf = requestAnimationFrame(loop); };
    fit(); addEventListener('resize', fit);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); io.observe(c);
    if (reduce()) draw(); else loop();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); io.disconnect(); };
  }, []);
  return <canvas ref={ref} className="herocv" aria-hidden="true" />;
}

/* Mini terminal chart using the simulated feed. Candles draw in, then follow live ticks. */
export function MiniChart({ id = 'NIFTY', n = 56 }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d'); let raf, W, H, p = reduce() ? 1 : 0, last = 0;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); last = 0; };
    const css = getComputedStyle(document.documentElement), up = css.getPropertyValue('--up').trim(), dn = css.getPropertyValue('--dn').trim();
    const draw = (t) => {
      raf = requestAnimationFrame(draw); if (p >= 1 && t - last < 900) return; last = t; p = Math.min(1, p + 0.012);
      const d = agg(id, 5).slice(-n), lo = Math.min(...d.map((x) => x.l)), hi = Math.max(...d.map((x) => x.h)), pad = (hi - lo) * 0.1 || 1, bw = W / n;
      g.clearRect(0, 0, W, H); const Y = (v) => H - 8 - ((v - lo + pad) / (hi - lo + 2 * pad)) * (H - 16), k = Math.ceil(d.length * p);
      for (let i = 0; i < k; i++) { const x = d[i], cx = i * bw + bw / 2, col = x.c >= x.o ? up : dn, grow = i === k - 1 ? (d.length * p) % 1 || 1 : 1; g.strokeStyle = g.fillStyle = col; g.beginPath(); g.moveTo(cx, Y(x.h)); g.lineTo(cx, Y(x.l)); g.stroke(); const top = Y(Math.max(x.o, x.c)), bh = Math.max(2, Math.abs(Y(x.o) - Y(x.c))) * grow; g.fillRect(cx - bw * 0.3, top, bw * 0.6, bh); }
    };
    fit(); raf = requestAnimationFrame(draw); addEventListener('resize', fit);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, [id, n]);
  return <canvas ref={ref} className="minicv" aria-label={'Simulated ' + id + ' chart'} />;
}

export function Marquee() {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1500); return () => clearInterval(t); }, []);
  const items = UNIVERSE.filter((u) => u.seg !== 'IDX' || true).slice(0, 26);
  const row = items.map((u) => <span key={u.id} className="mq"><b>{u.id}</b><span className="mono">{fmt(M[u.id].ltp)}</span><span className={'mono ' + cl(chgp(u.id))}>{pc(chgp(u.id))}</span></span>);
  return <div className="marquee" aria-label="Simulated prices"><div className="mqtrack">{row}{row}</div></div>;
}

export function FAQ({ items }) {
  const [o, setO] = useState(0);
  return <div className="faq">{items.map(([q, a], i) => (
    <div key={q} className={'qa' + (o === i ? ' open' : '')}><button aria-expanded={o === i} onClick={() => setO(o === i ? -1 : i)}><span>{q}</span><FiChevronDown aria-hidden="true" /></button><div className="ans"><div><p>{a}</p></div></div></div>))}</div>;
}

const LINKS = [['/products', 'Products'], ['/pricing', 'Pricing'], ['/platforms', 'Platforms'], ['/about', 'About'], ['/support', 'Support']];
export function SiteLayout({ children }) {
  const { path } = useRoute(), user = useAuth(), [menu, setMenu] = useState(false), [sc, setSc] = useState(false), bar = useRef();
  useEffect(() => { setMenu(false); scrollTo(0, 0); }, [path]);
  useEffect(() => {
    const f = () => { setSc(scrollY > 12); const h = document.documentElement.scrollHeight - innerHeight; if (bar.current) bar.current.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; };
    f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f);
  }, []);
  const cta = user ? <button className="btn pri" onClick={() => go(lastPage())}>Open dashboard <FiArrowRight /></button> : <><Link to="/login" className="btn ghost">Log in</Link><Link to="/signup" className="btn pri shimmer">Open free account</Link></>;
  return (
    <div className="site">
      <div className="sprog" ref={bar} aria-hidden="true" />
      <header className={'shead' + (sc ? ' sc' : '')}>
        <div className="sw row between">
          <Link to="/welcome" className="brand"><Logo /><span className="bname">FINORA</span></Link>
          <nav className="slinks" aria-label="Site">{LINKS.map(([k, n]) => <Link key={k} to={k} className={path === k ? 'on' : ''}>{n}</Link>)}</nav>
          <div className="row scta">{cta}</div>
          <button className="iconbtn burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <FiX /> : <FiMenu />}</button>
        </div>
        {menu && <div className="smenu">{LINKS.map(([k, n]) => <Link key={k} to={k}>{n}</Link>)}<div className="row">{cta}</div></div>}
      </header>
      <main key={path} className="spage">{children}</main>
      <footer className="sfoot">
        <div className="sw">
          <div className="fgrid">
            <div><Link to="/welcome" className="brand"><Logo /><span className="bname">FINORA</span></Link><p className="mut">Trade Beyond Limits. A paper-trading and investing platform for Indian markets, built to learn without risking real money.</p></div>
            <div><h4>Products</h4><Link to="/products">Stocks and ETFs</Link><Link to="/products">Futures and options</Link><Link to="/products">Mutual funds</Link><Link to="/products">IPO</Link></div>
            <div><h4>Company</h4><Link to="/about">About</Link><Link to="/pricing">Pricing</Link><Link to="/platforms">Platforms</Link><Link to="/support">Support</Link></div>
            <div><h4>Legal</h4><Link to="/legal/terms">Terms of use</Link><Link to="/legal/privacy">Privacy policy</Link><Link to="/legal/risk">Risk disclosure</Link></div>
          </div>
          <p className="disc">FINORA Phase 1 is a simulator. Prices are generated, not taken from NSE, BSE or MCX, and all money is virtual. FINORA is not a SEBI registered broker or investment adviser and nothing here is investment advice. Investments in securities markets are subject to market risk.</p>
          <div className="row between wrapr mut sm"><span>© {new Date().getFullYear()} FINORA</span><span>Made for Indian investors</span></div>
        </div>
      </footer>
    </div>
  );
}
