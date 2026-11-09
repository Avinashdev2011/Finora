import { useState } from 'react';
import { useLive, getS, mfBuy, mfRedeem, createSIP, toggleSIP, deleteSIP, mfValue, mfInvested, available, notify, toastErr } from '../lib/engine.js';
import { FUNDS, FUND, navNow, navSeries, returns } from '../lib/mfdata.js';
import { fmt, inr, sg, pc, cl, dfull, dt } from '../lib/util.js';
import { Card, Pills, Table, Stat, Spark, Modal, Field, Seg, Empty } from '../components/ui.jsx';

const R = (f, d) => pc(returns(f, d) * 100);

export default function MutualFunds() {
  useLive();
  const S = getS(), [tab, setTab] = useState('explore'), [cat, setCat] = useState('All'), [open, setOpen] = useState(null), [redeem, setRedeem] = useState(null);
  const cats = ['All', ...new Set(FUNDS.map((f) => f.cat))];
  const rows = FUNDS.filter((f) => cat === 'All' || f.cat === cat);
  const held = Object.entries(S.mf.h).map(([id, h]) => ({ f: FUND[id], h }));
  const val = mfValue(), inv = mfInvested();
  return (
    <div className="page">
      <div className="row between wrapr"><div><h1>Mutual funds</h1><div className="mut sm">Demo funds with generated NAV histories. They are fictional and not real schemes. Past simulated returns say nothing about real funds.</div></div><span className="chip sim">DEMO FUNDS</span></div>
      <div className="grid g4">
        <Card><Stat label="Current value" value={inr(val)} /></Card>
        <Card><Stat label="Invested" value={inr(inv)} /></Card>
        <Card><Stat label="Returns" value={`${sg(val - inv)} (${inv ? pc(((val - inv) / inv) * 100) : '0.00%'})`} cls={cl(val - inv)} /></Card>
        <Card><Stat label="Active SIPs" value={S.mf.sips.filter((s) => s.active).length} /></Card>
      </div>
      <Pills label="View" value={tab} onChange={setTab} options={[['explore', 'Explore funds'], ['mine', `My funds (${held.length})`], ['sips', `SIPs (${S.mf.sips.length})`], ['tx', 'Transactions']]} />
      {tab === 'explore' && (
        <Card title="Funds" actions={<Pills label="Category" value={cat} onChange={setCat} options={cats.map((c) => [c, c])} />}>
          <Table rows={rows} rowKey={(f) => f.id} onRow={setOpen}
            cols={[{ h: 'Fund', l: 1, render: (f) => <><b>{f.name}</b><div className="mut sm">{f.sub}</div></> }, { h: 'Risk', render: (f) => f.risk }, { h: 'NAV', render: (f) => fmt(navNow(f), 4) },
              { h: '1M', render: (f) => R(f, 30), cls: (f) => cl(returns(f, 30)) }, { h: '6M', render: (f) => R(f, 182), cls: (f) => cl(returns(f, 182)) },
              { h: '1Y', render: (f) => R(f, 365), cls: (f) => cl(returns(f, 365)) }, { h: '3Y CAGR', render: (f) => R(f, 1095), cls: (f) => cl(returns(f, 1095)) },
              { h: '', render: (f) => <button className="btn sm pri" onClick={(e) => { e.stopPropagation(); setOpen(f); }}>Invest</button> }]} />
        </Card>
      )}
      {tab === 'mine' && (
        <Card title="Your funds">
          <Table rows={held} rowKey={(r) => r.f.id} empty="No mutual fund holdings yet. Pick a fund and invest a lumpsum or start a SIP."
            cols={[{ h: 'Fund', l: 1, render: (r) => <b>{r.f.name}</b> }, { h: 'Units', render: (r) => r.h.units.toFixed(3) }, { h: 'NAV', render: (r) => fmt(navNow(r.f), 4) },
              { h: 'Invested', render: (r) => inr(r.h.invested) }, { h: 'Current', render: (r) => inr(r.h.units * navNow(r.f)) },
              { h: 'Returns', render: (r) => `${sg(r.h.units * navNow(r.f) - r.h.invested)} (${pc(((r.h.units * navNow(r.f) - r.h.invested) / r.h.invested) * 100)})`, cls: (r) => cl(r.h.units * navNow(r.f) - r.h.invested) },
              { h: '', render: (r) => <span className="tb2"><button className="btn sm pri" onClick={() => setOpen(r.f)}>Add</button><button className="btn sm" onClick={() => setRedeem(r)}>Redeem</button></span> }]} />
        </Card>
      )}
      {tab === 'sips' && (
        <Card title="SIPs">
          <Table rows={S.mf.sips} rowKey={(s) => s.id} empty="No SIPs yet. Open a fund and choose SIP."
            cols={[{ h: 'Fund', l: 1, render: (s) => <b>{FUND[s.fid].name}</b> }, { h: 'Amount', render: (s) => inr(s.amt) }, { h: 'Monthly on', render: (s) => 'Day ' + s.day }, { h: 'Started', render: (s) => dfull(s.start) },
              { h: 'Installments', render: (s) => s.done.length }, { h: 'Status', render: (s) => (s.active ? 'Active' : 'Paused'), cls: (s) => (s.active ? 'up' : 'mut') },
              { h: '', render: (s) => <span className="tb2"><button className="btn sm" onClick={() => toggleSIP(s.id)}>{s.active ? 'Pause' : 'Resume'}</button><button className="btn sm sell" onClick={() => deleteSIP(s.id)}>Delete</button></span> }]} />
          <div className="mut sm" style={{ marginTop: 8 }}>SIP installments are processed when the app opens on or after the due day, using that day's simulated NAV and your available virtual funds.</div>
        </Card>
      )}
      {tab === 'tx' && (
        <Card title="Transactions">
          <Table rows={S.mf.tx.slice(0, 100)} empty="No transactions yet." rowKey={(t) => t.ts + t.fid + t.type}
            cols={[{ h: 'Time', l: 1, render: (t) => dt(t.ts) }, { h: 'Fund', l: 1, render: (t) => FUND[t.fid].name }, { h: 'Type', render: (t) => <span className={'tag ' + (t.type === 'BUY' ? 'buy' : 'sell')}>{t.type}</span> },
              { h: 'Amount', render: (t) => inr(t.amt) }, { h: 'Units', render: (t) => t.units.toFixed(3) }, { h: 'NAV', render: (t) => fmt(t.nav, 4) }, { h: 'Note', l: 1, render: (t) => t.note }]} />
        </Card>
      )}
      {open && <FundModal f={open} onClose={() => setOpen(null)} />}
      {redeem && <RedeemModal r={redeem} onClose={() => setRedeem(null)} />}
    </div>
  );
}

