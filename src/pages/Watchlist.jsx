import { useState } from 'react';
import { FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { useLive, getS, setWatch, activeList } from '../lib/engine.js';
import { M, META } from '../lib/market.js';
import { fmt, sg, cl } from '../lib/util.js';
import { go } from '../lib/router.jsx';
import { Card, Table, TB, Chg, SymbolPicker, Empty } from '../components/ui.jsx';

export default function Watchlist() {
  useLive();
  const S = getS(), names = Object.keys(S.wls), list = activeList().filter((s) => M[s]);
  const [nn, setNn] = useState('');
  const [sort, setSort] = useState('');
  const rows = [...list];
  if (sort === 'chg') rows.sort((a, b) => (M[b].ltp / M[b].prev) - (M[a].ltp / M[a].prev));
  if (sort === 'name') rows.sort();
  return (
    <div className="page">
      <div className="row wrap">
        {names.map((n) => <button key={n} className="pill" aria-pressed={S.wl === n} onClick={() => setWatch((s) => { s.wl = n; })}>{n}</button>)}
        {names.length < 6 && <form className="row" onSubmit={(e) => { e.preventDefault(); const v = nn.trim(); if (v && !S.wls[v]) setWatch((s) => { s.wls[v] = []; s.wl = v; }); setNn(''); }}>
          <input className="mini" placeholder="New list name" aria-label="New list name" value={nn} onChange={(e) => setNn(e.target.value)} /><button className="btn sm" aria-label="Create list"><FiPlus /> Add list</button></form>}
      </div>
      <Card title={S.wl} actions={<>
        <select className="mini" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="">Added order</option><option value="chg">Top movers</option><option value="name">Name</option></select>
        {names.length > 1 && <button className="btn sm" onClick={() => setWatch((s) => { delete s.wls[s.wl]; s.wl = Object.keys(s.wls)[0]; })}><FiTrash2 /> Delete list</button>}</>}>
        <div style={{ maxWidth: 360, marginBottom: 12 }}><SymbolPicker placeholder="Add a symbol to this list" onPick={(id) => setWatch((s) => { const l = s.wls[s.wl]; if (!l.includes(id)) l.push(id); })} /></div>
        <Table rows={rows} rowKey={(r) => r} onRow={(r) => go('/stock/' + r)} empty="This list is empty. Search above to add symbols."
          cols={[{ h: 'Symbol', l: 1, render: (r) => <><b>{r}</b><div className="mut sm">{META.get(r).name}</div></> }, { h: 'LTP', render: (r) => fmt(M[r].ltp) }, { h: 'Chg', render: (r) => <span className={'mono ' + cl(M[r].ltp - M[r].prev)}>{sg(M[r].ltp - M[r].prev)}</span> }, { h: '% Chg', render: (r) => <Chg id={r} /> }, { h: 'High', render: (r) => fmt(M[r].hi) }, { h: 'Low', render: (r) => fmt(M[r].lo) },
            { h: '', render: (r) => <span className="row nowrap"><TB id={r} /><button className="iconbtn sm" aria-label={'Remove ' + r} onClick={(e) => { e.stopPropagation(); setWatch((s) => { s.wls[s.wl] = s.wls[s.wl].filter((x) => x !== r); }); }}><FiX /></button></span> }]} />
      </Card>
    </div>
  );
}
