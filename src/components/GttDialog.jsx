import { useState } from 'react';
import { inst, createGTT, toastErr } from '../lib/engine.js';
import { fmt } from '../lib/util.js';
import { Modal, Seg, Pills, Field, SymbolPicker } from './ui.jsx';

export default function GttDialog({ iid: id0, side: side0 = 'SELL', onClose }) {
  const [iid, setIid] = useState(id0 || 'RELIANCE'), [side, setSide] = useState(side0), [kind, setKind] = useState('SINGLE'), [product, setProduct] = useState('DELIVERY');
  const [qty, setQty] = useState('1'), [t1, setT1] = useState(''), [p1, setP1] = useState(''), [t2, setT2] = useState(''), [p2, setP2] = useState('');
  const i = inst(iid), eq = i && i.kind === 'EQ', dec = i && i.ltp() < 100 ? 3 : 2;
  const submit = () => {
    const legs = kind === 'OCO' ? [{ trig: t1, price: p1 }, { trig: t2, price: p2 }] : [{ trig: t1, price: p1 }];
    const r = createGTT({ iid, side, qty: parseInt(qty, 10), product: eq ? product : 'NRML', legs });
    if (!r.ok) toastErr(r.msg); else onClose();
  };
  return (
    <Modal title="Create GTT" onClose={onClose}>
      <div className="tk">
        <div className="mut sm">A GTT (good till triggered) waits until the price crosses your trigger, then places an order for you. It stays active until it triggers or you cancel it.</div>
        <SymbolPicker placeholder={'Instrument: ' + iid} onPick={setIid} filter={(u) => u.seg === 'EQ' || u.seg === 'ETF'} />
        {i && <div className="row between"><b>{i.label}</b><span className="mono">LTP {fmt(i.ltp(), dec)}</span></div>}
        <Seg label="Side" value={side} onChange={setSide} options={[['BUY', 'Buy', 'b'], ['SELL', 'Sell', 's']]} />
        <Pills label="Type" value={kind} onChange={setKind} options={[['SINGLE', 'Single trigger'], ['OCO', 'OCO (target and stop-loss)']]} />
        {eq && <Pills label="Product" value={product} onChange={setProduct} options={[['DELIVERY', 'Delivery'], ['INTRADAY', 'Intraday']]} />}
        <Field label={eq ? 'Quantity' : 'Lots'}><input className="mono" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} /></Field>
        <div className="g2c">
          <Field label={kind === 'OCO' ? 'Target trigger' : 'Trigger price'}><input className="mono" inputMode="decimal" value={t1} onChange={(e) => setT1(e.target.value)} /></Field>
          <Field label="Limit price" hint="Leave empty for market"><input className="mono" inputMode="decimal" value={p1} onChange={(e) => setP1(e.target.value)} /></Field>
          {kind === 'OCO' && <><Field label="Stop-loss trigger"><input className="mono" inputMode="decimal" value={t2} onChange={(e) => setT2(e.target.value)} /></Field>
            <Field label="Limit price" hint="Leave empty for market"><input className="mono" inputMode="decimal" value={p2} onChange={(e) => setP2(e.target.value)} /></Field></>}
        </div>
        <button className={'btn big ' + (side === 'BUY' ? 'buy' : 'sell')} onClick={submit}>Create GTT</button>
      </div>
    </Modal>
  );
}
