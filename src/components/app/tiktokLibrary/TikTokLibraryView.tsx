'use client';

import { Film, Images } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import type { ListingPackSummaryDto } from '../../../types/business/shop';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { AppLink, useAppRouter } from '../shell/AppLink';
import { PackStatusBadge } from './PackStatusBadge';

/** Shop Studio library: one TikTok Shop listing pack per product. */
export const TikTokLibraryView = () => {
  const router = useAppRouter();
  const { data, error, loading, refresh } = useApi<{ packs: ListingPackSummaryDto[] }>('/api/app/shop/library');
  if (loading && !data) return <SkeletonGrid count={8} cols={4} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data?.packs.length) {
    return <EmptyState illustration={<Images className="h-10 w-10" />} title="No listing packs yet" body="Create a drop from your store. Each product gets a pack ready for TikTok Shop." action={{ label: 'Go to Store', onClick: () => router.push('/app/store') }} />;
  }
  const counts = { ready: data.packs.filter((p) => p.status === 'ready').length, uploaded: data.packs.filter((p) => p.status === 'uploaded').length };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-app-muted">{data.packs.length} products · {counts.ready} ready to list · {counts.uploaded} uploaded</p>
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
    </div>
  );
};
