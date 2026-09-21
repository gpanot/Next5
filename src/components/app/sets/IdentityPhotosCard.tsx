'use client';

import { ChevronDown, Pencil, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';
import { SelfieFields } from '../onboarding/SelfieFields';
import { useSelfieUpload } from '../onboarding/useSelfieUpload';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { IdentityPhotoGrid, type Identity } from './IdentityPhotoGrid';

export const EditPhotosDialog = ({ product, onClose, onSaved }: { product: ProductLineDto; onClose: () => void; onSaved: () => void }) => {
  const { me } = useWorkspace();
  const selfies = useSelfieUpload(product, Boolean(me?.user.consents.includes('face_processing')));
  const save = async () => { if (await selfies.save()) onSaved(); };
  return (
    <Dialog open onClose={onClose} title="Change your photos" description="New photos replace the old ones. Photos you already created stay the same." className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <div className="flex flex-col gap-5">
        <SelfieFields upload={selfies} />
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
          <AppButton loading={selfies.busy} disabled={!selfies.ready} onClick={() => void save()}>Save photos</AppButton>
        </div>
      </div>
    </Dialog>
  );
};

/**
 * "Photos of me" for this studio. Tap to open a big view where she replaces, removes or adds one photo.
 * "Retake all" (and a first upload) use the same step as onboarding, which also asks for face consent.
 */
export const IdentityPhotosCard = ({ product, compact = false }: { product: ProductLineDto; compact?: boolean }) => {
  const { refresh: refreshMe } = useWorkspace();
  const { data, loading, refresh } = useApi<{ identities: Identity[] }>(`/api/app/identity?product=${product}`);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const photos = data?.identities ?? [];
  const changed = () => { refresh(); refreshMe(); };
  const summary = product === 'shop'
    ? photos.length ? `Used when you wear the products yourself (“Me”). ${photos.length} photo${photos.length === 1 ? '' : 's'}.` : 'Add your photos to wear the products yourself.'
    : photos.length ? `Used to create every photo of you. ${photos.length} photo${photos.length === 1 ? '' : 's'}.` : 'Add your selfies to create photos of you.';

  return (
    <section aria-label="Photos of you" className={`flex flex-col gap-4 rounded-2xl border border-app-line bg-app-panel ${compact ? 'p-3' : 'p-4 shadow-sm'}`}>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => photos.length && setOpen((v) => !v)} aria-expanded={photos.length ? open : undefined} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span className="flex -space-x-3">
            {loading && <span aria-hidden className="block h-14 w-14 animate-pulse rounded-full bg-app-sunken" />}
            {!loading && photos.length === 0 && <span className="flex h-14 w-14 items-center justify-center rounded-full bg-app-sunken text-app-muted"><UserRound aria-hidden className="h-6 w-6" /></span>}
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img key={p.id} src={p.url ?? ''} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-app-panel" />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[15px] font-semibold text-app-ink">
              Photos of you
              {photos.length > 0 && <ChevronDown aria-hidden className={`h-4 w-4 text-app-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}
            </span>
            <span className="block text-[13px] text-app-muted">{summary}</span>
          </span>
        </button>
        {photos.length === 0 && !loading
          ? <AppButton size="sm" iconLeft={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>Add photos</AppButton>
          : <AppButton size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'See and edit'}</AppButton>}
      </div>
      {open && photos.length > 0 && (
        <>
          <IdentityPhotoGrid product={product} photos={photos} onChanged={changed} />
          <button type="button" onClick={() => setEditing(true)} className="self-start text-[13px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink">Retake all photos</button>
        </>
      )}
      {editing && <EditPhotosDialog product={product} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); changed(); }} />}
    </section>
  );
};
