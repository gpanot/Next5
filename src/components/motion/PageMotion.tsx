'use client';

/**
 * Mounts the motion system for one marketing page: hero intro, scroll reveals,
 * split-text replays and an optional pointer tilt. Renders nothing.
 * Every tween, ScrollTrigger and listener is reverted on unmount.
 */
import { useEffect } from 'react';
import { onSplitReplay, playHeroIntro, wireScrollReveals } from './choreography';
import { gsap, prefersReducedMotion, releaseMotionPending, ScrollTrigger } from './gsap';
import { attachTilt } from './pointerField';

type Props = {
  /** id of the page root element. */
  rootId: string;
  /** Optional: [data-tilt-zone] and [data-tilt] inside the root get a pointer tilt. */
  tilt?: boolean;
  /** Extra page-specific choreography, run inside the same GSAP context. Return a cleanup if needed. */
  extra?: (root: HTMLElement) => (() => void) | void;
};

export function PageMotion({ rootId, tilt = false, extra }: Props) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || prefersReducedMotion()) {
      releaseMotionPending();
      return;
    }
    const cleanups: (() => void)[] = [];
    const ctx = gsap.context(() => {
      root.classList.add('motion-on');
      playHeroIntro(root);
      wireScrollReveals(root);
      const zone = root.querySelector<HTMLElement>('[data-tilt-zone]');
      const target = root.querySelector<HTMLElement>('[data-tilt]');
      if (tilt && zone && target) cleanups.push(attachTilt(zone, target));
      const extraCleanup = extra?.(root);
      if (extraCleanup) cleanups.push(extraCleanup);
    }, root);
    root.addEventListener('split:replay', onSplitReplay);
    // Images and late fonts change section heights; re-measure trigger positions once they settle.
    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 1200);

    return () => {
      window.clearTimeout(refreshTimer);
      root.removeEventListener('split:replay', onSplitReplay);
      cleanups.forEach((fn) => fn());
      ctx.revert();
      root.classList.remove('motion-on');
    };
  }, [rootId, tilt, extra]);
  return null;
}
