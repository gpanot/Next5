'use client';

import { ChevronDown, UserRound } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { FormatId } from '../../../config/formats';
import { useApi } from '../../../hooks/useApi';
import { useEstimate } from '../../../hooks/useEstimate';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { Occasion } from '../../../lib/listingOccasions';
import { lastInfluencerStore, lastSetStore } from '../../../lib/localStore';
import type { BatchSummaryDto } from '../../../types/business/batches';
import type { StudioSetDto } from '../../../types/business/catalog';
import type { ListingDto } from '../../../types/business/listings';
import { AppLink, useAppRouter } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';
import type { Identity } from '../sets/IdentityPhotoGrid';
import { useInfluencers } from '../sets/influencers/useInfluencers';
import { CreateSection } from './CreateSection';
import { CreditSummaryBar } from './CreditSummaryBar';
import { FormatPicker } from './FormatPicker';
import { InfluencerPicker, type FaceChoice } from './InfluencerPicker';
import { OccasionPicker } from './OccasionPicker';
import { StyleLine, type Style } from './StyleLine';

type Props = { listing: ListingDto; step: number; initialFace: FaceChoice | null; defaultOpen: boolean };

/** No face yet: the photos need one, the videos do not. */
const NoFace = () => (
  <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-app-line bg-app-panel p-4">
    <p className="text-[14px] text-app-muted">Add your face first. Your own photo or an AI face.</p>
    <AppLink href="/app/sets/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90">
      <UserRound aria-hidden className="h-4 w-4" /> Add a face
    </AppLink>
  </div>
);

/** Who is in the photos: an influencer pick, or her selfies when she has no influencer. */
const FaceRow = ({ picker, selfies }: { picker: ReactNode; selfies: Identity[] }) => (
  <>
    {picker ?? (
      <div className="flex gap-2">
        {selfies.map((p) =>
          p.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img key={p.id} src={p.url} alt={p.kind === 'full_body' ? 'Your full-body photo' : 'Your selfie'} className="h-20 w-[60px] rounded-xl object-cover ring-1 ring-app-line" />
          ) : null,
        )}
      </div>
    )}
  </>
);

/**
 * Optional, under the videos: photos of her inside this home, one per room photo.
 * Folded by default for Zillow listings, because the house is what viewers came for.
 */
export const ListingPhotosSection = ({ listing, step, initialFace, defaultOpen }: Props) => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const [open, setOpen] = useState(defaultOpen);
  const sets = useApi<{ sets: StudioSetDto[] }>('/api/app/sets?product=brand');
  const identitiesApi = useApi<{ identities: Identity[] }>('/api/app/identity?product=brand');
  const influencersApi = useInfluencers();
  const lastSet = lastSetStore.useValue();
  const lastInfluencerValue = lastInfluencerStore.useValue();
  const [occasionPick, setOccasionPick] = useState<Occasion | null>(null);
  const [style, setStyle] = useState<Style>({ wardrobe: null, poseEnergy: null });
  const [faceChoice, setFaceChoice] = useState<FaceChoice | null>(initialFace);
  const [formats, setFormats] = useState<FormatId[]>(['story_9_16']);
  const [highRes, setHighRes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const influencerList = influencersApi.data?.influencers ?? [];
  const selfies = identitiesApi.data?.identities ?? [];
  const selfieUrl = selfies.find((p) => p.kind === 'face')?.url ?? selfies[0]?.url ?? null;
  const known = (id: string | null | undefined): string | null => (id && influencerList.some((i) => i.id === id) ? id : null);
  const influencerId = faceChoice
    ? known(faceChoice.influencerId)
    : known(lastInfluencerValue) ?? (identitiesApi.data && !selfieUrl ? influencerList[0]?.id ?? null : null);
  const influencerPhotoId = faceChoice && influencerId && influencerList.find((i) => i.id === influencerId)?.variations.some((v) => v.id === faceChoice.photoId)
    ? faceChoice.photoId
    : null;

  const usualSet = (sets.data?.sets ?? []).find((s) => s.id === lastSet) ?? sets.data?.sets[0] ?? null;
  const fallback = { wardrobe: usualSet?.wardrobe ?? null, poseEnergy: usualSet?.poseEnergy ?? null };
  const rooms = listing.rooms.length;
  const occasion = occasionPick ?? listing.occasion;

  const draft = useMemo(() => {
    if (!open || rooms === 0 || !occasion) return null;
    return {
      product: 'brand', kind: 'brand_property', listingId: listing.id, occasion, variations: 1,
      wardrobe: style.wardrobe ?? fallback.wardrobe, poseEnergy: style.poseEnergy ?? fallback.poseEnergy,
      formats, highRes, influencerId: influencerId ?? undefined, influencerPhotoId: influencerPhotoId ?? undefined,
    };
  }, [open, rooms, occasion, listing.id, style, fallback.wardrobe, fallback.poseEnergy, formats, highRes, influencerId, influencerPhotoId]);
  const { estimate, error, loading } = useEstimate(draft);

  const submit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/batches', { method: 'POST', json: draft });
      track('batch_created', { product: 'brand', items: res.batch.progress.total });
      lastInfluencerStore.set(influencerId ?? '');
      refresh();
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start these photos.');
      setSubmitting(false);
    }
  };

  const toggle = (
    <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-panel p-4 text-left transition-colors duration-200 hover:bg-app-sunken">
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-app-ink">Photos of you in this home</span>
        <span className="block text-[13px] text-app-muted">Optional. One photo per room, with you in it.</span>
      </span>
      <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-app-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );

  if (!open) return toggle;
  const picker = influencerList.length > 0
    ? <InfluencerPicker influencers={influencerList} selfieUrl={selfieUrl} value={{ influencerId, photoId: influencerPhotoId }} onChange={setFaceChoice} />
    : null;

  return (
    <div className="flex flex-col gap-5">
      {toggle}
      {!me?.workspace?.hasIdentity ? <NoFace /> : (
        <>
          <CreateSection step={step} title="What’s happening?" sub="With this home, right now.">
            <OccasionPicker value={occasion} onChange={setOccasionPick} fromZillow={!occasionPick && Boolean(listing.occasion)} />
          </CreateSection>
          <CreateSection step={step + 1} title="Who and how" sub="Pick who is in the photos, then the style details.">
            <div className="flex flex-col gap-3">
              <FaceRow picker={picker} selfies={selfies} />
              <StyleLine value={style} onChange={setStyle} fallback={fallback} />
            </div>
          </CreateSection>
          <CreateSection step={step + 2} title="Formats" sub="Each format is created at its own shape and counts as a photo.">
            <FormatPicker value={formats} onChange={setFormats} highRes={highRes} onHighRes={setHighRes} highResAllowed={Boolean(me.plan?.highRes)} />
          </CreateSection>
          <CreditSummaryBar
            breakdown={`${rooms} photo${rooms === 1 ? '' : 's'} × ${formats.length} format${formats.length > 1 ? 's' : ''}${highRes ? ' × 2 (high-res)' : ''}`}
            estimate={estimate}
            error={submitError ?? error}
            hint={rooms > 0 && !occasion ? 'Pick what’s happening with this home.' : undefined}
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
