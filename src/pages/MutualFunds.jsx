import { useEffect, useState } from 'react';
import { useLive, getS, mfBuy, mfRedeem, createSIP, toggleSIP, deleteSIP, mfValue, mfInvested, available, notify, toastErr } from '../lib/engine.js';
import { searchFunds, loadFund, fundInfo, navNow, navDate, returns } from '../lib/mfdata.js';
import { fmt, inr, sg, pc, cl, dt } from '../lib/util.js';
import { Card, Pills, Table, Stat, Spark, Modal, Field, Empty } from '../components/ui.jsx';

const PRESETS = ['Nifty 50 index', 'Flexi cap', 'ELSS tax saver', 'Liquid', 'Large cap', 'Mid cap', 'Small cap', 'Gold', 'Balanced advantage'];
const R = (v) => (v == null ? 'n/a' : pc(v));

export default function MutualFunds() {
  useLive();
  const S = getS(), [tab, setTab] = useState('explore'), [q, setQ] = useState(''), [res, setRes] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const [sel, setSel] = useState(null), [buy, setBuy] = useState(null), [redeem, setRedeem] = useState(null);
  const run = async (text) => {
    const t = text.trim(); if (t.length < 3) return setErr('Type at least 3 letters of a fund name.');
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await searchFunds(t)); } catch (e) { setErr('Could not reach the mutual fund data source (' + e.message + '). Check your connection or the data proxy in Settings.'); }
    setBusy(false);
  };
  useEffect(() => { Object.keys(S.mf.h).concat(S.mf.sips.map((x) => x.fid)).forEach((c) => loadFund(c).catch(() => {})); }, []); // eslint-disable-line
  const held = Object.entries(S.mf.h), val = mfValue(), inv = mfInvested();
  return (
    <div className="page">
      <div><h1>Mutual funds</h1><div className="mut sm">Real schemes and real NAVs published by AMFI, via mfapi.in. Investments use virtual money and fill at the latest published NAV (updated once a day).</div></div>
      <div className="grid g4">
        <Card><Stat label="Current value" value={inr(val)} /></Card><Card><Stat label="Invested" value={inr(inv)} /></Card>
        <Card><Stat label="Returns" value={`${sg(val - inv)}${inv ? ' (' + pc(((val - inv) / inv) * 100) + ')' : ''}`} cls={cl(val - inv)} /></Card><Card><Stat label="Active SIPs" value={S.mf.sips.filter((s) => s.active).length} /></Card>
      </div>
      <Pills label="View" value={tab} onChange={setTab} options={[['explore', 'Explore'], ['mine', `My funds (${held.length})`], ['sips', 'SIPs'], ['tx', 'Transactions']]} />
      {tab === 'explore' && (
        <Card title="Find a fund">
          <form className="row" onSubmit={(e) => { e.preventDefault(); run(q); }}><input className="grow" placeholder="Search a scheme, e.g. Parag Parikh Flexi Cap Direct" aria-label="Search funds" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn pri" disabled={busy}>{busy ? 'Searching' : 'Search'}</button></form>
          <div className="pills" style={{ marginTop: 10 }}>{PRESETS.map((p) => <button key={p} className="pill" onClick={() => { setQ(p + ' direct growth'); run(p + ' direct growth'); }}>{p}</button>)}</div>
          {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
          {res && (res.length ? <div className="scroll" style={{ marginTop: 12 }}><table className="tbl"><thead><tr><th className="l">Scheme</th><th /></tr></thead><tbody>{res.map((f) => <tr key={f.code} className="click" onClick={() => setSel(f.code)}><td className="l">{f.name}<div className="mut sm">Code {f.code}</div></td><td><button className="btn sm">View</button></td></tr>)}</tbody></table></div> : <Empty>No scheme matches. Try fewer words.</Empty>)}
          {!res && !err && <div className="mut sm" style={{ marginTop: 12 }}>Search by fund house or scheme name, or tap a category above. Choose Direct Growth plans for the lowest cost.</div>}
        </Card>
      )}
      {tab === 'mine' && (
        <Card flush><Table rows={held} rowKey={(r) => r[0]} onRow={(r) => setSel(r[0])} empty="You have not invested in any fund yet. Use Explore to find one."
          cols={[{ h: 'Fund', l: 1, render: ([c, h]) => <>{h.name}<div className="mut sm">Units {h.units.toFixed(3)}</div></> }, { h: 'Invested', render: ([, h]) => inr(h.invested) }, { h: 'NAV', render: ([c, h]) => fmt(navNow(c) || h.nav, 4) },
            { h: 'Value', render: ([c, h]) => inr(h.units * (navNow(c) || h.nav)) }, { h: 'P&L', render: ([c, h]) => sg(h.units * (navNow(c) || h.nav) - h.invested), cls: ([c, h]) => cl(h.units * (navNow(c) || h.nav) - h.invested) },
            { h: '', render: ([c]) => <button className="btn sm" onClick={(e) => { e.stopPropagation(); setRedeem(c); }}>Redeem</button> }]} /></Card>
      )}
      {tab === 'sips' && (
        <Card flush><Table rows={S.mf.sips} rowKey={(s) => s.id} empty="No SIPs yet. Open a fund and choose Start SIP."
          cols={[{ h: 'Fund', l: 1, render: (s) => s.name }, { h: 'Amount', render: (s) => inr(s.amt) }, { h: 'Day', render: (s) => s.day }, { h: 'Installments', render: (s) => s.done.length }, { h: 'Status', render: (s) => (s.active ? 'Active' : 'Paused') },
            { h: '', render: (s) => <span className="row nowrap"><button className="btn sm" onClick={() => toggleSIP(s.id)}>{s.active ? 'Pause' : 'Resume'}</button><button className="btn sm sell" onClick={() => deleteSIP(s.id)}>Delete</button></span> }]} /></Card>
      )}
      {tab === 'tx' && (
        <Card flush><Table rows={S.mf.tx.slice(0, 100)} rowKey={(t) => t.ts + t.fid + t.type} empty="No transactions yet."
          cols={[{ h: 'Time', l: 1, render: (t) => dt(t.ts) }, { h: 'Fund', l: 1, render: (t) => t.name }, { h: 'Type', render: (t) => <span className={'tag ' + (t.type === 'BUY' ? 'buy' : 'sell')}>{t.type}</span> }, { h: 'Amount', render: (t) => inr(t.amt) }, { h: 'Units', render: (t) => t.units.toFixed(3) }, { h: 'NAV', render: (t) => fmt(t.nav, 4) }, { h: 'Note', l: 1, render: (t) => <span className="mut">{t.note}</span> }]} /></Card>
      )}
      {sel && <Detail code={sel} onClose={() => setSel(null)} onBuy={(c, sip) => { setSel(null); setBuy({ c, sip }); }} />}
      {buy && <BuyModal code={buy.c} sip={buy.sip} onClose={() => setBuy(null)} />}
      {redeem && <RedeemModal code={redeem} onClose={() => setRedeem(null)} />}
    </div>
  );
}

