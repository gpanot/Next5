'use client';

import { Camera } from 'lucide-react';
import { useState } from 'react';
import type { StudioSetDto } from '../../../../types/business/catalog';
import { AppButton } from '../../../ui/AppButton';
import { CreateSection } from '../../create/CreateSection';
import { ArchiveSetDialog } from '../ArchiveSetDialog';
import { EditPhotosDialog } from '../IdentityPhotosCard';
import { ModelAvatar } from './ModelAvatar';
import { ModelChoice } from './ModelChoice';
import { ME, modelInfo } from './modelIdentity';
import { useShopModelForm } from './useShopModelForm';

type Props = { existing?: StudioSetDto };

const ExistingModel = ({ set, onArchive }: { set: StudioSetDto; onArchive: () => void }) => {
  const model = modelInfo(set.modelRef || ME);
  return (
    <div className="flex items-center gap-3">
      <ModelAvatar model={model} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-app-ink">{model.name}</span>
        {model.description && <span className="block truncate text-[13px] text-app-muted">{model.description}</span>}
      </span>
      <AppButton size="sm" variant="ghost" className="text-app-danger" onClick={onArchive}>Remove</AppButton>
    </div>
  );
};

/** Shop: add a model (a Studio model, or "You" from her photos). Scenes are picked per drop, not here. */
export const ShopModelEditor = ({ existing }: Props) => {
  const form = useShopModelForm(existing);
  const [archiving, setArchiving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const needsPhotos = form.modelRef === ME && !form.hasMyPhotos;

  if (existing) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <CreateSection step={1} title="Model" sub="Pick the scenes each time you create a drop.">
          <ExistingModel set={existing} onArchive={() => setArchiving(true)} />
        </CreateSection>
        {archiving && <ArchiveSetDialog setId={existing.id} name={existing.name} noun="model" onClose={() => setArchiving(false)} onArchived={form.done} />}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <CreateSection step={1} title="Pick a model" sub="Who wears your products. You pick the scenes when you create a drop.">
        <ModelChoice value={form.modelRef} onChange={form.setModelRef} />
      </CreateSection>
      {form.error && <p role="alert" className="text-[14px] text-app-danger">{form.error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <AppButton variant="ghost" onClick={form.cancel}>Cancel</AppButton>
        {needsPhotos ? (
          <AppButton size="lg" iconLeft={<Camera className="h-4 w-4" />} onClick={() => setUploading(true)}>Add your photos</AppButton>
        ) : (
          <AppButton size="lg" loading={form.busy} disabled={!form.canSave} onClick={() => void form.save()}>{form.modelRef === ME ? 'Add me' : 'Add model'}</AppButton>
        )}
      </div>
      {uploading && <EditPhotosDialog product="shop" onClose={() => setUploading(false)} onSaved={() => { setUploading(false); void form.save(); }} />}
    </div>
  );
};
