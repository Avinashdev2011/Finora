import { useEffect, useState } from 'react';
import { Link, go } from '../lib/router.jsx';
import { signup, login, lastPage, validateSignup } from '../lib/auth.js';
import { verifyEnabled, sendOtp, checkOtp } from '../lib/verify.js';
import { Logo, MiniChart } from '../components/Site.jsx';
import { FiEye, FiEyeOff, FiArrowRight, FiCheck } from 'react-icons/fi';

/* One code box: sends a code on mount, verifies it, and supports resend after a short wait. */
function OtpBox({ channel, target, label, onVerified }) {
  const [code, setCode] = useState(''), [msg, setMsg] = useState(''), [wait, setWait] = useState(0), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [sent, setSent] = useState('');
  const send = async () => { setMsg(''); setBusy(true); const r = await sendOtp(channel, target); setBusy(false); if (r.ok) { setSent(r.sentTo); setWait(r.resendIn || 30); setCode(''); } else { setMsg(r.error || 'Could not send the code.'); if (r.retryIn) setWait(r.retryIn); } };
  useEffect(() => { send(); }, []); // eslint-disable-line
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const check = async () => { setMsg(''); setBusy(true); const r = await checkOtp(channel, target, code); setBusy(false); if (r.ok) { setDone(true); onVerified(r.token); } else { setMsg(r.error || 'Could not verify.'); if (r.expired) setCode(''); } };
  if (done) return <div className="otp ok"><FiCheck /> {label} verified</div>;
  return (
    <div className="otp">
      <div className="mut sm">{sent ? `We sent a 6 digit code to ${sent}.` : `Sending a code to your ${label.toLowerCase()}`}</div>
      <div className="row"><input className="mono grow" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label={label + ' code'} placeholder="6 digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><button type="button" className="btn pri" disabled={busy || code.length !== 6} onClick={check}>Verify</button></div>
      <button type="button" className="lnkbtn" disabled={busy || wait > 0} onClick={send}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</button>
      {msg && <div className="err" role="alert">{msg}</div>}
    </div>
  );
}

export default function Auth({ mode }) {
  const isUp = mode === 'signup';
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' }), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [agree, setAgree] = useState(false), [step, setStep] = useState('form'), [ev, setEv] = useState(false), [pv, setPv] = useState(false), [help, setHelp] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const next = () => { const p = new URLSearchParams(location.hash.split('?')[1] || '').get('next'); go(p || lastPage()); };
  const finish = async () => { setBusy(true); const r = await signup({ ...f, emailVerified: ev, phoneVerified: pv }); setBusy(false); r.ok ? next() : (setErr(r.msg), setStep('form')); };
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (isUp) {
      if (!agree) return setErr('Please accept the terms and the risk disclosure.');
      const v = validateSignup(f); if (!v.ok) return setErr(v.msg);
      if (verifyEnabled()) { setEv(false); setPv(false); return setStep('verify'); }
      return finish();
    }
    setBusy(true); const r = await login(f.email, f.password); setBusy(false);
    r.ok ? next() : setErr(r.msg);
  };
  return (
    <div className="authwrap">
      <aside className="authart" aria-hidden="true">
        <div className="aurora"><i /><i /><i /></div>
        <Link to="/welcome" className="brand"><Logo /><span className="bname">FINORA</span></Link>
        <div className="aq"><h2>Trade beyond limits.</h2><p>₹10,00,000 of virtual capital. Real terminal. Zero risk.</p></div>
        <div className="dframe"><MiniChart id="BANKNIFTY" n={44} /></div>
      </aside>
      <main className="authform">
        {isUp && step === 'verify' ? (
          <div className="aform">
            <Link to="/welcome" className="brand mobbrand"><Logo /><span className="bname">FINORA</span></Link>
            <h1>Verify your details</h1>
            <p className="mut">Enter the codes we sent so we know these are really yours.</p>
            <div className="field"><span>Email · {f.email}</span><OtpBox channel="email" target={f.email} label="Email" onVerified={() => setEv(true)} /></div>
            {f.phone && <div className="field"><span>Mobile · +91 {f.phone}</span><OtpBox channel="phone" target={f.phone} label="Mobile" onVerified={() => setPv(true)} /></div>}
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn pri big" disabled={busy || !ev || (!!f.phone && !pv)} onClick={finish}>{busy ? 'Please wait' : 'Create account'} {!busy && <FiArrowRight />}</button>
            <button type="button" className="lnkbtn" onClick={() => setStep('form')}>Back to details</button>
          </div>
        ) : (
        <form onSubmit={submit} noValidate className="aform">
          <Link to="/welcome" className="brand mobbrand"><Logo /><span className="bname">FINORA</span></Link>
          <h1>{isUp ? 'Open your free account' : 'Welcome back'}</h1>
          <p className="mut">{isUp ? 'Start practising with virtual money. No bank or KYC needed.' : 'Log in to continue where you left off.'}</p>
          {isUp && <label className="field"><span>Full name</span><input autoComplete="name" value={f.name} onChange={set('name')} /></label>}
          <label className="field"><span>Email</span><input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} /></label>
          {isUp && <label className="field"><span>Mobile (optional, verified by SMS)</span><input inputMode="numeric" autoComplete="tel-national" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></label>}
          <label className="field"><span>Password</span><div className="pw"><input type={show ? 'text' : 'password'} autoComplete={isUp ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} /><button type="button" className="iconbtn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <FiEyeOff /> : <FiEye />}</button></div>{isUp && <small>At least 8 characters.</small>}</label>
          {isUp && <label className="chk"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>I agree to the <Link to="/legal/terms">Terms</Link> and understand FINORA is a practice platform with <Link to="/legal/risk">risk disclosure</Link>.</span></label>}
          {!isUp && <button type="button" className="lnkbtn" onClick={() => setHelp(!help)}>Forgot password?</button>}
          {help && <div className="note">Phase 1 accounts live only in this browser, so there is no email reset. Create a new account with a different email.</div>}
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn pri big shimmer" disabled={busy}>{busy ? 'Please wait' : isUp ? 'Create account' : 'Log in'} {!busy && <FiArrowRight />}</button>
          <p className="mut sm center">{isUp ? <>Already registered? <Link to="/login">Log in</Link></> : <>New to FINORA? <Link to="/signup">Open a free account</Link></>}</p>
          <p className="mut sm center">Practice accounts are stored only in this browser. Do not reuse a real password.</p>
        </form>
        )}
      </main>
    </div>
  );
}
