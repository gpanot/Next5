'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorState } from '../ui/ErrorState';
import { SkeletonText } from '../ui/Skeleton';
import { SLIDESHOW_PRICE_LABEL } from '../../types/admin/slideshowCredits';
import { ClaimBox } from './ClaimBox';
import { LeadHero, LeadNav } from './LeadHero';
import { CompareSection, HowItWorks, LeadFaq } from './LeadSections';
import { PostSheet } from './PostSheet';
import { useProspectView } from './useProspectView';
import { WeekStrip } from './WeekStrip';

/** Loading: the hero lines and a row of 9:16 cards. */
const Loading = () => (
  <div className="mx-auto max-w-[1180px] space-y-6 px-5 pt-10">
    <SkeletonText lines={3} />
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[9/16] w-[min(62vw,230px)] shrink-0 animate-pulse rounded-[18px] bg-zinc-100 dark:bg-zinc-800" />)}
    </div>
  </div>
);

/** The review page a prospect gets in a DM (layout from the lead page brief): their next 14 days of posts, each one
 *  opens, then "Get my posts" signs them in and hands them the workspace. */
export function ProspectPage({ shareToken }: { shareToken: string }) {
  const { data, error, loading, retry } = useProspectView(shareToken);
  const [open, setOpen] = useState<number | null>(null);
  const days = data?.days ?? [];
  const videos = days.filter((d) => d.kind === 'blitz').length;
  const claimed = data?.status === 'claimed';

  return (
    <div className="min-h-dvh bg-app-bg text-app-ink">
      {loading && <Loading />}
      {error && <div className="mx-auto max-w-md px-5 py-24"><ErrorState message={error} onRetry={retry} /></div>}
      {data && (
        <>
          <LeadNav heldUntil={data.heldUntil} ended={data.heldEnded} claimed={claimed} />
          <main>
            <LeadHero name={data.name} websiteUrl={data.websiteUrl} videos={videos} slideshows={days.length - videos} />
            <WeekStrip days={days} onOpen={setOpen} />
            <CompareSection name={data.name} day={days.find((d) => d.kind !== 'blitz') ?? days[0]} />
            <HowItWorks />
            <ClaimBox shareToken={shareToken} name={data.name} total={days.length} price={SLIDESHOW_PRICE_LABEL} claimed={claimed} />
            <LeadFaq name={data.name} price={SLIDESHOW_PRICE_LABEL} />
          </main>
          <footer className="border-t border-app-line py-7 text-[13px] text-app-muted">
            <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-x-6 gap-y-2 px-5">
              <span>Next5, made for {data.name}</span>
              <Link href="/privacy" className="text-app-muted underline-offset-2 hover:underline">Privacy</Link>
            </div>
          </footer>
        </>
      )}
      <PostSheet day={open === null ? null : days[open] ?? null} onClose={() => setOpen(null)} />
    </div>
  );
}
