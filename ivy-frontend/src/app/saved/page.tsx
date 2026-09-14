'use client';

import { useEffect, useState } from 'react';
import { ListingCard } from '@/components/ListingCard';
import { SiteHeader } from '@/components/SiteHeader';
import { listListings, type ListingRecord } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SavedPage() {
  const { email, ready, loggedIn } = useAuth();
  const [rows, setRows] = useState<ListingRecord[]>([]);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!email) return;
    const savedIds = JSON.parse(localStorage.getItem(`ivy.saved.${email}`) ?? '[]') as string[];
    setIds(savedIds);
    listListings().then(items => {
      setRows((items as ListingRecord[]).filter(item => savedIds.includes(item.listing_id)));
    });
  }, [email]);
  function remove(id: string) { const next = ids.filter(item => item !== id); setIds(next); setRows(rows.filter(item => item.listing_id !== id)); if (email) localStorage.setItem(`ivy.saved.${email}`, JSON.stringify(next)); }
  if (!ready || !loggedIn) return <main className="min-h-screen"><SiteHeader /><p className="mx-auto max-w-7xl px-6 py-20">Sign in to see saved listings.</p></main>;
  return <main className="min-h-screen"><SiteHeader /><section className="mx-auto max-w-7xl px-6 py-10 lg:px-10"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">Your shortlist</p><h1 className="mt-2 text-5xl">Saved listings.</h1><p className="mt-4 text-sm text-[var(--muted)]">Saved on this device for {email}. The API favourites endpoints returned 404, so this is intentionally client-side.</p><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rows.map(item => <ListingCard key={item.listing_id} listing={item} saved onSave={() => remove(item.listing_id)} />)}</div>{!rows.length && <p className="mt-12 text-[var(--muted)]">Nothing saved yet.</p>}</section></main>;
}
