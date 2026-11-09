export const fmt = (n, d = 2) => Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const inr = (n) => (n < 0 ? '−' : '') + '₹' + fmt(Math.abs(n));
export const sg = (n) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
export const pc = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
export const cl = (n) => (n >= 0 ? 'up' : 'dn');
export const arrow = (n) => (n >= 0 ? '▲' : '▼');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const cr = (n) => (Math.abs(n) >= 1e7 ? fmt(n / 1e7) + ' Cr' : Math.abs(n) >= 1e5 ? fmt(n / 1e5) + ' L' : fmt(n, 0));
export const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const dlab = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
export const dfull = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const tm = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const dt = (t) => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const dayNum = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 864e5);

export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const gauss = (r) => {
  let u = 0, v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export function downloadFile(name, text, type = 'text/csv') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCSV(rows) {
  return rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
}
