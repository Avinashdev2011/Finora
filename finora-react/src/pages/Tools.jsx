import { useState } from 'react';
import { useLive, getS, mutate, charges, inst } from '../lib/engine.js';
import { M, ids, META, chgp } from '../lib/market.js';
import { fmt, inr, pc, cl, dt } from '../lib/util.js';
import { Card, Pills, Field, Table, SymbolPicker } from '../components/ui.jsx';

const num = (v) => parseFloat(v) || 0;
const In = ({ label, v, set, hint }) => <Field label={label} hint={hint}><input className="mono" inputMode="decimal" value={v} onChange={(e) => set(e.target.value.replace(/[^\d.]/g, ''))} /></Field>;
const Out = ({ rows }) => <div className="sum">{rows.map(([k, v]) => <div key={k}><span>{k}</span><span>{v}</span></div>)}</div>;

function SIP() {
  const [a, setA] = useState('10000'), [r, setR] = useState('12'), [y, setY] = useState('10');
  const m = num(r) / 1200, n = num(y) * 12, P = num(a), fv = m ? P * ((Math.pow(1 + m, n) - 1) / m) * (1 + m) : P * n, inv = P * n;
  return <div className="tk"><In label="Monthly SIP (₹)" v={a} set={setA} /><In label="Expected return (% a year)" v={r} set={setR} /><In label="Years" v={y} set={setY} /><Out rows={[['Invested', inr(inv)], ['Estimated value', inr(fv)], ['Estimated gain', inr(fv - inv)]]} /></div>;
}
function Lump() {
  const [a, setA] = useState('100000'), [r, setR] = useState('12'), [y, setY] = useState('10'), fv = num(a) * Math.pow(1 + num(r) / 100, num(y));
  return <div className="tk"><In label="Amount (₹)" v={a} set={setA} /><In label="Expected return (% a year)" v={r} set={setR} /><In label="Years" v={y} set={setY} /><Out rows={[['Invested', inr(num(a))], ['Estimated value', inr(fv)], ['Estimated gain', inr(fv - num(a))]]} /></div>;
}
function EMI() {
  const [a, setA] = useState('1000000'), [r, setR] = useState('9'), [y, setY] = useState('5'), m = num(r) / 1200, n = num(y) * 12, P = num(a), emi = m ? (P * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1) : n ? P / n : 0;
  return <div className="tk"><In label="Loan amount (₹)" v={a} set={setA} /><In label="Interest (% a year)" v={r} set={setR} /><In label="Years" v={y} set={setY} /><Out rows={[['Monthly EMI', inr(emi || 0)], ['Total interest', inr(Math.max(0, emi * n - P) || 0)], ['Total payment', inr(emi * n || 0)]]} /></div>;
}
function Brok() {
  const [id, setId] = useState('RELIANCE'), [b, setB] = useState('1400'), [s, setS] = useState('1420'), [q, setQ] = useState('100'), [prod, setProd] = useState('INTRADAY');
  const i = inst(id), qb = num(q), c1 = i ? charges(i, 'BUY', qb, num(b), prod) : 0, c2 = i ? charges(i, 'SELL', qb, num(s), prod) : 0;
  const tot = (typeof c1 === 'object' ? c1.total : c1) + (typeof c2 === 'object' ? c2.total : c2), gross = (num(s) - num(b)) * qb;
  return <div className="tk"><SymbolPicker placeholder={'Symbol: ' + id} onPick={setId} filter={(u) => u.seg === 'EQ' || u.seg === 'ETF'} /><In label="Buy price" v={b} set={setB} /><In label="Sell price" v={s} set={setS} /><In label="Quantity" v={q} set={setQ} />
    <Pills label="Product" value={prod} onChange={setProd} options={[['INTRADAY', 'Intraday'], ['DELIVERY', 'Delivery']]} /><Out rows={[['Gross P&L', inr(gross)], ['Total charges (estimate)', inr(tot)], ['Net P&L', inr(gross - tot)], ['Breakeven move', qb ? '₹' + fmt(tot / qb) + ' per share' : '-']]} /></div>;
}
function Size() {
  const [cap, setCap] = useState('1000000'), [risk, setRisk] = useState('1'), [e, setE] = useState('1400'), [sl, setSl] = useState('1380'), amt = (num(cap) * num(risk)) / 100, d = Math.abs(num(e) - num(sl)), q = d ? Math.floor(amt / d) : 0;
  return <div className="tk"><In label="Capital (₹)" v={cap} set={setCap} /><In label="Risk per trade (%)" v={risk} set={setRisk} /><In label="Entry price" v={e} set={setE} /><In label="Stop-loss price" v={sl} set={setSl} /><Out rows={[['Amount at risk', inr(amt)], ['Quantity', fmt(q, 0)], ['Position value', inr(q * num(e))]]} /></div>;
}
function CAGR() {
  const [s, setS] = useState('100000'), [en, setEn] = useState('200000'), [y, setY] = useState('5'), c = num(s) > 0 && num(y) > 0 ? (Math.pow(num(en) / num(s), 1 / num(y)) - 1) * 100 : 0;
  return <div className="tk"><In label="Starting value (₹)" v={s} set={setS} /><In label="Ending value (₹)" v={en} set={setEn} /><In label="Years" v={y} set={setY} /><Out rows={[['CAGR', pc(c)], ['Total return', pc(num(s) ? ((num(en) - num(s)) / num(s)) * 100 : 0)]]} /></div>;
}
function Journal() {
  useLive();
  const S = getS(), [sym, setSym] = useState(''), [txt, setTxt] = useState('');
  return (
    <div className="tk">
      <div className="row wrapr"><input className="mini" placeholder="Symbol (optional)" aria-label="Symbol" value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} /><input className="grow" placeholder="What did you learn from this trade?" aria-label="Journal note" value={txt} onChange={(e) => setTxt(e.target.value)} />
        <button className="btn pri" onClick={() => { if (!txt.trim()) return; mutate((s) => s.journal.unshift({ ts: Date.now(), sym, txt: txt.trim() })); setTxt(''); setSym(''); }}>Add note</button></div>
      <Table rows={S.journal} rowKey={(j) => j.ts} empty="No notes yet." cols={[{ h: 'When', l: 1, render: (j) => dt(j.ts) }, { h: 'Symbol', l: 1, render: (j) => j.sym }, { h: 'Note', l: 1, render: (j) => j.txt }, { h: '', render: (j) => <button className="btn sm" onClick={() => mutate((s) => { s.journal = s.journal.filter((x) => x.ts !== j.ts); })}>✕</button> }]} />
    </div>
  );
}
function Compare() {
  useLive();
  const [a, setA] = useState('RELIANCE'), [b, setB] = useState('TCS');
  const row = (id) => ({ id, ltp: M[id].ltp, p: chgp(id), name: META.get(id).name, sec: META.get(id).sec });
  const rs = [row(a), row(b)];
  return <div className="tk"><div className="row wrapr"><SymbolPicker placeholder={'First: ' + a} onPick={setA} /><SymbolPicker placeholder={'Second: ' + b} onPick={setB} /></div>
    <Table rows={rs} rowKey={(r) => r.id} cols={[{ h: 'Symbol', l: 1, render: (r) => <b>{r.id}</b> }, { h: 'Name', l: 1, render: (r) => r.name }, { h: 'Sector', l: 1, render: (r) => r.sec }, { h: 'LTP', render: (r) => fmt(r.ltp) }, { h: 'Day change', render: (r) => pc(r.p), cls: (r) => cl(r.p) }]} /></div>;
}

const TOOLS = [['sip', 'SIP', SIP], ['lump', 'Lumpsum', Lump], ['emi', 'EMI', EMI], ['brok', 'Brokerage', Brok], ['size', 'Position size', Size], ['cagr', 'CAGR', CAGR], ['journal', 'Journal', Journal], ['cmp', 'Compare', Compare]];
export default function Tools() {
  const [t, setT] = useState('sip'), C = TOOLS.find((x) => x[0] === t)[2];
  return (
    <div className="page">
      <div><h1>Tools</h1><div className="mut sm">Calculators give estimates from the numbers you enter. Returns are not guaranteed.</div></div>
      <Pills label="Tool" value={t} onChange={setT} options={TOOLS.map((x) => [x[0], x[1]])} />
      <Card title={TOOLS.find((x) => x[0] === t)[1]}><C /></Card>
    </div>
  );
}
