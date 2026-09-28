'use client';

import type { MetaAdDto } from '../../../types/admin/metaAds';

type Props = { ads: MetaAdDto[]; count: number; onOpen: (index: number) => void };

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5';

function Placeholder({ n }: { n: number }) {
  return (
    <div className="flex aspect-[4/5] animate-pulse items-end rounded-xl border border-line bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-mono text-xs text-zinc-300 dark:text-zinc-600">{String(n).padStart(2, '0')}</span>
    </div>
  );
}

function AdCard({ ad, onOpen }: { ad: MetaAdDto; onOpen: () => void }) {
  if (ad.status === 'ready' && ad.finalUrl) {
    return (
      <button onClick={onOpen} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-line shadow-sm transition hover:shadow-md dark:border-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.finalUrl} alt={ad.headline} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </button>
    );
  }
  const failed = ad.status === 'failed';
  return (
    <button onClick={onOpen} className="relative flex aspect-[4/5] items-end rounded-xl border border-line bg-white p-3 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="absolute inset-0 flex items-center justify-center">
        {failed ? <span className="text-lg text-red-500">✕</span> : <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />}
      </span>
      <span className={['relative text-[10px] font-medium uppercase', failed ? 'text-red-500' : 'text-zinc-400'].join(' ')}>
        {failed ? 'Failed · tap for details' : `${ad.angle} · ${ad.status === 'compositing' ? 'adding text' : ad.status === 'imaging' ? 'painting' : 'queued'}`}
      </span>
    </button>
  );
}

export function AdGrid({ ads, count, onOpen }: Props) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold tracking-tight text-ink dark:text-zinc-100">Your ads</h3>
        {ads.some((a) => a.status === 'ready') && <p className="text-xs text-muted dark:text-zinc-400">Tap an ad for copy and downloads</p>}
      </div>
      <div className={GRID}>
        {ads.length === 0
          ? Array.from({ length: count }, (_, i) => <Placeholder key={i} n={i + 1} />)
          : ads.map((ad, i) => <AdCard key={ad.id} ad={ad} onOpen={() => onOpen(i)} />)}
      </div>
    </section>
  );
}
