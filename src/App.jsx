import { Component, useEffect } from 'react';
import Shell from './components/Shell.jsx';
import { useRoute, go } from './lib/router.jsx';
import { useAuth, saveLast, lastPage } from './lib/auth.js';
import { SiteLayout } from './components/Site.jsx';
import { Landing, Products, Pricing, About, Support, Platforms, Legal } from './pages/Site.jsx';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Markets from './pages/Markets.jsx';
import Watchlist from './pages/Watchlist.jsx';
import Charts from './pages/Charts.jsx';
import Stock from './pages/Stock.jsx';
import Currency from './pages/Currency.jsx';
import MutualFunds from './pages/MutualFunds.jsx';
import Orders from './pages/Orders.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Funds from './pages/Funds.jsx';
import Reports from './pages/Reports.jsx';
import Scanner from './pages/Scanner.jsx';
import Alerts from './pages/Alerts.jsx';
import Learn from './pages/Learn.jsx';
import Tools from './pages/Tools.jsx';
import Settings from './pages/Settings.jsx';

const ROUTES = {
  '/': ['Home', Home], '/markets': ['Markets', Markets], '/watchlist': ['Watchlists', Watchlist], '/charts': ['Charts', Charts, true],
  '/currency': ['Currency', Currency],
  '/mutual-funds': ['Mutual funds', MutualFunds], '/orders': ['Orders', Orders], '/portfolio': ['Portfolio', Portfolio], '/funds': ['Funds', Funds],
  '/reports': ['Reports', Reports], '/scanner': ['Scanner', Scanner], '/alerts': ['Alerts', Alerts], '/learn': ['Learn', Learn], '/tools': ['Tools', Tools], '/settings': ['Settings', Settings],
};

class Boundary extends Component {
  state = { e: null };
  static getDerivedStateFromError(e) { return { e }; }
  componentDidUpdate(p) { if (p.k !== this.props.k && this.state.e) this.setState({ e: null }); }
  render() {
    return this.state.e ? <div className="page"><div className="card"><h2>Something went wrong on this page</h2><p className="mut">{String(this.state.e.message || this.state.e)}</p><button className="btn pri" onClick={() => { location.hash = '/'; this.setState({ e: null }); }}>Back to home</button></div></div> : this.props.children;
  }
}

const PUBLIC = { '/welcome': Landing, '/products': Products, '/pricing': Pricing, '/about': About, '/support': Support, '/platforms': Platforms };

export default function App() {
  const { path, parts } = useRoute(), user = useAuth();
  const isStock = parts[0] === 'stock' && parts[1], appRoute = !!ROUTES[path] || isStock;
  const toLogin = !user && appRoute && path !== '/', toApp = user && (path === '/login' || path === '/signup');
  useEffect(() => {
    const cur = (location.hash.slice(1) || '/').split('?')[0];
    if (toLogin) { if (cur === path) go('/login?next=' + encodeURIComponent(path)); }
    else if (toApp) go(lastPage());
    else if (user && appRoute) saveLast(path);
  }, [toLogin, toApp, user, appRoute, path]);
  useEffect(() => { document.title = (user && appRoute ? '' : '') + 'FINORA · Trade Beyond Limits'; }, [user, appRoute]);
  if (toLogin || toApp) return null;
  if (path === '/login' || path === '/signup') return <Auth mode={path.slice(1)} />;
  if (!user && path === '/') return <SiteLayout><Landing /></SiteLayout>;
  if (PUBLIC[path]) { const P = PUBLIC[path]; return <SiteLayout><P /></SiteLayout>; }
  if (parts[0] === 'legal') return <SiteLayout><Legal k={parts[1]} /></SiteLayout>;
  let title, Page, fill = false;
  if (isStock) { title = decodeURIComponent(parts[1]); Page = () => <Stock id={decodeURIComponent(parts[1])} />; }
  else if (ROUTES[path]) { [title, Page, fill] = ROUTES[path]; }
  else return <SiteLayout><div className="sec sw center"><h1>Page not found</h1><p className="mut">That page does not exist.</p><a className="btn pri" href="#/welcome">Go to the homepage</a></div></SiteLayout>;
  return <Shell title={title} fill={fill}><Boundary k={path}><Page /></Boundary></Shell>;
}
