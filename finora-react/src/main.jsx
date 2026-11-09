import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { startEngine, getS } from './lib/engine.js';
import { applyTheme } from './components/Shell.jsx';

applyTheme(getS().theme);
startEngine();
createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.hostname.includes('localhost:5173')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
