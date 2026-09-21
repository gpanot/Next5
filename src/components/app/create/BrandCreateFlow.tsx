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
import type { Occasion } from '../../../lib/listingOccasions';
import { lastSetStore } from '../../../lib/localStore';
import type { BatchSummaryDto } from '../../../types/business/batches';
import type { StudioSetDto, ThemeDto } from '../../../types/business/catalog';
import type { ListingDto } from '../../../types/business/listings';
import { ChipGroup } from '../../ui/Chip';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CreateSection } from './CreateSection';
import { CreditSummaryBar } from './CreditSummaryBar';
import { FormatPicker } from './FormatPicker';
import { ListingPicker, type WhoMode } from './ListingPicker';
import { OccasionPicker } from './OccasionPicker';
import { SetPicker } from './SetPicker';
import { StyleLine, type Style } from './StyleLine';
import { ThemePicker } from './ThemePicker';

const COUNTS = [1, 8, 16, 24, 32] as const;

/** One photo is the try-it size; the rest are read as weeks of posting. */
const countLabel = (c: number): string => (c === 1 ? '1 photo · just to try' : `${c} photos · ≈ ${Math.round(c / 4)} weeks of posts`);
const VARIATIONS = [1, 2, 3] as const;

/**
 * Two forms behind one first question: "+ Property" (the default, for realtors) or "Just me".
 * "Just me" chooses a style and a theme, because we choose the place.
 * A property has a place already — its photos — so it asks what is happening and how she looks instead
 * (docs/business-studios/14-property-create-plan.md).
 */
