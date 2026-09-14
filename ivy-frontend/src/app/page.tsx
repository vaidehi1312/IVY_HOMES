import Link from 'next/link';

const signals = [
  ['4,700', 'listing records'],
  ['3,722', 'currently live'],
  ['520', 'builder projects'],
  ['1,900', 'rental homes']
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="text-xl font-bold tracking-tight">ivy / homes</Link>
        <nav className="flex items-center gap-6 text-sm text-[var(--muted)]">
          <Link href="/listings">Browse</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/login" className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-white">Sign in</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:pt-20">
        <div className="reveal self-center">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-[var(--coral)]">Bengaluru, honestly</p>
          <h1 className="max-w-3xl text-6xl leading-[.95] tracking-[-0.04em] md:text-8xl">A clearer way to find your next address.</h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[var(--muted)]">Browse live sale listings, rentals, and projects with the API&apos;s real pagination and real units baked in.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/listings" className="rounded-full bg-[var(--leaf)] px-6 py-3 text-sm font-bold text-white">Explore listings</Link>
            <Link href="/insights" className="rounded-full border border-[var(--ink)]/20 px-6 py-3 text-sm font-bold">View market signals</Link>
          </div>
        </div>
        <div className="reveal relative min-h-[420px]" style={{ animationDelay: '120ms' }}>
          <div className="absolute inset-8 rotate-3 rounded-[2rem] bg-[var(--coral)]/80" />
          <div className="relative flex h-full min-h-[420px] flex-col justify-between rounded-[2rem] bg-[var(--leaf)] p-8 text-[var(--paper)] shadow-2xl">
            <div className="flex justify-between text-sm"><span>01 / 04</span><span>market view</span></div>
            <div><p className="text-5xl leading-none">Homes with<br /><em>receipts.</em></p><p className="mt-5 max-w-xs text-sm leading-6 text-white/70">Every number here comes from a paged, inspected API response.</p></div>
            <div className="flex justify-between border-t border-white/20 pt-4 text-xs uppercase tracking-[.18em] text-white/70"><span>Verified data</span><span>BLR / 2026</span></div>
          </div>
        </div>
      </section>

      <section id="insights" className="border-y border-[var(--ink)]/10 bg-[var(--paper)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-[var(--ink)]/10 md:grid-cols-4">
          {signals.map(([value, label]) => <div key={label} className="bg-[var(--paper)] px-6 py-8"><p className="text-4xl">{value}</p><p className="mt-2 text-sm text-[var(--muted)]">{label}</p></div>)}
        </div>
      </section>

      <section id="browse" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="flex flex-col justify-between gap-5 border-b border-[var(--ink)]/20 pb-6 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">Start here</p><h2 className="mt-3 text-4xl">Find the right kind of place.</h2></div><p className="max-w-sm text-sm leading-6 text-[var(--muted)]">Sale, rent, or a project still taking shape. The full browser follows this verified API layer.</p></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[['01', 'For sale', '4,700 records', '→', '/listings'], ['02', 'For rent', '1,900 homes', '→', '/rentals'], ['03', 'New projects', '520 developments', '→', '/projects']].map(([number, title, detail, arrow, href]) => <Link key={title} href={href} className="group border border-[var(--ink)]/15 bg-[var(--paper)] p-6 transition hover:-translate-y-1 hover:border-[var(--leaf)]"><div className="flex justify-between text-xs text-[var(--muted)]"><span>{number}</span><span>{arrow}</span></div><h3 className="mt-16 text-3xl">{title}</h3><p className="mt-2 text-sm text-[var(--muted)]">{detail}</p></Link>)}
        </div>
      </section>
    </main>
  );
}
