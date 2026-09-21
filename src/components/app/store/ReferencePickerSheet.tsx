'use client';

import { Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { formatUsd } from '../../../lib/money';
import type { ProductDto } from '../../../types/business/products';
import { AppButton } from '../../ui/AppButton';
import { Sheet } from '../../ui/Sheet';

type Props = { product: ProductDto | null; onClose: () => void; onChanged: () => void };

/** Pick the cleanest listing image as the reference (no text or color swatches), and load all images/variants. */
export const ReferencePickerSheet = ({ product, onClose, onChanged }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={product !== null} onClose={onClose} title={product?.name ?? 'Product'} side="right" className="sm:w-[520px]">
      {product && (
        <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-2">
          <div className="flex flex-wrap items-center gap-3 text-[14px] text-app-muted">
            {product.priceCents != null && <span className="font-semibold text-app-ink">{formatUsd(product.priceCents, { showCents: true })}</span>}
            {product.soldCount != null && <span>{product.soldCount.toLocaleString('en-US')} sold</span>}
            {product.variantCount > 0 && <span>{product.variantCount} variants{product.colors.length ? ` · ${product.colors.join(', ')}` : ''}</span>}
            {product.externalUrl && <a href={product.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-app-accent hover:text-app-ink">On TikTok <ExternalLink aria-hidden className="h-3.5 w-3.5" /></a>}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-app-ink">Reference photo</p>
            <p className="mt-0.5 text-[13px] text-app-muted">Pick the clearest photo of the product: no text, no color swatches, the whole item visible. We copy the product from it.</p>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {product.imageUrls.map((url, i) => {
              const current = url === product.frontImageUrl;
              return (
                <li key={url}>
                  <button type="button" disabled={busy !== null} onClick={() => void run(url, () => apiFetch(`/api/app/shop/products/${product.id}/reference`, { method: 'POST', json: { imageUrl: url } }))} className={`relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-app-sunken ring-2 transition-shadow duration-200 ${current ? 'ring-app-accent' : 'ring-transparent hover:ring-app-line'}`} aria-label={`Use image ${i + 1} as reference`} aria-pressed={current}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- TikTok CDN image */}
                    <img src={url} alt="" className={`h-full w-full object-cover ${busy === url ? 'opacity-50' : ''}`} referrerPolicy="no-referrer" />
                    {current && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-3.5 w-3.5" /></span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {!product.detailsFetched && product.externalUrl && (
            <AppButton variant="secondary" loading={busy === 'details'} disabled={busy !== null} onClick={() => void run('details', () => apiFetch('/api/app/shop/products/details', { method: 'POST', json: { productIds: [product.id] } }))}>
              Load all photos and variants
            </AppButton>
          )}
          {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
        </div>
      )}
    </Sheet>
  );
};
