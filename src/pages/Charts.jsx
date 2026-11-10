import { useState } from 'react';
import { FiMousePointer, FiTrendingUp, FiMinus, FiSquare, FiTrash2, FiChevronDown, FiCornerUpLeft, FiBarChart } from 'react-icons/fi';
import { useLive, getS, equity, activeList } from '../lib/engine.js';
import { M, META, TF } from '../lib/market.js';
import { fmt, inr } from '../lib/util.js';
import Chart, { clearDrawings, undoDrawing } from '../components/Chart.jsx';
import Ticket from '../components/Ticket.jsx';
import { Chg, SymbolPicker, Pills } from '../components/ui.jsx';
import { PositionsTable, OrdersTable, TradesTable, HoldingsTable } from '../components/tables.jsx';
import { go } from '../lib/router.jsx';
import { openTicket } from '../lib/ui.js';
import { inst, px } from '../lib/engine.js';

let lastSym = 'RELIANCE';
const TOOLS = [['cursor', 'Cursor', FiMousePointer], ['tl', 'Trendline', FiTrendingUp], ['hl', 'Horizontal line', FiMinus], ['rc', 'Rectangle', FiSquare], ['fib', 'Fibonacci retracement', FiBarChart]];
const IND = [['ema', 'EMA 20'], ['sma', 'SMA 50'], ['bb', 'Bollinger Bands'], ['vol', 'Volume'], ['rsi', 'RSI 14'], ['macd', 'MACD']];

export default function Charts() {
  useLive();
  const S = getS();
  const [sym, setSymState] = useState(lastSym), [tf, setTf] = useState('5m'), [type, setType] = useState('candle'), [tool, setTool] = useState('cursor');
  const [ind, setInd] = useState({ ema: true, vol: true }), [menu, setMenu] = useState(false), [rt, setRt] = useState('watch'), [bt, setBt] = useState('positions'), [mt, setMt] = useState('chart');
  const setSym = (s) => { lastSym = s; setSymState(s); };
  const m = M[sym], list = activeList().filter((s) => M[s]);
  return (
    <div className="term">
      <div className="ctabs" role="tablist" aria-label="Chart views">
        <button role="tab" aria-selected="true">Chart</button>
        <button role="tab" aria-selected="false" onClick={() => go('/stock/' + sym)}>Overview</button>
        <button role="tab" aria-selected="false" onClick={() => go('/markets')}>Markets</button>
        <span className="grow" /><span className="chip sim hide-s">SIMULATED</span>
      </div>
      <div className="tbar">
        <div className="symsearch"><SymbolPicker placeholder={sym} onPick={setSym} /></div>
        <span className="mono ltpbig">{fmt(m.ltp)}</span><Chg id={sym} abs />
        <span className="vs" />
        <div className="seg sm" role="group" aria-label="Timeframe">{Object.keys(TF).map((t) => <button key={t} aria-pressed={tf === t} onClick={() => setTf(t)}>{t}</button>)}</div>
        <div className="seg sm" role="group" aria-label="Chart type">{[['candle', 'Candles'], ['bar', 'Bars'], ['line', 'Line'], ['area', 'Area']].map(([k, n]) => <button key={k} aria-pressed={type === k} onClick={() => setType(k)}>{n}</button>)}</div>
        <div className="menuwrap">
          <button className="btn sm" onClick={() => setMenu(!menu)} aria-expanded={menu}>Indicators <FiChevronDown /></button>
          {menu && <div className="menu" onMouseLeave={() => setMenu(false)}>{IND.map(([k, n]) => <label key={k}><input type="checkbox" checked={!!ind[k]} onChange={(e) => setInd({ ...ind, [k]: e.target.checked })} /> {n}</label>)}</div>}
        </div>
        <button className="btn sm" onClick={() => go('/stock/' + sym)}>Details</button>
      </div>
      <div className="mtabs"><Pills label="Panel" value={mt} onChange={setMt} options={[['chart', 'Chart'], ['trade', 'Trade'], ['book', 'Positions']]} /></div>
      <div className={'ltools' + (mt !== 'chart' ? ' hidem' : '')} role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(([k, n, I]) => <button key={k} title={n} aria-label={n} aria-pressed={tool === k} onClick={() => setTool(k)}><I /></button>)}
        <button title="Undo last drawing" aria-label="Undo last drawing" onClick={() => undoDrawing(sym)}><FiCornerUpLeft /></button>
        <button title="Remove all drawings" aria-label="Remove all drawings" onClick={() => clearDrawings(sym)}><FiTrash2 /></button>
      </div>
      <div className={'cwrap' + (mt !== 'chart' ? ' hidem' : '')}>
        <Chart sym={sym} tf={tf} type={type} ind={ind} tool={tool} trade={false} />
        {inst(sym) && <div className="qtrade"><button className="btn buy" onClick={() => openTicket(sym, 'BUY')}>BUY @ {fmt(px(inst(sym), 'BUY'))}</button><button className="btn sell" onClick={() => openTicket(sym, 'SELL')}>SELL @ {fmt(px(inst(sym), 'SELL'))}</button></div>}
      </div>
      <div className={'bpanel' + (mt !== 'book' ? ' hidem' : '')}>
        <div className="ptabs" role="tablist">{[['positions', 'Positions'], ['orders', 'Orders'], ['holdings', 'Holdings'], ['trades', 'Trades']].map(([k, n]) => <button key={k} role="tab" aria-selected={bt === k} onClick={() => setBt(k)}>{n}</button>)}<span className="grow" /><span className="mono mut sm padr">Equity {inr(equity())}</span></div>
        <div className="pbody">{bt === 'positions' ? <PositionsTable /> : bt === 'orders' ? <OrdersTable limit={30} /> : bt === 'holdings' ? <HoldingsTable /> : <TradesTable limit={40} />}</div>
      </div>
      <aside className={'rpanel' + (mt !== 'trade' ? ' hidem' : '')}>
        <div className="ptabs" role="tablist">{[['watch', 'Watchlist'], ['order', 'Order'], ['info', 'Details']].map(([k, n]) => <button key={k} role="tab" aria-selected={rt === k} onClick={() => setRt(k)}>{n}</button>)}</div>
        <div className="pbody">
          {rt === 'watch' && list.map((s) => (
            <div key={s} role="button" tabIndex={0} className={'wlrow' + (s === sym ? ' on' : '')} onClick={() => setSym(s)} onKeyDown={(e) => e.key === 'Enter' && setSym(s)}>
              <span><b>{s}</b><small>{META.get(s).sec}</small></span><span className="mono">{fmt(M[s].ltp)}</span><Chg id={s} />
            </div>))}
          {rt === 'order' && <Ticket iid={sym} />}
          {rt === 'info' && (
            <div className="tk"><div><h3>{META.get(sym).name}</h3><div className="mut">{sym} · {META.get(sym).sec}</div></div>
              <div className="kv2">{[['Open', fmt(m.open)], ['Prev close', fmt(m.prev)], ['Day high', fmt(m.hi)], ['Day low', fmt(m.lo)], ['Volume', fmt(m.v, 0)], ['Lot size', META.get(sym).lot || 1]].map(([k, v]) => <div key={k}><small>{k}</small><b className="mono">{v}</b></div>)}</div>
              <div className="mut sm">Real prices from a public delayed feed. When the market is closed you see the last close.</div></div>)}
        </div>
      </aside>
    </div>
  );
}
