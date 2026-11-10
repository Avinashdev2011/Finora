import { useRef, useState } from 'react';
import { useLive, getS, mutate, resetAccount, exportData, importData, notify, toastErr } from '../lib/engine.js';
import { marketOpen, feed, getProxy, setProxy, refreshAll } from '../lib/market.js';
import { inr, downloadFile } from '../lib/util.js';
import { applyTheme } from '../components/Shell.jsx';
import { Card, Pills, Field } from '../components/ui.jsx';

export default function Settings() {
  useLive();
  const S = getS(), [amt, setAmt] = useState('1000000'), [sure, setSure] = useState(false), file = useRef();
  const imp = (f) => { if (!f) return; const r = new FileReader(); r.onload = () => (importData(String(r.result)) ? notify('Backup restored.', 'ok') : toastErr('That file is not a valid FINORA backup.')); r.readAsText(f); };
  return (
    <div className="page">
      <h1>Settings</h1>
      <div className="grid g2">
        <Card title="Profile">
          <Field label="Display name"><input value={S.name} maxLength={30} onChange={(e) => mutate((s) => { s.name = e.target.value; })} /></Field>
          <Pills label="Theme" value={S.theme} onChange={(v) => { mutate((s) => { s.theme = v; }); applyTheme(v); }} options={[['system', 'System'], ['dark', 'Dark'], ['light', 'Light']]} />
        </Card>
        <Card title="Data source">
          <div className="mut sm" style={{ marginBottom: 10 }}>Prices come from Yahoo Finance's public chart feed (NSE and BSE, usually delayed by a few minutes). Status: <b>{feed.status === 'ok' ? 'connected' : feed.status === 'connecting' ? 'connecting' : 'not connected'}</b>{feed.lastOk ? ' · last update ' + new Date(feed.lastOk).toLocaleTimeString() : ''}. Equity is {feed.status === 'ok' && marketOpen('EQ') ? 'open now' : 'closed or not live'}. When closed, the last close is shown and orders are blocked.</div>
          {feed.err && feed.status !== 'ok' && <div className="err" style={{ marginBottom: 10 }}>{String(feed.err)}</div>}
          <Field label="Data proxy URL (optional)"><input placeholder="https://your-worker.workers.dev" defaultValue={getProxy()} onBlur={(e) => setProxy(e.target.value.trim())} /></Field>
          <Field label="Verification server URL (optional)"><input placeholder="https://your-api.example.com" defaultValue={(() => { try { return localStorage.getItem('finora.api') || ''; } catch (e) { return ''; } })()} onBlur={(e) => { try { const v = e.target.value.trim(); v ? localStorage.setItem('finora.api', v) : localStorage.removeItem('finora.api'); } catch (err) { /* ignore */ } }} /></Field>
          <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={() => refreshAll()}>Refresh now</button></div>
          <div className="mut sm" style={{ marginTop: 10 }}>If your browser blocks the feed, deploy the small proxy from the worker folder and paste its address here.</div>
        </Card>
        <Card title="Backup">
          <div className="row wrapr">
            <button className="btn" onClick={() => downloadFile('finora-backup.json', exportData(), 'application/json')}>Export backup</button>
            <button className="btn" onClick={() => file.current.click()}>Import backup</button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { imp(e.target.files[0]); e.target.value = ''; }} />
          </div>
          <div className="mut sm" style={{ marginTop: 10 }}>Your data lives only in this browser. Export a backup before clearing site data.</div>
        </Card>
        <Card title="Reset virtual account">
          <Field label="Starting capital (₹)"><input className="mono" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} /></Field>
          {!sure ? <button className="btn sell" onClick={() => setSure(true)}>Reset account</button> : <div className="row"><span className="mut sm">Erase all trades and restart with {inr(parseInt(amt, 10) || 0)}?</span><button className="btn sell" onClick={() => { const v = parseInt(amt, 10); if (v >= 1000) { resetAccount(v); notify('Account reset.', 'ok'); } else toastErr('Minimum ₹1,000.'); setSure(false); }}>Yes, reset</button><button className="btn" onClick={() => setSure(false)}>Cancel</button></div>}
        </Card>
      </div>
      <Card title="About data and trading">
        <div className="mut sm">FINORA Phase 1 uses real, delayed NSE/BSE prices from a public feed and real AMFI mutual fund NAVs, with virtual money. No order reaches a broker or exchange. Fundamentals such as P/E and market cap are not shown because no free source is available. Nothing here is investment advice.</div>
      </Card>
    </div>
  );
}
