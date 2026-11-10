import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiMinus } from 'react-icons/fi';
import { M, META, agg, TF, ema, sma, rsi, macd, boll, chg, chgp, marketOpen, focusSymbol, seriesState } from '../lib/market.js';
import { subscribe, inst, bid, ask } from '../lib/engine.js';
import { fmt, pc, sg, clamp } from '../lib/util.js';
import { openTicket } from '../lib/ui.js';

const DRAW = new Map();
export const clearDrawings = (s) => DRAW.set(s, []);
export const undoDrawing = (s) => (DRAW.get(s) || []).pop();

export default function Chart({ sym, tf = '5m', type = 'candle', ind = {}, tool = 'cursor', compact = false, trade = true }) {
  const wrap = useRef(), cv = useRef();
  const s = useRef({ n: compact ? 60 : 90, off: 0, mouse: null, pend: null, geo: null, ptrs: new Map(), drag: null, pinch: 0, raf: 0, last: '' });
  const props = useRef({}); props.current = { sym, tf, type, ind, tool, compact };
  const [lg, setLg] = useState(null);
  const [quote, setQuote] = useState(null);

  const draw = () => {
    s.current.raf = 0;
    const c = cv.current, w = wrap.current; if (!c || !w) return;
    const { sym, tf, type, ind, compact } = props.current, st = s.current;
    const W = Math.floor(w.clientWidth), H = Math.floor(w.clientHeight); if (W < 50 || H < 50) return;
    const dpr = devicePixelRatio || 1;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.documentElement), C = (n) => css.getPropertyValue(n).trim();
    const up = C('--up'), dn = C('--dn'), mut = C('--mut'), line = C('--line'), fg = C('--fg'), acc = C('--acc-t'), info = C('--info'), warn = C('--warn'), bg = C('--bg'), s2 = C('--s2');
    const data = agg(sym, TF[tf]), len = data.length, closes = data.map((d) => d.c);
    if (!len) { const stt = seriesState(sym, TF[tf]); g.fillStyle = mut; g.font = '13px Inter,system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(stt === 'error' ? 'Chart data could not be loaded. Check your connection.' : 'Loading real chart data', W / 2, H / 2); return; }
    st.n = clamp(st.n, 20, 300);
    const n = Math.min(st.n, len); st.off = clamp(st.off, 0, Math.max(0, len - n));
    const end = len - st.off, start = Math.max(0, end - n), vis = data.slice(start, end);
    const E = ind.ema ? ema(closes, 20) : null, SM = ind.sma ? sma(closes, 50) : null, R = ind.rsi ? rsi(closes, 14) : null, MC = ind.macd ? macd(closes) : null, BB = ind.bb ? boll(closes) : null;
    const padL = 6, padR = compact ? 56 : 68, padT = 10, padB = 22, gap = 8, avail = H - padT - padB;
    const panels = []; if (ind.vol) panels.push('vol'); if (R) panels.push('rsi'); if (MC) panels.push('macd');
    const ph = Math.round(avail * (compact ? 0.16 : 0.15)), mainH = avail - panels.length * (ph + gap);
    let lo = Infinity, hi = -Infinity;
    vis.forEach((d, k) => { lo = Math.min(lo, d.l); hi = Math.max(hi, d.h); const j = start + k; if (BB && BB.up[j] != null) { hi = Math.max(hi, BB.up[j]); lo = Math.min(lo, BB.lo[j]); } });
    const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
    const bw = (W - padL - padR) / n, X = (k) => padL + (n - vis.length + k + 0.5) * bw, Y = (p) => padT + ((hi - p) / (hi - lo)) * mainH;
    st.geo = { padL, padR, padT, mainH, lo, hi, bw, n, start, vis, data, W, H, padB };
    g.fillStyle = mut; g.globalAlpha = 0.06; g.font = '700 56px Sora,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, padL + (W - padL - padR) / 2, padT + mainH / 2); g.globalAlpha = 1;
    g.font = '11px "JetBrains Mono",monospace'; g.lineWidth = 1;
    const dec = hi - lo < 5 ? 3 : 2;
    for (let i = 0; i <= 6; i++) { const p = lo + ((hi - lo) * i) / 6, y = Math.round(Y(p)) + 0.5; g.strokeStyle = line; g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); g.fillStyle = mut; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(fmt(p, dec), W - padR + 5, y); }
    const every = Math.max(1, Math.round(n / (compact ? 4 : 6)));
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let k = 0; k < vis.length; k += every) { const x = Math.round(X(k)) + 0.5; g.strokeStyle = line; g.beginPath(); g.moveTo(x, padT); g.lineTo(x, padT + mainH); g.stroke(); const d = new Date(vis[k].t); g.fillStyle = mut; g.fillText(tf === '1D' ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), x, H - padB + 6); }
    g.save(); g.beginPath(); g.rect(padL, padT, W - padL - padR, mainH); g.clip();
    if (type === 'line' || type === 'area') {
      g.beginPath(); vis.forEach((d, k) => (k ? g.lineTo(X(k), Y(d.c)) : g.moveTo(X(k), Y(d.c)))); g.strokeStyle = acc; g.lineWidth = 2; g.stroke();
      if (type === 'area') { g.lineTo(X(vis.length - 1), padT + mainH); g.lineTo(X(0), padT + mainH); g.closePath(); g.globalAlpha = 0.16; g.fillStyle = acc; g.fill(); g.globalAlpha = 1; }
    } else vis.forEach((d, k) => {
      const x = X(k), col = d.c >= d.o ? up : dn; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
      if (type === 'bar') { g.beginPath(); g.moveTo(x, Y(d.h)); g.lineTo(x, Y(d.l)); g.moveTo(x - bw * 0.35, Y(d.o)); g.lineTo(x, Y(d.o)); g.moveTo(x, Y(d.c)); g.lineTo(x + bw * 0.35, Y(d.c)); g.stroke(); }
      else { g.beginPath(); g.moveTo(Math.round(x) + 0.5, Y(d.h)); g.lineTo(Math.round(x) + 0.5, Y(d.l)); g.stroke(); g.fillRect(x - bw * 0.36, Y(Math.max(d.o, d.c)), bw * 0.72, Math.max(1, Math.abs(Y(d.o) - Y(d.c)))); }
    });
    const L = (arr, col) => { g.beginPath(); let on = false; vis.forEach((d, k) => { const v = arr[start + k]; if (v == null) return; on ? g.lineTo(X(k), Y(v)) : g.moveTo(X(k), Y(v)); on = true; }); g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); };
    if (E) L(E, info); if (SM) L(SM, warn); if (BB) { L(BB.up, acc); L(BB.lo, acc); L(BB.mid, mut); }
    const dr = DRAW.get(sym) || [];
    const tx = (t) => { let a = 0, b = len - 1; while (a < b) { const m = (a + b) >> 1; data[m].t < t ? (a = m + 1) : (b = m); } return padL + (n - vis.length + (a - start) + 0.5) * bw; };
    g.lineWidth = 1.5;
    dr.forEach((d) => {
      g.strokeStyle = warn; g.fillStyle = warn;
      if (d.k === 'hl') { const y = Y(d.a.p); g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); g.fillText(fmt(d.a.p, dec), W - padR - 40, y - 8); }
      else if (d.k === 'tl') { g.beginPath(); g.moveTo(tx(d.a.t), Y(d.a.p)); g.lineTo(tx(d.b.t), Y(d.b.p)); g.stroke(); g.beginPath(); g.arc(tx(d.a.t), Y(d.a.p), 3, 0, 7); g.arc(tx(d.b.t), Y(d.b.p), 3, 0, 7); g.fill(); }
      else if (d.k === 'rc') { const x1 = tx(d.a.t), x2 = tx(d.b.t), y1 = Y(d.a.p), y2 = Y(d.b.p); g.globalAlpha = 0.14; g.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); g.globalAlpha = 1; g.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); }
      else if (d.k === 'fib') { const y1 = Y(d.a.p), y2 = Y(d.b.p); [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((r) => { const y = y1 + (y2 - y1) * r; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); g.globalAlpha = 1; g.textAlign = 'left'; g.fillText(r + '  ' + fmt(d.a.p + (d.b.p - d.a.p) * r, dec), padL + 4, y - 7); }); }
    });
    if (st.pend) { g.fillStyle = warn; g.beginPath(); g.arc(tx(st.pend.t), Y(st.pend.p), 4, 0, 7); g.fill(); }
    g.restore();
    const m = M[sym], lp = m.ltp, ly = Y(lp);
    if (ly > padT && ly < padT + mainH) { const col = lp >= m.prev ? up : dn; g.setLineDash([3, 3]); g.strokeStyle = col; g.beginPath(); g.moveTo(padL, ly); g.lineTo(W - padR, ly); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.fillRect(W - padR, ly - 9, padR, 18); g.fillStyle = bg; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '600 11px "JetBrains Mono",monospace'; g.fillText(fmt(lp, dec), W - padR + 5, ly); }
    let y0 = padT + mainH + gap;
    panels.forEach((p) => {
      g.font = '11px Inter,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = mut;
      if (p === 'vol') { const mv = Math.max(...vis.map((d) => d.v)) || 1; vis.forEach((d, k) => { g.globalAlpha = 0.55; g.fillStyle = d.c >= d.o ? up : dn; const h = (d.v / mv) * ph; g.fillRect(X(k) - bw * 0.36, y0 + ph - h, bw * 0.72, h); }); g.globalAlpha = 1; g.fillStyle = mut; g.fillText('Volume', padL + 4, y0 + 2); }
      if (p === 'rsi') { g.strokeStyle = line; [30, 70].forEach((v) => { const y = y0 + ph * (1 - v / 100); g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); }); g.beginPath(); let on = false; vis.forEach((d, k) => { const v = R[start + k]; if (v == null) return; const y = y0 + ph * (1 - v / 100); on ? g.lineTo(X(k), y) : g.moveTo(X(k), y); on = true; }); g.strokeStyle = warn; g.lineWidth = 1.5; g.stroke(); g.fillStyle = mut; g.fillText('RSI 14', padL + 4, y0 + 2); g.textBaseline = 'middle'; g.font = '11px "JetBrains Mono",monospace'; g.fillText('70', W - padR + 5, y0 + ph * 0.3); g.fillText('30', W - padR + 5, y0 + ph * 0.7); }
      if (p === 'macd') { const hs = vis.map((d, k) => MC.h[start + k]), mx = Math.max(...hs.map(Math.abs), 1e-9); const zy = y0 + ph / 2; g.strokeStyle = line; g.beginPath(); g.moveTo(padL, zy); g.lineTo(W - padR, zy); g.stroke(); vis.forEach((d, k) => { const v = MC.h[start + k]; g.fillStyle = v >= 0 ? up : dn; g.globalAlpha = 0.6; g.fillRect(X(k) - bw * 0.3, v >= 0 ? zy - (v / mx) * (ph / 2) : zy, bw * 0.6, (Math.abs(v) / mx) * (ph / 2)); }); g.globalAlpha = 1; const ML = (arr, col) => { g.beginPath(); vis.forEach((d, k) => { const y = zy - (arr[start + k] / mx) * (ph / 2); k ? g.lineTo(X(k), y) : g.moveTo(X(k), y); }); g.strokeStyle = col; g.lineWidth = 1.2; g.stroke(); }; ML(MC.m, info); ML(MC.s, warn); g.fillStyle = mut; g.fillText('MACD 12 26 9', padL + 4, y0 + 2); }
      y0 += ph + gap;
    });
    let hk = vis.length - 1;
    const ms = st.mouse;
    if (ms && ms.x > padL && ms.x < W - padR && ms.y > padT && ms.y < H - padB) {
      hk = clamp(Math.round((ms.x - padL) / bw - 0.5 - (n - vis.length)), 0, vis.length - 1);
      const x = Math.round(X(hk)) + 0.5; g.setLineDash([4, 4]); g.strokeStyle = mut; g.lineWidth = 1; g.beginPath(); g.moveTo(x, padT); g.lineTo(x, H - padB); g.moveTo(padL, ms.y); g.lineTo(W - padR, ms.y); g.stroke(); g.setLineDash([]);
      if (ms.y < padT + mainH) { const p = hi - ((ms.y - padT) / mainH) * (hi - lo); g.fillStyle = s2; g.fillRect(W - padR, ms.y - 9, padR, 18); g.fillStyle = fg; g.font = '11px "JetBrains Mono",monospace'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(fmt(p, dec), W - padR + 5, ms.y); }
    }
    const d = vis[hk];
    if (d) {
      const j = start + hk, cc = d.c - d.o;
      const L2 = { o: fmt(d.o, dec), h: fmt(d.h, dec), l: fmt(d.l, dec), c: fmt(d.c, dec), up: cc >= 0, chg: sg(chg(sym)) + ' (' + pc(chgp(sym)) + ')', cup: chg(sym) >= 0, v: fmt(d.v, 0), ema: E ? fmt(E[j], dec) : '', sma: SM && SM[j] != null ? fmt(SM[j], dec) : '', rsi: R && R[j] != null ? R[j].toFixed(1) : '' };
      const key = JSON.stringify(L2); if (key !== st.last) { st.last = key; setLg(L2); }
    }
    const i = inst(sym);
    if (i && i.kind !== 'SPOT') { const q = fmt(bid(i), dec) + '|' + fmt(ask(i), dec); if (q !== st.q) { st.q = q; setQuote(q.split('|')); } }
  };
  const schedule = () => { if (!s.current.raf) s.current.raf = requestAnimationFrame(draw); };

  useEffect(() => {
    const off = subscribe(schedule), ro = new ResizeObserver(schedule); ro.observe(wrap.current);
    const wheel = (e) => { e.preventDefault(); s.current.n += e.deltaY > 0 ? 8 : -8; schedule(); };
    cv.current.addEventListener('wheel', wheel, { passive: false });
    const c = cv.current; schedule();
    return () => { off(); ro.disconnect(); c.removeEventListener('wheel', wheel); cancelAnimationFrame(s.current.raf); };
  }, []);
  useEffect(() => { s.current.pend = null; s.current.off = 0; schedule(); }, [sym, tf]);
  useEffect(() => { focusSymbol(sym); return () => focusSymbol(null); }, [sym]);
  useEffect(schedule, [type, ind, tool]);

  const pos = (e) => { const r = cv.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e) => { cv.current.setPointerCapture(e.pointerId); const p = pos(e), st = s.current; st.ptrs.set(e.pointerId, p); st.drag = { x: p.x, off: st.off, moved: false }; if (st.ptrs.size === 2) { const [a, b] = [...st.ptrs.values()]; st.pinch = Math.hypot(a.x - b.x, a.y - b.y); st.pn = st.n; } };
  const move = (e) => {
    const st = s.current, p = pos(e); st.mouse = p;
    if (st.ptrs.has(e.pointerId)) st.ptrs.set(e.pointerId, p);
    if (st.ptrs.size === 2 && st.pinch) { const [a, b] = [...st.ptrs.values()]; st.n = clamp(Math.round(st.pn * (st.pinch / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)))), 20, 300); }
    else if (st.drag && st.geo) { const dx = p.x - st.drag.x; if (Math.abs(dx) > 4) st.drag.moved = true; if (st.drag.moved) st.off = st.drag.off + Math.round(dx / st.geo.bw); }
    schedule();
  };
  const up = (e) => {
    const st = s.current, p = pos(e), G = st.geo, t = props.current.tool;
    if (st.drag && !st.drag.moved && st.ptrs.size < 2 && G && t !== 'cursor' && p.y > G.padT && p.y < G.padT + G.mainH) {
      const k = clamp(Math.round((p.x - G.padL) / G.bw - 0.5 - (G.n - G.vis.length)) + G.start, 0, G.data.length - 1);
      const pt = { t: G.data[k].t, p: G.hi - ((p.y - G.padT) / G.mainH) * (G.hi - G.lo) };
      const sym = props.current.sym, list = DRAW.get(sym) || []; DRAW.set(sym, list);
      if (t === 'hl') list.push({ k: 'hl', a: pt }); else if (st.pend) { list.push({ k: t, a: st.pend, b: pt }); st.pend = null; } else st.pend = pt;
    }
    st.ptrs.delete(e.pointerId); st.pinch = 0; st.drag = null; if (!st.ptrs.size) st.mouse = e.pointerType === 'mouse' ? p : null; schedule();
  };

  const m = META.get(sym);
  return (
    <div className="chartwrap" ref={wrap}>
      <canvas ref={cv} aria-label={'Price chart for ' + sym} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onPointerLeave={() => { s.current.mouse = null; schedule(); }} onDoubleClick={() => { s.current.off = 0; schedule(); }} />
      {lg && (
        <div className="legend">
          <div className="h">{sym} <span className="mut">· {m && m.name} · {tf}</span></div>
          <div className="ln">O <i className={lg.up ? 'up' : 'dn'}>{lg.o}</i> H <i className={lg.up ? 'up' : 'dn'}>{lg.h}</i> L <i className={lg.up ? 'up' : 'dn'}>{lg.l}</i> C <i className={lg.up ? 'up' : 'dn'}>{lg.c}</i> <i className={lg.cup ? 'up' : 'dn'}>{lg.chg}</i></div>
          {!compact && <div className="ln">{lg.ema && <span style={{ color: 'var(--info)' }}>EMA 20 {lg.ema} </span>}{lg.sma && <span style={{ color: 'var(--warn)' }}>SMA 50 {lg.sma} </span>}{lg.rsi && <span style={{ color: 'var(--warn)' }}>RSI {lg.rsi} </span>}{ind.vol && 'Vol ' + lg.v}</div>}
        </div>
      )}
      {m && !marketOpen(m.seg) && <div className="closedtag">MARKET CLOSED · showing last close</div>}
      <div className="zoom"><button className="iconbtn sm" aria-label="Zoom in" onClick={() => { s.current.n -= 12; schedule(); }}><FiPlus /></button><button className="iconbtn sm" aria-label="Zoom out" onClick={() => { s.current.n += 12; schedule(); }}><FiMinus /></button></div>
      {trade && quote && !compact && (
        <div className="quick"><button className="qs" onClick={() => openTicket(sym, 'SELL')}><small>SELL</small>{quote[0]}</button><button className="qb" onClick={() => openTicket(sym, 'BUY')}><small>BUY</small>{quote[1]}</button></div>
      )}
    </div>
  );
}
