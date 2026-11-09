import { useState } from 'react';
import { useLive, getS, mutate, notify, toastErr } from '../lib/engine.js';
import { M, marketOpen, META } from '../lib/market.js';
import { fmt, dt } from '../lib/util.js';
import { Card, Pills, Table, Field, SymbolPicker } from '../components/ui.jsx';

export default function Alerts() {
  useLive();
  const S = getS(), [tab, setTab] = useState('alerts'), [sym, setSym] = useState('RELIANCE'), [cond, setCond] = useState('above'), [price, setPrice] = useState('');
  const add = () => {
    const p = parseFloat(price); if (!(p > 0)) return toastErr('Enter a valid price.');
    mutate((s) => s.alerts.push({ sym, cond, price: p, done: false })); notify(`Alert set: ${sym} ${cond} ${p}`, 'ok'); setPrice('');
  };
  return (
    <div className="page">
      <div><h1>Alerts</h1><div className="mut sm">Price alerts only trigger while that market is open. When it is closed, prices are frozen and nothing fires.</div></div>
      <Pills label="View" value={tab} onChange={setTab} options={[['alerts', `Price alerts (${S.alerts.filter((a) => !a.done).length})`], ['notifs', 'Notifications']]} />
      {tab === 'alerts' && (
        <>
          <Card title="New alert"><div className="row wrapr">
            <SymbolPicker placeholder={'Symbol: ' + sym} onPick={setSym} />
            <Pills label="Condition" value={cond} onChange={setCond} options={[['above', 'At or above'], ['below', 'At or below']]} />
            <Field label={`Price (now ${fmt(M[sym]?.ltp ?? 0)})`}><input className="mono mini" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
            <button className="btn pri" onClick={add}>Set alert</button>
          </div></Card>
          <Card flush>
            <Table rows={S.alerts.map((a, i) => ({ ...a, i }))} rowKey={(a) => a.i} empty="No alerts yet."
              cols={[{ h: 'Symbol', l: 1, render: (a) => <b>{a.sym}</b> }, { h: 'Condition', render: (a) => (a.cond === 'above' ? '≥ ' : '≤ ') + fmt(a.price) }, { h: 'Now', render: (a) => (M[a.sym] ? fmt(M[a.sym].ltp) : '') },
                { h: 'Status', render: (a) => (a.done ? 'Triggered ' + dt(a.at) : M[a.sym] && marketOpen(META.get(a.sym).seg) ? 'Watching' : 'Paused, market closed'), cls: (a) => (a.done ? 'up' : '') },
                { h: '', render: (a) => <button className="btn sm" onClick={() => mutate((s) => s.alerts.splice(a.i, 1))}>Delete</button> }]} />
          </Card>
        </>
      )}
      {tab === 'notifs' && (
        <Card title="Notification history" actions={<button className="btn sm" onClick={() => mutate((s) => { s.notifs = []; })}>Clear</button>} flush>
          <Table rows={S.notifs} rowKey={(n) => n.ts + n.msg} empty="No notifications." cols={[{ h: 'Time', l: 1, render: (n) => dt(n.ts) }, { h: 'Message', l: 1, render: (n) => n.msg, cls: (n) => (n.kind === 'bad' ? 'dn' : n.kind === 'ok' ? 'up' : '') }]} />
        </Card>
      )}
    </div>
  );
}
