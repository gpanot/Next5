'use client';

import { ArrowLeft } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import { occasionLabel, type Occasion } from '../../../lib/listingOccasions';
import type { BatchEstimateDto } from '../../../types/business/batches';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';
import { OccasionPicker } from './OccasionPicker';
import { StyleLine, type Style } from './StyleLine';

type Props = {
  listing: ListingDto;
  looks: number;
  occasion: Occasion | null;
  occasionFromZillow: boolean;
  onOccasion: (occasion: Occasion) => void;
  styleValue: Style;
  styleFallback: { wardrobe: string | null; poseEnergy: string | null };
  onStyle: (style: Style) => void;
  formatsLabel: string;
  estimate: BatchEstimateDto | null;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
};

/**
 * After she cleaned up a property's photos: one button makes the photos. If nothing says what is happening
 * with the home, she picks it right here — on this card, not back in the form.
 */
export const ListingReadyCard = ({
  listing, looks, occasion, occasionFromZillow, onOccasion, styleValue, styleFallback, onStyle,
  formatsLabel, estimate, loading, error, submitting, onSubmit, onBack,
}: Props) => {
  const photos = listing.rooms.length;
  const total = photos * looks;
  const short = estimate && !estimate.canAfford;
  const cover = listing.rooms[0]?.url;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-app-accent">Ready</p>
          <h2 className="truncate text-[17px] font-semibold text-app-ink">{listing.label}</h2>
          {occasion && <p className="text-[13px] text-app-muted">{occasionLabel(occasion)}</p>}
        </div>
      </div>

      <p className="text-[22px] font-semibold tabular-nums text-app-ink">
        {photos} photo{photos === 1 ? '' : 's'} × {looks} look{looks === 1 ? '' : 's'} = {total} photos
      </p>
      <p className="-mt-2 text-[13px] text-app-muted">Size: {formatsLabel}</p>
      {!occasion && (
        <div className="flex flex-col gap-2 rounded-xl border border-app-line p-3">
          <p className="text-[14px] font-medium text-app-ink">What’s happening with this home?</p>
          <OccasionPicker value={occasion} onChange={onOccasion} fromZillow={occasionFromZillow} />
        </div>
      )}
      <div className="flex flex-col gap-1 rounded-xl bg-app-sunken px-3 py-2">
        <p className="text-[12px] font-medium uppercase tracking-wide text-app-muted">Your style</p>
        <StyleLine value={styleValue} onChange={onStyle} fallback={styleFallback} />
      </div>

      <div aria-live="polite" className="text-[13px]">
        {!occasion ? (
          <p className="text-app-muted">Pick what’s happening to see the cost.</p>
        ) : error ? (
          <p className="text-app-danger">{error}</p>
        ) : loading || !estimate ? (
          <p className="text-app-muted">Checking your balance…</p>
        ) : short ? (
          <p className="text-app-warning">This uses {estimate.credits} photos. You have {estimate.balance}.</p>
        ) : (
          <p className="text-app-muted">Uses {estimate.credits} photos. You have {estimate.balance} → {estimate.balance - estimate.credits} after.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {short ? (
          <Link href="/app/billing" className="inline-flex h-12 items-center justify-center rounded-xl bg-app-accent px-5 text-[14px] font-medium text-app-accent-ink transition-opacity duration-200 hover:opacity-90 sm:flex-1">
            Top up to make them
          </Link>
        ) : (
          <AppButton size="lg" className="sm:flex-1" loading={submitting} disabled={!occasion || loading || Boolean(error) || !estimate || photos === 0} onClick={onSubmit}>
            {estimate ? `Make my ${estimate.credits} photos` : `Make my ${total} photos`}
          </AppButton>
        )}
        <AppButton size="lg" variant="secondary" iconLeft={<ArrowLeft aria-hidden className="h-4 w-4" />} onClick={onBack}>
          Change photos or settings
        </AppButton>
      </div>
    </section>
  );
};
