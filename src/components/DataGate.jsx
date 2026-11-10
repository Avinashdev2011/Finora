import { useState } from 'react';
import { feed, getProxy, setProxy, refreshAll } from '../lib/market.js';
import { Link } from '../lib/router.jsx';

/* Shown instead of a page when no real market data has been loaded. FINORA never shows made-up prices. */
export default function DataGate() {
  const [url, setUrl] = useState(getProxy());
  if (feed.status === 'connecting') return <div className="gate"><div className="spin" aria-hidden="true" /><h2>Connecting to market data</h2><p className="mut">Loading real prices for NSE and BSE instruments.</p></div>;
  return (
    <div className="gate">
      <h2>Live market data is not connected</h2>
      <p className="mut">FINORA shows only real prices, so nothing is displayed until the data source responds ({feed.err || 'no response'}). Check your internet connection, then retry. If the problem continues, your browser may be blocking the data source and you need to set up the free data proxy.</p>
      <div className="row wrapr" style={{ justifyContent: 'center' }}><button className="btn pri" onClick={() => refreshAll(true)}>Retry</button><Link to="/settings" className="btn">Data source settings</Link></div>
      <div className="gatebox"><label className="field"><span>Data proxy URL (optional)</span><input placeholder="https://finora-feed.yourname.workers.dev" value={url} onChange={(e) => setUrl(e.target.value)} /></label><button className="btn" onClick={() => setProxy(url)}>Save and connect</button><small className="mut">See the README in the download for the 2 minute proxy setup.</small></div>
    </div>
  );
}
