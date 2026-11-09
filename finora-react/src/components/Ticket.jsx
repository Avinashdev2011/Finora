import { useEffect, useState } from 'react';
import { useLive, inst, bid, ask, px, charges, marginDelta, validate, placeOrder, available, notify, toastErr, isOpenFor, closedMsg } from '../lib/engine.js';
import { fmt, inr } from '../lib/util.js';
import { setUI, openGTT } from '../lib/ui.js';
import { go } from '../lib/router.jsx';
import { Seg, Pills, Field } from './ui.jsx';

export default function Ticket({ iid: id0, side: side0 = 'BUY', onDone, onClose }) {
  useLive();
  const [iid, setIid] = useState(id0), [side, setSide] = useState(side0), [product, setProduct] = useState('INTRADAY');
  const [type, setType] = useState('MARKET'), [qty, setQty] = useState('1'), [price, setPrice] = useState(''), [trig, setTrig] = useState('');
  const [stage, setStage] = useState('form'), [res, setRes] = useState(null);
  useEffect(() => { setIid(id0); setStage('form'); setPrice(''); setTrig(''); }, [id0]);
  useEffect(() => setSide(side0), [side0]);
  const i = inst(iid);
  if (!i) return <div className="empty">Unknown instrument.</div>;
  if (i.kind === 'SPOT') {
    return (
      <div className="tk">
        <b>{i.name}</b>
        <div className="mut">{i.id} is a spot price and cannot be traded directly. Trade its futures or options.</div>
        <button className="btn pri" onClick={() => { onClose && onClose(); go(i.u.seg === 'COM' ? '/commodities' : i.u.seg === 'CUR' ? '/currency' : '/derivatives'); }}>Open derivatives</button>
      </div>
    );
  }
  const eq = i.kind === 'EQ', units = (parseInt(qty, 10) || 0) * (eq ? 1 : i.lot), prod = eq ? product : 'NRML';
  const p = type === 'MARKET' ? px(i, side) : +price || 0;
  const ch = p > 0 ? charges(i, side, units, p, prod).total : 0, mg = p > 0 ? marginDelta(i, side, units, p, prod) : 0;
  const problem = () => validate(i, side, units, p, prod) || ((type === 'SL' || type === 'SL-L') && !(+trig > 0) ? 'Enter a trigger price.' : null) || ((type === 'LIMIT' || type === 'SL-L') && !(+price > 0) ? 'Enter a limit price.' : null);
  const dec = i.ltp() < 100 ? 3 : 2;

  if (stage === 'done') {
    const r = res, o = r.order;
    return (
      <div className="tk">
        <div className="sum">
          <div><b>{r.ok ? 'Order placed' : 'Order rejected'}</b><span className={'tag ' + (o && o.status === 'EXECUTED' ? 'buy' : 'sell')}>{o ? o.status : 'REJECTED'}</span></div>
          <div><span>Order id</span><span>#{o ? o.id : '-'}</span></div><div><span>Instrument</span><span>{i.label}</span></div>
          <div><span>Result</span><span className="wrap">{r.msg}</span></div>
        </div>
        <div className="row"><button className="btn" onClick={() => { setStage('form'); setRes(null); }}>New order</button>{onClose && <button className="btn pri" onClick={onClose}>Close</button>}</div>
      </div>
    );
  }
  if (stage === 'review') {
    return (
      <div className="tk">
        <h3>Review order</h3>
        <div className="sum">
          <div><span>Side</span><span className={side === 'BUY' ? 'up' : 'dn'}>{side}</span></div>
          <div><span>Instrument</span><span>{i.label}</span></div>
          <div><span>Type</span><span>{type} · {prod}</span></div>
          <div><span>Quantity</span><span>{units}{!eq && ` (${qty} lot${qty > 1 ? 's' : ''})`}</span></div>
          <div><span>Price</span><span>{type === 'MARKET' ? 'Market (about ' + fmt(p, dec) + ')' : fmt(p, dec)}</span></div>
          {type.startsWith('SL') && <div><span>Trigger</span><span>{fmt(+trig, dec)}</span></div>}
          <div><span>Order value</span><span>{inr(units * p)}</span></div>
          <div><span>{prod === 'DELIVERY' && side === 'BUY' ? 'Funds needed' : 'Margin needed'}</span><span>{inr(Math.max(0, mg))}</span></div>
          <div><span>Charges (estimate)</span><span>{inr(ch)}</span></div>
        </div>
        <div className="row"><button className="btn" onClick={() => setStage('form')}>Edit</button>
          <button className={'btn grow ' + (side === 'BUY' ? 'buy' : 'sell')} onClick={() => { const r = placeOrder({ iid, side, qty: parseInt(qty, 10), product: prod, type, price: +price || 0, trig: +trig || 0 }); setRes(r); setStage('done'); r.ok ? notify(r.msg, 'ok') : toastErr(r.msg); onDone && onDone(r); }}>Confirm {side} · paper trade</button></div>
      </div>
    );
  }
  return (
    <div className="tk">
      <div className="row between">
        <div><b>{i.label}</b><div className="mut sm">{i.ex} · {i.name}</div></div>
        <div className="mono right"><b>{fmt(i.ltp(), dec)}</b><div className="mut sm">{fmt(bid(i), dec)} / {fmt(ask(i), dec)}</div></div>
      </div>
      {!isOpenFor(i) && <div className="banner">{closedMsg(i)} Prices are frozen at the last close.</div>}
      <Seg label="Side" value={side} onChange={setSide} options={[['BUY', 'Buy', 'b'], ['SELL', 'Sell', 's']]} />
      {eq ? <Pills label="Product" value={product} onChange={setProduct} options={[['INTRADAY', 'Intraday'], ['DELIVERY', 'Delivery']]} /> : <div className="mut sm">Product: NRML · lot size {i.lot}{i.u.unit ? ' · ' + i.u.unit : ''}</div>}
      <Pills label="Order type" value={type} onChange={setType} options={[['MARKET', 'Market'], ['LIMIT', 'Limit'], ['SL', 'Stop-loss'], ['SL-L', 'SL-Limit']]} />
      <div className="g2c">
        <Field label={eq ? 'Quantity' : 'Lots'}><input className="mono" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Price"><input className="mono" inputMode="decimal" disabled={type === 'MARKET' || type === 'SL'} placeholder={type === 'MARKET' ? 'Market' : fmt(i.ltp(), dec)} value={type === 'MARKET' || type === 'SL' ? '' : price} onChange={(e) => setPrice(e.target.value)} /></Field>
        {type.startsWith('SL') && <Field label="Trigger price"><input className="mono" inputMode="decimal" value={trig} onChange={(e) => setTrig(e.target.value)} /></Field>}
      </div>
      <div className="sum">
        <div><span>Order value</span><span>{inr(units * p)}</span></div>
        <div><span>{prod === 'DELIVERY' && side === 'BUY' ? 'Funds needed' : 'Margin needed'}</span><span>{inr(Math.max(0, mg))}</span></div>
        <div><span>Charges (estimate)</span><span>{inr(ch)}</span></div>
        <div><span>Available</span><span>{inr(available())}</span></div>
      </div>
      <button className={'btn big ' + (side === 'BUY' ? 'buy' : 'sell')} onClick={() => { const e = problem(); if (e) { toastErr(e); return; } setStage('review'); }}>Review {side === 'BUY' ? 'buy' : 'sell'} order</button>
      <button className="btn ghost" onClick={() => openGTT(iid, side)}>Create GTT instead</button>
      <div className="mut sm">Virtual money. No real order reaches any broker or exchange.</div>
    </div>
  );
}
export { setUI };
