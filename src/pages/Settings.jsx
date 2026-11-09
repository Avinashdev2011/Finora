import { useRef, useState } from 'react';
import { useLive, getS, mutate, commit, setSimClosed, resetAccount, exportData, importData, notify, toastErr } from '../lib/engine.js';
import { marketOpen } from '../lib/market.js';
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
        <Card title="Market hours">
          <div className="mut sm" style={{ marginBottom: 10 }}>FINORA follows Indian market hours. When a market is closed, prices stay frozen and orders are blocked. Equity is {marketOpen('EQ') && !S.simClosed ? 'open now' : S.simClosed ? 'forced open (demo mode)' : 'closed now'}.</div>
          <Pills label="Mode" value={S.simClosed ? 'demo' : 'real'} onChange={(v) => setSimClosed(v === 'demo')} options={[['real', 'Real market hours'], ['demo', 'Demo mode: simulate open']]} />
          <div className="mut sm" style={{ marginTop: 10 }}>Demo mode keeps simulated prices moving outside market hours so you can practise. It is clearly labelled in the top bar.</div>
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
        <div className="mut sm">FINORA Phase 1 uses simulated market data and virtual money. Prices are generated, not taken from NSE or BSE, and no order reaches a broker or exchange. Real live charts need a licensed market data feed. Mutual fund NAVs and IPOs are demo data. Nothing here is investment advice.</div>
      </Card>
    </div>
  );
}
