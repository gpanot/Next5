'use client';

import { track } from '../../../lib/analytics';
import { Package } from 'lucide-react';
import { useAppRouter } from '../shell/AppLink';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { lastSetStore } from '../../../lib/localStore';
import type { BatchSummaryDto } from '../../../types/business/batches';
import type { SetTemplateDto, StudioSetDto } from '../../../types/business/catalog';
import type { ProductDto } from '../../../types/business/products';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Switch } from '../../ui/Switch';
import { SkeletonCard } from '../../ui/Skeleton';
import type { Identity } from '../sets/IdentityPhotoGrid';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CreateSection } from './CreateSection';
import { CreditSummaryBar } from './CreditSummaryBar';
import { FormatPicker } from './FormatPicker';
import { ProductPicker } from './ProductPicker';
import { ScenePicker } from './ScenePicker';
import { ShopModelPicker } from './ShopModelPicker';
import { useShopDraft } from './useShopDraft';

type Data = { products: ProductDto[]; sets: StudioSetDto[]; scenes: SetTemplateDto[]; myPhotoUrl: string | null };

/** Create a drop: products › models › scenes and poses › formats. */
const ShopCreateForm = ({ data }: { data: Data }) => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const d = useShopDraft(data.sets, data.scenes);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const story = d.formats.includes('story_9_16');

  const submit = async () => {
    if (!d.draft) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/batches', { method: 'POST', json: d.draft });
      track('batch_created', { product: 'shop', items: res.batch.progress.total });
      lastSetStore.set(d.draft.setId);
      refresh();
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start this drop.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <CreateSection step={1} title="Products" sub="Up to 40 per drop.">
        <ProductPicker products={data.products} selected={d.selected} onToggle={d.toggleProduct} onlyNew={d.onlyNew} onOnlyNew={d.setOnlyNew} />
      </CreateSection>
      <CreateSection step={2} title="Models" sub="Who wears your products.">
        <ShopModelPicker sets={data.sets} value={d.models} onChange={d.setModels} myPhotoUrl={data.myPhotoUrl} />
      </CreateSection>
      <CreateSection step={3} title="Scene and poses" sub="Where she poses, and how. Tap a pose to leave it out.">
        <ScenePicker scenes={data.scenes} value={d.scenePicks} onChange={d.setScenes} />
      </CreateSection>
      <CreateSection step={4} title="Formats">
        <div className="flex flex-col gap-4">
          <FormatPicker value={d.formats} onChange={d.setFormats} highRes={d.highRes} onHighRes={d.setHighRes} highResAllowed={Boolean(me?.plan?.highRes)} />
          <Switch
            checked={d.withCover || story}
            disabled={story}
            onChange={d.setWithCover}
            label={(
              <span className="flex flex-col">
                <span className="text-[14px] font-medium text-app-ink">Add a 9:16 video cover for each product</span>
                <span className="text-[13px] text-app-muted">{story ? 'Every photo is already made in 9:16, so you have covers.' : 'One extra photo per product. TikTok shows it on your listing video. Your square photos stay the same.'}</span>
              </span>
            )}
          />
        </div>
      </CreateSection>
      <CreditSummaryBar
        breakdown={d.breakdown}
        estimate={d.estimate}
        error={submitError ?? d.error}
        hint={d.models.length === 0 ? 'Add a model first.' : undefined}
        loading={d.loading}
        submitting={submitting}
        disabled={!d.draft}
        onSubmit={submit}
      />
    </div>
  );
};

export const ShopCreateFlow = () => {
  const router = useAppRouter();
  const products = useApi<{ products: ProductDto[] }>('/api/app/products');
  const sets = useApi<{ sets: StudioSetDto[] }>('/api/app/sets?product=shop');
  const scenes = useApi<{ templates: SetTemplateDto[] }>('/api/app/templates?product=shop');
  const identity = useApi<{ identities: Identity[] }>('/api/app/identity?product=shop');

  if (products.loading || sets.loading || scenes.loading) return <div className="flex flex-col gap-4"><SkeletonCard /><SkeletonCard /></div>;
  const failed = products.error ?? sets.error ?? scenes.error;
  if (failed) return <ErrorState message={failed} onRetry={() => { products.refresh(); sets.refresh(); scenes.refresh(); }} />;
  if (!products.data?.products.length) {
    return <EmptyState illustration={<Package className="h-10 w-10" />} title="Add products first" body="Upload front photos of the items you want photographed." action={{ label: 'Add products', onClick: () => router.push('/app/products') }} />;
  }
  const photos = identity.data?.identities ?? [];
  const myPhotoUrl = photos.find((p) => p.kind === 'face')?.url ?? photos[0]?.url ?? null;
  return <ShopCreateForm data={{ products: products.data.products, sets: sets.data?.sets ?? [], scenes: scenes.data?.templates ?? [], myPhotoUrl }} />;
};
