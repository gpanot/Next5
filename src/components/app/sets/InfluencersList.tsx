'use client';

import { Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { InfluencerDto } from '../../../types/business/influencers';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { AppLink, useAppRouter } from '../shell/AppLink';
import { ArchiveInfluencerDialog } from './influencers/ArchiveInfluencerDialog';
import { InfluencerTile } from './influencers/InfluencerTile';
import { useInfluencers } from './influencers/useInfluencers';

const NewInfluencerTile = () => (
  <AppLink
    href="/app/sets/new"
    className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-app-line bg-app-panel p-6 text-center transition-colors duration-200 hover:border-app-muted hover:bg-app-sunken"
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
      <Plus aria-hidden className="h-5 w-5" />
    </span>
    <span className="text-[14px] font-semibold text-app-ink">New influencer</span>
    <span className="max-w-[200px] text-[12px] text-app-muted">Make a face with AI, use a photo, or pick one from our gallery</span>
  </AppLink>
);

/**
 * Brand influencers: each one a face you can post as, without showing your own.
 * Pick any variation as the face for new photos.
 */
export const InfluencersList = () => {
  const { data, loading, error, refresh } = useInfluencers();
  const router = useAppRouter();
  const [archiving, setArchiving] = useState<InfluencerDto | null>(null);

  if (loading && !data) return <SkeletonGrid count={3} cols={3} />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;

  const influencers = data?.influencers ?? [];
  if (influencers.length === 0) {
    return (
      <EmptyState
        illustration={<UserRound className="h-10 w-10" />}
        title="Create your first AI influencer"
        body="No need to show your face. Make one with AI, use a photo, or pick one from our gallery. Then use them in every post."
        action={{ label: 'New influencer', iconLeft: <Plus className="h-4 w-4" />, onClick: () => router.push('/app/sets/new') }}
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {influencers.map((inf) => <InfluencerTile key={inf.id} influencer={inf} onArchive={() => setArchiving(inf)} />)}
        <NewInfluencerTile />
      </div>
      {archiving && (
        <ArchiveInfluencerDialog
          influencer={archiving}
          onClose={() => setArchiving(null)}
          onArchived={() => { setArchiving(null); refresh(); }}
        />
      )}
    </>
  );
};
