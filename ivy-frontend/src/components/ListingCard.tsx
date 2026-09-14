import Link from 'next/link';
import type { ListingRecord } from '@/lib/api';

function money(value?: number) {
  return typeof value === 'number' ? `₹${Math.abs(value).toLocaleString('en-IN')}` : 'Price on request';
}

export function ListingCard({ listing, saved, onSave }: { listing: ListingRecord; saved?: boolean; onSave?: () => void }) {
  return (
    <article className="border border-[var(--ink)]/15 bg-[var(--paper)] p-5 transition hover:-translate-y-1 hover:border-[var(--leaf)]">
      <div className="flex items-start justify-between gap-4"><span className="text-xs uppercase tracking-[.16em] text-[var(--coral)]">{listing.property_type ?? 'home'}</span>{onSave && <button aria-label={saved ? 'Remove saved listing' : 'Save listing'} onClick={onSave} className="text-xl">{saved ? '★' : '☆'}</button>}</div>
      <h2 className="mt-7 text-2xl"><Link href={`/listings/${encodeURIComponent(listing.listing_id)}`}>{listing.apartment_name ?? 'Untitled home'}</Link></h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{listing.locality ?? 'Bengaluru'} · {listing.bedroom ?? '—'} BHK · {listing.carpet_area ?? '—'} sq ft</p>
      <div className="mt-7 flex items-end justify-between"><p className="text-xl">{money(listing.price)}</p><span className="text-xs text-[var(--muted)]">{listing.is_live === false ? 'inactive' : 'live'}</span></div>
    </article>
  );
}
