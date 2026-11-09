import { useEffect, useRef, useState } from 'react';
import { useLive, inst, placeOrder, notify, toastErr } from '../lib/engine.js';
import { M, META, UNIVERSE, expiriesFor, bs, greeks, yrs, optId, futId, oiFor } from '../lib/market.js';
import { fmt, inr, sg, pc, cl, dlab, clamp } from '../lib/util.js';
import { openTicket } from '../lib/ui.js';
import { Link } from '../lib/router.jsx';
import { Card, Pills, Table, Chg, ClosedBanner, Empty } from '../components/ui.jsx';

const TITLES = { IDX: 'Index F&O', STK: 'Stock F&O', COM: 'Commodity futures (MCX)', CUR: 'Currency futures (CDS)' };

export default function Derivatives({ seg }) {
  useLive();
  const [mode, setMode] = useState('IDX'), [sel, setSel] = useState({}), [view, setView] = useState('chain'), [legs, setLegs] = useState([]);
  const kind = seg === 'IDX' ? mode : seg;
  const unds = UNIVERSE.filter((u) => u.fo && (kind === 'STK' ? u.seg === 'EQ' : u.seg === kind));
  const und = sel[kind] && unds.some((u) => u.id === sel[kind]) ? sel[kind] : unds[0].id, u = META.get(und), exps = expiriesFor(u);
  const exp = sel[und + '|e'] && exps.includes(sel[und + '|e']) ? sel[und + '|e'] : exps[0];
  const hasOpt = u.seg === 'IDX' || u.seg === 'EQ', v = hasOpt ? view : 'fut';
  const m = M[und];
  const addLeg = (id) => { const i = inst(id); setLegs((l) => [...l, { id, side: 1, lots: 1, entry: i.ltp(), k: Math.random() }]); setView('strat'); notify('Added ' + i.label + ' to strategy', '', false); };
  return (
    <div className="page">
      <ClosedBanner seg={u.seg} />
      <div className="row between wrapr">
        <div><h1>{TITLES[kind]}</h1><div className="mut sm">Sample lot sizes. Option prices come from a simple pricing model on the simulated spot price. Open interest is generated.</div></div>
        <span className="chip sim">SIMULATED</span>
      </div>
      <Card>
        <div className="row between wrapr">
          {seg === 'IDX' && <Pills label="Segment" value={mode} onChange={(x) => { setMode(x); setView('chain'); }} options={[['IDX', 'Indices'], ['STK', 'Stocks']]} />}
          <Pills label="Underlying" value={und} onChange={(x) => setSel({ ...sel, [kind]: x })} options={unds.map((x) => [x.id, x.id])} />
          <Pills label="Expiry" value={exp} onChange={(x) => setSel({ ...sel, [und + '|e']: x })} options={exps.map((x) => [x, dlab(x)])} />
          {hasOpt && <Pills label="View" value={v} onChange={setView} options={[['chain', 'Option chain'], ['fut', 'Futures'], ['oi', 'OI analysis'], ['strat', 'Strategy' + (legs.length ? ` (${legs.length})` : '')]]} />}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <b className="big2 mono">{fmt(m.ltp, m.ltp < 100 ? 3 : 2)}</b><Chg id={und} abs /><span className="mut sm">{u.name} spot · lot {u.lot}{u.unit ? ' · per ' + u.unit : ''}</span>
          <Link to={'/stock/' + und} className="btn sm ghost">Chart</Link>
        </div>
      </Card>
      {v === 'chain' && <Chain u={u} exp={exp} onLeg={addLeg} />}
      {v === 'fut' && <Futures u={u} exps={exps} />}
      {v === 'oi' && <OI u={u} exp={exp} />}
      {v === 'strat' && <Strategy u={u} exp={exp} legs={legs} setLegs={setLegs} />}
    </div>
  );
}

function strikes(u) { const sp = M[u.id].ltp, st = u.step || 10, atm = Math.round(sp / st) * st; return { atm, st, list: Array.from({ length: 19 }, (_, k) => atm + (k - 9) * st) }; }

