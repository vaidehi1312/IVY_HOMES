'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingCard } from '@/components/ListingCard';
import { SiteHeader } from '@/components/SiteHeader';
import { listListings, type ListingRecord } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 24;
function savedKey(email: string | null) { return email ? `ivy.saved.${email}` : 'ivy.saved.guest'; }

export default function ListingsPage() {
  const router = useRouter(); const { email, ready, loggedIn } = useAuth();
  const [all, setAll] = useState<ListingRecord[]>([]); const [saved, setSaved] = useState<string[]>([]); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [locality, setLocality] = useState(''); const [bedroom, setBedroom] = useState(''); const [minPrice, setMinPrice] = useState(''); const [maxPrice, setMaxPrice] = useState(''); const [furnishing, setFurnishing] = useState('');

  useEffect(() => { if (ready && !loggedIn) router.replace('/login'); }, [ready, loggedIn, router]);
  useEffect(() => { if (!email) return; setSaved(JSON.parse(localStorage.getItem(savedKey(email)) ?? '[]')); }, [email]);
  useEffect(() => { if (!loggedIn) return; listListings().then(rows => setAll(rows as ListingRecord[])).catch(err => setError(String(err))).finally(() => setLoading(false)); }, [loggedIn]);

  const filtered = useMemo(() => all.filter(item => {
    const localityMatch = !locality || String(item.locality ?? '').toLowerCase().includes(locality.toLowerCase());
    const bedroomMatch = !bedroom || item.bedroom === Number(bedroom);
    const minMatch = !minPrice || (item.price ?? 0) >= Number(minPrice);
    const maxMatch = !maxPrice || (item.price ?? 0) <= Number(maxPrice);
    const furnishingMatch = !furnishing || item.furnishing === furnishing;
    return localityMatch && bedroomMatch && minMatch && maxMatch && furnishingMatch;
  }), [all, locality, bedroom, minPrice, maxPrice, furnishing]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function toggleSave(id: string) { const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]; setSaved(next); if (email) localStorage.setItem(savedKey(email), JSON.stringify(next)); }
  function resetFilters() { setLocality(''); setBedroom(''); setMinPrice(''); setMaxPrice(''); setFurnishing(''); setPage(1); }

  if (!ready || !loggedIn) return <main className="min-h-screen"><SiteHeader /><p className="mx-auto max-w-7xl px-6 py-20">Redirecting to sign in…</p></main>;
  return <main className="min-h-screen"><SiteHeader /><section className="mx-auto max-w-7xl px-6 py-10 lg:px-10"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">Homes for sale</p><h1 className="mt-2 text-5xl">The live register.</h1></div><p className="text-sm text-[var(--muted)]">{filtered.length.toLocaleString('en-IN')} matches · saved locally per account</p></div><div className="mt-9 grid gap-3 border-y border-[var(--ink)]/15 py-5 md:grid-cols-5"><input placeholder="Locality" value={locality} onChange={e => {setLocality(e.target.value);setPage(1)}} className="border border-[var(--ink)]/15 bg-transparent px-3 py-2" /><select value={bedroom} onChange={e => {setBedroom(e.target.value);setPage(1)}} className="border border-[var(--ink)]/15 bg-transparent px-3 py-2"><option value="">Bedrooms</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} BHK</option>)}</select><input type="number" placeholder="Min price" value={minPrice} onChange={e => {setMinPrice(e.target.value);setPage(1)}} className="border border-[var(--ink)]/15 bg-transparent px-3 py-2" /><input type="number" placeholder="Max price" value={maxPrice} onChange={e => {setMaxPrice(e.target.value);setPage(1)}} className="border border-[var(--ink)]/15 bg-transparent px-3 py-2" /><select value={furnishing} onChange={e => {setFurnishing(e.target.value);setPage(1)}} className="border border-[var(--ink)]/15 bg-transparent px-3 py-2"><option value="">Furnishing</option><option>unfurnished</option><option>semi-furnished</option><option>fully-furnished</option></select></div><div className="mt-4 flex justify-end"><button onClick={resetFilters} className="text-sm text-[var(--muted)] underline">Clear filters</button></div>{loading && <p className="py-12">Loading the corrected offset collection…</p>}{error && <p className="py-12 text-[var(--coral)]">{error}</p>} {!loading && !error && <><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visible.map(item => <ListingCard key={item.listing_id} listing={item} saved={saved.includes(item.listing_id)} onSave={() => toggleSave(item.listing_id)} />)}</div><div className="mt-8 flex items-center justify-between border-t border-[var(--ink)]/15 pt-5 text-sm"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="disabled:opacity-30">← Previous</button><span>Page {page} / {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}</span><button disabled={page * PAGE_SIZE >= filtered.length} onClick={() => setPage(page + 1)} className="disabled:opacity-30">Next →</button></div></>}</section></main>;
}
