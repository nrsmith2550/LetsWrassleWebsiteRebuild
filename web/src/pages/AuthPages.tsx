import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="mb-6 text-3xl">{title}</h1>
      <div className="card">{children}</div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as any)?.from || '/account/orders';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const u = await login(email, password);
      nav(u.role === 'ADMIN' && from === '/account/orders' ? '/admin' : from, { replace: true });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Log in">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-gray-600">New here? <Link to="/register" className="font-bold text-orange">Create an account</Link></p>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await register(f);
      nav('/account/orders', { replace: true });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Create account">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Full name</label><input className="input" required value={f.name} onChange={set('name')} autoComplete="name" /></div>
        <div><label className="label">Email</label><input className="input" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div><label className="label">Phone (optional)</label><input className="input" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
        <div><label className="label">Password (8+ characters)</label><input className="input" type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-center text-xs text-gray-500">Any past guest orders placed with this email will be linked to your account.</p>
        <p className="text-center text-sm text-gray-600">Already have an account? <Link to="/login" className="font-bold text-orange">Log in</Link></p>
      </form>
    </Shell>
  );
}
