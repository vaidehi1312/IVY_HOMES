'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { getListing, type ListingRecord } from '@/lib/api';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>(); const [listing, setListing] = useState<ListingRecord | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (params.id) getListing(params.id).then(item => setListing(item as ListingRecord)).catch(err => setError(String(err))); }, [params.id]);
  return <main className="min-h-screen"><SiteHeader /><section className="mx-auto max-w-5xl px-6 py-12 lg:px-10">{error && <p className="text-[var(--coral)]">{error}</p>}{!listing && !error && <p>Loading listing…</p>}{listing && <><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">{listing.property_type ?? 'Property'} · {listing.is_live === false ? 'inactive' : 'live'}</p><h1 className="mt-4 max-w-3xl text-6xl">{listing.apartment_name ?? 'Untitled home'}</h1><p className="mt-4 text-lg text-[var(--muted)]">{listing.locality} · {listing.bedroom} BHK · {listing.carpet_area} sq ft</p><div className="mt-12 grid gap-8 md:grid-cols-[1.2fr_.8fr]"><div className="border border-[var(--ink)]/15 bg-[var(--paper)] p-7"><h2 className="text-2xl">Seller notes</h2><p className="mt-5 leading-8 text-[var(--muted)]">{listing.description}</p></div><dl className="space-y-4 text-sm"><div><dt className="text-[var(--muted)]">Price</dt><dd className="text-2xl">₹{Math.abs(Number(listing.price ?? 0)).toLocaleString('en-IN')}</dd></div><div><dt className="text-[var(--muted)]">Furnishing</dt><dd>{listing.furnishing ?? '—'}</dd></div><div><dt className="text-[var(--muted)]">Floor</dt><dd>{String(listing.floor ?? '—')} / {String(listing.total_floors ?? '—')}</dd></div><div><dt className="text-[var(--muted)]">Verified</dt><dd>{listing.is_verified ? 'Yes' : 'No'}</dd></div></dl></div></>}</section></main>;
}
