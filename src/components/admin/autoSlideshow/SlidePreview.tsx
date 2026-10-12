'use client';

import type { ReactNode } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import { SlidePlayer } from './SlidePlayer';

/** `textLayer`: drawn over slide i's image (the slide on screen's draggable text, and live edits not rendered yet). */
type Props = { show: AutoSlideshowDto; index: number; onIndex: (i: number) => void; working: boolean; textLayer?: (i: number) => ReactNode };

/** A made slideshow in the player: its rendered slides, its music. */
export function SlidePreview({ show, index, onIndex, working, textLayer }: Props) {
  return (
    <SlidePlayer
      count={show.slides.length}
      slideKey={(i) => show.slides[i]?.imageKey ?? String(i)}
      index={index}
      onIndex={onIndex}
      working={working}
      audio={show.audio}
      renderSlide={(i) => {
        const s = show.slides[i]!;
        if (!s.imageUrl) return null;
        return (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.imageUrl} alt={s.title} className="h-full w-full object-cover" draggable={false} />
            {textLayer?.(i)}
          </>
        );
      }}
    />
  );
}
