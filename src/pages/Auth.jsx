import { useState } from 'react';
import { Link, go } from '../lib/router.jsx';
import { signup, login, guestLogin, lastPage } from '../lib/auth.js';
import { Logo, MiniChart } from '../components/Site.jsx';
import { FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

export default function Auth({ mode }) {
  const isUp = mode === 'signup';
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' }), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [agree, setAgree] = useState(false), [help, setHelp] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const next = () => { const p = new URLSearchParams(location.hash.split('?')[1] || '').get('next'); go(p || lastPage()); };
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (isUp && !agree) return setErr('Please accept the terms and the risk disclosure.');
    setBusy(true); const r = isUp ? await signup(f) : await login(f.email, f.password); setBusy(false);
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
        <form onSubmit={submit} noValidate className="aform">
          <Link to="/welcome" className="brand mobbrand"><Logo /><span className="bname">FINORA</span></Link>
          <h1>{isUp ? 'Open your free account' : 'Welcome back'}</h1>
          <p className="mut">{isUp ? 'Start practising with virtual money. No bank or KYC needed.' : 'Log in to continue where you left off.'}</p>
          {isUp && <label className="field"><span>Full name</span><input autoComplete="name" value={f.name} onChange={set('name')} /></label>}
          <label className="field"><span>Email</span><input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} /></label>
          {isUp && <label className="field"><span>Mobile (optional)</span><input inputMode="numeric" autoComplete="tel-national" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></label>}
          <label className="field"><span>Password</span><div className="pw"><input type={show ? 'text' : 'password'} autoComplete={isUp ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} /><button type="button" className="iconbtn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <FiEyeOff /> : <FiEye />}</button></div>{isUp && <small>At least 8 characters.</small>}</label>
          {isUp && <label className="chk"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>I agree to the <Link to="/legal/terms">Terms</Link> and understand FINORA is a simulator with <Link to="/legal/risk">risk disclosure</Link>.</span></label>}
          {!isUp && <button type="button" className="lnkbtn" onClick={() => setHelp(!help)}>Forgot password?</button>}
          {help && <div className="note">Phase 1 accounts live only in this browser, so there is no email reset. Create a new account or use the guest demo below.</div>}
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn pri big shimmer" disabled={busy}>{busy ? 'Please wait' : isUp ? 'Create account' : 'Log in'} {!busy && <FiArrowRight />}</button>
          <div className="or"><span>or</span></div>
          <button type="button" className="btn big" onClick={() => { guestLogin(); next(); }}>Continue as guest (demo)</button>
          <p className="mut sm center">{isUp ? <>Already registered? <Link to="/login">Log in</Link></> : <>New to FINORA? <Link to="/signup">Open a free account</Link></>}</p>
          <p className="mut sm center">Demo accounts are stored only in this browser. Do not reuse a real password.</p>
        </form>
      </main>
    </div>
  );
}
