import { useState } from 'react';
import { useLive, getS, addFunds, withdrawFunds, available, blocked, equity, notify, toastErr } from '../lib/engine.js';
import { fmt, inr, sg, cl, dt } from '../lib/util.js';
import { Card, Table, Stat, Seg, Field } from '../components/ui.jsx';

export default function Funds() {
  useLive();
  const S = getS(), [mode, setMode] = useState('ADD'), [amt, setAmt] = useState('100000');
  const a = parseFloat(amt) || 0;
  const submit = () => { const r = mode === 'ADD' ? addFunds(a) : withdrawFunds(a); if (!r.ok) toastErr(r.msg); };
  return (
    <div className="page">
      <div className="row between wrapr"><div><h1>Funds</h1><div className="mut sm">Add or withdraw virtual money. Nothing here moves real money or connects to a bank.</div></div><span className="chip sim">VIRTUAL</span></div>
      <div className="grid g4">
        <Card><Stat label="Available to trade" value={inr(available())} /></Card>
        <Card><Stat label="Cash balance" value={inr(S.cash)} /></Card>
        <Card><Stat label="Margin used" value={inr(blocked())} /></Card>
        <Card><Stat label="IPO funds blocked" value={inr(S.ipoBlocked)} /></Card>
      </div>
      <div className="grid g2">
        <Card title="Add or withdraw">
          <div className="tk">
            <Seg label="Action" value={mode} onChange={setMode} options={[['ADD', 'Add funds', 'b'], ['WD', 'Withdraw', 's']]} />
            <Field label="Amount (₹)"><input className="mono" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
            <div className="pills">{[10000, 50000, 100000, 500000].map((x) => <button key={x} className="pill" onClick={() => setAmt(String(x))}>₹{fmt(x, 0)}</button>)}</div>
            <button className={'btn big ' + (mode === 'ADD' ? 'buy' : 'sell')} onClick={submit}>{mode === 'ADD' ? 'Add virtual funds' : 'Withdraw'}</button>
            <div className="mut sm">Withdrawals are limited to your available margin. Total value now {inr(equity())}.</div>
          </div>
        </Card>
        <Card title="Ledger">
          <Table rows={S.ledger.slice(0, 40)} rowKey={(r) => r.ts + r.type + r.amt} empty="No entries."
            cols={[{ h: 'Time', l: 1, render: (r) => dt(r.ts) }, { h: 'Type', l: 1, render: (r) => r.type }, { h: 'Amount', render: (r) => sg(r.amt), cls: (r) => cl(r.amt) }, { h: 'Note', l: 1, render: (r) => <span className="mut">{r.note}</span> }]} />
        </Card>
      </div>
    </div>
  );
}
