import { useLive } from '../lib/engine.js';
import { UNIVERSE, M, chg, chgp } from '../lib/market.js';
import { fmt, sg, pc, cl } from '../lib/util.js';
import { go } from '../lib/router.jsx';
import { Card, Table, Chg, PriceMode, Spark } from '../components/ui.jsx';

export default function Currency() {
  useLive();
  const rows = UNIVERSE.filter((u) => u.seg === 'CUR' && M[u.id].ok);
  return (
    <div className="page">
      <div><h1>Currency</h1><div className="mut sm">Real exchange rates against the Indian rupee from a public delayed feed. Rates are for viewing and charting. They cannot be traded here.</div></div>
      <div className="grid g4">{rows.map((u) => (
        <Card key={u.id}><div className="mut">{u.name}</div><div className="mono xl">{fmt(M[u.id].ltp, 3)}</div><div className={'mono ' + cl(chg(u.id))}>{sg(chg(u.id))} ({pc(chgp(u.id))})</div><Spark id={u.id} /><PriceMode id={u.id} /></Card>))}</div>
      <Card flush><Table rows={rows} rowKey={(u) => u.id} onRow={(u) => go('/stock/' + u.id)} empty="Currency rates are not available right now."
        cols={[{ h: 'Pair', l: 1, render: (u) => <><b>{u.id}</b><div className="mut sm">{u.name}</div></> }, { h: 'Rate', render: (u) => fmt(M[u.id].ltp, 3) }, { h: 'Change', render: (u) => <span className={'mono ' + cl(chg(u.id))}>{sg(chg(u.id))}</span> }, { h: '% Change', render: (u) => <Chg id={u.id} /> }, { h: 'Day high', render: (u) => fmt(M[u.id].hi, 3) }, { h: 'Day low', render: (u) => fmt(M[u.id].lo, 3) }]} />
      </Card>
    </div>
  );
}
