'use client';

import { ArchiveRestore, Loader2, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { InfluencerDto } from '../../../types/business/influencers';
import { apiFetch } from '../../../lib/apiClient';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { AppLink, useAppRouter } from '../shell/AppLink';
import { ArchiveInfluencerDialog } from './influencers/ArchiveInfluencerDialog';
import { InfluencerTile } from './influencers/InfluencerTile';
import { useInfluencers } from './influencers/useInfluencers';

type Props = { showArchived: boolean };

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

/** Archived influencer card — shows portrait + name + a Restore button. */
const ArchivedTile = ({ influencer, onRestored }: { influencer: InfluencerDto; onRestored: () => void }) => {
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/app/influencers/${influencer.id}?product=brand`, { method: 'PATCH', json: { status: 'active' } });
      onRestored();
    } catch { /* ignore */ } finally { setBusy(false); }
  };
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm opacity-70 transition-opacity duration-200 hover:opacity-100">
      <div className="relative aspect-square bg-app-sunken sm:aspect-[4/5]">
        {influencer.portraitUrl
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          ? <img src={influencer.portraitUrl} alt={influencer.name} className="h-full w-full object-cover object-top" />
          : <div className="flex h-full items-center justify-center"><UserRound aria-hidden className="h-12 w-12 text-app-muted/50" /></div>}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">Archived</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-semibold text-app-ink">{influencer.name}</h3>
          {[influencer.gender, influencer.ethnicity].filter(Boolean).join(' · ') && (
            <p className="truncate text-[13px] text-app-muted">{[influencer.gender, influencer.ethnicity].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void restore()}
          disabled={busy}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-app-line px-4 text-[13px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken disabled:opacity-50"
        >
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArchiveRestore aria-hidden className="h-4 w-4" />}
          Restore
        </button>
      </div>
    </article>
  );
};

/**
 * Brand influencers: each one a face you can post as, without showing your own.
 * Pick any variation as the face for new photos.
 */
export const InfluencersList = ({ showArchived }: Props) => {
  const status = showArchived ? 'archived' : 'active';
  const { data, loading, error, refresh } = useInfluencers(status);
  const router = useAppRouter();
  const [archiving, setArchiving] = useState<InfluencerDto | null>(null);

  if (loading && !data) return <SkeletonGrid count={3} cols={3} />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;

  const influencers = data?.influencers ?? [];

  if (showArchived) {
    if (influencers.length === 0) {
      return (
        <EmptyState
          illustration={<ArchiveRestore className="h-10 w-10" />}
          title="No archived influencers"
          body="Influencers you archive will appear here. You can restore them any time."
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {influencers.map((inf) => <ArchivedTile key={inf.id} influencer={inf} onRestored={refresh} />)}
      </div>
    );
  }

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
        {influencers.map((inf) => <InfluencerTile key={inf.id} influencer={inf} onArchive={() => setArchiving(inf)} onStylesAdded={refresh} />)}
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
