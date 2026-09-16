'use client';

import { Archive, ArchiveRestore, Check, Package, Plus, Search } from 'lucide-react';
import { useAppRouter } from '../shell/AppLink';
import { useEffect, useState } from 'react';
import { PRODUCT_CATEGORIES } from '../../../config/shots';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import type { ProductDto } from '../../../types/business/products';
import { AppButton } from '../../ui/AppButton';
import { Badge } from '../../ui/Badge';
import { ChipGroup } from '../../ui/Chip';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Select } from '../../ui/Select';
import { SkeletonGrid } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';
import { ToastContainer } from '../../ui/Toast';
import { AddProductsSheet } from './AddProductsSheet';
import { ArchiveProductsDialog } from './ArchiveProductsDialog';
import { ProductDetailSheet } from './ProductDetailSheet';

const STATUS = [{ value: 'all', label: 'All' }, { value: 'unused', label: 'New' }, { value: 'used', label: 'Photographed' }, { value: 'archived', label: 'Archived' }] as const;

export const ProductsView = () => {
  const router = useAppRouter();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<ProductDto | null>(null);
  const [archiving, setArchiving] = useState<string[] | null>(null);
  const [archiveMode, setArchiveMode] = useState(true);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const showArchived = status === 'archived';
  const query = new URLSearchParams({ ...(debounced ? { search: debounced } : {}), ...(category ? { category } : {}), ...(status !== 'all' && !showArchived ? { status } : {}), ...(showArchived ? { archived: 'true' } : {}) });
  const { data, error, loading, refresh } = useApi<{ products: ProductDto[] }>(`/api/app/products?${query.toString()}`);
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <TextInput aria-label="Search products" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="w-40"><Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></div>
        <ChipGroup options={STATUS} value={status} onChange={(v) => setStatus(String(v))} />
        <AppButton iconLeft={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)} className="ml-auto">Add products</AppButton>
      </div>
      {showArchived && (
        <p className="text-[13px] text-app-muted">Archived products stay out of new drops and weekly store syncs. Their photos stay in your library.</p>
      )}
      {loading && !data && <SkeletonGrid count={8} cols={4} />}
      {error && <ErrorState message={error} onRetry={refresh} />}
      {data && data.products.length === 0 && (
        showArchived
          ? <EmptyState illustration={<Archive className="h-10 w-10" />} title="No archived products" body="Archive products you don’t sell anymore to keep this list short." />
          : <EmptyState illustration={<Package className="h-10 w-10" />} title={debounced || category || status !== 'all' ? 'No products match' : 'Add your first products'} body="A clear front photo on a plain background works best." action={{ label: 'Add products', onClick: () => setAdding(true) }} />
      )}
      {data && data.products.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.products.map((p) => (
            <li key={p.id} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-app-panel transition-colors duration-200 ${selected.has(p.id) ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-line'}`}>
              <button type="button" onClick={() => setDetail(p)} className="relative aspect-square bg-app-sunken" aria-label={`Edit ${p.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                {p.frontUrl && <img src={p.frontUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
              </button>
              <button type="button" aria-label={selected.has(p.id) ? `Unselect ${p.name}` : `Select ${p.name}`} aria-pressed={selected.has(p.id)} onClick={() => toggle(p.id)} className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 ${selected.has(p.id) ? 'border-app-accent bg-app-accent text-app-accent-ink' : 'border-white bg-black/30'}`}>
                {selected.has(p.id) && <Check aria-hidden className="h-4 w-4" />}
              </button>
              <div className="flex flex-col gap-1 p-3">
                <span className="truncate text-[14px] font-semibold text-app-ink">{p.name}</span>
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="neutral">{PRODUCT_CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category}</Badge>
                  <span className={`text-[12px] ${p.archived ? 'text-app-warning' : 'text-app-muted'}`}>{p.archived ? 'Archived' : p.lastUsedAt ? 'Photographed' : 'New'}</span>
                </div>
                {p.sku && <span className="truncate text-[12px] text-app-muted">SKU {p.sku}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {selected.size > 0 && (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-panel p-3 shadow-lg lg:bottom-4">
          <span className="text-[14px] font-medium text-app-ink">{selected.size} selected</span>
          <div className="flex gap-2">
            <AppButton variant="secondary" iconLeft={showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />} onClick={() => { setArchiveMode(!showArchived); setArchiving([...selected]); }}>
              {showArchived ? 'Bring back' : 'Archive'}
            </AppButton>
            {!showArchived && <AppButton onClick={() => router.push(`/app/create?products=${[...selected].join(',')}`)}>Create photos</AppButton>}
          </div>
        </div>
      )}
      <AddProductsSheet open={adding} onClose={() => setAdding(false)} onSaved={(n) => { toast(`${n} product${n === 1 ? '' : 's'} added`); refresh(); }} />
      <ProductDetailSheet product={detail} onClose={() => setDetail(null)} onChanged={refresh} onArchive={(id, archived) => { setDetail(null); setArchiving([id]); setArchiveMode(archived); }} />
      {archiving && (
        <ArchiveProductsDialog
          productIds={archiving}
          archived={archiveMode}
          onClose={() => setArchiving(null)}
          onDone={(n) => {
            setArchiving(null);
            setSelected(new Set());
            toast(archiveMode ? `${n} product${n === 1 ? '' : 's'} archived` : `${n} product${n === 1 ? '' : 's'} back in your list`);
            refresh();
          }}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
