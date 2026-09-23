import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { resetPassword, signUpCustomer } from '../../services/firebase/auth';

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const from = new URLSearchParams(location.search).get('from') || '/portal';

  useEffect(() => {
    if (auth?.user && !auth.loading) {
      navigate(auth.roles?.includes('customer') ? '/customer' : from, { replace: true });
    }
  }, [auth?.user, auth?.loading, auth?.roles, from, navigate]);

  if (auth?.loading) return <div className="portal-loading"><div className="portal-spinner" /><p>Checking secure session…</p></div>;
  if (auth?.user) return <Navigate to={auth.roles?.includes('customer') ? '/customer' : from} replace />;

  const submit = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      if (mode === 'register') {
        if (!name.trim() || !phone.trim()) throw new Error('Full name and mobile number are required for a customer account.');
        if (password.length < 6) throw new Error('Password must contain at least 6 characters.');
        await signUpCustomer({ email, password, name, company, phone });
        navigate('/customer', { replace: true });
      } else {
        await auth.login(email, password);
        navigate(from, { replace: true });
      }
    } catch (submitError) {
      const code = submitError?.code;
      setError(code === 'auth/email-already-in-use' ? 'An account already exists for this email. Sign in instead.' : code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'Incorrect email or password.' : submitError?.message || 'Authentication failed.');
    } finally { setSubmitting(false); }
  };

  const forgotPassword = async () => {
    setError('');
    if (!email.trim()) return setError('Enter your email address first.');
    try { await resetPassword(email); setError('Password reset instructions have been sent to your email.'); }
    catch (resetError) { setError(resetError.message || 'Unable to send password reset instructions.'); }
  };

  return <div className="portal-login"><div className="portal-login-card"><img src="/logo.png" alt="Cyber I.T Masters" className="portal-login-logo" /><p className="portal-login-eyebrow">CITM SERVICE DESK</p><h1>{mode === 'login' ? 'Sign in' : 'Create customer account'}</h1><p>{mode === 'login' ? 'Use your Cyber I.T Masters account to access the secure workspace.' : 'Create an account to submit and track service requests.'}</p><div className="portal-auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Customer account</button></div><form onSubmit={submit}>{mode === 'register' && <><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label><label>Company<input value={company} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" /></label><label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label></>}<label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>{error && <div className="portal-error" role="alert">{error}</div>}<button className="portal-button" type="submit" disabled={submitting}>{submitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create customer account'}</button></form>{mode === 'login' && <button type="button" className="portal-text-button" onClick={forgotPassword}>Forgot password?</button>}<div className="portal-login-help"><strong>Service sign-off links are separate.</strong><span>Customers do not need a portal session to use a valid secure one-time sign-off link.</span></div></div></div>;
}
