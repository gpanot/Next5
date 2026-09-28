'use client';

import type { MetaAdDto } from '../../../types/admin/metaAds';

type Props = { ad: MetaAdDto; brandName: string; domain: string };

/** The ad as it shows in a Facebook / Instagram feed. */
export function FeedPreview({ ad, brandName, domain }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">{brandName.charAt(0)}</span>
        <div className="leading-tight">
          <p className="text-xs font-bold text-ink dark:text-zinc-100">{brandName}</p>
          <p className="text-[10px] text-muted">Sponsored</p>
        </div>
      </div>
      <p className="px-3 pb-3 text-xs leading-relaxed text-ink dark:text-zinc-200">{ad.primaryText}</p>
      <div className="relative aspect-[4/5] bg-zinc-100 dark:bg-zinc-800">
        {(ad.status === 'imaging' || ad.status === 'compositing') && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/70 text-xs font-medium text-ink backdrop-blur-sm dark:bg-zinc-900/70 dark:text-zinc-100">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
            {ad.status === 'imaging' ? 'Painting a new image…' : 'Placing the text…'}
          </div>
        )}
        {ad.finalUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.finalUrl} alt={ad.headline} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">{ad.error ?? 'Still designing…'}</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="min-w-0">
          <p className="text-[10px] text-muted uppercase">{domain}</p>
          <p className="truncate text-xs font-bold text-ink dark:text-zinc-100">{ad.headline}</p>
        </div>
        <span className="shrink-0 rounded bg-zinc-200 px-4 py-1.5 text-[11px] font-semibold text-ink dark:bg-zinc-800 dark:text-zinc-100">Learn more</span>
      </div>
    </div>
  );
}
