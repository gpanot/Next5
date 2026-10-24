'use client';

import type { HookAngle, HookOption } from '../../../types/admin/scriptGenerator';
import { amberTag, BackButton, optionCard, secondaryBtn, StepFrame } from './ui';

type Props = {
  carousel?: boolean;
  hooks: HookOption[] | null;
  busy: boolean;
  error: string;
  onPick: (hook: HookOption) => void;
  onBack: () => void;
  onRegenerate: () => void;
};

const ANGLE_LABEL: Record<HookAngle, string> = { contrarian: 'Contrarian', pain: 'Pain', stakes: 'Stakes', proof: 'Proof', mistake: 'Mistake' };

function HookSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Writing hook options">
      {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-app-panel" />)}
      <p className="text-center text-xs text-app-muted">Writing 3 hook options…</p>
    </div>
  );
}

/** "Pick your hook": 3 cards with different angles. Picking one starts the script. */
export function HookStep({ carousel, hooks, busy, error, onPick, onBack, onRegenerate }: Props) {
  return (
    <StepFrame eyebrow="Step 04 · Pick your hook" title="Pick your hook" help={carousel ? 'Slide 1 decides if anyone swipes. Each option is a photo and a line of text that promise the same thing.' : 'The first 3 seconds decide everything. Each option is a first frame, a few bold words and a spoken line that promise the same thing.'}>
      {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
      {!hooks && !error ? <HookSkeleton /> : null}
      <div className={`space-y-4 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        {hooks?.map((h) => (
          <button key={h.angle} type="button" onClick={() => onPick(h)} disabled={busy} className={optionCard}>
            <span className={amberTag}>{ANGLE_LABEL[h.angle]}</span>
            <p className="mt-3 text-lg font-extrabold text-app-ink">{h.text}</p>
            {h.verbal && <p className="mt-1 text-sm text-app-ink">{h.verbal}</p>}
            <p className="mt-2 text-xs text-app-muted">{carousel ? 'Photo' : 'Visual'}: {h.visual}</p>
          </button>
        ))}
      </div>
      {busy && <p className="text-center text-sm text-app-muted">Writing your script…</p>}
      <div className="flex items-center justify-between pt-2">
        <BackButton label="Back" onClick={onBack} disabled={busy} />
        <button type="button" onClick={onRegenerate} disabled={busy || (!hooks && !error)} className={secondaryBtn}>Regenerate hooks</button>
      </div>
    </StepFrame>
  );
}
