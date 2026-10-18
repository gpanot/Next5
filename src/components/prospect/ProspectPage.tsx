'use client';

import { useState } from 'react';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SkeletonText } from '../ui/Skeleton';
import { ClaimBar } from './ClaimBar';
import { DayList } from './DayList';
import { PostViewer } from './PostViewer';
import { useProspectView } from './useProspectView';

/** Loading: the header and a few day rows. */
const Loading = () => (
  <div className="space-y-3">
    <SkeletonText lines={2} />
    {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
  </div>
);

/** The review page a prospect gets in a DM: their next 14 days of posts, each one opens, then "Get my posts". */
export function ProspectPage({ shareToken }: { shareToken: string }) {
  const { data, error, loading, retry } = useProspectView(shareToken);
  const [open, setOpen] = useState<number | null>(null);
  const days = data?.days ?? [];
  const videos = days.filter((d) => d.kind === 'blitz').length;

  return (
    <div className="min-h-dvh bg-app-bg">
      <main className="mx-auto max-w-xl px-4 pt-8 pb-40">
        {loading && <Loading />}
        {error && <ErrorState message={error} onRetry={retry} />}
        {data && (
          <>
            <header className="mb-5 space-y-1">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-app-muted">Made for {data.name}</p>
              <h1 className="text-[28px] font-bold leading-tight text-app-ink">Your next {days.length} days of posts</h1>
              <p className="text-[15px] text-app-muted">
                {videos} videos and {days.length - videos} slideshows for TikTok and Instagram. One post a day. Tap a day to see it.
              </p>
            </header>
            {days.length === 0 ? <EmptyState title="No posts here yet" body="Ask for a new link." /> : <DayList days={days} onOpen={setOpen} />}
            <ClaimBar claimHref={`/p/${shareToken}?claim=1`} claimed={data.status === 'claimed'} />
          </>
        )}
      </main>
      <PostViewer day={open === null ? null : days[open] ?? null} onClose={() => setOpen(null)} />
    </div>
  );
}
