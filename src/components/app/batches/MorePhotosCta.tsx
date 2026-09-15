'use client';

import { Images } from 'lucide-react';
import { useState } from 'react';
import { SHOTS, TIKTOK_PHOTO_SWEET_SPOT, type ShotId } from '../../../config/shots';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { BatchDetailDto, BatchSummaryDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { useAppRouter } from '../shell/AppLink';

type MorePhotosCtaProps = { batch: BatchDetailDto; onError: (message: string) => void };

const labelFor = (shot: string): string => (shot in SHOTS ? SHOTS[shot as ShotId].label : shot);

/** After a Shop batch finishes: TikTok's 5–9 photo tip and one tap to add the next 3 angles per product. */
export const MorePhotosCta = ({ batch, onError }: MorePhotosCtaProps) => {
  const router = useAppRouter();
  const [busy, setBusy] = useState(false);
  const eligible = batch.products.filter((p) => p.nextShots.length > 0);
  const active = batch.status === 'queued' || batch.status === 'generating';
  if (active || !batch.setId || eligible.length === 0) return null;

  const photos = eligible.reduce((sum, p) => sum + p.nextShots.length, 0) * batch.formats.length;
  const credits = photos * (batch.highRes ? 2 : 1);
  const single = eligible.length === 1 ? eligible[0] : null;
  const { min, max } = TIKTOK_PHOTO_SWEET_SPOT;

  const create = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/batches', {
        method: 'POST',
        json: { product: 'shop', kind: 'shop_products', more: true, setId: batch.setId, productIds: eligible.map((p) => p.id), packId: batch.packId ?? 'listing', formats: batch.formats, highRes: batch.highRes },
      });
      track('more_photos_created', { products: eligible.length, photos });
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not start more photos. Try again.');
      setBusy(false);
    }
  };

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-app-accent/30 bg-app-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex gap-3">
        <Images aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-semibold text-app-ink">TikTok tip: {min} to {max} photos per listing sell better</p>
          <p className="text-[14px] text-app-muted">
            {single
              ? `This product has ${single.angleCount} photo${single.angleCount === 1 ? '' : 's'}. Add ${single.nextShots.length} new angles: ${single.nextShots.map(labelFor).join(', ')}.`
              : `Add up to 3 new angles to each of your ${eligible.length} products.`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        <AppButton loading={busy} onClick={() => void create()}>Create {photos} more photo{photos === 1 ? '' : 's'}</AppButton>
        <span className="text-[12px] text-app-muted">Uses {credits} photo{credits === 1 ? '' : 's'} from your balance</span>
      </div>
    </aside>
  );
};
