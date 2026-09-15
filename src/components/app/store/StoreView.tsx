'use client';

import { Search, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useShopConnection } from '../../../hooks/useShopConnection';
import { useToast } from '../../../hooks/useToast';
import type { ProductDto } from '../../../types/business/products';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard, SkeletonGrid } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';
import { ToastContainer } from '../../ui/Toast';
import { useAppRouter } from '../shell/AppLink';
import { CatalogGrid } from './CatalogGrid';
import { ConnectStoreCard } from './ConnectStoreCard';
import { DropScheduleCard } from './DropScheduleCard';
import { ReferencePickerSheet } from './ReferencePickerSheet';
import { StoreHeader } from './StoreHeader';

const FILTERS = [
  { value: 'needs', label: 'Needs photos' },
  { value: 'best', label: 'Best sellers' },
  { value: 'all', label: 'All' },
] as const;

/** Shop Studio → Store: connect the TikTok Shop, see the catalog, pick products for the next drop. */
export const StoreView = () => {
  const router = useAppRouter();
  const shop = useShopConnection();
  const [reconnect, setReconnect] = useState(false);
  const [filter, setFilter] = useState<string>('needs');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const status = shop.connection?.status;
  const products = useApi<{ products: ProductDto[] }>(status === 'ready' ? `/api/app/products?sort=best_selling${search ? `&search=${encodeURIComponent(search)}` : ''}` : null);

  // Reference photos download in the background right after an import: refresh until they're all in.
  const pending = products.data?.products.some((p) => p.photoPending) ?? false;
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => products.refresh(), 5_000);
    return () => window.clearTimeout(id);
  }, [pending, products]);

  const visible = useMemo(() => {
    const list = products.data?.products ?? [];
    return filter === 'needs' ? list.filter((p) => p.timesUsed === 0) : list;
  }, [products.data, filter]);
  const open = products.data?.products.find((p) => p.id === openId) ?? null;
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (!shop.loaded) return <SkeletonCard />;
  if (shop.error && !shop.connection) return <ErrorState message={shop.error} onRetry={() => void shop.refresh()} />;
  if (!shop.connection || reconnect) {
    return (
      <>
        <ConnectStoreCard
          onConnected={(c) => { shop.setConnection(c); setReconnect(false); }}
          onImported={(n) => { toast(`${n} products imported`); setReconnect(false); void shop.refresh(); }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <>
      <StoreHeader connection={shop.connection} onChange={shop.setConnection} onReconnect={() => setReconnect(true)} />
      {status === 'ready' && <DropScheduleCard />}
      {status === 'syncing' && <SkeletonGrid count={8} cols={4} />}
      {status === 'failed' && shop.connection.productCount === 0 && <EmptyState illustration={<Store className="h-10 w-10" />} title="No products yet" body="Check the store link, or upload your product export from Seller Center." action={{ label: 'Try again', onClick: () => setReconnect(true) }} />}
      {status === 'ready' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ChipGroup options={FILTERS} value={filter} onChange={(v) => setFilter(String(v))} />
            <div className="relative ml-auto min-w-48">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
              <TextInput aria-label="Search products" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          {products.loading && !products.data && <SkeletonGrid count={8} cols={4} />}
          {products.error && <ErrorState message={products.error} onRetry={products.refresh} />}
          {products.data && visible.length === 0 && <EmptyState illustration={<Store className="h-10 w-10" />} title={filter === 'needs' ? 'Every product has photos' : 'No products match'} body={filter === 'needs' ? 'Nice. Sync after your next restock to bring in new products.' : 'Try another search.'} />}
          {visible.length > 0 && <CatalogGrid products={visible} selected={selected} onToggle={toggle} onOpen={(p) => setOpenId(p.id)} />}
        </>
      )}
      {selected.size > 0 && (
        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-panel p-3 shadow-lg lg:bottom-4">
          <span className="text-[14px] font-medium text-app-ink">{selected.size} selected</span>
          <AppButton onClick={() => router.push(`/app/create?products=${[...selected].join(',')}`)}>Create drop</AppButton>
        </div>
      )}
      <ReferencePickerSheet product={open} onClose={() => setOpenId(null)} onChanged={() => { products.refresh(); toast('Updated'); }} />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
