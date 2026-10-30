'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { getAccountClient, accountReturnPath } from '@/lib/auth/browser';
import styles from './sign-in.module.css';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'recover' | 'password'>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  useEffect(() => {
    const client = getAccountClient(); if (!client) return;
    const reset = new URLSearchParams(location.search).get('reset') === '1'; if (reset) setMode('password');
    const { data: subscription } = client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') setMode('password'); });
    return () => subscription.subscription.unsubscribe();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); const client = getAccountClient();
    if (!client) { setError('Account sign-in is not configured yet. The local editor is still available.'); return; }
    setBusy(true);
    try {
      if (mode === 'recover') { const result = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/login?reset=1` }); if (result.error) throw result.error; setNotice('If an account exists, you’ll receive a password reset link.'); return; }
      if (mode === 'password') { const result = await client.auth.updateUser({ password }); if (result.error) throw result.error; setNotice('Password updated. You can continue to your workspace.'); return; }
      if (mode === 'signup') { const result = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}/login` } }); if (result.error) throw result.error; if (!result.data.session) { setNotice('Check your email to confirm your account, then sign in.'); return; } }
      else { const result = await client.auth.signInWithPassword({ email: email.trim(), password }); if (result.error) throw result.error; }
      location.assign(accountReturnPath(new URLSearchParams(location.search).get('next')));
    } catch { setError(mode === 'login' ? 'Could not sign in. Check your email and password, then try again.' : 'Could not complete that request. Please try again.'); }
    finally { setBusy(false); }
  }
  const changeMode = (next: typeof mode) => { setMode(next); setNotice(''); setError(''); setPassword(''); };
  return <main className={styles.page}><section className={styles.card} aria-labelledby="sign-in-title">
    <Link className={styles.brand} href="/">SlightNudge</Link>
    <h1 id="sign-in-title">{mode === 'signup' ? 'Create your account' : mode === 'recover' ? 'Reset your password' : mode === 'password' ? 'Choose a new password' : 'Welcome back'}</h1>
    <p>{mode === 'recover' ? 'We’ll send a link to your email.' : 'A quiet place to make your next change.'}</p>
    {!configured && <div className={styles.notice} role="status">Account sign-in awaits service setup. You can use the <Link href="/studio/window">local editor</Link> now.</div>}
    <form onSubmit={submit}>
      {mode !== 'password' && <label>Email<input type="email" required autoComplete="email" value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label>}
      {mode !== 'recover' && <label>Password<input type="password" required minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label>}
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
      <button className={styles.primary} disabled={busy || !configured}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'recover' ? 'Send reset link' : mode === 'password' ? 'Update password' : 'Sign in'}</button>
    </form>
    <div className={styles.actions}><button type="button" disabled={busy} onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Back to sign in'}</button>{mode === 'login' && <button type="button" disabled={busy} onClick={() => changeMode('recover')}>Forgot password?</button>}{mode === 'password' && notice && <Link href="/workspace">Continue to workspace</Link>}</div>
  </section></main>;
}
