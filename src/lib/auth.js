// Demo authentication. Accounts live only in this browser (localStorage). There is no server yet.
// Phase 2 replaces this with real backend auth (see backend/). Never reuse a real password here.
import { useSyncExternalStore } from 'react';
import { mutate } from './engine.js';

const SK = 'finora.auth', AK = 'finora.accounts', LK = 'finora.last';
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
let session = rd(SK, null);
const subs = new Set();
const set = (s) => { session = s; wr(SK, s); subs.forEach((f) => f()); };
export const getAuth = () => session;
export const useAuth = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), getAuth);

async function hashPw(pw, salt) {
  const data = new TextEncoder().encode(salt + ':' + pw);
  if (globalThis.crypto && crypto.subtle) { const d = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
  let h = 5381; for (const c of salt + pw) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + (h >>> 0).toString(16);
}
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export function validateSignup({ name, email, phone, password }) {
  name = name.trim(); email = email.trim().toLowerCase();
  if (name.length < 2) return { ok: false, msg: 'Enter your full name.' };
  if (!okEmail(email)) return { ok: false, msg: 'Enter a valid email address.' };
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return { ok: false, msg: 'Enter a 10 digit Indian mobile number, or leave it blank.' };
  if (password.length < 8) return { ok: false, msg: 'Password must be at least 8 characters.' };
  const acc = rd(AK, {});
  if (acc[email]) return { ok: false, msg: 'An account with this email already exists. Please log in.' };
  return { ok: true };
}
export async function signup({ name, email, phone, password, emailVerified = false, phoneVerified = false }) {
  const v = validateSignup({ name, email, phone, password }); if (!v.ok) return v;
  name = name.trim(); email = email.trim().toLowerCase();
  const acc = rd(AK, {});
  const salt = Math.random().toString(36).slice(2);
  acc[email] = { name, phone: phone || '', emailVerified, phoneVerified: !!phone && phoneVerified, salt, hash: await hashPw(password, salt), ts: Date.now() }; wr(AK, acc);
  set({ name, email, ts: Date.now(), emailVerified, phoneVerified: !!phone && phoneVerified }); mutate((s) => { s.name = name.split(' ')[0]; });
  return { ok: true };
}
export async function login(email, password) {
  email = email.trim().toLowerCase();
  const a = rd(AK, {})[email];
  if (!a || (await hashPw(password, a.salt)) !== a.hash) return { ok: false, msg: 'Email or password is incorrect.' };
  set({ name: a.name, email, ts: Date.now(), emailVerified: !!a.emailVerified, phoneVerified: !!a.phoneVerified }); mutate((s) => { s.name = a.name.split(' ')[0]; });
  return { ok: true };
}
export function logout() { set(null); }
export const saveLast = (p) => { try { sessionStorage.setItem(LK, p); localStorage.setItem(LK, p); } catch (e) { /* ignore */ } };
export const lastPage = () => { try { return localStorage.getItem(LK) || '/'; } catch (e) { return '/'; } };
