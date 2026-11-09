import { useEffect, useRef, useState } from 'react';
import { useLive, getS, equity, dayPnl, available, holdMV, holdCost, unreal, mfValue, mfInvested, blocked } from '../lib/engine.js';
import { fmt, inr, sg, pc, cl } from '../lib/util.js';
import { Link } from '../lib/router.jsx';
import { Card, Pills, Stat } from '../components/ui.jsx';
import { PositionsTable, HoldingsTable } from '../components/tables.jsx';

function Curve({ pts, base }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const w = cv.clientWidth, h = 200, dpr = devicePixelRatio || 1; cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement), C = (n) => css.getPropertyValue(n).trim();
    const lo = Math.min(...pts, base), hi = Math.max(...pts, base), pad = (hi - lo) * 0.15 || 1000, W = w - 76;
    const Y = (v) => h - 20 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (h - 30), X = (i) => (i / Math.max(1, pts.length - 1)) * W;
    g.strokeStyle = C('--line'); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, Y(base)); g.lineTo(W, Y(base)); g.stroke(); g.setLineDash([]);
    const col = C(pts[pts.length - 1] >= base ? '--up' : '--dn');
    g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
    g.lineTo(W, h - 20); g.lineTo(0, h - 20); g.closePath(); g.globalAlpha = 0.12; g.fillStyle = col; g.fill(); g.globalAlpha = 1;
    g.fillStyle = C('--mut'); g.font = '11px "JetBrains Mono",monospace'; g.textAlign = 'left'; g.fillText(fmt(hi, 0), W + 6, 12); g.fillText(fmt(lo, 0), W + 6, h - 22); g.fillText('Capital', W + 6, Y(base) + 4);
  });
  return <canvas ref={ref} className="cv" style={{ height: 200 }} aria-label="Equity curve" />;
}

function Donut({ parts }) {
  const ref = useRef();
  const total = parts.reduce((a, p) => a + Math.max(0, p.v), 0) || 1;
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const s = 200, dpr = devicePixelRatio || 1; cv.width = s * dpr; cv.height = s * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let a = -Math.PI / 2;
    parts.forEach((p) => { const d = (Math.max(0, p.v) / total) * Math.PI * 2; g.beginPath(); g.arc(s / 2, s / 2, 90, a, a + d); g.arc(s / 2, s / 2, 58, a + d, a, true); g.closePath(); g.fillStyle = p.c; g.fill(); a += d; });
  });
  return (
    <div className="row" style={{ gap: 24 }}>
      <canvas ref={ref} style={{ width: 200, height: 200 }} role="img" aria-label="Allocation chart" />
      <div className="legendcol">{parts.map((p) => <div key={p.n} className="row between"><span><i className="swatch" style={{ background: p.c }} />{p.n}</span><span className="mono">{((Math.max(0, p.v) / total) * 100).toFixed(1)}%</span></div>)}</div>
    </div>
  );
}

export default function Portfolio() {
  useLive();
  const S = getS(), [tab, setTab] = useState('holdings');
  const e = equity(), day = dayPnl(), hv = holdMV(), hc = holdCost(), un = unreal(), mv = mfValue(), mi = mfInvested();
  const pts = S.eq.length > 2 ? S.eq.map((x) => x.v) : [S.start, e];
  const parts = [{ n: 'Cash', v: S.cash - blocked() > 0 ? S.cash : S.cash, c: '#4FA3FF' }, { n: 'Stocks and ETFs', v: hv, c: '#6B5BF5' }, { n: 'Mutual funds', v: mv, c: '#22C55E' }, { n: 'IPO funds blocked', v: S.ipoBlocked, c: '#F5B700' }, { n: 'F&O unrealized', v: Math.abs(un), c: '#FB5A74' }];
  return (
    <div className="page">
      <div className="row between wrapr"><h1>Portfolio</h1><span className="chip sim">VIRTUAL MONEY</span></div>
      <div className="grid g4">
        <Card><Stat label="Total value" value={inr(e)} /></Card>
        <Card><Stat label="Day P&L" value={sg(day)} cls={cl(day)} /></Card>
        <Card><Stat label="Overall P&L" value={`${sg(e - S.start)} (${pc(((e - S.start) / S.start) * 100)})`} cls={cl(e - S.start)} /></Card>
        <Card><Stat label="Realized P&L" value={sg(S.realized)} cls={cl(S.realized)} /></Card>
        <Card><Stat label="Available margin" value={inr(available())} /></Card>
        <Card><Stat label="Margin used" value={inr(blocked())} /></Card>
        <Card><Stat label="Holdings" value={`${inr(hv)} (${sg(hv - hc)})`} cls={cl(hv - hc)} /></Card>
        <Card><Stat label="Mutual funds" value={`${inr(mv)} (${sg(mv - mi)})`} cls={cl(mv - mi)} /></Card>
      </div>
      <div className="grid g2">
        <Card title="Equity curve"><Curve pts={pts} base={S.start} /></Card>
        <Card title="Allocation"><Donut parts={parts} /></Card>
      </div>
      <Pills label="View" value={tab} onChange={setTab} options={[['holdings', `Holdings (${Object.keys(S.holdings).length})`], ['positions', `Positions (${Object.keys(S.positions).length})`]]} />
      <Card flush>{tab === 'holdings' ? <HoldingsTable /> : <PositionsTable />}</Card>
      <div className="mut sm">Mutual fund and IPO details are on their own pages: <Link to="/mutual-funds">Mutual funds</Link> and <Link to="/ipo">IPO</Link>.</div>
    </div>
  );
}
