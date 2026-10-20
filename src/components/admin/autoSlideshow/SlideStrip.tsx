'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';

/** `textLayer`: drawn over slide i's image (the ringed card's draggable text, and live edits not rendered yet).
 *  `corner`: a control in slide i's top right corner, beside the card (not inside its button). `footer`: one at the right
 *  of its label, under the picture (the content slides' delete). */
type Props = { slides: AutoSlideDto[]; index: number; busy: string | null; onPick: (i: number) => void; textLayer?: (i: number) => ReactNode; corner?: (i: number) => ReactNode; footer?: (i: number) => ReactNode };

/** Hook, CTA, or Content for every other slide: the three groups the editor's tabs use. */
export const roleGroup = (role: AutoSlideDto['role']) => (role === 'hook' ? 'Hook' : role === 'cta' ? 'CTA' : 'Content');

/** Every slide as a numbered 9:16 card, big enough to read its text, with its role; the one being edited is ringed. Tapping a card edits it. */
export function SlideStrip({ slides, index, busy, onPick, textLayer, corner, footer }: Props) {
  const list = useRef<HTMLOListElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  // Keeps the edited card in view, sideways only (the page itself never scrolls), with no animation.
  useEffect(() => {
    const [box, card] = [list.current, selected.current];
    if (!box || !card) return;
    // Measured on screen: the card's offsetLeft is relative to its own <li>, so it can't place it in the strip.
    const [b, c] = [box.getBoundingClientRect(), card.getBoundingClientRect()];
    if (c.left < b.left) box.scrollLeft -= b.left - c.left + 16;
    else if (c.right > b.right) box.scrollLeft += c.right - b.right + 16;
  }, [index]);

  return (
    <ol ref={list} aria-label="Slides" className="flex gap-2.5 overflow-x-auto px-4 py-3 [scrollbar-width:thin]">
      {slides.map((s, i) => {
        const on = i === index;
        const working = busy === `slide-${i}` || busy === `photo-${i}`;
        const control = corner?.(i);
        const below = footer?.(i);
        return (
          <li key={s.imageKey ?? i} className="relative shrink-0">
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
                  <img src={s.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" draggable={false} />
                )}
                {s.imageUrl && textLayer?.(i)}
                <span className="absolute top-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/70 px-1 text-[11px] font-bold text-white">{i + 1}</span>
                {working && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                )}
              </span>
              <span className={`px-3 py-2 text-left text-sm font-medium ${on ? 'text-white' : 'text-white/60'}`}>{roleGroup(s.role)}</span>
            </button>
            {control && <span className="absolute top-2 right-2">{control}</span>}
            {below && <span className="absolute right-1 bottom-0.5">{below}</span>}
          </li>
        );
      })}
    </ol>
  );
}
