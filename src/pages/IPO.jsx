import { useState } from 'react';
import { useLive, getS, IPOS, ipoStatus, ipoSubs, ipoBid, ipoCancel, available, notify, toastErr } from '../lib/engine.js';
import { fmt, inr, dt, sg, cl } from '../lib/util.js';
import { Card, Pills, Table, Modal, Field } from '../components/ui.jsx';

export default function IPO() {
  useLive();
  const S = getS(), [tab, setTab] = useState('open'), [apply, setApply] = useState(null);
  const list = IPOS.filter((x) => (tab === 'open' ? ipoStatus(x) === 'OPEN' : tab === 'up' ? ipoStatus(x) === 'UPCOMING' : tab === 'closed' ? ipoStatus(x) === 'CLOSED' : false));
  const ipo = (id) => IPOS.find((x) => x.id === id);
  return (
    <div className="page">
      <div className="row between wrapr"><div><h1>IPO</h1><div className="mut sm">Demo issues from fictional companies, to practise bidding with virtual money. Funds are blocked while a bid is open, then allotted or refunded when the issue closes. Allotted shares are sold at a simulated listing price.</div></div><span className="chip sim">DEMO IPOs</span></div>
      <Pills label="View" value={tab} onChange={setTab} options={[['open', 'Open now'], ['up', 'Upcoming'], ['closed', 'Closed'], ['bids', `My bids (${S.ipo.bids.length})`]]} />
      {tab !== 'bids' && (list.length ? (
        <div className="grid g2">{list.map((x) => {
          const st = ipoStatus(x), bid = S.ipo.bids.find((b) => b.ipo === x.id && b.status === 'APPLIED');
          return (
            <Card key={x.id}>
              <div className="row between"><div><h2>{x.name}</h2><div className="mut sm">{x.sector}</div></div><span className={'tag ' + (st === 'OPEN' ? 'buy' : '')}>{st}</span></div>
              <div className="kv" style={{ margin: '12px 0' }}>
                <div className="stat"><small>Price band</small><b className="mono">₹{x.lo} to ₹{x.hi}</b></div>
                <div className="stat"><small>Lot size</small><b className="mono">{x.lot} shares</b></div>
                <div className="stat"><small>Min investment</small><b className="mono">{inr(x.lot * x.hi)}</b></div>
                <div className="stat"><small>Issue size</small><b className="mono">₹{fmt(x.size, 0)} Cr</b></div>
                <div className="stat"><small>Opens</small><b className="mono">{dt(x.open)}</b></div>
                <div className="stat"><small>Closes</small><b className="mono">{dt(x.close)}</b></div>
                {st !== 'UPCOMING' && <div className="stat"><small>Subscribed (simulated)</small><b className="mono">{ipoSubs(x).toFixed(2)}x</b></div>}
              </div>
              {st === 'OPEN' && (bid ? <div className="row"><span className="tag buy">Bid placed · {bid.lots} lot(s)</span><button className="btn sm" onClick={() => ipoCancel(bid.id)}>Cancel bid</button></div> : <button className="btn pri" onClick={() => setApply(x)}>Apply</button>)}
              {st === 'UPCOMING' && <div className="mut sm">Bidding opens {dt(x.open)}.</div>}
              {st === 'CLOSED' && <div className="mut sm">Bidding has closed.</div>}
            </Card>
          );
        })}</div>
      ) : <Card><div className="empty">No IPOs in this list right now.</div></Card>)}
      {tab === 'bids' && (
        <Card title="My bids">
          <Table rows={S.ipo.bids} rowKey={(b) => b.id} empty="You have not bid on any IPO yet."
            cols={[{ h: 'Company', l: 1, render: (b) => <b>{ipo(b.ipo).name}</b> }, { h: 'Lots', render: (b) => b.lots }, { h: 'Bid price', render: (b) => fmt(b.price) }, { h: 'Amount', render: (b) => inr(b.amt) },
              { h: 'Placed', render: (b) => dt(b.ts) }, { h: 'Status', render: (b) => b.status, cls: (b) => (b.status === 'ALLOTTED' ? 'up' : b.status === 'NOT ALLOTTED' ? 'dn' : '') },
              { h: 'Result', l: 1, render: (b) => (b.status === 'ALLOTTED' ? `${b.shares} shares, listing ${fmt(b.listPx)}, gain ${sg(b.pnl)}` : '') }]} />
        </Card>
      )}
      {apply && <ApplyModal x={apply} onClose={() => setApply(null)} />}
    </div>
  );
}

function ApplyModal({ x, onClose }) {
  const [lots, setLots] = useState('1');
  const l = parseInt(lots, 10) || 0, amt = l * x.lot * x.hi;
  return (
    <Modal title={'Apply · ' + x.name} onClose={onClose}>
      <div className="tk">
        <Field label="Lots" hint={`1 lot = ${x.lot} shares. Retail limit is 13 lots and ₹2,00,000.`}><input className="mono" inputMode="numeric" value={lots} onChange={(e) => setLots(e.target.value.replace(/\D/g, ''))} /></Field>
        <div className="sum"><div><span>Cut-off price</span><span>₹{x.hi}</span></div><div><span>Shares</span><span>{l * x.lot}</span></div><div><span>Amount to block</span><span>{inr(amt)}</span></div><div><span>Available</span><span>{inr(available())}</span></div></div>
        <button className="btn big pri" onClick={() => { const r = ipoBid(x.id, l); r.ok ? (notify(r.msg, 'ok'), onClose()) : toastErr(r.msg); }}>Place bid</button>
      </div>
    </Modal>
  );
}
export { cl };
