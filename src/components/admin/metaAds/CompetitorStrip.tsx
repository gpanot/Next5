'use client';

import { useState } from 'react';
import type { CompetitorAd, CompetitorResearch } from '../../../types/admin/metaAds';

type Props = { research: CompetitorResearch | null; insights: string[]; loading: boolean; compact: boolean };

function Skeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-56 w-40 shrink-0 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
    </div>
  );
}

/** Once ads are done, the strip collapses to a "Inspired by" stack of thumbnails. Tapping it expands the strip again. */
function Compact({ research, onExpand }: { research: CompetitorResearch; onExpand: () => void }) {
  return (
    <button onClick={onExpand} aria-expanded={false} className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-1 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <div>
        <p className="text-[10px] font-bold tracking-wider text-muted uppercase">Inspired by</p>
        <p className="mt-0.5 text-sm leading-tight font-bold text-ink dark:text-zinc-100">{research.ads.length} winning Meta ads</p>
        <p className="text-[11px] text-muted">{research.brandCount} brands · up to {research.stats.maxDaysRunning} days live</p>
      </div>
      <div className="flex -space-x-2 overflow-hidden py-1">
        {research.ads.filter((ad) => ad.imageUrl).slice(0, 6).map((ad) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={ad.id} src={ad.imageUrl ?? ''} alt={ad.pageName} referrerPolicy="no-referrer" className="h-10 w-10 rounded-lg border-2 border-white object-cover shadow-sm dark:border-zinc-900" />
        ))}
      </div>
      <span className="ml-auto shrink-0 text-xs font-medium text-muted">Show ▾</span>
    </button>
  );
}

/** One competitor ad. Opens the ad in the Meta Ad Library so it can be checked at the source. */
function CompetitorCard({ ad }: { ad: CompetitorAd }) {
  return (
    <a href={ad.libraryUrl} target="_blank" rel="noreferrer" className="flex w-40 shrink-0 snap-start flex-col transition hover:-translate-y-0.5">
      <div className="relative mb-2 h-40 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {ad.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt={ad.pageName} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        )}
        <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white backdrop-blur">Running {ad.daysRunning}d</span>
      </div>
      <p className="truncate text-xs leading-tight font-bold text-ink dark:text-zinc-100">{ad.pageName}</p>
      <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">{ad.title || ad.body}</p>
      <p className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">View in Ad Library ↗</p>
    </a>
  );
}

export function CompetitorStrip({ research, insights, loading, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!research && !loading) return null;
  if (research && compact && !expanded) return <Compact research={research} onExpand={() => setExpanded(true)} />;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-ink dark:text-zinc-100">What&apos;s winning in your category</h3>
        {compact && (
          <button onClick={() => setExpanded(false)} aria-expanded className="min-h-10 shrink-0 px-2 text-xs font-medium text-muted transition hover:text-ink dark:hover:text-zinc-100">
            Hide ▴
          </button>
        )}
      </div>
      {!research ? (
        <Skeleton />
      ) : research.ads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted dark:border-zinc-800">No live competitor ads found.</p>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {research.ads.map((ad) => <CompetitorCard key={ad.id} ad={ad} />)}
        </div>
      )}
      {insights.length > 0 && (
        <ul className="grid gap-2 border-t border-line pt-3 text-xs text-muted md:grid-cols-3 dark:border-zinc-800">
          {insights.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
    </section>
  );
}
