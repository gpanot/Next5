'use client';

import { track } from '../../../lib/analytics';
import { Package } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAppRouter } from '../shell/AppLink';
import { useMemo, useState } from 'react';
import { FORMATS, type FormatId } from '../../../config/formats';
import { PACKS, type PackId } from '../../../config/shots';
import { useApi } from '../../../hooks/useApi';
import { useEstimate } from '../../../hooks/useEstimate';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { lastSetStore } from '../../../lib/localStore';
import type { BatchSummaryDto } from '../../../types/business/batches';
import type { StudioSetDto } from '../../../types/business/catalog';
import type { ProductDto } from '../../../types/business/products';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CreateSection } from './CreateSection';
import { CreditSummaryBar } from './CreditSummaryBar';
import { FormatPicker } from './FormatPicker';
import { ProductPicker } from './ProductPicker';
import { SetPicker } from './SetPicker';

const PACK_CHOICES: PackId[] = ['listing', 'full'];

export const ShopCreateFlow = () => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const params = useSearchParams();
  const products = useApi<{ products: ProductDto[] }>('/api/app/products');
  const sets = useApi<{ sets: StudioSetDto[] }>('/api/app/sets?product=shop');
  const lastSet = lastSetStore.useValue();
  const preselected = (params.get('products') ?? '').split(',').filter(Boolean);
  const defaults = (me?.workspace?.defaultFormats ?? []).filter((f): f is FormatId => f in FORMATS);

  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [onlyNew, setOnlyNew] = useState(preselected.length === 0);
  // A drop link can carry its look, shots and sizes (?set=&pack=&formats=).
  const urlPack = params.get('pack');
  const urlFormats = (params.get('formats') ?? '').split(',').filter((f): f is FormatId => f in FORMATS);
  const [setChoice, setSetChoice] = useState<string | null>(params.get('set'));
  const [packId, setPackId] = useState<PackId>(urlPack === 'full' || urlPack === 'accessory' ? urlPack : 'listing');
  const [formats, setFormats] = useState<FormatId[]>(urlFormats.length ? urlFormats : defaults.length ? defaults : ['square_1_1']);
  const [highRes, setHighRes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setId = setChoice ?? sets.data?.sets.find((s) => s.id === lastSet)?.id ?? sets.data?.sets[0]?.id ?? null;
  const productIds = useMemo(() => [...selected], [selected]);
  const draft = useMemo(() => (setId && productIds.length ? { product: 'shop', kind: 'shop_products', setId, productIds, packId, formats, highRes } : null), [setId, productIds, packId, formats, highRes]);
  const { estimate, error, loading } = useEstimate(draft);

  if (products.loading || sets.loading) return <div className="flex flex-col gap-4"><SkeletonCard /><SkeletonCard /></div>;
  if (!products.data?.products.length) {
    return <EmptyState illustration={<Package className="h-10 w-10" />} title="Add products first" body="Upload front photos of the items you want photographed." action={{ label: 'Add products', onClick: () => router.push('/app/products') }} />;
  }

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/batches', { method: 'POST', json: draft });
      track('batch_created', { product: 'shop', items: res.batch.progress.total });
      if (setId) lastSetStore.set(setId);
      refresh();
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start this batch.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <CreateSection step={1} title="Products" sub="Up to 40 per batch.">
        <ProductPicker products={products.data.products} selected={selected} onToggle={toggle} onlyNew={onlyNew} onOnlyNew={setOnlyNew} />
      </CreateSection>
      <CreateSection step={2} title="Shop look" sub="The look and model for every photo in this batch.">
        <SetPicker sets={sets.data?.sets ?? []} value={setId} onChange={setSetChoice} noun="Shop look" />
      </CreateSection>
      <CreateSection step={3} title="Shots per product" sub="Bags, shoes and jewelry automatically get the accessory pack. Back shots need a back photo.">
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
          {PACK_CHOICES.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={packId === id} onClick={() => setPackId(id)} className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors duration-200 ${packId === id ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}>
              <span className="text-[15px] font-semibold text-app-ink">{PACKS[id].label} · {PACKS[id].shots.length} shots</span>
              <span className="text-[13px] text-app-muted">{PACKS[id].description}</span>
            </button>
          ))}
        </div>
      </CreateSection>
      <CreateSection step={4} title="Formats">
        <FormatPicker value={formats} onChange={setFormats} highRes={highRes} onHighRes={setHighRes} highResAllowed={Boolean(me?.plan?.highRes)} />
      </CreateSection>
      <CreditSummaryBar
        breakdown={`${productIds.length} product${productIds.length === 1 ? '' : 's'} × up to ${PACKS[packId].shots.length} shots × ${formats.length} format${formats.length > 1 ? 's' : ''}`}
        estimate={estimate}
        error={submitError ?? error}
        loading={loading}
        submitting={submitting}
        disabled={!draft}
        onSubmit={submit}
      />
    </div>
  );
};
