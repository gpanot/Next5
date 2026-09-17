'use client';

import { ArrowLeft } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import type { BatchEstimateDto } from '../../../types/business/batches';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';

type Props = {
  listing: ListingDto;
  looks: number;
  setName: string | null;
  themeTitle: string | null;
  formatsLabel: string;
  estimate: BatchEstimateDto | null;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
};

/** After she cleaned up a property's photos: everything is chosen, one button makes the photos. */
export const ListingReadyCard = ({ listing, looks, setName, themeTitle, formatsLabel, estimate, loading, error, submitting, onSubmit, onBack }: Props) => {
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
          {listing.statusLabel && <p className="text-[13px] text-app-muted">{listing.statusLabel}</p>}
        </div>
      </div>

      <p className="text-[22px] font-semibold tabular-nums text-app-ink">
        {photos} photo{photos === 1 ? '' : 's'} × {looks} look{looks === 1 ? '' : 's'} = {total} photos
      </p>
      <p className="text-[13px] text-app-muted">
        {[setName && `Set: ${setName}`, themeTitle && `Theme: ${themeTitle}`, formatsLabel].filter(Boolean).join(' · ')}
      </p>

      <div aria-live="polite" className="text-[13px]">
        {error ? (
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
          <AppButton size="lg" className="sm:flex-1" loading={submitting} disabled={loading || Boolean(error) || !estimate || photos === 0} onClick={onSubmit}>
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
