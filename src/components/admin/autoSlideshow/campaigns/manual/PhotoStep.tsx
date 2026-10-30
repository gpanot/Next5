'use client';

import type { ManualDraftDto } from '../../../../../types/admin/autoSlideshow';
import { ChatBox } from './ChatBox';
import type { ManualBusy } from './useManualDraft';

const PHOTO_IDEAS = ['Outside, in daylight', 'Closer on the face', 'Brighter photo', 'Different place'];

type Props = {
  draft: ManualDraftDto;
  busy: ManualBusy;
  onRedo: (request: string) => Promise<boolean>;
};

/**
 * Step 3: the first slide on its photo, as big as the wizard allows (the full body height from tablets up, next to the
 * chat box), and redos from the chat box while free tries are left. Finish is in the wizard's footer.
 */
export function PhotoStep({ draft, busy, onRedo }: Props) {
  const redoing = busy === 'redo';
  return (
    <div className="grid gap-4 sm:h-full sm:grid-cols-[auto_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-[9/16] h-[min(58dvh,34rem)] overflow-hidden rounded-xl bg-app-sunken shadow-sm sm:h-full sm:max-h-full">
        {draft.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage link, sized by its box
          <img src={draft.photoUrl} alt={`First slide: ${draft.slides[0]?.title ?? ''}`} className={`h-full w-full object-cover transition-opacity ${redoing ? 'opacity-40' : ''}`} />
        )}
        {redoing && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-app-ink">
            <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-4 border-app-line border-t-app-cta" />
            Making a new photo…
          </div>
        )}
      </div>
      <div className="space-y-4">
        <p className="text-sm text-app-muted">This is your first slide. Like it? We make the other photos in the same style.</p>
        {draft.redosLeft > 0 ? (
          <ChatBox
            label={`Change the photo (${draft.redosLeft} free ${draft.redosLeft === 1 ? 'try' : 'tries'} left)`}
            placeholder="e.g. At a coffee shop, smiling"
            ideas={PHOTO_IDEAS}
            disabled={busy !== null}
            busy={redoing}
            onSend={onRedo}
          />
        ) : (
          <p className="rounded-xl bg-app-sunken p-3 text-sm text-app-muted">You used your free photo tries. Keep this one, or delete the draft and start over.</p>
        )}
        <p className="text-xs text-app-muted">Uses 1 credit once your slideshow is ready. We finish it in the background.</p>
      </div>
    </div>
  );
}

/** The photo step's footer button: keep this photo and finish the slideshow. */
export function PhotoActions({ busy, onFinish }: { busy: ManualBusy; onFinish: () => void }) {
  return (
    <button type="button" onClick={onFinish} disabled={busy !== null}
      className="min-h-12 flex-1 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-40 sm:flex-none">
      {busy === 'finish' ? 'Starting…' : 'Looks good, finish it'}
    </button>
  );
}
