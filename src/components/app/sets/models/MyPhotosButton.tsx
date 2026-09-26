'use client';

import { useState } from 'react';
import { useApi } from '../../../../hooks/useApi';
import { AppButton } from '../../../ui/AppButton';
import { Dialog } from '../../../ui/Dialog';
import { useWorkspace } from '../../shell/WorkspaceProvider';
import { EditPhotosDialog } from '../IdentityPhotosCard';
import { IdentityPhotoGrid, type Identity } from '../IdentityPhotoGrid';

/** "See and edit" on the You card: her photos in a dialog, to replace, remove or add one, or retake all. */
export const MyPhotosButton = ({ onChanged }: { onChanged: () => void }) => {
  const { refresh: refreshMe } = useWorkspace();
  const { data, refresh } = useApi<{ identities: Identity[] }>('/api/app/identity?product=shop');
  const [open, setOpen] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const changed = () => { refresh(); refreshMe(); onChanged(); };
  const photos = data?.identities ?? [];

  return (
    <>
      <AppButton size="sm" variant="secondary" onClick={() => (photos.length ? setOpen(true) : setRetaking(true))}>
        {photos.length ? 'See and edit' : 'Add photos'}
      </AppButton>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Photos of you" description="Used every time you wear the products. Photos you already made stay the same." className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <div className="flex flex-col gap-3">
            <IdentityPhotoGrid product="shop" photos={photos} onChanged={changed} />
            <button type="button" onClick={() => { setOpen(false); setRetaking(true); }} className="self-start text-[13px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink">Retake all photos</button>
          </div>
        </Dialog>
      )}
      {retaking && <EditPhotosDialog product="shop" onClose={() => setRetaking(false)} onSaved={() => { setRetaking(false); changed(); }} />}
    </>
  );
};
