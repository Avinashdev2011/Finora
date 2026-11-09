import { useSyncExternalStore } from 'react';

let st = { ticket: null, palette: false, more: false, gtt: null, notifs: false };
const subs = new Set();
export const getUI = () => st;
export function setUI(p) { st = { ...st, ...p }; subs.forEach((f) => f()); }
export const useUI = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => st);
export const openTicket = (iid, side = 'BUY') => setUI({ ticket: { iid, side, n: Math.random() } });
export const openGTT = (iid, side = 'SELL') => setUI({ gtt: { iid, side }, ticket: null });
