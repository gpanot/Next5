'use client';

import { ArrowRight, Images } from 'lucide-react';
import { useState } from 'react';
import { SHOTS, TIKTOK_PHOTO_SWEET_SPOT, type ShotId } from '../../../config/shots';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { BatchDetailDto, BatchProductDto, BatchSummaryDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { AppLink as Link } from '../shell/AppLink';

type ProductMorePhotosProps = {
  batch: BatchDetailDto;
  product: BatchProductDto;
  onStarted: () => void;
  onError: (message: string) => void;
};

const labelFor = (shot: string): string => (shot in SHOTS ? SHOTS[shot as ShotId].label : shot);

/**
 * Inside one product's row, once the batch is done: TikTok's 5–9 photo tip and one tap for the next angles
 * of this product. The seller stays on the page (a drop can have many products) and gets a link to the new photos.
 */
export const ProductMorePhotos = ({ batch, product, onStarted, onError }: ProductMorePhotosProps) => {
  const [busy, setBusy] = useState(false);
  const [startedBatchId, setStartedBatchId] = useState<string | null>(null);
  const active = batch.status === 'queued' || batch.status === 'generating';
  const { min, max } = TIKTOK_PHOTO_SWEET_SPOT;

  if (startedBatchId) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-app-sunken px-3 py-2.5 text-[13px] text-app-ink" aria-live="polite">
        <span className="flex items-center gap-2"><Images aria-hidden className="h-4 w-4 text-app-accent" />New angles are being created for this product.</span>
        <Link href={`/app/batches/${startedBatchId}`} className="inline-flex items-center gap-1 font-medium text-app-accent transition-colors duration-200 hover:text-app-ink">Open <ArrowRight aria-hidden className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }
  if (active || !batch.setId || product.nextShots.length === 0) return null;

  const photos = product.nextShots.length * batch.formats.length;
  const credits = photos * (batch.highRes ? 2 : 1);

  const create = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/batches', {
        method: 'POST',
        json: { product: 'shop', kind: 'shop_products', more: true, setId: batch.setId, productIds: [product.id], packId: batch.packId ?? 'listing', formats: batch.formats, highRes: batch.highRes },
      });
      track('more_photos_created', { products: 1, photos });
      setStartedBatchId(res.batch.id);
      onStarted();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not start more photos. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-accent/25 bg-app-accent-soft px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2.5">
        <Images aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
        <p className="text-[13px] text-app-ink">
          <span className="font-semibold">{product.angleCount} photo{product.angleCount === 1 ? '' : 's'} so far.</span>{' '}
          TikTok listings with {min} to {max} photos sell better. Next angles: {product.nextShots.map(labelFor).join(', ')}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[12px] text-app-muted">Uses {credits}</span>
        <AppButton size="sm" loading={busy} onClick={() => void create()}>Create {photos} more</AppButton>
      </div>
    </div>
  );
};