function Chain({ u, exp, onLeg }) {
  const { atm, list } = strikes(u), sp = M[u.id].ltp, T = yrs(exp), iv = u.iv || 0.13;
  const cell = (id, v) => (
    <span className="cellb"><b className="mono">{fmt(v)}</b>
      <button className="b" onClick={() => openTicket(id, 'BUY')} aria-label={'Buy ' + id}>B</button>
      <button className="s" onClick={() => openTicket(id, 'SELL')} aria-label={'Sell ' + id}>S</button>
      <button className="l" onClick={() => onLeg(id)} aria-label="Add to strategy">+</button></span>
  );
  const rows = list.map((k) => ({ k, ce: bs(sp, k, T, 'CE', iv), pe: bs(sp, k, T, 'PE', iv), gc: greeks(sp, k, T, 'CE', iv), gp: greeks(sp, k, T, 'PE', iv), oc: oiFor(u.id, k, 'CE', sp, u.step), op: oiFor(u.id, k, 'PE', sp, u.step) }));
  return (
    <Card title={`${u.id} · ${dlab(exp)}`} actions={<span className="mut sm">B buy · S sell · + add to strategy</span>}>
      <div className="scroll"><table className="tbl chain">
        <thead><tr><th colSpan="3" className="ce">CALLS (CE)</th><th>Strike</th><th colSpan="3" className="pe">PUTS (PE)</th></tr>
          <tr><th>OI (lakh)</th><th>Delta</th><th>LTP</th><th /><th className="l">LTP</th><th className="l">Delta</th><th className="l">OI (lakh)</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.k} className={r.k === atm ? 'atm' : ''}>
            <td className="oi"><i style={{ right: 0, width: Math.round(r.oc * 1.6) + '%', background: 'var(--up)' }} />{r.oc.toFixed(1)}</td>
            <td className="mut">{r.gc.delta.toFixed(2)}</td>
            <td>{cell(optId(u.id, r.k, 'CE', exp), r.ce)}</td>
            <td className="k">{fmt(r.k, u.step < 1 ? 2 : 0)}</td>
            <td className="l">{cell(optId(u.id, r.k, 'PE', exp), r.pe)}</td>
            <td className="l mut">{r.gp.delta.toFixed(2)}</td>
            <td className="l oi"><i style={{ left: 0, width: Math.round(r.op * 1.6) + '%', background: 'var(--dn)' }} />{r.op.toFixed(1)}</td>
          </tr>))}</tbody>
      </table></div>
    </Card>
  );
}

function Futures({ u, exps }) {
  const rows = exps.map((e) => inst(futId(u.id, e)));
  return (
    <Card title="Futures contracts">
      <Table rows={rows} rowKey={(r) => r.id} empty="No contracts."
        cols={[{ h: 'Contract', l: 1, render: (r) => <b>{r.label}</b> }, { h: 'Exchange', render: (r) => r.ex }, { h: 'Lot', render: (r) => r.lot },
          { h: 'Price', render: (r) => fmt(r.ltp(), r.ltp() < 100 ? 3 : 2) }, { h: 'Spot', render: (r) => fmt(M[u.id].ltp, M[u.id].ltp < 100 ? 3 : 2) },
          { h: 'Premium', render: (r) => pc((r.ltp() / M[u.id].ltp - 1) * 100) }, { h: 'Margin / lot', render: (r) => inr((u.seg === 'COM' ? 0.08 : u.seg === 'CUR' ? 0.03 : 0.12) * r.ltp() * r.lot) },
          { h: '', render: (r) => <span className="tb2"><button className="btn sm buy" onClick={() => openTicket(r.id, 'BUY')}>Buy</button><button className="btn sm sell" onClick={() => openTicket(r.id, 'SELL')}>Sell</button></span> }]} />
    </Card>
  );
}

