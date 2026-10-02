'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AnalyticsDto } from '../../../../types/admin/slideshowAnalytics';
import { useAdminApi } from '../../business/useAdminApi';
import { AnalyticsFilters, type Filters } from './AnalyticsFilters';
import { filterPosts, liftOf, platformMedians, sortPosts, summarize } from './insights';
import { PostCard } from './PostCard';
import { SummaryCards, SummaryCardsSkeleton } from './SummaryCards';
import { TikTokAccountCard } from './TikTokAccountCard';
import { WhatWorks } from './WhatWorks';

function ListSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-[116px] animate-pulse rounded-xl bg-app-sunken" />
      ))}
    </ul>
  );
}

function EmptyState({ workspaceId, filtered }: { workspaceId: string; filtered: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
      <p className="text-base font-semibold text-app-ink">{filtered ? 'No posts here' : 'No posts yet'}</p>
      <p className="mt-1 text-sm text-app-muted">{filtered ? 'Try another platform or period.' : 'Post a slideshow and its numbers show up here 48 hours later.'}</p>
      {!filtered && (
        <Link href={`/slideshow/${workspaceId}`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink transition active:scale-95">
          Go to my slideshows
        </Link>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      <p>{message}</p>
      <button onClick={onRetry} className="mt-3 min-h-11 rounded-full border border-current px-4 font-semibold transition active:scale-95">Try again</button>
    </div>
  );
}

/** The workspace's posted slideshows and their numbers: summary, what works, and every post. */
export function AnalyticsPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error, refresh } = useAdminApi<AnalyticsDto>(token, `/api/slideshow/analytics?workspace=${workspaceId}`);
  const [filters, setFilters] = useState<Filters>({ platform: 'all', period: '30d', sort: 'newest' });
  const all = useMemo(() => data?.posts ?? [], [data]);
  // Medians come from every post (not just the period shown), so a quiet week does not move the bar.
  const medians = useMemo(() => platformMedians(all), [all]);
  const shown = useMemo(() => filterPosts(all, filters.platform, filters.period), [all, filters.platform, filters.period]);
  const sorted = useMemo(() => sortPosts(shown, filters.sort), [shown, filters.sort]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-app-ink">Analytics</h1>
        <Link href={`/slideshow/${workspaceId}`} className="min-h-11 content-center rounded-full px-3 text-sm font-semibold text-app-muted transition hover:text-app-ink">Slideshows</Link>
      </div>
      <AnalyticsFilters value={filters} onChange={setFilters} />
      {error && <ErrorState message={error} onRetry={refresh} />}
      {!data && !error && (
        <>
          <SummaryCardsSkeleton />
          <ListSkeleton />
        </>
      )}
      {data && (
        <>
          <TikTokAccountCard token={token} workspaceId={workspaceId} account={data.tiktok} />
          <SummaryCards summary={summarize(shown)} />
          {all.length > 0 && <WhatWorks posts={shown} medians={medians} />}
          {sorted.length === 0 ? (
            <EmptyState workspaceId={workspaceId} filtered={all.length > 0} />
          ) : (
            <ul className="space-y-3">
              {sorted.map((post) => (
                <PostCard key={post.id} post={post} lift={liftOf(post, medians)} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