function FundModal({ f, onClose }) {
  const [mode, setMode] = useState('LUMP'), [amt, setAmt] = useState('5000'), [day, setDay] = useState('5');
  const series = navSeries(f, 365);
  const go = () => {
    const a = parseFloat(amt);
    const r = mode === 'LUMP' ? mfBuy(f.id, a) : createSIP(f.id, a, +day);
    if (!r.ok) toastErr(r.msg); else { notify(r.msg, 'ok'); onClose(); }
  };
  return (
    <Modal title={f.name} onClose={onClose} wide>
      <div className="tk">
        <div className="row between"><div><span className="tag">{f.cat}</span> <span className="tag">{f.sub}</span> <span className="tag">Risk: {f.risk}</span></div><div className="mono right"><b>NAV {fmt(navNow(f), 4)}</b></div></div>
        <Spark data={series} height={110} />
        <div className="kv">{[['1M', 30], ['3M', 91], ['6M', 182], ['1Y', 365], ['3Y CAGR', 1095]].map(([n, d]) => <div className="stat" key={n}><small>{n}</small><b className={'mono ' + cl(returns(f, d))}>{R(f, d)}</b></div>)}</div>
        <div className="mut sm">Exit load: {f.exit}. Simulated numbers for demonstration.</div>
        <Seg label="Mode" value={mode} onChange={setMode} options={[['LUMP', 'Lumpsum'], ['SIP', 'Monthly SIP']]} />
        <div className="g2c">
          <Field label="Amount (₹)" hint="Minimum ₹100"><input className="mono" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
          {mode === 'SIP' && <Field label="SIP day of month" hint="1 to 28"><input className="mono" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} /></Field>}
        </div>
        <div className="mut sm">Available {inr(available())}</div>
        <button className="btn big pri" onClick={go}>{mode === 'LUMP' ? 'Invest now' : 'Start SIP'}</button>
      </div>
    </Modal>
  );
}

function RedeemModal({ r, onClose }) {
  const [u, setU] = useState(r.h.units.toFixed(3));
  const nav = navNow(r.f), units = Math.min(parseFloat(u) || 0, r.h.units);
  return (
    <Modal title={'Redeem · ' + r.f.name} onClose={onClose}>
      <div className="tk">
        <Field label="Units to redeem" hint={`You hold ${r.h.units.toFixed(3)} units`}><input className="mono" inputMode="decimal" value={u} onChange={(e) => setU(e.target.value)} /></Field>
        <div className="row"><button className="btn sm" onClick={() => setU(r.h.units.toFixed(3))}>All</button><button className="btn sm" onClick={() => setU((r.h.units / 2).toFixed(3))}>Half</button></div>
        <div className="sum"><div><span>NAV</span><span>{fmt(nav, 4)}</span></div><div><span>Proceeds (approx.)</span><span>{inr(units * nav)}</span></div></div>
        <button className="btn big pri" onClick={() => { const x = mfRedeem(r.f.id, units >= r.h.units - 0.0005 ? r.h.units : units); x.ok ? (notify(x.msg, 'ok'), onClose()) : toastErr(x.msg); }}>Redeem</button>
      </div>
    </Modal>
  );
}
export { Empty };