function OI({ u, exp }) {
  const { list } = strikes(u), sp = M[u.id].ltp;
  const d = list.map((k) => ({ k, c: oiFor(u.id, k, 'CE', sp, u.step), p: oiFor(u.id, k, 'PE', sp, u.step) }));
  const tc = d.reduce((a, x) => a + x.c, 0), tp = d.reduce((a, x) => a + x.p, 0), pcr = tp / tc, mx = Math.max(...d.map((x) => Math.max(x.c, x.p)));
  const pain = d.map((x) => ({ k: x.k, loss: d.reduce((a, y) => a + Math.max(0, x.k - y.k) * y.c + Math.max(0, y.k - x.k) * y.p, 0) })).sort((a, b) => a.loss - b.loss)[0].k;
  const res = d.reduce((a, x) => (x.c > a.c ? x : a), d[0]), sup = d.reduce((a, x) => (x.p > a.p ? x : a), d[0]);
  return (
    <Card title={`Open interest · ${dlab(exp)}`} actions={<span className="chip sim">GENERATED</span>}>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <div className="stat"><small>Put-call ratio</small><b className="mono">{pcr.toFixed(2)}</b></div>
        <div className="stat"><small>Max pain</small><b className="mono">{fmt(pain, 0)}</b></div>
        <div className="stat"><small>Resistance (max call OI)</small><b className="mono dn">{fmt(res.k, 0)}</b></div>
        <div className="stat"><small>Support (max put OI)</small><b className="mono up">{fmt(sup.k, 0)}</b></div>
      </div>
      <div className="oibars">{d.map((x) => (
        <div key={x.k} className="oirow"><span className="mono k">{fmt(x.k, 0)}</span>
          <div className="bar"><i className="pe" style={{ width: (x.p / mx) * 100 + '%' }} /></div><div className="bar r"><i className="ce" style={{ width: (x.c / mx) * 100 + '%' }} /></div></div>))}
        <div className="oirow leg"><span /><span className="mut sm">Puts (green)</span><span className="mut sm right">Calls (red)</span></div></div>
    </Card>
  );
}

