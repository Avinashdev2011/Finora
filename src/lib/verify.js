// Client for the FINORA verification backend (backend/server.js). Optional: when no API address is set,
// signup still works but email and mobile stay unverified.
const base = () => { try { return (localStorage.getItem('finora.api') || (window.FINORA_FEED && window.FINORA_FEED.api) || '').replace(/\/+$/, ''); } catch (e) { return ''; } };
export const verifyEnabled = () => !!base();
async function call(path, body) {
  try {
    const r = await fetch(base() + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
    return await r.json();
  } catch (e) { return { ok: false, error: 'Could not reach the verification server. Check your connection and try again.' }; }
}
export const sendOtp = (channel, target) => call('/api/otp/send', { channel, target });
export const checkOtp = (channel, target, code) => call('/api/otp/verify', { channel, target, code });
