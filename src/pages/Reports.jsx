import { useMemo, useState } from 'react';
import { useLive, getS } from '../lib/engine.js';
import { fmt, inr, sg, cl, dt, downloadFile, toCSV } from '../lib/util.js';
import { Card, Pills, Table, Stat } from '../components/ui.jsx';

export default function Reports() {
  useLive();
  const S = getS(), [tab, setTab] = useState('pnl');
  const pnl = useMemo(() => {
    const m = {};
    S.trades.forEach((t) => { const r = (m[t.label] = m[t.label] || { label: t.label, trades: 0, realized: 0, charges: 0 }); r.trades++; r.realized += t.realized; r.charges += t.charges; });
    return Object.values(m).map((r) => ({ ...r, net: r.realized - r.charges })).sort((a, b) => b.net - a.net);
  }, [S.trades.length]); // eslint-disable-line
  const tot = pnl.reduce((a, r) => ({ realized: a.realized + r.realized, charges: a.charges + r.charges }), { realized: 0, charges: 0 });
  const cb = S.trades.reduce((a, t) => { const c = t.cb || {}; ['brokerage', 'stt', 'exch', 'gst', 'sebi', 'stamp'].forEach((k) => (a[k] = (a[k] || 0) + (c[k] || 0))); return a; }, {});
  const del = S.trades.filter((t) => t.product === 'DELIVERY').reduce((a, t) => a + t.realized, 0), oth = S.trades.filter((t) => t.product !== 'DELIVERY').reduce((a, t) => a + t.realized, 0);
  const stcg = Math.max(0, del) * 0.2;
  return (
    <div className="page">
      <div className="row between wrapr"><div><h1>Reports</h1><div className="mut sm">Statements for your virtual account. Tax figures are illustrative estimates and not tax advice.</div></div></div>
      <div className="grid g4">
        <Card><Stat label="Realized P&L" value={sg(tot.realized)} cls={cl(tot.realized)} /></Card>
        <Card><Stat label="Charges paid" value={inr(tot.charges)} /></Card>
        <Card><Stat label="Net after charges" value={sg(tot.realized - tot.charges)} cls={cl(tot.realized - tot.charges)} /></Card>
        <Card><Stat label="Trades" value={S.trades.length} /></Card>
      </div>
      <Pills label="Report" value={tab} onChange={setTab} options={[['pnl', 'P&L statement'], ['charges', 'Charges'], ['tax', 'Tax estimate'], ['ledger', 'Ledger'], ['export', 'Export']]} />
      {tab === 'pnl' && (
        <Card title="Profit and loss by instrument" flush>
          <Table rows={pnl} rowKey={(r) => r.label} empty="No trades yet. Realized profit and loss shows here after you close a position."
            cols={[{ h: 'Instrument', l: 1, render: (r) => <b>{r.label}</b> }, { h: 'Trades', render: (r) => r.trades }, { h: 'Realized', render: (r) => sg(r.realized), cls: (r) => cl(r.realized) }, { h: 'Charges', render: (r) => fmt(r.charges) }, { h: 'Net', render: (r) => sg(r.net), cls: (r) => cl(r.net) }]} />
        </Card>
      )}
      {tab === 'charges' && (
        <Card title="Charges breakdown (estimates)">
          <div className="kv">{[['Brokerage', 'brokerage'], ['STT / CTT', 'stt'], ['Exchange charges', 'exch'], ['GST', 'gst'], ['SEBI fees', 'sebi'], ['Stamp duty', 'stamp']].map(([n, k]) => <div className="stat" key={k}><small>{n}</small><b className="mono">{inr(cb[k] || 0)}</b></div>)}</div>
          <div className="mut sm" style={{ marginTop: 10 }}>Rates approximate common Indian brokerage structures. They are not a contract note.</div>
        </Card>
      )}
      {tab === 'tax' && (
        <Card title="Illustrative tax estimate">
          <div className="kv">
            <div className="stat"><small>Delivery realized gains</small><b className={'mono ' + cl(del)}>{sg(del)}</b></div>
            <div className="stat"><small>Short-term capital gains tax (assumed 20%)</small><b className="mono">{inr(stcg)}</b></div>
            <div className="stat"><small>Intraday and F&O realized (business income)</small><b className={'mono ' + cl(oth)}>{sg(oth)}</b></div>
            <div className="stat"><small>Charges (deductible expense)</small><b className="mono">{inr(tot.charges)}</b></div>
          </div>
          <div className="mut sm" style={{ marginTop: 10 }}>All positions in a paper account are recent, so only short-term treatment is shown. Business income is taxed at your slab rate. Rules and rates change. Ask a qualified tax professional before relying on any number here.</div>
        </Card>
      )}
      {tab === 'ledger' && (
        <Card title="Ledger" flush>
          <Table rows={S.ledger.slice(0, 200)} rowKey={(r) => r.ts + r.type + r.amt} empty="No entries."
            cols={[{ h: 'Time', l: 1, render: (r) => dt(r.ts) }, { h: 'Type', l: 1, render: (r) => r.type }, { h: 'Amount', render: (r) => sg(r.amt), cls: (r) => cl(r.amt) }, { h: 'Cash after', render: (r) => fmt(r.bal) }, { h: 'Note', l: 1, render: (r) => <span className="mut">{r.note}</span> }]} />
        </Card>
      )}
      {tab === 'export' && (
        <Card title="Export">
          <div className="row">
            <button className="btn" onClick={() => downloadFile('finora-trades.csv', toCSV([['Time', 'Instrument', 'Side', 'Qty', 'Price', 'Product', 'Charges', 'Realized'], ...S.trades.map((t) => [new Date(t.ts).toISOString(), t.label, t.side, t.qty, t.price.toFixed(2), t.product, t.charges.toFixed(2), t.realized.toFixed(2)])]))}>Trades (CSV)</button>
            <button className="btn" onClick={() => downloadFile('finora-ledger.csv', toCSV([['Time', 'Type', 'Amount', 'Cash after', 'Note'], ...S.ledger.map((l) => [new Date(l.ts).toISOString(), l.type, l.amt.toFixed(2), l.bal.toFixed(2), l.note])]))}>Ledger (CSV)</button>
            <button className="btn" onClick={() => downloadFile('finora-pnl.csv', toCSV([['Instrument', 'Trades', 'Realized', 'Charges', 'Net'], ...pnl.map((r) => [r.label, r.trades, r.realized.toFixed(2), r.charges.toFixed(2), r.net.toFixed(2)])]))}>P&L (CSV)</button>
          </div>
          <div className="mut sm" style={{ marginTop: 10 }}>Downloads work when FINORA is opened from your own hosted link or installed app.</div>
        </Card>
      )}
    </div>
  );
}
