'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function SiteHeader() {
  const { ready, loggedIn, email, logout } = useAuth();
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Link href="/" className="text-xl font-bold tracking-tight">ivy / homes</Link>
      <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
        <Link href="/listings">Sale</Link><Link href="/rentals">Rent</Link><Link href="/projects">Projects</Link><Link href="/insights">Insights</Link>
        {ready && (loggedIn ? <button onClick={logout} title={email ?? undefined} className="rounded-full bg-[var(--ink)] px-4 py-2 text-white">Sign out</button> : <Link href="/login" className="rounded-full bg-[var(--ink)] px-4 py-2 text-white">Sign in</Link>)}
      </nav>
    </header>
  );
}
