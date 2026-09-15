'use client';

import { Check, Link2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useShopConnection } from '../../../hooks/useShopConnection';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { formatUsd } from '../../../lib/money';
import type { ProductDto } from '../../../types/business/products';
import type { ShopConnectionDto } from '../../../types/business/shop';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';
import { SkeletonGrid } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';

type Props = { value: string | null; onChange: (productId: string | null) => void };

/** Onboarding: paste the store link, import, then pick one of the best sellers for the free photos. */
export const StoreImportPicker = ({ value, onChange }: Props) => {
  const shop = useShopConnection();
  const [url, setUrl] = useState('');
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = shop.connection?.status === 'ready';
  const products = useApi<{ products: ProductDto[] }>(ready ? '/api/app/products?sort=best_selling' : null);
  const top = (products.data?.products ?? []).slice(0, 6);
  const pending = top.some((p) => p.photoPending);

  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => products.refresh(), 4_000);
    return () => window.clearTimeout(id);
  }, [pending, products]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { connection } = await apiFetch<{ connection: ShopConnectionDto }>('/api/app/shop/connection', { method: 'POST', json: { url, attest } });
      track('store_connected', { source: 'onboarding' });
      shop.setConnection(connection);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not import this store.');
    } finally {
      setBusy(false);
    }
  };

  if (!shop.loaded) return <SkeletonGrid count={3} cols={3} />;

  if (!shop.connection || shop.connection.status === 'failed') {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Link2 aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <TextInput aria-label="Your TikTok Shop link" inputMode="url" placeholder="https://shop.tiktok.com/us/store/your-shop/…" value={url} onChange={(e) => setUrl(e.target.value)} className="pl-9" />
        </div>
        <Checkbox checked={attest} onChange={setAttest} label="I own or manage this shop." />
        {(error ?? shop.connection?.error) && <p role="alert" className="text-[13px] text-app-danger">{error ?? shop.connection?.error}</p>}
        <AppButton loading={busy} disabled={!url || !attest} onClick={connect} className="self-start">Import my store</AppButton>
      </div>
    );
  }

  if (!ready) {
    return <p className="flex items-center gap-2 text-[14px] text-app-muted" role="status"><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Importing your products… usually under a minute.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-app-ink">{shop.connection.shopName ?? 'Your store'} · {shop.connection.productCount} products. Pick one for your free photos:</p>
      {products.loading && !products.data ? <SkeletonGrid count={6} cols={3} /> : (
        <div role="radiogroup" aria-label="Product for your free photos" className="grid grid-cols-3 gap-3">
          {top.map((p) => {
            const image = p.frontUrl ?? p.frontImageUrl ?? p.imageUrls[0];
            const selected = value === p.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={selected} disabled={p.photoPending} onClick={() => onChange(p.id)} className="flex flex-col gap-1.5 text-left disabled:opacity-60">
                <span className={`relative block aspect-[3/4] overflow-hidden rounded-xl bg-app-panel ring-2 transition-colors duration-200 ${selected ? 'ring-app-accent' : 'ring-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage or TikTok CDN image */}
                  {image && <img src={image} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
                  {selected && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-app-accent-ink"><Check aria-hidden className="h-4 w-4" /></span>}
                  {p.photoPending && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">Getting photo…</span>}
                </span>
                <span className="line-clamp-2 text-[12px] font-medium leading-snug text-app-ink">{p.name}</span>
                <span className="text-[11px] text-app-muted">{p.priceCents != null ? formatUsd(p.priceCents, { showCents: true }) : ''}{p.soldCount != null ? ` · ${p.soldCount.toLocaleString('en-US')} sold` : ''}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
