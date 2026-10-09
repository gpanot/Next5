'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AnalyticsDto } from '../../../../types/admin/slideshowAnalytics';
import { useAdminApi } from '../../business/useAdminApi';
import { NoPostsHere, NoPostsYet } from './AnalyticsEmpty';
import { AnalyticsFilters, SortSelect, type Filters } from './AnalyticsFilters';
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

  const hasPosts = all.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-normal text-app-ink md:text-3xl">Analytics</h1>
        {/* Phones reach it from the Calendar tab. */}
        <Link href={`/slideshow/${workspaceId}`} className="min-h-11 content-center rounded-full px-3 text-sm font-semibold text-app-muted transition hover:text-app-ink max-md:hidden">Slideshows</Link>
      </div>
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
          {/* No post yet: what will show here, not filters over a page of zeros. */}
          {!hasPosts ? (
            <NoPostsYet workspaceId={workspaceId} />
          ) : (
            <>
              <AnalyticsFilters value={filters} onChange={setFilters} />
              <SummaryCards summary={summarize(shown)} />
              <WhatWorks posts={shown} medians={medians} />
              {sorted.length === 0 ? (
                <NoPostsHere />
              ) : (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-app-muted">{sorted.length === 1 ? '1 post' : `${sorted.length} posts`}</h2>
                    <SortSelect value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} />
                  </div>
                  <ul className="space-y-3">
                    {sorted.map((post) => (
                      <PostCard key={post.id} post={post} lift={liftOf(post, medians)} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
