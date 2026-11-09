import { useEffect, useRef, useState } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import { M, META, chg, chgp, searchSyms, marketOpen, SESSIONS } from '../lib/market.js';
import { pc, sg, cl } from '../lib/util.js';
import { openTicket } from '../lib/ui.js';

export const Chg = ({ id, abs }) => {
  const p = chgp(id);
  return <span className={'mono ' + cl(p)}>{abs ? sg(chg(id)) + ' ' : ''}{pc(p)}</span>;
};
export const Card = ({ title, actions, children, className = '', flush }) => (
  <section className={'card ' + className} style={flush ? { padding: 0 } : undefined}>
    {(title || actions) && <div className="cardhead" style={flush ? { padding: '14px 16px 0' } : undefined}>{title && <h2>{title}</h2>}{actions && <div className="row">{actions}</div>}</div>}
    {children}
  </section>
);
export const Pills = ({ value, onChange, options, label }) => (
  <div className="pills" role="group" aria-label={label}>
    {options.map(([k, n]) => <button key={k} className="pill" aria-pressed={value === k} onClick={() => onChange(k)}>{n}</button>)}
  </div>
);
export const Seg = ({ value, onChange, options, label }) => (
  <div className="seg" role="group" aria-label={label}>
    {options.map(([k, n, c]) => <button key={k} className={c || ''} aria-pressed={value === k} onClick={() => onChange(k)}>{n}</button>)}
  </div>
);
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Field = ({ label, children, hint }) => <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
export const Stat = ({ label, value, cls = '' }) => <div className="stat"><small>{label}</small><b className={'mono ' + cls}>{value}</b></div>;

export function Table({ cols, rows, onRow, empty = 'Nothing here yet.', rowKey }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="scroll">
      <table className="tbl">
        <thead><tr>{cols.map((c, i) => <th key={i} className={c.l ? 'l' : ''}>{c.h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={rowKey ? rowKey(r) : ri} className={onRow ? 'click' : ''} onClick={onRow ? () => onRow(r) : undefined}>
              {cols.map((c, i) => <td key={i} className={(c.l ? 'l ' : '') + (c.cls ? c.cls(r) : '')}>{c.render(r, ri)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TB({ id, size = 'sm' }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <span className="tb2" onClick={(e) => e.stopPropagation()}>
      <button className={`btn ${size} buy`} onClick={stop(() => openTicket(id, 'BUY'))} aria-label={'Buy ' + id}>B</button>
      <button className={`btn ${size} sell`} onClick={stop(() => openTicket(id, 'SELL'))} aria-label={'Sell ' + id}>S</button>
    </span>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'dialog' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dhead"><h2>{title}</h2><button className="iconbtn" onClick={onClose} aria-label="Close"><FiX /></button></div>
        <div className="dbody">{children}</div>
      </div>
    </div>
  );
}

export function Spark({ id, height = 46, data, color }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const draw = () => {
      const w = cv.clientWidth || 200, h = cv.clientHeight || height, dpr = devicePixelRatio || 1;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = data || M[id].c.slice(-90).map((x) => x.c);
      const up = data ? cs[cs.length - 1] >= cs[0] : chg(id) >= 0;
      const css = getComputedStyle(document.documentElement);
      const col = color || css.getPropertyValue(up ? '--up' : '--dn').trim();
      const lo = Math.min(...cs), hi = Math.max(...cs);
      const X = (i) => (i / (cs.length - 1)) * w, Y = (v) => h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 8);
      g.beginPath(); cs.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))));
      g.strokeStyle = col; g.lineWidth = 1.6; g.stroke(); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.globalAlpha = 0.14; g.fillStyle = col; g.fill();
    };
    draw();
    const t = setInterval(draw, 4000);
    return () => clearInterval(t);
  }, [id, data, color, height]);
  return <canvas ref={ref} className="spark" style={{ height }} aria-hidden="true" />;
}

export function SymbolPicker({ onPick, placeholder = 'Search symbol', filter, autoFocus, clear = true }) {
  const [q, setQ] = useState(''), [open, setOpen] = useState(false), [hi, setHi] = useState(0);
  const res = searchSyms(q, 8).filter((u) => (filter ? filter(u) : true));
  const pick = (u) => { onPick(u.id); if (clear) setQ(''); setOpen(false); };
  return (
    <div className="picker">
      <FiSearch className="pi" aria-hidden="true" />
      <input value={q} autoFocus={autoFocus} placeholder={placeholder} aria-label={placeholder} autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, res.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && res[hi]) pick(res[hi]);
          else if (e.key === 'Escape') setOpen(false);
        }} />
      {open && q && (
        <div className="dd">
          {res.length ? res.map((u, i) => (
            <button key={u.id} className={i === hi ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(u); }}>
              <span><b>{u.id}</b> <span className="mut">{u.name}</span></span><span className="mut">{u.sec}</span>
            </button>
          )) : <div className="empty">No match</div>}
        </div>
      )}
    </div>
  );
}
export { META };

export function ClosedBanner({ seg = 'EQ' }) {
  if (marketOpen(seg)) return null;
  return <div className="banner">Market is closed ({(SESSIONS[seg] || SESSIONS.EQ)[2]}, Monday to Friday). Prices and charts are frozen at the last close, and orders cannot be placed until it opens.</div>;
}
