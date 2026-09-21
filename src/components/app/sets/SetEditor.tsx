'use client';

import { useAppRouter } from '../shell/AppLink';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { SetTemplateDto, StudioSetDto } from '../../../types/business/catalog';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { SkeletonGrid } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';
import { ModelGrid } from '../onboarding/ShopModelStep';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { ChipGroup } from '../../ui/Chip';
import { defaultStyle, StyleOptions, type BrandStyle } from './steps/StyleOptions';
import { TemplateGrid } from './steps/TemplateGrid';
import { ArchiveSetDialog } from './ArchiveSetDialog';
import { IdentityPhotosCard } from './IdentityPhotosCard';

type SetEditorProps = { existing?: StudioSetDto };

/** Create (no `existing`) or edit a style / shop look. Template can't change after creation. */
export const SetEditor = ({ existing }: SetEditorProps) => {
  const { product, refresh } = useWorkspace();
  const router = useAppRouter();
  const templates = useApi<{ templates: SetTemplateDto[] }>(product ? `/api/app/templates?product=${product}` : null);
  // "Add this style" on the Styles page arrives with ?template=<id> already picked.
  const urlTemplate = useSearchParams().get('template');
  const [templateId, setTemplateId] = useState<string | null>(existing?.templateId ?? urlTemplate);
  const [name, setName] = useState(existing?.name ?? '');
  const [styleChoice, setStyle] = useState<BrandStyle | null>(existing ? { locations: existing.locations, wardrobe: existing.wardrobe ?? 'smart_casual', poseEnergy: existing.poseEnergy ?? 'warm_approachable', brandColors: existing.brandColors } : null);
  const [modelRef, setModelRef] = useState<string>(existing?.modelRef ?? 'me');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const template = templates.data?.templates.find((t) => t.id === templateId) ?? null;
  const style = styleChoice ?? (template ? defaultStyle(template) : null);
  const noun = product === 'shop' ? 'shop look' : 'style';

  const pick = (id: string) => {
    setTemplateId(id);
    const t = templates.data?.templates.find((x) => x.id === id) ?? null;
    setStyle(defaultStyle(t));
    if (!name && t) setName(t.name);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { product, name: name || template?.name || '', ...(product === 'brand' ? style : { modelRef }) };
      if (existing) await apiFetch(`/api/app/sets/${existing.id}`, { method: 'PATCH', json: body });
      else await apiFetch('/api/app/sets', { method: 'POST', json: { ...body, templateId } });
      refresh();
      router.push('/app/sets');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not save this ${noun}.`);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {!existing && (templates.loading ? <SkeletonGrid count={6} cols={3} /> : <TemplateGrid templates={templates.data?.templates ?? []} value={templateId} onChange={pick} />)}
      {(template || existing) && (
        <Card>
          <CardBody className="flex flex-col gap-6">
            <Field label="Name" htmlFor="set-name" required><TextInput id="set-name" value={name || (existing ? '' : template?.name ?? '')} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
            {product === 'brand' && template && style && <StyleOptions template={template} value={style} onChange={setStyle} />}
            {product === 'shop' && (
              <Field label="Who wears the products?">
                <div className="flex flex-col gap-4">
                  <ChipGroup options={[{ value: 'me', label: 'Me' }, { value: 'studio', label: 'Studio model' }]} value={modelRef === 'me' ? 'me' : 'studio'} onChange={(v) => setModelRef(v === 'me' ? 'me' : '')} />
                  {modelRef === 'me' && <IdentityPhotosCard product="shop" compact />}
                  {modelRef !== 'me' && <ModelGrid value={modelRef} onChange={setModelRef} />}
                </div>
              </Field>
            )}
            {existing && <p className="text-[13px] text-app-muted">Changes apply to new batches. Photos you already created stay the same.</p>}
          </CardBody>
        </Card>
      )}
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {existing && <AppButton variant="ghost" className="mr-auto text-app-danger" onClick={() => setArchiving(true)}>Archive {noun}</AppButton>}
        <AppButton variant="ghost" onClick={() => router.push('/app/sets')}>Cancel</AppButton>
        <AppButton size="lg" loading={busy} disabled={!(name || template?.name) || (!existing && !templateId) || (product === 'shop' && !modelRef)} onClick={save}>{existing ? 'Save changes' : `Add ${noun}`}</AppButton>
      </div>
      {existing && archiving && <ArchiveSetDialog setId={existing.id} name={existing.name} noun={noun} onClose={() => setArchiving(false)} onArchived={() => { refresh(); router.push('/app/sets'); }} />}
    </div>
  );
};