function Detail({ code, onClose, onBuy }) {
  const [f, setF] = useState(fundInfo(code)), [err, setErr] = useState(''), [rg, setRg] = useState(365);
  useEffect(() => { loadFund(code).then(setF).catch((e) => setErr(e.message)); }, [code]);
  const r = f ? returns(code) : null, pts = f ? f.navs.slice(-Math.max(30, Math.round(rg * 0.69))).map((x) => x.n) : null;
  return (
    <Modal title="Fund details" wide onClose={onClose}>
      {err && <div className="err">Could not load this fund: {err}</div>}
      {!f && !err && <div className="empty">Loading real NAV history</div>}
      {f && (
        <div className="tk">
          <div><h2>{f.name}</h2><div className="mut sm">{f.house} · {f.cat}</div></div>
          <div className="row between wrapr"><div><div className="mut sm">NAV on {navDate(code)}</div><div className="mono xl">₹{fmt(navNow(code), 4)}</div></div><Pills label="Chart range" value={rg} onChange={setRg} options={[[182, '6M'], [365, '1Y'], [1095, '3Y'], [1826, '5Y'], [9999, 'All']]} /></div>
          <Spark data={pts} height={150} />
          <div className="kv">{['1M', '6M', '1Y', '3Y', '5Y'].map((k) => <div className="stat" key={k}><small>{k === '1M' || k === '6M' ? k + ' return' : k + ' annualised'}</small><b className={'mono ' + (r && r[k] != null ? cl(r[k]) : '')}>{r ? R(r[k]) : ''}</b></div>)}</div>
          <div className="row"><button className="btn buy grow" onClick={() => onBuy(code, false)}>Invest lumpsum</button><button className="btn pri grow" onClick={() => onBuy(code, true)}>Start SIP</button></div>
          <div className="mut sm">Past returns do not guarantee future returns. Mutual fund investments are subject to market risks.</div>
        </div>
      )}
    </Modal>
  );
}

function BuyModal({ code, sip, onClose }) {
  const f = fundInfo(code), [amt, setAmt] = useState(sip ? '5000' : '10000'), [day, setDay] = useState('5');
  const a = parseFloat(amt) || 0;
  const go1 = () => { const r = sip ? createSIP(code, a, parseInt(day, 10)) : mfBuy(code, a); r.ok ? (notify(r.msg, 'ok'), onClose()) : toastErr(r.msg); };
  return (
    <Modal title={(sip ? 'Start SIP · ' : 'Invest · ') + (f ? f.name : code)} onClose={onClose}>
      <div className="tk">
        <Field label={sip ? 'Monthly amount (₹)' : 'Amount (₹)'}><input className="mono" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
        {sip && <Field label="Day of month (1 to 28)"><input className="mono" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} /></Field>}
        <div className="sum"><div><span>Latest NAV</span><span>₹{fmt(navNow(code), 4)}</span></div><div><span>Units</span><span>{navNow(code) ? (a / navNow(code)).toFixed(3) : '-'}</span></div><div><span>Available</span><span>{inr(available())}</span></div></div>
        <button className="btn big pri" onClick={go1}>{sip ? 'Start SIP' : 'Invest'}</button>
      </div>
    </Modal>
  );
}

function RedeemModal({ code, onClose }) {
  const h = getS().mf.h[code], [u, setU] = useState(h ? h.units.toFixed(3) : '');
  if (!h) return null;
  return (
    <Modal title={'Redeem · ' + h.name} onClose={onClose}>
      <div className="tk"><Field label={`Units (you hold ${h.units.toFixed(3)})`}><input className="mono" inputMode="decimal" value={u} onChange={(e) => setU(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
        <div className="sum"><div><span>Latest NAV</span><span>₹{fmt(navNow(code) || h.nav, 4)}</span></div><div><span>Estimated proceeds</span><span>{inr((parseFloat(u) || 0) * (navNow(code) || h.nav))}</span></div></div>
        <button className="btn big sell" onClick={() => { const r = mfRedeem(code, parseFloat(u)); r.ok ? (notify(r.msg, 'ok'), onClose()) : toastErr(r.msg); }}>Redeem</button></div>
    </Modal>
  );
}
