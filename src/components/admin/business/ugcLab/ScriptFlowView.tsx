'use client';

import type { UgcScene } from '../../../../config/ugcLab';
import { ScriptPicker } from './ScriptPicker';
import { Spinner } from './ui';
import type { ScriptFlow, ScriptReady } from './useScriptFlow';

const SHOT_LABELS: Record<UgcScene['shot'], string> = { close: 'Close-up', medium: 'Waist up', wide: 'Full body' };

const SceneDetails = ({ scene }: { scene: UgcScene }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
    <dt className="text-muted">Person</dt><dd className="text-ink">{scene.person}</dd>
    <dt className="text-muted">Place</dt><dd className="text-ink">{scene.setting}</dd>
    <dt className="text-muted">Action</dt><dd className="text-ink">{scene.action}</dd>
    <dt className="text-muted">Framing</dt><dd className="text-ink">{SHOT_LABELS[scene.shot]}</dd>
  </dl>
);

/** Everything after a character is chosen: what it shows, progress, the 3 scripts and the editor. */
export function ScriptFlowView({ flow, onReady }: { flow: ScriptFlow; onReady: (ready: ScriptReady) => void }) {
  const { selected, busy, error, scripts, duration, edited } = flow;

  return (
    <>
      {selected?.scene && <div className="rounded-xl bg-surface-alt p-3"><SceneDetails scene={selected.scene} /></div>}

      {busy && (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner /> {busy === 'describe' ? 'Reading the image…' : 'Writing 3 scripts…'}
        </p>
      )}
      {error && <p className="text-[13px] text-red-700">{error}</p>}

      {selected && !busy && scripts.length === 0 && flow.hookDraft.trim() && (
        <button type="button" onClick={() => void flow.rewrite()} className="self-start text-[13px] text-ink underline">
          Write scripts for this character
        </button>
      )}

      {selected && scripts.length > 0 && (
        <ScriptPicker
          scripts={scripts}
          selected={duration}
          edited={edited}
          onSelect={flow.pick}
          onEdit={flow.setEdited}
          onConfirm={() => {
            const ready = flow.ready();
            if (ready) onReady(ready);
          }}
        />
      )}
    </>
  );
}
