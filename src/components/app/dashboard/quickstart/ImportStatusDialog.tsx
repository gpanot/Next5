'use client';

import { Check, Loader2, X } from 'lucide-react';
import { AppButton } from '../../../ui/AppButton';
import { Dialog } from '../../../ui/Dialog';

type Props = { open: boolean; ready: boolean; error: string | null; onClose: () => void; onGoToCreate: () => void };

const StatusIcon = ({ ready, error }: { ready: boolean; error: boolean }) => (
  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ready ? 'bg-app-success/15' : error ? 'bg-app-danger/10' : 'bg-app-accent-soft'}`}>
    {ready ? <Check aria-hidden className="h-5 w-5 text-app-success" /> : error ? <X aria-hidden className="h-5 w-5 text-app-danger" /> : <Loader2 aria-hidden className="h-5 w-5 animate-spin text-app-accent" />}
  </span>
);

/** Shown while the Zillow photos come in; it moves on to Create by itself when they are ready. */
export const ImportStatusDialog = ({ open, ready, error, onClose, onGoToCreate }: Props) => (
  <Dialog open={open} onClose={error ? onClose : () => undefined} title={ready ? 'Your listing is ready' : error ? 'We could not get that listing' : 'Getting your listing…'}>
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <StatusIcon ready={ready} error={Boolean(error)} />
        <div className="flex flex-col gap-1 text-[14px]">
          {error ? (
            <p className="text-app-danger">{error}</p>
          ) : ready ? (
            <p className="text-app-ink">The photos are in. Pick a few on the Create page to see your first results.</p>
          ) : (
            <>
              <p className="text-app-ink">We are getting the listing photos from Zillow. It takes about 20 seconds.</p>
              <p className="text-[13px] text-app-muted">Start with a few photos to see results fast.</p>
            </>
          )}
        </div>
      </div>
      {ready && <AppButton fullWidth onClick={onGoToCreate}>Pick photos and create</AppButton>}
      {error && <AppButton variant="secondary" fullWidth onClick={onClose}>Close</AppButton>}
      {!ready && !error && <p className="text-center text-[12px] text-app-muted">We take you to the Create page when it is ready.</p>}
    </div>
  </Dialog>
);
