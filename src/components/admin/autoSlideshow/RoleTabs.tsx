'use client';

import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';
import { roleGroup } from './SlideStrip';

type Props = { slides: AutoSlideDto[]; index: number; onPick: (i: number) => void };

const GROUPS = ['Hook', 'Content', 'CTA'] as const;

/** Hook · Content · CTA: jumps to the first slide of that kind; the on-screen slide's kind is lit. */
export function RoleTabs({ slides, index, onPick }: Props) {
  const current = slides[index] ? roleGroup(slides[index].role) : null;
  return (
    <div role="tablist" aria-label="Slide kind" className="flex rounded-xl bg-white/5 p-1">
      {GROUPS.map((group) => {
        const first = slides.findIndex((s) => roleGroup(s.role) === group);
        const on = current === group;
        return (
          <button
            key={group}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={first < 0}
            onClick={() => onPick(on ? index : first)}
            className={`min-h-9 rounded-lg px-3 text-sm font-medium transition disabled:opacity-30 ${on ? 'bg-emerald-400 text-zinc-950 shadow-sm' : 'text-white/60 hover:text-white'}`}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}
