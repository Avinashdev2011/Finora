import { useState } from 'react';
import { useLive, getS, cancelGTT, createBasket, deleteBasket, addBasketItem, removeBasketItem, execBasket, inst, notify, toastErr } from '../lib/engine.js';
import { fmt, dt } from '../lib/util.js';
import { openGTT } from '../lib/ui.js';
import { Card, Pills, Table, Seg, Field, SymbolPicker, Empty, ClosedBanner } from '../components/ui.jsx';
import { OrdersTable, TradesTable } from '../components/tables.jsx';

export default function Orders() {
  useLive();
  const S = getS(), [tab, setTab] = useState('orders');
  const open = S.orders.filter((o) => o.status === 'OPEN').length, gtt = S.gtts.filter((g) => g.status === 'ACTIVE').length;
  return (
    <div className="page">
      <ClosedBanner seg="EQ" />
      <div className="row between wrapr"><h1>Orders</h1>{tab === 'gtt' && <button className="btn pri" onClick={() => openGTT('RELIANCE', 'SELL')}>New GTT</button>}</div>
      <Pills label="View" value={tab} onChange={setTab} options={[['orders', `Order book${open ? ` (${open} open)` : ''}`], ['trades', 'Trade book'], ['gtt', `GTT${gtt ? ` (${gtt})` : ''}`], ['baskets', `Baskets (${S.baskets.length})`]]} />
      {tab === 'orders' && <Card flush><OrdersTable limit={200} /></Card>}
      {tab === 'trades' && <Card flush><TradesTable limit={200} /></Card>}
      {tab === 'gtt' && (
        <Card title="Good till triggered orders" actions={<span className="mut sm">A GTT waits until the price crosses your trigger, then places the order.</span>}>
          <Table rows={S.gtts} rowKey={(g) => g.id} empty="No GTT orders. Use New GTT, or set one from any order ticket."
            cols={[{ h: 'Created', l: 1, render: (g) => dt(g.ts) }, { h: 'Instrument', l: 1, render: (g) => <b>{g.label}</b> }, { h: 'Side', render: (g) => <span className={'tag ' + (g.side === 'BUY' ? 'buy' : 'sell')}>{g.side}</span> },
              { h: 'Type', render: (g) => g.kind }, { h: 'Qty', render: (g) => g.qty }, { h: 'Triggers', l: 1, render: (g) => g.legs.map((l) => `${l.dir === 'up' ? '≥' : '≤'} ${fmt(l.trig)}${l.price ? ' @ ' + fmt(l.price) : ' (market)'}`).join('  |  ') },
              { h: 'Status', render: (g) => <span title={g.note}>{g.status}</span>, cls: (g) => (g.status === 'TRIGGERED' ? 'up' : g.status === 'FAILED' ? 'dn' : '') },
              { h: '', render: (g) => (g.status === 'ACTIVE' ? <button className="btn sm" onClick={() => cancelGTT(g.id)}>Cancel</button> : null) }]} />
        </Card>
      )}
      {tab === 'baskets' && <Baskets />}
    </div>
  );
}

function Baskets() {
  const S = getS(), [name, setName] = useState('');
  return (
    <>
      <Card title="New basket" actions={<span className="mut sm">Group several orders and place them together.</span>}>
        <div className="row"><input className="grow" placeholder="Basket name" aria-label="Basket name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn pri" onClick={() => { createBasket(name.trim()); setName(''); }}>Create basket</button></div>
      </Card>
      {S.baskets.length ? <div className="grid g2">{S.baskets.map((b) => <BasketCard key={b.id} b={b} />)}</div> : <Card><Empty>No baskets yet.</Empty></Card>}
    </>
  );
}

function BasketCard({ b }) {
  const [iid, setIid] = useState('RELIANCE'), [side, setSide] = useState('BUY'), [qty, setQty] = useState('1'), [product, setProduct] = useState('INTRADAY');
  const add = () => { const q = parseInt(qty, 10); if (!(q > 0)) return toastErr('Enter a quantity.'); addBasketItem(b.id, { iid, side, qty: q, product, type: 'MARKET' }); };
  return (
    <Card title={b.name} actions={<><button className="btn sm pri" disabled={!b.items.length} onClick={() => execBasket(b.id)}>Place all</button><button className="btn sm sell" onClick={() => deleteBasket(b.id)}>Delete</button></>}>
      {b.items.length ? (
        <div className="scroll"><table className="tbl"><thead><tr><th className="l">Instrument</th><th>Side</th><th>Qty</th><th>Product</th><th /></tr></thead>
          <tbody>{b.items.map((it) => (
            <tr key={it.k}><td className="l"><b>{inst(it.iid)?.label || it.iid}</b></td><td><span className={'tag ' + (it.side === 'BUY' ? 'buy' : 'sell')}>{it.side}</span></td><td>{it.qty}</td><td>{it.product}</td>
              <td><button className="btn sm" aria-label="Remove" onClick={() => removeBasketItem(b.id, it.k)}>✕</button></td></tr>))}</tbody></table></div>
      ) : <Empty>Add instruments below.</Empty>}
      <div className="tk" style={{ paddingTop: 12 }}>
        <SymbolPicker placeholder={'Instrument: ' + iid} onPick={setIid} filter={(u) => u.seg === 'EQ' || u.seg === 'ETF'} />
        <div className="row"><Seg label="Side" value={side} onChange={setSide} options={[['BUY', 'Buy', 'b'], ['SELL', 'Sell', 's']]} /><Pills label="Product" value={product} onChange={setProduct} options={[['INTRADAY', 'Intraday'], ['DELIVERY', 'Delivery']]} /></div>
        <div className="row"><Field label="Quantity"><input className="mono mini" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} /></Field><button className="btn" onClick={add}>Add to basket</button></div>
      </div>
    </Card>
  );
}
export { notify };
