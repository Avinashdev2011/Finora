import { useState } from 'react';
import { FiStar, FiBell } from 'react-icons/fi';
import { useLive, getS, setWatch, mutate, notify, inst } from '../lib/engine.js';
import { M, META, TF, technicals, chg, chgp, marketOpen, agg, DAY, isLive, focusSymbol } from '../lib/market.js';
import { fmt, sg, pc, cl, arrow, cr, inr } from '../lib/util.js';
import { openTicket, openGTT } from '../lib/ui.js';
import { Link, go } from '../lib/router.jsx';
import Chart from '../components/Chart.jsx';
import { Card, Pills, Table, Stat, PriceMode, ClosedBanner } from '../components/ui.jsx';

export default function Stock({ id }) {
  useLive();
  const u = META.get(id), [tab, setTab] = useState('over'), [tf, setTf] = useState('15m');
  if (!u) return <div className="page"><div className="card"><h2>Unknown symbol {id}</h2><Link to="/markets" className="btn pri">Back to markets</Link></div></div>;
  if (!M[id].ok) return <div className="page"><div className="card"><h2>{u.id}: no price data yet</h2><p className="mut">Real price data for this symbol has not loaded. It will appear when the data source responds.</p><Link to="/markets" className="btn pri">Back to markets</Link></div></div>;
  const S = getS(), m = M[id], inW = (S.wls[S.wl] || []).includes(id), tradable = inst(id).kind !== 'SPOT';
  const h = S.holdings[id], t = technicals(id), yr = agg(id, DAY).slice(-252), hi52 = yr.length > 20 ? Math.max(...yr.map((x) => x.h)) : null, lo52 = yr.length > 20 ? Math.min(...yr.map((x) => x.l)) : null;
  const posRows = Object.entries(S.positions).filter(([, p]) => p.id.split('|')[0] === id);
  const [alertPx, setAlertPx] = useState('');
  const dec = m.ltp < 100 ? 3 : 2;
  return (
    <div className="page">
      <ClosedBanner seg={u.seg} />
      <div className="card">
        <div className="row between wrap">
          <div><h1 className="h1">{u.id}</h1><div className="mut">{u.name} · {u.seg === 'IDX' ? 'Index' : u.seg === 'CUR' ? 'Currency' : 'NSE'} · {u.sec}</div></div>
          <div className="right"><div className="mono xl">{fmt(m.ltp, dec)}</div><div className={'mono ' + cl(chg(id))}>{arrow(chg(id))} {sg(chg(id))} ({pc(chgp(id))})</div><div style={{ marginTop: 4 }}><PriceMode id={id} /></div></div>
        </div>
        <div className="row wrap" style={{ marginTop: 14 }}>
          {tradable ? <><button className="btn buy" onClick={() => openTicket(id, 'BUY')}>Buy</button><button className="btn sell" onClick={() => openTicket(id, 'SELL')}>Sell</button><button className="btn" onClick={() => openGTT(id, 'SELL')}>GTT</button></>
            : <span className="mut sm">Indices and currency rates are shown for reference and cannot be traded here.</span>}
          <button className="btn" onClick={() => setWatch((s) => { const l = s.wls[s.wl]; if (l.includes(id)) s.wls[s.wl] = l.filter((x) => x !== id); else l.push(id); })}><FiStar /> {inW ? 'In watchlist' : 'Add to watchlist'}</button>
          <button className="btn" onClick={() => go('/charts')}>Full chart</button>
        </div>
      </div>
      <div className="card chartcard">
        <div className="row between wrap" style={{ marginBottom: 8 }}><Pills label="Timeframe" value={tf} onChange={setTf} options={Object.keys(TF).map((k) => [k, k])} /></div>
        <div className="stockchart"><Chart sym={id} tf={tf} type="candle" ind={{ vol: true, ema: true }} compact trade={false} /></div>
      </div>
      <Pills label="Stock sections" value={tab} onChange={setTab} options={[['over', 'Overview'], ['tech', 'Technicals'], ['me', 'Your position'], ['alert', 'Alert']]} />
      {tab === 'over' && (
        <div className="grid g4">
          <Stat label="Open" value={fmt(m.open, dec)} /><Stat label="Previous close" value={fmt(m.prev, dec)} /><Stat label="Day high" value={fmt(m.hi, dec)} /><Stat label="Day low" value={fmt(m.lo, dec)} />
          <Stat label="Volume" value={cr(m.v)} /><Stat label="52-week high" value={hi52 ? fmt(hi52, dec) : 'Loading'} /><Stat label="52-week low" value={lo52 ? fmt(lo52, dec) : 'Loading'} /><Stat label="Data source" value="Public feed" />
          <div className="card span4 mut sm">Fundamentals such as P/E, market cap and results are not shown because no data provider is connected. FINORA does not invent them.</div>
        </div>
      )}
      {tab === 'tech' && !t && <Card title="Technical summary"><div className="empty">Loading daily price history.</div></Card>}
      {tab === 'tech' && t && (
        <Card title="Technical summary (daily candles)" actions={<span className={'tag big ' + (t.verdict.includes('uy') ? 'buy' : t.verdict.includes('ell') ? 'sell' : '')}>{t.verdict}</span>}>
          <div className="meter"><i style={{ width: (t.buy / 7) * 100 + '%', background: 'var(--up)' }} /><i style={{ width: (t.neutral / 7) * 100 + '%', background: 'var(--mut)' }} /><i style={{ width: (t.sell / 7) * 100 + '%', background: 'var(--dn)' }} /></div>
          <div className="mut sm" style={{ margin: '6px 0 10px' }}>{t.buy} buy · {t.neutral} neutral · {t.sell} sell</div>
          <Table rows={t.rows} rowKey={(r) => r.name} cols={[{ h: 'Indicator', l: 1, render: (r) => r.name }, { h: 'Value', render: (r) => r.value }, { h: 'Signal', render: (r) => <span className={'tag ' + (r.signal === 'Buy' ? 'buy' : r.signal === 'Sell' ? 'sell' : '')}>{r.signal}</span> }]} />
          <div className="mut sm" style={{ paddingTop: 8 }}>Signals are mechanical readings of real daily prices. They are not advice.</div>
        </Card>
      )}
      {tab === 'me' && (
        <Card title="Your position">
          {h && <div className="grid g4"><Stat label="Holding qty" value={h.qty} /><Stat label="Average price" value={fmt(h.avg)} /><Stat label="Value" value={inr(h.qty * m.ltp)} /><Stat label="P&L" value={sg((m.ltp - h.avg) * h.qty)} cls={cl(m.ltp - h.avg)} /></div>}
          {posRows.length > 0 && <Table rows={posRows} rowKey={(r) => r[0]} cols={[{ h: 'Instrument', l: 1, render: (r) => inst(r[1].id).label }, { h: 'Qty', render: (r) => r[1].qty }, { h: 'Avg', render: (r) => fmt(r[1].avg) }, { h: 'P&L', render: (r) => sg((inst(r[1].id).ltp() - r[1].avg) * r[1].qty), cls: (r) => cl((inst(r[1].id).ltp() - r[1].avg) * r[1].qty) }]} />}
          {!h && !posRows.length && <div className="empty">You have no position in {id}.</div>}
        </Card>
      )}
      {tab === 'alert' && (
        <Card title="Price alert">
          <div className="row wrap"><input className="mono mini" inputMode="decimal" placeholder={'Price e.g. ' + fmt(m.ltp, dec)} aria-label="Alert price" value={alertPx} onChange={(e) => setAlertPx(e.target.value)} />
            <button className="btn pri" onClick={() => { const p = parseFloat(alertPx); if (!(p > 0)) return; mutate((s) => s.alerts.push({ sym: id, cond: p >= m.ltp ? 'above' : 'below', price: p, done: false })); notify(`Alert set: ${id} ${p >= m.ltp ? 'at or above' : 'at or below'} ${p}`, 'ok'); setAlertPx(''); }}><FiBell /> Set alert</button></div>
          <div className="mut sm" style={{ marginTop: 8 }}>Alerts only trigger while the market is open. Manage them under Alerts.</div>
        </Card>
      )}
    </div>
  );
}
