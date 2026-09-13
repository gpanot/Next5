'use client';

import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { apiFetch } from '../../../lib/apiClient';
import type { SetTemplateDto } from '../../../types/business/catalog';
import { AppButton } from '../../ui/AppButton';
import { SkeletonGrid } from '../../ui/Skeleton';
import { defaultStyle, StyleOptions, type BrandStyle } from '../sets/steps/StyleOptions';
import { TemplateGrid } from '../sets/steps/TemplateGrid';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

export const BrandSetStep = ({ me, advance }: StepProps) => {
  const { data, loading } = useApi<{ templates: SetTemplateDto[] }>('/api/app/templates?product=brand');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [style, setStyle] = useState<BrandStyle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const template = data?.templates.find((t) => t.id === templateId) ?? null;
  const hasSet = (me.workspace?.setCount ?? 0) > 0;

  const pick = (id: string) => {
    setTemplateId(id);
    setStyle(defaultStyle(data?.templates.find((t) => t.id === id) ?? null));
  };

  const submit = async () => {
    if (!template || !style) {
      if (hasSet) await advance(4);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/app/sets', { method: 'POST', json: { product: 'brand', templateId: template.id, name: template.name, ...style } });
      await advance(4);
    } catch (err) {
      setError(stepError(err, 'Could not save your set.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="Pick your set"
      sub="Your set is your signature look. Every batch uses it, so your feed stays consistent."
      footer={<AppButton size="lg" loading={busy} disabled={!template && !hasSet} onClick={submit}>{template ? 'Save my set' : 'Continue'}</AppButton>}
    >
      {loading ? <SkeletonGrid count={6} cols={3} /> : <TemplateGrid templates={data?.templates ?? []} value={templateId} onChange={pick} />}
      {template && style && (
        <div className="rounded-2xl bg-app-sunken p-4 sm:p-5">
          <StyleOptions template={template} value={style} onChange={setStyle} />
        </div>
      )}
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
