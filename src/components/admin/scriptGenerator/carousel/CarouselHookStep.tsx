'use client';

import type { CarouselHook } from '../../../../types/admin/carousel';
import type { HookAngle } from '../../../../types/admin/scriptGenerator';
import { amberTag, BackButton, optionCard, secondaryBtn, StepFrame } from '../ui';
import type { CarouselBuilder } from './useCarouselBuilder';

const ANGLE_LABEL: Record<HookAngle, string> = { contrarian: 'Contrarian', pain: 'Pain', stakes: 'Stakes', proof: 'Proof', mistake: 'Mistake' };

function HookCard({ h, busy, onPick }: { h: CarouselHook; busy: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} disabled={busy} className={optionCard}>
      <span className={amberTag}>{ANGLE_LABEL[h.angle]}</span>
      <p className="mt-3 text-lg font-extrabold text-app-ink">{h.text}</p>
      <p className="mt-1 text-xs text-app-muted">Photo: {h.photo}</p>
      {h.bottomText && (
        <div className="mt-3 border-t border-app-line pt-3">
          <p className="text-lg font-extrabold text-app-ink">{h.bottomText}</p>
          {h.bottomPhoto && <p className="mt-1 text-xs text-app-muted">Bottom photo: {h.bottomPhoto}</p>}
        </div>
      )}
    </button>
  );
}

/** Carousel step 3: 3 options for slide 1, written about the viewer. Picking one writes the carousel. */
export function CarouselHookStep({ c }: { c: CarouselBuilder }) {
  return (
    <StepFrame eyebrow="Carousel · Step 03 · Pick slide 1" title="Pick your first slide" help="Slide 1 decides if anyone swipes. Each option talks about the viewer's problem, not about you.">
      {c.error && <p role="alert" className="text-sm text-app-danger">{c.error}</p>}
      {!c.hooks && !c.error && (
        <div className="space-y-3" aria-busy="true" aria-label="Writing slide 1 options">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-app-panel" />)}
        </div>
      )}
      <div className={`space-y-4 ${c.busy ? 'pointer-events-none opacity-60' : ''}`}>
        {c.hooks?.map((h) => <HookCard key={h.angle} h={h} busy={c.busy} onPick={() => c.pickHook(h)} />)}
      </div>
      {c.busy && <p className="text-center text-sm text-app-muted">Writing your carousel…</p>}
      <div className="flex items-center justify-between pt-2">
        <BackButton label="Back" onClick={() => c.setStep('questions')} disabled={c.busy} />
        <button type="button" onClick={() => void c.submitAnswers()} disabled={c.busy || (!c.hooks && !c.error)} className={secondaryBtn}>New options</button>
      </div>
    </StepFrame>
  );
}
