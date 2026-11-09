import { useLive, getS, inst, squareOff, cancelOrder, notify } from '../lib/engine.js';
import { M } from '../lib/market.js';
import { fmt, sg, pc, cl, tm, dt } from '../lib/util.js';
import { openTicket } from '../lib/ui.js';
import { Link } from '../lib/router.jsx';
import { Table } from './ui.jsx';

export function PositionsTable() {
  useLive();
  const rows = Object.entries(getS().positions).map(([k, p]) => ({ k, p, i: inst(p.id) })).filter((r) => r.i);
  return (
    <Table rows={rows} rowKey={(r) => r.k} empty="No open positions. Place a paper trade and it appears here."
      cols={[
        { h: 'Instrument', l: 1, render: (r) => <b>{r.i.label}</b> }, { h: 'Product', render: (r) => r.p.product },
        { h: 'Qty', render: (r) => (r.p.qty > 0 ? '+' : '') + r.p.qty, cls: (r) => (r.p.qty > 0 ? 'up' : 'dn') },
        { h: 'Avg', render: (r) => fmt(r.p.avg) }, { h: 'LTP', render: (r) => fmt(r.i.ltp()) },
        { h: 'P&L', render: (r) => sg((r.i.ltp() - r.p.avg) * r.p.qty), cls: (r) => cl((r.i.ltp() - r.p.avg) * r.p.qty) },
        { h: '', render: (r) => <button className="btn sm" onClick={() => squareOff(r.k)}>Exit</button> },
      ]} />
  );
}
export function HoldingsTable() {
  useLive();
  const rows = Object.entries(getS().holdings).map(([s, h]) => ({ s, h }));
  return (
    <Table rows={rows} rowKey={(r) => r.s} empty="No holdings. Delivery buys appear here."
      cols={[
        { h: 'Symbol', l: 1, render: (r) => <Link to={'/stock/' + r.s}><b>{r.s}</b></Link> }, { h: 'Qty', render: (r) => r.h.qty },
        { h: 'Avg', render: (r) => fmt(r.h.avg) }, { h: 'LTP', render: (r) => fmt(M[r.s].ltp) }, { h: 'Value', render: (r) => fmt(M[r.s].ltp * r.h.qty) },
        { h: 'P&L', render: (r) => sg((M[r.s].ltp - r.h.avg) * r.h.qty), cls: (r) => cl(M[r.s].ltp - r.h.avg) },
        { h: 'Return', render: (r) => pc(((M[r.s].ltp - r.h.avg) / r.h.avg) * 100), cls: (r) => cl(M[r.s].ltp - r.h.avg) },
        { h: '', render: (r) => <button className="btn sm sell" onClick={() => openTicket(r.s, 'SELL')}>Sell</button> },
      ]} />
  );
}
export function OrdersTable({ limit = 80 }) {
  useLive();
  const rows = getS().orders.slice(0, limit);
  return (
    <Table rows={rows} rowKey={(r) => r.id} empty="No orders yet."
      cols={[
        { h: 'Time', l: 1, render: (r) => tm(r.ts) }, { h: 'Instrument', l: 1, render: (r) => <b>{r.label}</b> },
        { h: 'Side', render: (r) => <span className={'tag ' + (r.side === 'BUY' ? 'buy' : 'sell')}>{r.side}</span> },
        { h: 'Type', render: (r) => r.type + ' · ' + r.product + (r.src ? ' · ' + r.src : '') }, { h: 'Qty', render: (r) => r.qty },
        { h: 'Price', render: (r) => (r.status === 'EXECUTED' ? fmt(r.fill) : r.price ? fmt(r.price) : r.trig ? 'trg ' + fmt(r.trig) : 'Mkt') },
        { h: 'Status', l: 1, cls: (r) => (r.status === 'EXECUTED' ? 'up' : r.status === 'REJECTED' ? 'dn' : ''), render: (r) => <span title={r.note}>{r.status}{r.status === 'REJECTED' && r.note ? ' · ' + r.note.slice(0, 60) : ''}</span> },
        { h: '', render: (r) => (r.status === 'OPEN' ? <button className="btn sm" onClick={() => cancelOrder(r.id)}>Cancel</button> : null) },
      ]} />
  );
}
export function TradesTable({ limit = 100 }) {
  useLive();
  const rows = getS().trades.slice(0, limit);
  return (
    <Table rows={rows} rowKey={(r) => r.id} empty="No trades yet."
      cols={[
        { h: 'Time', l: 1, render: (r) => dt(r.ts) }, { h: 'Instrument', l: 1, render: (r) => <b>{r.label}</b> },
        { h: 'Side', render: (r) => <span className={'tag ' + (r.side === 'BUY' ? 'buy' : 'sell')}>{r.side}</span> }, { h: 'Qty', render: (r) => r.qty },
        { h: 'Price', render: (r) => fmt(r.price) }, { h: 'Charges', render: (r) => fmt(r.charges) },
        { h: 'Realized', render: (r) => (r.realized ? sg(r.realized) : '-'), cls: (r) => (r.realized ? cl(r.realized) : '') },
      ]} />
  );
}
export { notify };
