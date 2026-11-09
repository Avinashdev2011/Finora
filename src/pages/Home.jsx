import { useLive, getS, equity, dayPnl, available, holdMV, unreal, mfValue, blocked, IPOS, ipoStatus } from '../lib/engine.js';
import { M, ids, UNIVERSE, chgp, chg } from '../lib/market.js';
import { fmt, inr, sg, pc, cl, arrow } from '../lib/util.js';
import { Link, go } from '../lib/router.jsx';
import { openTicket } from '../lib/ui.js';
import { Card, Spark, Table, TB, Chg, Stat } from '../components/ui.jsx';

export default function Home() {
  useLive();
  const S = getS(), e = equity(), day = dayPnl(), h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const eq = UNIVERSE.filter((u) => u.seg === 'EQ');
  const movers = [...eq].sort((a, b) => chgp(b.id) - chgp(a.id)), top = movers.slice(0, 5), low = movers.slice(-3).reverse();
  const watch = (S.wls[S.wl] || []).filter((s) => M[s]).slice(0, 7);
  const posN = Object.keys(S.positions).length, openOrd = S.orders.filter((o) => o.status === 'OPEN').length, gtt = S.gtts.filter((g) => g.status === 'ACTIVE').length;
  const ipoOpen = IPOS.filter((x) => ipoStatus(x) === 'OPEN').length;
  const curve = S.eq.length > 2 ? S.eq.map((x) => x.v) : null;
  return (
    <div className="page">
      <div className="hero card">
        <div className="grow">
          <div className="mut">{hello}, {S.name}</div>
          <div className="big mono">{inr(e)}</div>
          <div className={'mono ' + cl(day)}>{arrow(day)} {sg(day)} today · overall {sg(e - S.start)} ({pc(((e - S.start) / S.start) * 100)})</div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn buy" onClick={() => openTicket('RELIANCE', 'BUY')}>Buy / Sell</button>
            <button className="btn" onClick={() => go('/funds')}>Add funds</button>
            <button className="btn" onClick={() => go('/derivatives')}>Option chain</button>
            <button className="btn" onClick={() => go('/ipo')}>IPO{ipoOpen ? ` (${ipoOpen} open)` : ''}</button>
          </div>
        </div>
        <div className="herochart">{curve ? <Spark data={curve} height={92} /> : <div className="mut sm">Your equity curve appears here as the simulator runs.</div>}</div>
      </div>

      <div className="grid g4">
        <Stat label="Available margin" value={inr(available())} />
        <Stat label="Margin used" value={inr(blocked())} />
        <Stat label="Holdings value" value={inr(holdMV())} />
        <Stat label="Mutual funds" value={inr(mfValue())} />
        <Stat label="Unrealized P&L" value={sg(unreal())} cls={cl(unreal())} />
        <Stat label="Open positions" value={posN} />
        <Stat label="Pending orders" value={openOrd} />
        <Stat label="Active GTTs" value={gtt} />
      </div>

      <div className="grid g3">
        {['NIFTY', 'BANKNIFTY', 'SENSEX'].map((s) => (
          <Link key={s} to={'/stock/' + s} className="card lnk">
            <div className="row between mut"><span>{M && s}</span><span>{s === 'SENSEX' ? 'BSE' : 'NSE'}</span></div>
            <div className="mono xl">{fmt(M[s].ltp)}</div>
            <div className={'mono ' + cl(chg(s))}>{arrow(chg(s))} {sg(chg(s))} ({pc(chgp(s))})</div>
            <Spark id={s} />
          </Link>
        ))}
      </div>

      <div className="grid g2">
        <Card title="Top gainers" actions={<Link to="/markets" className="btn sm">All markets</Link>}>
          <Table rows={top} rowKey={(r) => r.id} onRow={(r) => go('/stock/' + r.id)}
            cols={[{ h: 'Symbol', l: 1, render: (r) => <><b>{r.id}</b><div className="mut sm">{r.name}</div></> }, { h: 'LTP', render: (r) => fmt(M[r.id].ltp) }, { h: 'Change', render: (r) => <Chg id={r.id} /> }, { h: '', render: (r) => <TB id={r.id} /> }]} />
          <div className="mut sm" style={{ padding: '10px 4px 0' }}>Biggest losers: {low.map((u) => <span key={u.id}><Link to={'/stock/' + u.id}>{u.id}</Link> <Chg id={u.id} />{'  '}</span>)}</div>
        </Card>
        <Card title={'Watchlist · ' + S.wl} actions={<Link to="/watchlist" className="btn sm">Manage</Link>}>
          <Table rows={watch} rowKey={(r) => r} onRow={(r) => go('/stock/' + r)} empty="Your watchlist is empty."
            cols={[{ h: 'Symbol', l: 1, render: (r) => <b>{r}</b> }, { h: 'LTP', render: (r) => fmt(M[r].ltp) }, { h: 'Change', render: (r) => <Chg id={r} /> }, { h: '', render: (r) => <TB id={r} /> }]} />
        </Card>
      </div>

      <div className="grid g3 tiles">
        {[['/charts', 'Charts', 'Candles, indicators and drawing tools'], ['/scanner', 'Scanner', 'Find oversold, overbought and breakout stocks'], ['/mutual-funds', 'Mutual funds', 'Lumpsum and SIP with demo funds'], ['/commodities', 'Commodities', 'Gold, silver, crude oil futures'], ['/learn', 'Learn', 'Short lessons on orders, options and risk'], ['/tools', 'Calculators', 'SIP, EMI, brokerage and position size']].map(([k, n, d]) => (
          <Link key={k} to={k} className="card lnk tile"><b>{n}</b><span className="mut sm">{d}</span></Link>
        ))}
      </div>
    </div>
  );
}