export const BrandCreateFlow = () => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const params = useSearchParams();
  const sets = useApi<{ sets: StudioSetDto[] }>('/api/app/sets?product=brand');
  const themes = useApi<{ featured: ThemeDto | null; library: ThemeDto[] }>('/api/app/themes');
  const listings = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const lastSet = lastSetStore.useValue();
  const defaults = (me?.workspace?.defaultFormats ?? []).filter((f): f is FormatId => f in FORMATS);

  const [setChoice, setSetChoice] = useState<string | null>(params.get('set'));
  const [themeChoice, setThemeChoice] = useState<string | null>(params.get('theme'));
  const [count, setCount] = useState<number>(16);
  const listingParam = params.get('listing');
  const [listingId, setListingId] = useState<string | null>(listingParam && listingParam !== 'new' ? listingParam : null);
  // Realtors first: a property unless she came from a theme or a style to make photos of just her.
  const [mode, setMode] = useState<WhoMode>((params.get('theme') || params.get('set')) && !listingParam ? 'me' : 'property');
  const [variations, setVariations] = useState<number>(1);
  // Her pick per property. Without one, only Zillow's own status fills it in — an uploaded home stays empty.
  const [occasionByListing, setOccasionByListing] = useState<Record<string, Occasion>>({});
  const [style, setStyle] = useState<Style>({ wardrobe: null, poseEnergy: null });
  const [imported, setImported] = useState<ListingDto | null>(null);
  const [formats, setFormats] = useState<FormatId[]>(defaults.length ? defaults : ['portrait_4_5']);
  const [highRes, setHighRes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allSets = sets.data?.sets ?? [];
  const usualSet = allSets.find((s) => s.id === lastSet) ?? allSets[0] ?? null;
  const setId = setChoice ?? usualSet?.id ?? null;
  const themeId = themeChoice ?? themes.data?.featured?.id ?? null;
  // The import's own copy covers the moment before the list refreshes.
  const listing = listings.data?.listings.find((l) => l.id === listingId) ?? (imported?.id === listingId ? imported : null);
  const rooms = listing?.rooms.length ?? 0;
  const occasion = listing ? occasionByListing[listing.id] ?? listing.occasion : null;
  const occasionFromZillow = Boolean(listing && !occasionByListing[listing.id] && listing.occasion);
  const fallbackWardrobe = usualSet?.wardrobe ?? null;
  const fallbackPose = usualSet?.poseEnergy ?? null;
  // In listing mode the count is what her photos allow, never a number she picks.
  const photoCount = listing ? rooms * variations : count;

  const draft = useMemo(() => {
    if (listing) {
      if (rooms === 0 || !occasion) return null;
      return {
        product: 'brand', kind: 'brand_property', listingId: listing.id, occasion, variations,
        wardrobe: style.wardrobe ?? fallbackWardrobe, poseEnergy: style.poseEnergy ?? fallbackPose,
        formats, highRes,
      };
    }
    return setId && themeId ? { product: 'brand', kind: 'brand_theme', setId, themeId, count, formats, highRes } : null;
  }, [listing, rooms, occasion, variations, style, fallbackWardrobe, fallbackPose, setId, themeId, count, formats, highRes]);
  const { estimate, error, loading } = useEstimate(draft);

  const pickOccasion = (next: Occasion) => {
    if (listing) setOccasionByListing((prev) => ({ ...prev, [listing.id]: next }));
  };

  const onAdded = (next: ListingDto) => {
    setImported(next);
    listings.refresh();
    setListingId(next.id);
  };

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
      if (!listing && setId) lastSetStore.set(setId);
      refresh();
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start this batch.');
      setSubmitting(false);
    }
  };

  const styleFallback = { wardrobe: fallbackWardrobe, poseEnergy: fallbackPose };

  return (
    <div className="flex flex-col gap-5">
      {/* First, because it decides what every step below means. */}
      <CreateSection step={1} title="Who is it for?" sub="Paste a listing link to show up inside the home, or make photos of just you.">
        <ListingPicker mode={mode} onMode={setMode} listings={listings.data?.listings ?? []} value={listingId} onChange={setListingId} onRefresh={listings.refresh} onAdded={onAdded} />
      </CreateSection>

      {/* In property mode, nothing below makes sense until there is a property. */}
      {mode === 'property' && !listing ? null : listing ? (
        <>
          <CreateSection step={2} title="What’s happening?" sub="With this home, right now.">
            <OccasionPicker value={occasion} onChange={pickOccasion} fromZillow={occasionFromZillow} />
          </CreateSection>
          <CreateSection step={3} title="How many looks per photo?" sub={rooms > 0 ? `${rooms} photo${rooms === 1 ? '' : 's'} × ${variations} = ${rooms * variations} photo${rooms * variations === 1 ? '' : 's'}.` : 'Add a photo of the property first.'}>
            <ChipGroup options={VARIATIONS.map((v) => ({ value: String(v), label: `${v} look${v === 1 ? '' : 's'} per photo` }))} value={String(variations)} onChange={(v) => setVariations(Number(v))} />
          </CreateSection>
          <CreateSection step={4} title="How you look" sub="Your clothes and energy. The home stays exactly as photographed.">
            <StyleLine value={style} onChange={setStyle} fallback={styleFallback} />
          </CreateSection>
        </>
      ) : (
        <>
          <CreateSection step={2} title="Your style" sub="Pick a saved style, then put a theme on it.">
            <SetPicker sets={allSets} value={setId} onChange={setSetChoice} noun="Style" />
          </CreateSection>
          <CreateSection step={3} title="Theme">
            <ThemePicker featured={themes.data?.featured ?? null} library={themes.data?.library ?? []} value={themeId} onChange={setThemeChoice} />
          </CreateSection>
          <CreateSection step={4} title="How many photos?" sub="Each is a different scene or pose from the theme.">
            <ChipGroup options={COUNTS.map((c) => ({ value: String(c), label: countLabel(c) }))} value={String(count)} onChange={(v) => setCount(Number(v))} />
          </CreateSection>
        </>
      )}

      {(mode === 'me' || listing) && (
        <>
          <CreateSection step={5} title="Formats" sub="Each format is created at its own shape and counts as a photo.">
            <FormatPicker value={formats} onChange={setFormats} highRes={highRes} onHighRes={setHighRes} highResAllowed={Boolean(me.plan?.highRes)} />
          </CreateSection>
          <CreditSummaryBar
            breakdown={`${photoCount} photo${photoCount === 1 ? '' : 's'} × ${formats.length} format${formats.length > 1 ? 's' : ''}${highRes ? ' × 2 (high-res)' : ''}`}
            estimate={estimate}
            error={submitError ?? error}
            hint={listing && rooms > 0 && !occasion ? 'Pick what’s happening with this home.' : undefined}
            loading={loading}
            submitting={submitting}
            disabled={!draft}
            onSubmit={submit}
          />
        </>
      )}
    </div>
  );
};
