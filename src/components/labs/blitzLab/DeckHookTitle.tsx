'use client';

/**
 * The hook title on a deck card, like the render (remotion/HookTitleLayer.tsx): over the hook shot and the first
 * HOOK_TITLE_CARRY_S of the next. Follows the card's shot timer (`elapsedRef`); re-renders only when it hides.
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { HOOK_TITLE_CARRY_S, hookTitleConfig } from '../../../remotion/hookTitle';
import type { HookTitle, TextConfig } from '../../../remotion/types';
import { SlideCaption } from './SlideCaption';

type Props = {
  title: HookTitle;
  config: TextConfig;
  /** The shot on screen. */
  shot: number;
  /** Seconds into the current shot. */
  elapsedRef: React.MutableRefObject<number>;
};

export function DeckHookTitle({ title, config, shot, elapsedRef }: Props) {
  const [carried, setCarried] = useState(true);
  useEffect(() => {
    if (shot !== 1) return;
    let raf = 0;
    const tick = () => {
      const on = elapsedRef.current < HOOK_TITLE_CARRY_S;
      setCarried(on);
      if (on) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shot, elapsedRef]);
  if (shot > 1 || (shot === 1 && !carried)) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      <SlideCaption text={title.text} config={hookTitleConfig(config, title)} positionY={title.positionY} />
    </div>
  );
}
