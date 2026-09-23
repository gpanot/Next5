'use client';

import { useEffect, useRef, useState } from 'react';
import type { RenderState } from './useBlitzRender';

type RenderControlsProps = {
  state: RenderState;
  isBusy: boolean;
  /** Why the button is disabled, if it is (shown as the label). */
  blockedReason: string | null;
  onSubmit: () => void;
};

/**
 * "Done Editing" button.
 *
 * Since the render is fire-and-forget (the editor resets to 'idle' right after
 * the job is queued), this button only shows a brief "Queuing…" spinner during
 * the POST, then returns to "Done Editing" so the user can start a new video.
 *
 * Progress / errors are tracked per-job in the Library card, not here.
 */
export function RenderControls({ state, isBusy, blockedReason, onSubmit }: RenderControlsProps) {
  // Show a brief confirmation after a job is successfully queued.
  // We detect the submitting→idle transition (success) by tracking prev phase.
  const [justQueued, setJustQueued] = useState(false);
  const prevPhaseRef = useRef<RenderState['phase']>('idle');
  useEffect(() => {
    if (prevPhaseRef.current === 'submitting' && state.phase === 'idle') {
      setJustQueued(true);
      const t = setTimeout(() => setJustQueued(false), 3000);
      prevPhaseRef.current = state.phase;
      return () => clearTimeout(t);
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase]);

  const label =
    state.phase === 'submitting' ? 'Queuing render…'
    : blockedReason ?? '✓ Done Editing';

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-2">
      <button
        type="button"
        onClick={onSubmit}
        disabled={isBusy || blockedReason !== null}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isBusy && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {label}
      </button>
      {justQueued && (
        <p className="text-center text-[12px] font-medium text-emerald-700">
          ✓ Queued — rendering in background. See library below.
        </p>
      )}
      {state.phase === 'error' && <p className="text-center text-[12px] text-red-700">{state.message}</p>}
    </div>
  );
}
