'use client';

import { track } from '../../../lib/analytics';
import { ImagePlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAppRouter } from '../shell/AppLink';
import { useMemo, useState } from 'react';
import { FORMATS, type FormatId } from '../../../config/formats';
import { useApi } from '../../../hooks/useApi';
import { useEstimate } from '../../../hooks/useEstimate';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { lastSetStore } from '../../../lib/localStore';
import type { BatchSummaryDto } from '../../../types/business/batches';
import type { StudioSetDto, ThemeDto } from '../../../types/business/catalog';
import { ChipGroup } from '../../ui/Chip';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CreateSection } from './CreateSection';
import { CreditSummaryBar } from './CreditSummaryBar';
import { FormatPicker } from './FormatPicker';
import { ListingPicker, type ListingDto } from './ListingPicker';
import { SetPicker } from './SetPicker';
import { ThemePicker } from './ThemePicker';

const COUNTS = [8, 16, 24, 32] as const;
const VARIATIONS = [1, 2, 3] as const;

export const BrandCreateFlow = () => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const params = useSearchParams();
  const sets = useApi<{ sets: StudioSetDto[] }>('/api/app/sets?product=brand');
  const themes = useApi<{ featured: ThemeDto | null; library: ThemeDto[] }>('/api/app/themes');
  const listings = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const lastSet = lastSetStore.useValue();
  const defaults = (me?.workspace?.defaultFormats ?? []).filter((f): f is FormatId => f in FORMATS);

  const [setChoice, setSetChoice] = useState<string | null>(null);
  const [themeChoice, setThemeChoice] = useState<string | null>(params.get('theme'));
  const [count, setCount] = useState<number>(16);
  const listingParam = params.get('listing');
  const [listingId, setListingId] = useState<string | null>(listingParam && listingParam !== 'new' ? listingParam : null);
  const [variations, setVariations] = useState<number>(2);
  const [formats, setFormats] = useState<FormatId[]>(defaults.length ? defaults : ['portrait_4_5']);
  const [highRes, setHighRes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setId = setChoice ?? sets.data?.sets.find((s) => s.id === lastSet)?.id ?? sets.data?.sets[0]?.id ?? null;
  const themeId = themeChoice ?? themes.data?.featured?.id ?? null;
  const listing = listings.data?.listings.find((l) => l.id === listingId) ?? null;
  const rooms = listing?.rooms.length ?? 0;
  // In listing mode the count is what her rooms allow, never a number she picks.
  const photoCount = listing ? rooms * variations : count;
  const draft = useMemo(
    () =>
      setId && themeId && (!listing || rooms > 0)
        ? { product: 'brand', kind: 'brand_theme', setId, themeId, count, formats, highRes, ...(listing ? { listingId: listing.id, variations } : {}) }
        : null,
    [setId, themeId, count, formats, highRes, listing, rooms, variations],
  );
  const { estimate, error, loading } = useEstimate(draft);

  if (sets.loading || themes.loading) return <div className="flex flex-col gap-4"><SkeletonCard /><SkeletonCard /></div>;
  if (!me?.workspace?.hasIdentity) {
    return <EmptyState illustration={<ImagePlus className="h-10 w-10" />} title="Add your selfies first" body="We need three photos of you to create your photos." action={{ label: 'Add selfies', onClick: () => router.push('/start/brand') }} />;
  }

  const submit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/batches', { method: 'POST', json: draft });
      track('batch_created', { product: 'brand', items: res.batch.progress.total });
      if (setId) lastSetStore.set(setId);
      refresh();
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start this batch.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <CreateSection step={1} title="Set" sub="Your signature look for this batch.">
        <SetPicker sets={sets.data?.sets ?? []} value={setId} onChange={setSetChoice} noun="Set" />
      </CreateSection>
      <CreateSection step={2} title="Theme">
        <ThemePicker featured={themes.data?.featured ?? null} library={themes.data?.library ?? []} value={themeId} onChange={setThemeChoice} />
      </CreateSection>
      <CreateSection step={3} title="Who is it for?" sub="A property, or photos of just you.">
        <ListingPicker listings={listings.data?.listings ?? []} value={listingId} onChange={setListingId} onRefresh={listings.refresh} startAdding={listingParam === 'new'} />
      </CreateSection>
      {listing ? (
        <CreateSection step={4} title="How many looks per room?" sub={rooms > 0 ? `${rooms} room${rooms === 1 ? '' : 's'} × ${variations} = ${rooms * variations} photos.` : 'Add a photo of a room first.'}>
          <ChipGroup options={VARIATIONS.map((v) => ({ value: String(v), label: `${v} look${v === 1 ? '' : 's'} per room` }))} value={String(variations)} onChange={(v) => setVariations(Number(v))} />
        </CreateSection>
      ) : (
        <CreateSection step={4} title="How many photos?" sub="Each is a different scene or pose from the theme.">
          <ChipGroup options={COUNTS.map((c) => ({ value: String(c), label: `${c} photos · ≈ ${Math.round(c / 4)} weeks of posts` }))} value={String(count)} onChange={(v) => setCount(Number(v))} />
        </CreateSection>
      )}
      <CreateSection step={5} title="Formats" sub="Each format is created at its own shape and counts as a photo.">
        <FormatPicker value={formats} onChange={setFormats} highRes={highRes} onHighRes={setHighRes} highResAllowed={Boolean(me.plan?.highRes)} />
      </CreateSection>
      <CreditSummaryBar
        breakdown={`${photoCount} photos × ${formats.length} format${formats.length > 1 ? 's' : ''}${highRes ? ' × 2 (high-res)' : ''}`}
        estimate={estimate}
        error={submitError ?? error}
        loading={loading}
        submitting={submitting}
        disabled={!draft}
        onSubmit={submit}
      />
    </div>
  );
};
