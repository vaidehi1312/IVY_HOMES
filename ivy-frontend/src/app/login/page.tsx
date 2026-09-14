'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('demo1@ivy.homes');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(email, password); router.push('/listings'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen"><SiteHeader /><section className="mx-auto max-w-xl px-6 py-20"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">Private view</p><h1 className="mt-3 text-5xl">Welcome back.</h1><form onSubmit={submit} className="mt-10 space-y-5 border border-[var(--ink)]/15 bg-[var(--paper)] p-7"><label className="block text-sm">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block w-full border border-[var(--ink)]/20 bg-transparent px-3 py-3" /></label><label className="block text-sm">Password<input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block w-full border border-[var(--ink)]/20 bg-transparent px-3 py-3" /></label>{error && <p className="text-sm text-[var(--coral)]">{error}</p>}<button disabled={busy} className="w-full rounded-full bg-[var(--leaf)] px-5 py-3 font-bold text-white">{busy ? 'Signing in…' : 'Sign in'}</button></form></section></main>;
}
