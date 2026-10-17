'use client';

/**
 * Deck card caption while its voiceover plays (2026-10-17): the spoken line, a few words at a time, each word appearing
 * as it is said, like the rendered video (remotion/SpokenCaption.tsx). Follows the card's shot timer (`elapsedRef`),
 * which the voiceover audio is kept in step with; re-renders only when a word appears.
 */

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { spokenPageAt, spokenPages, SPOKEN_LEAD_S } from '../../../remotion/spokenPages';
import type { SpokenWord, TextConfig } from '../../../remotion/types';
import { DraggableCaption } from './DraggableCaption';
import { SlideCaption } from './SlideCaption';

type Props = {
  words: SpokenWord[];
  config: TextConfig;
  positionY?: number;
  /** Seconds into the current shot. */
  elapsedRef: React.MutableRefObject<number>;
  /** Set (paused card): the page on screen shows whole and drags up or down; called on release. */
  onMove?: (positionY: number) => void;
};

/** Page on screen and how many of its words have appeared, `seconds` into the shot. */
const progressAt = (pages: SpokenWord[][], seconds: number) => {
  const page = spokenPageAt(pages, seconds);
  const shown = (pages[page] ?? []).filter((w) => seconds >= w.startS - SPOKEN_LEAD_S).length;
  return { page, shown };
};

export function SpokenDeckCaption({ words, config, positionY, elapsedRef, onMove }: Props) {
  const pages = useMemo(() => spokenPages(words), [words]);
  // Set on the first animation frame from the shot timer.
  const [at, setAt] = useState({ page: 0, shown: 0 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = progressAt(pages, elapsedRef.current);
      setAt((prev) => (prev.page === next.page && prev.shown === next.shown ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pages, elapsedRef]);

  const page = pages[at.page] ?? [];
  if (onMove) return <DraggableCaption text={page.map((w) => w.word).join(' ')} config={config} positionY={positionY} onMove={onMove} />;
  // A boxed caption shows its page whole, so the box does not grow word by word.
  if (config.textBackground) return <SlideCaption text={page.map((w) => w.word).join(' ')} config={config} positionY={positionY} />;
  const text = page.map((w, i) => (
    <span key={`${at.page}-${i}`}>
      <span
        className="inline-block transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
        style={{ opacity: i < at.shown ? 1 : 0, transform: i < at.shown ? 'none' : 'translateY(0.3em) scale(0.8)' }}
      >
        {w.word}
      </span>
      {i < page.length - 1 ? ' ' : ''}
    </span>
  ));
  return <SlideCaption text={text} config={config} positionY={positionY} />;
}