const TPL = {
  bullcall: ['Bull call spread', (a, s) => [['CE', a, 1], ['CE', a + 2 * s, -1]]],
  bearput: ['Bear put spread', (a, s) => [['PE', a, 1], ['PE', a - 2 * s, -1]]],
  straddle: ['Long straddle', (a) => [['CE', a, 1], ['PE', a, 1]]],
  strangle: ['Long strangle', (a, s) => [['CE', a + 2 * s, 1], ['PE', a - 2 * s, 1]]],
  condor: ['Iron condor', (a, s) => [['CE', a + 2 * s, -1], ['CE', a + 4 * s, 1], ['PE', a - 2 * s, -1], ['PE', a - 4 * s, 1]]],
};
function Strategy({ u, exp, legs, setLegs }) {
  const { atm, st } = strikes(u), cv = useRef();
  const mk = (t, k, side) => { const id = optId(u.id, k, t, exp); return { id, side, lots: 1, entry: inst(id).ltp(), k: Math.random() }; };
  const sp = M[u.id].ltp;
  const ps = legs.map((l) => ({ l, i: inst(l.id) })).filter((x) => x.i);
  const pts = []; let r = null, net = 0;
  if (ps.length) {
    for (let k = 0; k <= 300; k++) { const S0 = sp * (0.88 + (0.24 * k) / 300); let v = 0; ps.forEach(({ l, i }) => { const q = l.side * l.lots * i.lot, val = i.kind === 'FUT' ? S0 - l.entry : (i.type === 'CE' ? Math.max(S0 - i.k, 0) : Math.max(i.k - S0, 0)) - l.entry; v += q * val; }); pts.push([S0, v]); }
    const ys = pts.map((p) => p[1]), mx = Math.max(...ys), mn = Math.min(...ys), be = [];
    for (let k = 1; k < pts.length; k++) if (pts[k - 1][1] * pts[k][1] < 0) be.push(pts[k - 1][0] + ((pts[k][0] - pts[k - 1][0]) * Math.abs(pts[k - 1][1])) / (Math.abs(pts[k - 1][1]) + Math.abs(pts[k][1])));
    r = { mx, mn, be, upU: ys[300] > ys[280] + 1e-6 && ys[300] >= mx - 1e-6, dnU: ys[300] < ys[280] - 1e-6 && ys[300] <= mn + 1e-6, upL: ys[0] < ys[20] - 1e-6 && ys[0] <= mn + 1e-6 };
    net = ps.reduce((a, { l, i }) => a - l.side * l.entry * l.lots * i.lot, 0);
  }
  useEffect(() => {
    const c = cv.current; if (!c || !pts.length) return;
    const w = c.clientWidth, h = 240, dpr = devicePixelRatio || 1; c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement), C = (n) => css.getPropertyValue(n).trim();
    const lo = Math.min(r.mn, -1), hi = Math.max(r.mx, 1), pad = (hi - lo) * 0.12;
    const Y = (v) => h - 20 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (h - 32), X = (i) => (i / 300) * w;
    g.save(); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(i), Y(p[1])) : g.moveTo(X(i), Y(p[1])))); g.lineTo(w, Y(0)); g.lineTo(0, Y(0)); g.closePath(); g.clip();
    g.globalAlpha = 0.22; g.fillStyle = C('--up'); g.fillRect(0, 0, w, Y(0)); g.fillStyle = C('--dn'); g.fillRect(0, Y(0), w, h); g.restore(); g.globalAlpha = 1;
    g.strokeStyle = C('--line'); g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke();
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(i), Y(p[1])) : g.moveTo(X(i), Y(p[1])))); g.strokeStyle = C('--acc-t'); g.lineWidth = 2; g.stroke();
    const sx = ((sp - sp * 0.88) / (sp * 0.24)) * w; g.setLineDash([4, 4]); g.strokeStyle = C('--mut'); g.beginPath(); g.moveTo(sx, 6); g.lineTo(sx, h - 20); g.stroke(); g.setLineDash([]);
    g.fillStyle = C('--mut'); g.font = '11px "JetBrains Mono",monospace'; g.textAlign = 'center'; g.fillText('Spot ' + fmt(sp, 0), clamp(sx, 50, w - 50), h - 5); g.textAlign = 'left'; g.fillText(fmt(sp * 0.88, 0), 2, h - 5); g.textAlign = 'right'; g.fillText(fmt(sp * 1.12, 0), w - 2, h - 5);
  });
  const place = () => { let ok = 0, bad = 0; legs.forEach((l) => { const x = placeOrder({ iid: l.id, side: l.side > 0 ? 'BUY' : 'SELL', qty: l.lots, product: 'NRML', type: 'MARKET', src: 'STRATEGY' }); x.ok ? ok++ : bad++; }); bad ? toastErr(`${ok} leg(s) placed, ${bad} rejected. See the order book.`) : notify(`${ok} leg(s) executed`, 'ok'); };
  return (
    <div className="grid g2">
      <Card title="Strategy builder">
        <div className="pills" style={{ marginBottom: 12 }}>{Object.entries(TPL).map(([k, [n, f]]) => <button key={k} className="pill" onClick={() => setLegs(f(atm, st).map(([t, s, side]) => mk(t, s, side)))}>{n}</button>)}</div>
        {legs.length ? (
          <>
            <div className="scroll"><table className="tbl"><thead><tr><th className="l">Leg</th><th>Side</th><th>Lots</th><th>Entry</th><th /></tr></thead>
              <tbody>{ps.map(({ l, i }) => (
                <tr key={l.k}><td className="l"><b>{i.label}</b></td>
                  <td><button className={'btn sm ' + (l.side > 0 ? 'buy' : 'sell')} onClick={() => setLegs(legs.map((x) => (x === l ? { ...x, side: -x.side } : x)))}>{l.side > 0 ? 'BUY' : 'SELL'}</button></td>
                  <td><input className="mono mini" inputMode="numeric" aria-label="Lots" value={l.lots} onChange={(e) => setLegs(legs.map((x) => (x === l ? { ...x, lots: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)))} /></td>
                  <td className="mono">{fmt(l.entry)}</td><td><button className="btn sm" aria-label="Remove leg" onClick={() => setLegs(legs.filter((x) => x !== l))}>✕</button></td></tr>))}</tbody></table></div>
            <div className="row" style={{ marginTop: 12 }}><button className="btn pri" onClick={place}>Place all legs (paper)</button><button className="btn" onClick={() => setLegs([])}>Clear</button></div>
          </>
        ) : <Empty>Pick a template, or add contracts from the option chain with +.</Empty>}
      </Card>
      <Card title="Payoff at expiry">
        {r ? (
          <>
            <canvas ref={cv} className="cv" style={{ height: 240 }} aria-label="Payoff diagram" />
            <div className="kv" style={{ marginTop: 12 }}>
              <div className="stat"><small>Max profit</small><b className="mono up">{r.upU ? 'Unlimited' : inr(r.mx)}</b></div>
              <div className="stat"><small>Max loss</small><b className="mono dn">{r.dnU || r.upL ? 'Unlimited' : inr(r.mn)}</b></div>
              <div className="stat"><small>Net {net < 0 ? 'debit' : 'credit'}</small><b className="mono">{inr(Math.abs(net))}</b></div>
              <div className="stat"><small>Breakeven</small><b className="mono">{r.be.length ? r.be.map((b) => fmt(b, 0)).join(' · ') : 'None'}</b></div>
            </div>
          </>
        ) : <Empty>The payoff chart appears once the strategy has a leg.</Empty>}
      </Card>
    </div>
  );
}
