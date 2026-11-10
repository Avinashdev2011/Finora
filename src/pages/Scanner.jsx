import { useState } from 'react';
import { useLive } from '../lib/engine.js';
import { M, META, ids, technicals, chgp } from '../lib/market.js';
import { fmt, pc, cl } from '../lib/util.js';
import { go } from '../lib/router.jsx';
import { Card, Pills, Table, Field, ClosedBanner } from '../components/ui.jsx';
import { openTicket } from '../lib/ui.js';

const PRESETS = [
  ['gain', 'Top gainers', (r) => r.p > 0, (a, b) => b.p - a.p],
  ['lose', 'Top losers', (r) => r.p < 0, (a, b) => a.p - b.p],
  ['os', 'RSI oversold (<30)', (r) => r.t && r.t.rsi < 30, (a, b) => a.t.rsi - b.t.rsi],
  ['ob', 'RSI overbought (>70)', (r) => r.t && r.t.rsi > 70, (a, b) => b.t.rsi - a.t.rsi],
  ['sb', 'Strong buy signals', (r) => r.t && (r.t.verdict === 'Strong buy' || r.t.verdict === 'Buy'), (a, b) => b.t.buy - a.t.buy],
  ['ss', 'Strong sell signals', (r) => r.t && (r.t.verdict === 'Strong sell' || r.t.verdict === 'Sell'), (a, b) => b.t.sell - a.t.sell],
];

export default function Scanner() {
  useLive();
  const [tab, setTab] = useState('gain'), [minP, setMinP] = useState(''), [maxP, setMaxP] = useState(''), [sig, setSig] = useState('ANY'), [stamp, setStamp] = useState(0);
  const base = ids('EQ').map((id) => ({ id, t: technicals(id) })); void stamp;
  const analysed = base.filter((b) => b.t).length;
  const rows = base.map((b) => ({ ...b, ltp: M[b.id].ltp, p: chgp(b.id) }));
  const preset = PRESETS.find((p) => p[0] === tab);
  let list;
  if (preset) list = rows.filter(preset[2]).sort(preset[3]);
  else {
    const lo = parseFloat(minP), hi = parseFloat(maxP);
    list = rows.filter((r) => (isNaN(lo) || r.ltp >= lo) && (isNaN(hi) || r.ltp <= hi) && (sig === 'ANY' || (r.t && r.t.verdict.toLowerCase().includes(sig.toLowerCase())))).sort((a, b) => b.p - a.p);
  }
  return (
    <div className="page">
      <ClosedBanner seg="EQ" />
      <div className="row between wrapr"><div><h1>Scanner</h1><div className="mut sm">Scans real prices and daily indicators. Signal scans fill in as price history loads ({analysed} of {base.length} stocks analysed). These are not trade recommendations.</div></div><button className="btn" onClick={() => setStamp((x) => x + 1)}>Refresh signals</button></div>
      <Pills label="Scan" value={tab} onChange={setTab} options={[...PRESETS.map((p) => [p[0], p[1]]), ['custom', 'Custom filter']]} />
      {tab === 'custom' && (
        <Card title="Filters"><div className="row wrapr">
          <Field label="Min price"><input className="mono mini" inputMode="decimal" value={minP} onChange={(e) => setMinP(e.target.value)} /></Field>
          <Field label="Max price"><input className="mono mini" inputMode="decimal" value={maxP} onChange={(e) => setMaxP(e.target.value)} /></Field>
          <Pills label="Signal" value={sig} onChange={setSig} options={[['ANY', 'Any'], ['buy', 'Buy'], ['sell', 'Sell'], ['neutral', 'Neutral']]} />
        </div></Card>
      )}
      <Card flush>
        <Table rows={list} rowKey={(r) => r.id} onRow={(r) => go('/stock/' + r.id)} empty="No stocks match this scan right now."
          cols={[{ h: 'Symbol', l: 1, render: (r) => <><b>{r.id}</b> <span className="mut sm">{META.get(r.id).name}</span></> }, { h: 'LTP', render: (r) => fmt(r.ltp) }, { h: 'Change', render: (r) => pc(r.p), cls: (r) => cl(r.p) },
            { h: 'RSI', render: (r) => (r.t ? r.t.rsi.toFixed(1) : '—') }, { h: 'Signal', render: (r) => (r.t ? r.t.verdict : '—'), cls: (r) => (r.t && /buy/i.test(r.t.verdict) ? 'up' : r.t && /sell/i.test(r.t.verdict) ? 'dn' : '') },
            { h: '', render: (r) => <button className="btn sm buy" onClick={(e) => { e.stopPropagation(); openTicket(r.id, 'BUY'); }}>Buy</button> }]} />
      </Card>
    </div>
  );
}
