'use client';

import { Film, Images, LayoutList } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { ListingPackSummaryDto } from '../../../types/business/shop';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { AppLink, useAppRouter } from '../shell/AppLink';
import { PackStatusBadge } from './PackStatusBadge';

type DisplayMode = 'cards' | 'list';

/** Shop Studio library: one TikTok Shop listing pack per product. */
export const TikTokLibraryView = () => {
  const router = useAppRouter();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const { data, error, loading, refresh } = useApi<{ packs: ListingPackSummaryDto[] }>('/api/app/shop/library');
  if (loading && !data) return <SkeletonGrid count={8} cols={4} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data?.packs.length) {
    return <EmptyState illustration={<Images className="h-10 w-10" />} title="No listing packs yet" body="Create a drop from your store. Each product gets a pack ready for TikTok Shop." action={{ label: 'Go to Store', onClick: () => router.push('/app/store') }} />;
  }
  const counts = { ready: data.packs.filter((p) => p.status === 'ready').length, uploaded: data.packs.filter((p) => p.status === 'uploaded').length };
  return (
    <div className="flex flex-col gap-4">
      {/* Header row: summary + view toggle */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] text-app-muted">{data.packs.length} products · {counts.ready} ready to list · {counts.uploaded} uploaded</p>
        <div className="flex rounded-xl border border-app-line bg-app-sunken p-0.5" role="group" aria-label="View mode">
          {(['cards', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={displayMode === mode}
              onClick={() => setDisplayMode(mode)}
              title={mode === 'cards' ? 'Card view' : 'List view'}
              className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors duration-150 ${displayMode === mode ? 'bg-app-panel shadow-sm text-app-ink' : 'text-app-muted hover:text-app-ink'}`}
            >
              {mode === 'cards' ? (
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                  <rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" />
                </svg>
              ) : (
                <LayoutList className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </div>

      {displayMode === 'cards' ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.packs.map((p) => (
            <li key={p.productId}>
              <AppLink href={`/app/library/${p.productId}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent">
                <span className="relative block aspect-square bg-app-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                  {p.mainUrl && <img src={p.mainUrl} alt={`${p.name} — main photo`} className="h-full w-full object-cover" loading="lazy" />}
                  {p.originalUrl && (
                    <span className="absolute bottom-2 left-2 block h-14 w-11 overflow-hidden rounded-md bg-white p-0.5 shadow-md ring-1 ring-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- storage or TikTok CDN image */}
                      <img src={p.originalUrl} alt="" className="h-full w-full rounded object-cover" referrerPolicy="no-referrer" />
                    </span>
                  )}
                  <span className="absolute right-2 top-2"><PackStatusBadge status={p.status} /></span>
                </span>
                <span className="flex flex-1 flex-col gap-1.5 p-3">
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug text-app-ink">{p.name}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 text-[12px] text-app-muted">
                    <Badge tone="neutral">{p.photoCount}/9 photos</Badge>
                    {p.hasCover ? <span className="inline-flex items-center gap-1"><Film aria-hidden className="h-3.5 w-3.5" /> cover</span> : <span className="text-app-warning">no cover</span>}
                  </span>
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-app-line rounded-2xl border border-app-line bg-app-panel overflow-hidden">
          {data.packs.map((p) => (
            <li key={p.productId}>
              <AppLink
                href={`/app/library/${p.productId}`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-app-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent"
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-app-sunken">
                  {p.mainUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                    <img src={p.mainUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                {/* Name */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-[13px] font-semibold text-app-ink">{p.name}</p>
                  <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-app-muted">
                    <Badge tone="neutral">{p.photoCount}/9 photos</Badge>
                    {p.hasCover ? <span className="inline-flex items-center gap-1"><Film aria-hidden className="h-3.5 w-3.5" /> cover</span> : <span className="text-app-warning">no cover</span>}
                  </span>
                </div>
                {/* Status */}
                <div className="shrink-0">
                  <PackStatusBadge status={p.status} />
                </div>
              </AppLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
