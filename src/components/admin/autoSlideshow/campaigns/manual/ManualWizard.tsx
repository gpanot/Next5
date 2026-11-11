'use client';

import { useEffect, useRef } from 'react';
import type { ManualStage } from '../../../../../types/admin/autoSlideshow';
import { PhotoActions, PhotoStep } from './PhotoStep';
import { StoryActions, StoryStep } from './StoryStep';
import { useManualDraft } from './useManualDraft';

const STEPS: { stage: ManualStage; label: string }[] = [
  { stage: 'story', label: 'Story' },
  { stage: 'photo', label: 'First photo' },
  { stage: 'finishing', label: 'Finish' },
];

const stepIndex = (stage: ManualStage) => (stage === 'ready' ? 2 : STEPS.findIndex((s) => s.stage === stage));

/** The three steps, with the current one lit. */
function Stepper({ stage }: { stage: ManualStage }) {
  const at = stepIndex(stage);
  return (
    <ol className="flex items-center gap-2" aria-label="Steps">
      {STEPS.map((s, i) => (
        <li key={s.stage} aria-current={i === at ? 'step' : undefined} className="flex flex-1 flex-col gap-1">
          <span className={`h-1.5 rounded-full transition-colors ${i <= at ? 'bg-app-cta' : 'bg-app-line'}`} />
          <span className={`text-[11px] font-semibold ${i === at ? 'text-app-ink' : 'text-app-muted'}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Shaped like the story step (slides side by side on desktops), so the wizard does not jump when it lands. */
function WizardSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      <p role="status" className="text-sm text-app-muted">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-app-sunken lg:h-56" />)}
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-app-sunken" />
    </div>
  );
}

/** A draft opened while it is being finished (or just done): it lives on its Brand Cast card now. */
function FinishingNote({ onClose }: { onClose: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-base font-semibold text-app-ink">We are finishing this slideshow</p>
      <p className="max-w-xs text-sm text-app-muted">Watch its card in Brand Cast: it shows there when ready.</p>
      <button type="button" autoFocus onClick={onClose} className="min-h-11 rounded-full border border-app-line px-5 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">Close</button>
    </div>
  );
}

type Props = {
  token: string;
  runId: string;
  /** A draft to pick up (a Draft card); null starts a new one told by `castId` (null: the least-used face). */
  draftId: string | null;
  castId: string | null;
  /** Closes the wizard; `changed` when a draft was made, finished or deleted, so the Brand Cast cards load again. */
  onClose: (changed: boolean) => void;
};

/**
 * "Create 1 manually": one Brand Cast slideshow, made with the owner. Story first (chat, typing, or another story),
 * then the first photo (chat redos). Finish closes the wizard at once: the other photos are made in the background
 * while the slideshow's card counts down in Brand Cast. Closing earlier keeps the draft, shown as a Draft card.
 */
export function ManualWizard({ token, runId, draftId, castId, onClose }: Props) {
  const { draft, busy, error, start, send, discard } = useManualDraft(token, runId, draftId);
  const started = useRef(false);
  useEffect(() => {
    if (draftId || started.current) return;
    started.current = true;
    void start(castId);
  }, [draftId, castId, start]);

  const finish = async () => {
    if (await send({ action: 'finish' })) onClose(true);
  };

  const remove = async () => {
    if (await discard()) onClose(true);
  };

  const reviewing = draft !== null && (draft.stage === 'story' || draft.stage === 'photo');
  // Header, body and footer: the frame keeps one size (WIZARD_FRAME), only the body scrolls.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-3 border-b border-app-line px-5 pt-5 pb-3">
        <div className="flex min-h-10 items-center gap-2">
          <h3 id="new-campaign-title" className="mr-auto text-lg font-extrabold text-app-ink">Make it yourself</h3>
          {reviewing && (
            <button type="button" onClick={() => void remove()} disabled={busy !== null} className="min-h-10 rounded-full px-3 text-sm font-medium text-app-danger transition hover:bg-app-sunken active:scale-95 disabled:opacity-40">
              {busy === 'discard' ? 'Deleting…' : 'Delete draft'}
            </button>
          )}
        </div>
        <Stepper stage={draft?.stage ?? 'story'} />
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {(error ?? draft?.error) && <p role="alert" className="rounded-xl bg-app-sunken p-3 text-sm text-app-danger">{error ?? draft?.error}</p>}
        {!draft ? (
          busy === 'starting' ? <WizardSkeleton label="Writing your story…" /> : null
        ) : draft.stage === 'story' ? (
          <StoryStep draft={draft} busy={busy} onRequest={(request) => send({ action: 'request', request })} onText={(index, title, body) => send({ action: 'text', index, title, body })} />
        ) : draft.stage === 'photo' ? (
          <PhotoStep draft={draft} busy={busy} onRedo={(request) => send({ action: 'redo', request })} />
        ) : (
          <FinishingNote onClose={() => onClose(true)} />
        )}
      </div>
      <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-app-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center">
        <button type="button" onClick={() => onClose(draft !== null)} disabled={busy === 'discard'}
          className="min-h-11 rounded-full px-4 text-sm font-medium text-app-muted transition hover:text-app-ink sm:mr-auto">
          {reviewing ? 'Save draft and close' : 'Close'}
        </button>
        {draft?.stage === 'story' && <StoryActions busy={busy} onAnother={() => void send({ action: 'another' })} onApprove={() => void send({ action: 'approve' })} />}
        {draft?.stage === 'photo' && <PhotoActions busy={busy} onFinish={() => void finish()} />}
      </footer>
    </div>
  );
}
