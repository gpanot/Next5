'use client';

/**
 * Wide-screen side decks on the /slideshow home: the six cards fan out from
 * behind the headline on load, then each side drifts against the pointer for depth.
 * Runs inside <PageMotion>'s GSAP context, so it is skipped under reduced motion
 * and reverted on unmount. Below 2xl the decks are hidden and this does nothing.
 * Once step 1 of the story reaches the middle of the screen the decks fade out,
 * so the cards do not crowd the pinned phone; scrolling back up brings them back.
 */
import { gsap } from '../../../motion/gsap';
import { attachDepth } from '../../../motion/pointerField';

/** Pointer drift in px per side; the right side moves a bit more so the two read as separate layers. */
const SIDE_DEPTH = { left: 14, right: 20 } as const;

export function slideshowDeckMotion(root: HTMLElement): (() => void) | void {
  const decks = root.querySelector<HTMLElement>('[data-decks]');
  if (!decks || decks.offsetParent === null) return;
  const cards = gsap.utils.toArray<HTMLElement>('[data-deck-card]', decks);
  const center = window.innerWidth / 2;
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    const towardCenter = center - (rect.left + rect.width / 2);
    gsap.from(card, { x: towardCenter * 0.6, y: 40, autoAlpha: 0, scale: 0.9, duration: 1.3, ease: 'expo.out', delay: 0.35 + (i % 3) * 0.09 });
  });
  fadeOutAtStory(root, decks);
  const sides = (['left', 'right'] as const).flatMap((side) => {
    const el = decks.querySelector<HTMLElement>(`[data-deck-side="${side}"]`);
    return el ? [{ el, depth: SIDE_DEPTH[side] }] : [];
  });
  return attachDepth(root, sides);
}

/** Fades the whole deck layer (not the cards, which the intro tween owns) when the first story step hits center. */
function fadeOutAtStory(root: HTMLElement, decks: HTMLElement) {
  const firstStep = root.querySelector<HTMLElement>('[data-story-step]');
  if (!firstStep) return;
  gsap.to(decks, {
    autoAlpha: 0,
    duration: 0.5,
    ease: 'power2.out',
    scrollTrigger: { trigger: firstStep, start: 'top center', toggleActions: 'play none none reverse' },
  });
}
