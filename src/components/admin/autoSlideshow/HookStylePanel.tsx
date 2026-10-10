'use client';

import { HookStyleOptions } from '../../labs/blitzLab/HookStyleOptions';
import type { HookStyleId } from '../../../types/hookStyle';
import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';

type Props = { slides: AutoSlideDto[]; busy: string | null; onPick: (id: HookStyleId) => void };

/** The look the hook and CTA slides share: the first one found, Default when none was picked. */
const currentLook = (slides: AutoSlideDto[]): HookStyleId => slides.find((s) => s.role === 'hook' || s.role === 'cta')?.look ?? 'default';

/** "Hook + CTA style" in the slideshow editor: the same picks as the Ideas deck's Hook button; a pick re-renders those slides. */
export function HookStylePanel({ slides, busy, onPick }: Props) {
  const working = busy === 'hook-style';
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-white/50 uppercase">
        Hook + CTA style
        {working && <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      </p>
      <HookStyleOptions tone="dark" activeId={currentLook(slides)} disabled={busy !== null} onPick={onPick} />
    </div>
  );
}
