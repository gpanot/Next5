'use client';

import { Pencil, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';
import { SelfieFields } from '../onboarding/SelfieFields';
import { useSelfieUpload } from '../onboarding/useSelfieUpload';
import { useWorkspace } from '../shell/WorkspaceProvider';

type Identity = { id: string; kind: 'face' | 'full_body'; url: string | null };

const EditPhotosDialog = ({ product, onClose, onSaved }: { product: ProductLineDto; onClose: () => void; onSaved: () => void }) => {
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

/** "Photos of me" for this studio: see them and replace them with the same upload step as onboarding. */
export const IdentityPhotosCard = ({ product, compact = false }: { product: ProductLineDto; compact?: boolean }) => {
  const { refresh: refreshMe } = useWorkspace();
  const { data, loading, refresh } = useApi<{ identities: Identity[] }>(`/api/app/identity?product=${product}`);
  const [editing, setEditing] = useState(false);
  const photos = data?.identities ?? [];

  return (
    <section aria-label="Photos of you" className={`flex flex-wrap items-center gap-4 rounded-2xl border border-app-line bg-app-panel ${compact ? 'p-3' : 'p-4 shadow-sm'}`}>
      <div className="flex -space-x-3">
        {loading && <span aria-hidden className="block h-14 w-14 animate-pulse rounded-full bg-app-sunken" />}
        {!loading && photos.length === 0 && <span className="flex h-14 w-14 items-center justify-center rounded-full bg-app-sunken text-app-muted"><UserRound aria-hidden className="h-6 w-6" /></span>}
        {photos.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img key={p.id} src={p.url ?? ''} alt={p.kind === 'full_body' ? 'Your full-body photo' : 'Your selfie'} className="h-14 w-14 rounded-full object-cover ring-2 ring-app-panel" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-app-ink">Photos of you</p>
        <p className="text-[13px] text-app-muted">{product === 'shop'
          ? photos.length ? `Used when you wear the products yourself (“Me”). ${photos.length} photo${photos.length === 1 ? '' : 's'}.` : 'Add your photos to wear the products yourself.'
          : photos.length ? `Used to create every photo of you. ${photos.length} photo${photos.length === 1 ? '' : 's'}.` : 'Add your selfies to create photos of you.'}</p>
      </div>
      <AppButton size="sm" variant="secondary" iconLeft={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>{photos.length ? 'Edit photos' : 'Add photos'}</AppButton>
      {editing && <EditPhotosDialog product={product} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); refreshMe(); }} />}
    </section>
  );
};
