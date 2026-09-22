'use client';

import type { RenderState } from './useBlitzRender';

type RenderControlsProps = {
  state: RenderState;
  isBusy: boolean;
  /** Why the button is disabled, if it is (shown as the label). */
  blockedReason: string | null;
  onSubmit: () => void;
};

const busyLabel: Partial<Record<RenderState['phase'], string>> = {
  submitting: 'Queuing render…',
  queued: 'Queued — waiting for worker…',
  rendering: 'Rendering…',
};

/** "Done Editing" button plus render status line. */
export function RenderControls({ state, isBusy, blockedReason, onSubmit }: RenderControlsProps) {
  const label = busyLabel[state.phase] ?? blockedReason ?? '✓ Done Editing';
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
      {state.phase === 'done' && (
        <p className="text-center text-[12px] font-medium text-emerald-700">✓ Render complete — see library below</p>
      )}
      {state.phase === 'error' && <p className="text-center text-[12px] text-red-700">{state.message}</p>}
    </div>
  );
}
