// DEMO mutual funds. These are fictional funds with generated NAV histories, not real schemes.
import { mulberry, hash, gauss, dayNum } from './util.js';

export const FUNDS = [
  { id: 'D-LARGE', name: 'Demo Large Cap Fund', cat: 'Equity', sub: 'Large cap', risk: 'Very high', base: 100, mu: 0.12, sig: 0.15, exit: '1% if before 1 year' },
  { id: 'D-FLEXI', name: 'Demo Flexi Cap Fund', cat: 'Equity', sub: 'Flexi cap', risk: 'Very high', base: 80, mu: 0.14, sig: 0.17, exit: '1% if before 1 year' },
  { id: 'D-MID', name: 'Demo Mid Cap Fund', cat: 'Equity', sub: 'Mid cap', risk: 'Very high', base: 120, mu: 0.17, sig: 0.21, exit: '1% if before 1 year' },
  { id: 'D-SMALL', name: 'Demo Small Cap Fund', cat: 'Equity', sub: 'Small cap', risk: 'Very high', base: 60, mu: 0.19, sig: 0.26, exit: '1% if before 1 year' },
  { id: 'D-ELSS', name: 'Demo Tax Saver Fund', cat: 'Equity', sub: 'ELSS', risk: 'Very high', base: 90, mu: 0.14, sig: 0.17, exit: '3 year lock-in (not enforced in demo)' },
  { id: 'D-NIFTY', name: 'Demo Nifty 50 Index Fund', cat: 'Index', sub: 'Index', risk: 'Very high', base: 150, mu: 0.11, sig: 0.14, exit: 'Nil' },
  { id: 'D-HYBRID', name: 'Demo Balanced Advantage Fund', cat: 'Hybrid', sub: 'Balanced', risk: 'High', base: 40, mu: 0.095, sig: 0.08, exit: '1% if before 1 year' },
  { id: 'D-DEBT', name: 'Demo Short Duration Debt Fund', cat: 'Debt', sub: 'Short duration', risk: 'Moderate', base: 30, mu: 0.07, sig: 0.012, exit: 'Nil' },
  { id: 'D-LIQUID', name: 'Demo Liquid Fund', cat: 'Debt', sub: 'Liquid', risk: 'Low', base: 1000, mu: 0.062, sig: 0.002, exit: 'Nil' },
  { id: 'D-GOLD', name: 'Demo Gold Savings Fund', cat: 'Gold', sub: 'Gold', risk: 'High', base: 25, mu: 0.09, sig: 0.13, exit: '1% if before 15 days' },
];
export const FUND = Object.fromEntries(FUNDS.map((f) => [f.id, f]));

const ANCHOR = 19600, series = {};
function ensure(f, dn) {
  let s = series[f.id];
  const need = dn - ANCHOR + 1;
  if (!s) s = series[f.id] = { a: [f.base], r: mulberry(hash(f.id)) };
  while (s.a.length < need) {
    const prev = s.a[s.a.length - 1];
    s.a.push(prev * Math.exp(f.mu / 365 - (f.sig * f.sig) / 730 + (f.sig / Math.sqrt(365)) * gauss(s.r)));
  }
  return s.a;
}
export const navOn = (f, dn) => ensure(f, dn)[Math.max(0, dn - ANCHOR)];
export const navNow = (f) => navOn(f, dayNum());
export function navSeries(f, days) { const dn = dayNum(); return Array.from({ length: days + 1 }, (_, i) => navOn(f, dn - days + i)); }
export function returns(f, days) {
  const dn = dayNum(), a = navOn(f, dn), b = navOn(f, dn - days), r = a / b - 1;
  return days > 365 ? Math.pow(a / b, 365 / days) - 1 : r;
}
