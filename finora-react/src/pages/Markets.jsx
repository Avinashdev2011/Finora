import { useState } from 'react';
import { useLive } from '../lib/engine.js';
import { UNIVERSE, M, chg, chgp, ids } from '../lib/market.js';
import { fmt, sg, pc, cl, arrow, cr, clamp } from '../lib/util.js';
import { Link, go } from '../lib/router.jsx';
import { Card, Pills, Table, TB, Chg, Spark } from '../components/ui.jsx';

const eqIds = () => ids('EQ');
function Movers() {
  const [k, setK] = useState('gain');
  const all = eqIds();
  const list = k === 'gain' ? [...all].sort((a, b) => chgp(b) - chgp(a)) : k === 'lose' ? [...all].sort((a, b) => chgp(a) - chgp(b)) : k === 'act' ? [...all].sort((a, b) => M[b].v - M[a].v)
    : k === 'hi' ? [...all].sort((a, b) => (M[a].rangeHi - M[a].ltp) / M[a].rangeHi - (M[b].rangeHi - M[b].ltp) / M[b].rangeHi) : [...all].sort((a, b) => (M[a].ltp - M[a].rangeLo) / M[a].ltp - (M[b].ltp - M[b].rangeLo) / M[b].ltp);
  return (
    <Card title="Movers" actions={<Pills label="Movers" value={k} onChange={setK} options={[['gain', 'Gainers'], ['lose', 'Losers'], ['act', 'Most active'], ['hi', 'Near range high'], ['lo', 'Near range low']]} />}>
      <Table rows={list.slice(0, 8)} rowKey={(r) => r} onRow={(r) => go('/stock/' + r)}
        cols={[{ h: 'Symbol', l: 1, render: (r) => <><b>{r}</b><div className="mut sm">{UNIVERSE.find((u) => u.id === r).name}</div></> }, { h: 'LTP', render: (r) => fmt(M[r].ltp) }, { h: 'Change', render: (r) => <Chg id={r} /> }, { h: 'Volume', render: (r) => cr(M[r].v) }, { h: '', render: (r) => <TB id={r} /> }]} />
      <div className="mut sm" style={{ paddingTop: 8 }}>Range high and low use the simulator's own history window, not 52-week data.</div>
    </Card>
  );
}
function Sectors() {
  const by = {};
  UNIVERSE.filter((u) => u.seg === 'EQ').forEach((u) => (by[u.sec] = by[u.sec] || []).push(chgp(u.id)));
  const rows = Object.entries(by).map(([s, a]) => [s, a.reduce((x, y) => x + y, 0) / a.length]).sort((a, b) => b[1] - a[1]);
  return (
    <Card title="Sector performance">
      <div className="heat">{rows.map(([s, v]) => <div key={s} style={{ background: `color-mix(in srgb, ${v >= 0 ? 'var(--up)' : 'var(--dn)'} ${Math.round(clamp(Math.abs(v) / 1.5, 0.12, 0.5) * 100)}%, var(--s2))` }}>{s}<span className={cl(v)}>{pc(v)}</span></div>)}</div>
    </Card>
  );
}
function StocksTab({ seg }) {
  const [q, setQ] = useState(''), [sec, setSec] = useState(''), [sort, setSort] = useState(['id', 1]);
  const list = UNIVERSE.filter((u) => u.seg === seg && (!sec || u.sec === sec) && (!q || (u.id + u.name).toUpperCase().includes(q.toUpperCase())));
  const key = { id: (u) => u.id, ltp: (u) => M[u.id].ltp, chg: (u) => chgp(u.id), vol: (u) => M[u.id].v }[sort[0]];
  list.sort((a, b) => (key(a) > key(b) ? 1 : -1) * sort[1]);
  const secs = [...new Set(UNIVERSE.filter((u) => u.seg === seg).map((u) => u.sec))];
  const th = (k, n) => <button className="sortb" onClick={() => setSort([k, sort[0] === k ? -sort[1] : 1])}>{n}{sort[0] === k ? (sort[1] > 0 ? ' ▲' : ' ▼') : ''}</button>;
  return (
    <Card title={seg === 'EQ' ? 'All stocks' : 'ETFs'} actions={<><input className="mini" placeholder="Filter" aria-label="Filter" value={q} onChange={(e) => setQ(e.target.value)} />{seg === 'EQ' && <select className="mini" aria-label="Sector" value={sec} onChange={(e) => setSec(e.target.value)}><option value="">All sectors</option>{secs.map((s) => <option key={s}>{s}</option>)}</select>}</>}>
      <Table rows={list} rowKey={(u) => u.id} onRow={(u) => go('/stock/' + u.id)} empty="No match."
        cols={[{ h: th('id', 'Symbol'), l: 1, render: (u) => <><b>{u.id}</b><div className="mut sm">{u.name}</div></> }, { h: 'Sector', l: 1, render: (u) => u.sec }, { h: th('ltp', 'LTP'), render: (u) => fmt(M[u.id].ltp) }, { h: 'Chg', render: (u) => <span className={'mono ' + cl(chg(u.id))}>{sg(chg(u.id))}</span> }, { h: th('chg', '% Chg'), render: (u) => <Chg id={u.id} /> }, { h: 'High', render: (u) => fmt(M[u.id].hi) }, { h: 'Low', render: (u) => fmt(M[u.id].lo) }, { h: th('vol', 'Volume'), render: (u) => cr(M[u.id].v) }, { h: '', render: (u) => <TB id={u.id} /> }]} />
    </Card>
  );
}
function Heatmap() {
  const list = UNIVERSE.filter((u) => u.seg === 'EQ');
  return (
    <Card title="Heatmap" actions={<span className="mut sm">Tile colour shows today's change</span>}>
      <div className="hm">{list.map((u) => { const v = chgp(u.id); return <Link key={u.id} to={'/stock/' + u.id} style={{ background: `color-mix(in srgb, ${v >= 0 ? 'var(--up)' : 'var(--dn)'} ${Math.round(clamp(Math.abs(v) / 1.8, 0.1, 0.65) * 100)}%, var(--s2))` }}><b>{u.id}</b><span className="mono">{pc(v)}</span></Link>; })}</div>
    </Card>
  );
}
export default function Markets() {
  useLive();
  const [tab, setTab] = useState('over');
  return (
    <div className="page">
      <Pills label="Markets view" value={tab} onChange={setTab} options={[['over', 'Overview'], ['stocks', 'Stocks'], ['etf', 'ETFs'], ['heat', 'Heatmap']]} />
      {tab === 'over' && <>
        <div className="grid g4">{['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'].map((s) => (
          <Link key={s} to={'/stock/' + s} className="card lnk"><div className="row between mut"><span>{UNIVERSE.find((u) => u.id === s).name}</span><span>{s === 'SENSEX' ? 'BSE' : 'NSE'}</span></div><div className="mono xl">{fmt(M[s].ltp)}</div><div className={'mono ' + cl(chg(s))}>{arrow(chg(s))} {sg(chg(s))} ({pc(chgp(s))})</div><Spark id={s} /></Link>
        ))}</div>
        <div className="grid g2"><Movers /><Sectors /></div>
      </>}
      {tab === 'stocks' && <StocksTab seg="EQ" />}
      {tab === 'etf' && <StocksTab seg="ETF" />}
      {tab === 'heat' && <Heatmap />}
    </div>
  );
}
