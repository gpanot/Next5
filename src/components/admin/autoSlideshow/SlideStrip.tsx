'use client';

import { useEffect, useRef } from 'react';
import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';

type Props = { slides: AutoSlideDto[]; index: number; busy: string | null; onPick: (i: number) => void };

/** Hook, CTA, or Content for every other slide: the three groups the editor's tabs use. */
export const roleGroup = (role: AutoSlideDto['role']) => (role === 'hook' ? 'Hook' : role === 'cta' ? 'CTA' : 'Content');

/** Every slide as a numbered 9:16 card, big enough to read its text, with its role; the one being edited is ringed. Tapping a card edits it. */
export function SlideStrip({ slides, index, busy, onPick }: Props) {
  const list = useRef<HTMLOListElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  // Keeps the edited card in view, sideways only (the page itself never scrolls), with no animation.
  useEffect(() => {
    const [box, card] = [list.current, selected.current];
    if (!box || !card) return;
    const left = card.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft) box.scrollLeft = left - 16;
    else if (left + card.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = left + card.offsetWidth - box.clientWidth + 16;
  }, [index]);

  return (
    <ol ref={list} aria-label="Slides" className="flex gap-2.5 overflow-x-auto px-4 py-3 [scrollbar-width:thin]">
      {slides.map((s, i) => {
        const on = i === index;
        const working = busy === `slide-${i}` || busy === `photo-${i}`;
        return (
          <li key={s.imageKey ?? i} className="shrink-0">
            <button
              ref={on ? selected : undefined}
              type="button"
              onClick={() => onPick(i)}
              aria-current={on ? 'true' : undefined}
              aria-label={`Slide ${i + 1}, ${roleGroup(s.role)}`}
              className={`relative flex w-40 flex-col overflow-hidden rounded-xl border-2 bg-zinc-900 transition active:scale-[0.98] sm:w-60 ${on ? 'border-emerald-400 shadow-sm shadow-emerald-500/20' : 'border-white/10 hover:border-white/30'}`}
            >
              <span className="relative block aspect-[9/16] w-full bg-white/5">
                {s.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="absolute top-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/70 px-1 text-[11px] font-bold text-white">{i + 1}</span>
                {working && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                )}
              </span>
              <span className={`px-3 py-2 text-left text-sm font-medium ${on ? 'text-white' : 'text-white/60'}`}>{roleGroup(s.role)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
