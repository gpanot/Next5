'use client';

import { useState } from 'react';
import { PRODUCT_CATEGORIES } from '../../../config/shots';
import { useApi } from '../../../hooks/useApi';
import { apiFetch } from '../../../lib/apiClient';
import { onboardingModelStore } from '../../../lib/localStore';
import type { SetTemplateDto } from '../../../types/business/catalog';
import { AppButton } from '../../ui/AppButton';
import { Field } from '../../ui/Field';
import { Select } from '../../ui/Select';
import { SkeletonGrid } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';
import { PhotoSlot } from '../shared/PhotoSlot';
import { TemplateGrid } from '../sets/steps/TemplateGrid';
import { GuideImages, PRODUCT_GUIDES } from './GuideImages';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';
import { useUpload, type PendingPhoto } from './useUpload';

export const ShopLookStep = ({ me, advance }: StepProps) => {
  const { data, loading } = useApi<{ templates: SetTemplateDto[] }>('/api/app/templates?product=shop');
  const model = onboardingModelStore.useValue() ?? 'me';
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PendingPhoto | null>(null);
  const [product, setProduct] = useState({ name: '', category: '', colorName: '' });
  const { upload, busy, error, setError } = useUpload();
  const hasSet = (me.workspace?.setCount ?? 0) > 0;
  const ready = (hasSet || templateId) && photo && product.name && product.category;

  const submit = async () => {
    try {
      if (templateId && !hasSet) {
        const template = data?.templates.find((t) => t.id === templateId);
        await apiFetch('/api/app/sets', { method: 'POST', json: { product: 'shop', templateId, name: template?.name, modelRef: model } });
      }
      if (!photo) return;
      const form = new FormData();
      form.set('front', photo.file);
      Object.entries(product).forEach(([k, v]) => form.set(k, v));
      if (await upload('/api/app/products', form)) await advance(4);
    } catch (err) {
      setError(stepError(err, 'Could not save your look.'));
    }
  };

  return (
    <StepCard
      title="Pick your shop look and add a product"
      sub="Your look keeps every product photo consistent. Add one product to try it for free."
      footer={<AppButton size="lg" loading={busy} disabled={!ready} onClick={submit}>Continue</AppButton>}
    >
      {!hasSet && (loading ? <SkeletonGrid count={6} cols={3} /> : <TemplateGrid templates={data?.templates ?? []} value={templateId} onChange={setTemplateId} />)}
      <div className="grid gap-5 rounded-2xl bg-app-sunken p-4 sm:grid-cols-[180px_1fr] sm:p-5">
        <PhotoSlot label="Front photo" hint="One item, plain background" capture="environment" previewUrl={photo?.previewUrl ?? null} onFile={(file, previewUrl) => setPhoto({ file, previewUrl })} />
        <div className="flex flex-col gap-4">
          <Field label="Product name" htmlFor="ob-product-name" required>
            <TextInput id="ob-product-name" value={product.name} onChange={(e) => setProduct((p) => ({ ...p, name: e.target.value }))} placeholder="Linen two-piece set" />
          </Field>
          <Field label="Category" htmlFor="ob-product-category" required>
            <Select id="ob-product-category" value={product.category} onChange={(e) => setProduct((p) => ({ ...p, category: e.target.value }))}>
              <option value="">Choose…</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Colour" htmlFor="ob-product-colour" helper="Helps keep the colour exact">
            <TextInput id="ob-product-colour" value={product.colorName} onChange={(e) => setProduct((p) => ({ ...p, colorName: e.target.value }))} placeholder="Beige" />
          </Field>
        </div>
      </div>
      <GuideImages guides={PRODUCT_GUIDES} />
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
