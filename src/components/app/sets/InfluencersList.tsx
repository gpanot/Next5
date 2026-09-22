'use client';

import { Archive, Plus, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { useApi } from '../../../hooks/useApi';
import { AppLink } from '../shell/AppLink';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';

export type InfluencerSummaryDto = {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  ethnicity: string | null;
  source: 'generated' | 'uploaded' | 'gallery';
  setCount: number;
  portraitUrl: string | null;
  previewUrls: string[];
  createdAt: string;
};

const SOURCE_LABEL: Record<InfluencerSummaryDto['source'], string> = {
  generated: 'AI Generated',
  uploaded: 'Uploaded',
  gallery: 'From gallery',
};

// ─── Archive dialog ─────────────────────────────────────────────────────────

type ArchiveDialogProps = {
  influencer: InfluencerSummaryDto;
  onClose: () => void;
  onArchived: () => void;
};

const ArchiveDialog = ({ influencer, onClose, onArchived }: ArchiveDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/app/influencers/${influencer.id}`, { method: 'DELETE' });
      onArchived();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not archive influencer.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-app-panel p-6 shadow-xl">
        <h2 className="text-[18px] font-semibold text-app-ink">Archive {influencer.name}?</h2>
        <p className="text-[14px] text-app-muted">
          This will archive the influencer and their associated styles. Previously generated photos remain in your library.
        </p>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-full border border-app-line py-2 text-[14px] font-medium text-app-ink transition-colors hover:bg-app-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={loading}
            className="flex-1 rounded-full bg-red-500 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Single influencer card ──────────────────────────────────────────────────

type CardProps = {
  influencer: InfluencerSummaryDto;
  onArchive: () => void;
};

const InfluencerCard = ({ influencer, onArchive }: CardProps) => {
  const hasPhotos = influencer.previewUrls.length > 0;
  const traits = [influencer.gender, influencer.ethnicity, influencer.age ? `${influencer.age} yo` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Portrait area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-app-sunken">
        {influencer.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL
          <img
            src={influencer.portraitUrl}
            alt={`${influencer.name} — base portrait`}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-14 w-14 text-app-muted/40" />
          </div>
        )}

        {/* Source badge */}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {SOURCE_LABEL[influencer.source]}
        </span>

        {/* Archive button */}
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${influencer.name}`}
          title="Archive"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/80"
        >
          <Archive className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* Info + actions */}
      <div className="flex flex-col gap-3 p-4">
        {/* Name + traits */}
        <div>
          <h3 className="truncate text-[16px] font-semibold text-app-ink">{influencer.name}</h3>
          <p className="truncate text-[12px] text-app-muted">
            {influencer.setCount} style{influencer.setCount === 1 ? '' : 's'}
            {traits ? ` · ${traits}` : ''}
          </p>
        </div>

        {/* Generated photo strip */}
        {hasPhotos ? (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {influencer.previewUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL
              <img
                key={url}
                src={url}
                alt={`${influencer.name} generated photo ${i + 1}`}
                className="h-16 w-12 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-app-muted/60 italic">Photos generating…</p>
        )}

        {/* CTA */}
        <AppLink
          href={`/app/create?influencerId=${influencer.id}`}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-app-cta text-[13px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90"
        >
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          Create photos
        </AppLink>
      </div>
    </article>
  );
};

// ─── New influencer CTA card ─────────────────────────────────────────────────

const NewInfluencerCard = () => (
  <AppLink
    href="/app/sets/new"
    className="group flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-app-line bg-app-sunken p-6 text-center transition-colors duration-200 hover:border-app-muted hover:bg-app-panel"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-panel shadow-sm ring-1 ring-app-line transition-shadow group-hover:shadow-md">
      <Plus className="h-6 w-6 text-app-accent" aria-hidden />
    </div>
    <div>
      <p className="text-[14px] font-semibold text-app-ink">New influencer</p>
      <p className="mt-0.5 text-[12px] text-app-muted">Generate, upload, or pick from gallery</p>
    </div>
  </AppLink>
);

// ─── Empty state ─────────────────────────────────────────────────────────────

const EmptyInfluencers = () => (
  <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-app-line bg-app-sunken p-10 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-app-panel shadow-sm ring-1 ring-app-line">
      <User className="h-8 w-8 text-app-muted" aria-hidden />
    </div>
    <div className="flex flex-col gap-1">
      <h2 className="text-[20px] font-bold text-app-ink">Create your first AI influencer</h2>
      <p className="mx-auto max-w-xs text-[14px] text-app-muted">
        Pick traits, generate a base character, and our agents will train a persistent character you can reuse across every piece of content.
      </p>
    </div>
    <AppLink
      href="/app/sets/new"
      className="inline-flex h-11 items-center gap-2 rounded-full bg-app-cta px-6 text-[14px] font-semibold text-app-cta-ink transition-opacity hover:opacity-90"
    >
      <Plus aria-hidden className="h-4 w-4" />
      New influencer
    </AppLink>
  </div>
);

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Brand influencer grid: one card per AI influencer, each showing portrait + generated previews.
 * Replaces the selfie-centric InfluencerCard + LookCard approach for the brand product.
 */
export const InfluencersList = () => {
  const { data, loading, error, refresh } = useApi<{ influencers: InfluencerSummaryDto[] }>(
    '/api/app/influencers?product=brand',
  );
  const [archiving, setArchiving] = useState<InfluencerSummaryDto | null>(null);

  if (loading && !data) return <SkeletonGrid count={4} cols={2} />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;

  const influencers = data?.influencers ?? [];

  if (influencers.length === 0) return <EmptyInfluencers />;

  return (
    <div className="flex flex-col gap-6">
      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {influencers.map((inf) => (
          <InfluencerCard
            key={inf.id}
            influencer={inf}
            onArchive={() => setArchiving(inf)}
          />
        ))}
        <NewInfluencerCard />
      </div>

      {/* Archive dialog */}
      {archiving && (
        <ArchiveDialog
          influencer={archiving}
          onClose={() => setArchiving(null)}
          onArchived={() => { setArchiving(null); refresh(); }}
        />
      )}
    </div>
  );
};
