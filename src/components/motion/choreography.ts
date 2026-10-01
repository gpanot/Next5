'use client';

/**
 * Data-attribute motion protocol shared by the marketing pages:
 *   [data-intro="n"]       hero element, enters in order n on load (optional [data-intro-lift] px)
 *   [data-intro-split]     hero heading whose <SplitWords> rise word by word on load
 *   [data-split]           heading whose words rise word by word when scrolled into view
 *   [data-reveal]          block that rises in when scrolled into view (adds .in for CSS details)
 *   [data-count]           number inside a revealed block that counts up once
 * Content is complete without JS: GSAP only sets start states for elements below the fold.
 * Reduced motion: none of this runs, so everything renders in its final state.
 */
import { gsap, releaseMotionPending, ScrollTrigger } from './gsap';

const WORD = '.split-wi';
const EASE_TEXT = 'expo.out';
const EASE_BLOCK = 'power3.out';
const SCROLL_START = 'top 86%';

function belowFold(el: Element): boolean {
  return el.getBoundingClientRect().top > window.innerHeight * 0.92;
}

/** Hero entrance: headline words first, then supporting pieces in data-intro order. */
export function playHeroIntro(root: HTMLElement): void {
  const words = root.querySelectorAll(`[data-intro-split] ${WORD}`);
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-intro]')).sort(
    (a, b) => Number(a.dataset.intro) - Number(b.dataset.intro),
  );
  gsap.set(words, { yPercent: 110, autoAlpha: 1 });
  items.forEach((el) => gsap.set(el, { autoAlpha: 0, y: Number(el.dataset.introLift ?? 24) }));
  releaseMotionPending();

  const tl = gsap.timeline();
  tl.to(words, { yPercent: 0, duration: 1.05, ease: EASE_TEXT, stagger: 0.035 }, 0.05);
  items.forEach((el, i) => {
    tl.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE_BLOCK, clearProps: 'transform' }, 0.18 + i * 0.08);
  });
}

function countUp(el: HTMLElement): void {
  const raw = el.dataset.countTo ?? el.textContent ?? '';
  const match = raw.match(/^([^0-9]*)([0-9][0-9,]*)(.*)$/);
  if (!match) return;
  el.dataset.countTo = raw;
  const [, prefix, digits, suffix] = match;
  const end = parseInt(digits.replace(/,/g, ''), 10);
  const commas = digits.includes(',');
  const state = { v: 0 };
  gsap.to(state, {
    v: end,
    duration: 1.1,
    ease: 'power3.out',
    onUpdate: () => {
      const n = String(Math.round(state.v));
      el.textContent = prefix + (commas ? n.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : n) + suffix;
    },
  });
}

function markIn(el: Element): void {
  el.classList.add('in');
  el.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => {
    if (c.dataset.done) return;
    c.dataset.done = '1';
    countUp(c);
  });
}

/** A heading block: words rise, then the block's other children follow. */
function revealSplitGroup(group: HTMLElement): void {
  const splits = group.matches('[data-split]') ? [group] : Array.from(group.querySelectorAll<HTMLElement>('[data-split]'));
  const rest = Array.from(group.children).filter((c) => !c.matches('[data-split]') && !c.querySelector('[data-split]'));
  const words = splits.flatMap((s) => Array.from(s.querySelectorAll(WORD)));
  gsap.set(words, { yPercent: 110 });
  if (rest.length) gsap.set(rest, { autoAlpha: 0, y: 18 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: group, start: SCROLL_START, once: true }, onStart: () => markIn(group) });
  tl.to(words, { yPercent: 0, duration: 0.95, ease: EASE_TEXT, stagger: 0.03 });
  if (rest.length) tl.to(rest, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE_BLOCK, stagger: 0.08 }, '-=0.65');
}

/** Plain blocks rise in batches, so a row of cards staggers as one gesture. */
function revealBlocks(blocks: HTMLElement[]): void {
  if (!blocks.length) return;
  gsap.set(blocks, { autoAlpha: 0, y: 32 });
  ScrollTrigger.batch(blocks, {
    start: SCROLL_START,
    once: true,
    onEnter: (batch) => {
      batch.forEach(markIn);
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.85, ease: EASE_BLOCK, stagger: 0.09, clearProps: 'transform' });
    },
  });
}

/** Wires every scroll reveal inside `root`. Call inside a gsap.context so it reverts cleanly. */
export function wireScrollReveals(root: HTMLElement): void {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal], [data-split]')).filter(
    (el) => !el.closest('[data-intro-split]') && !(el.matches('[data-split]') && el.closest('[data-reveal]')),
  );
  const visibleNow = candidates.filter((el) => !belowFold(el));
  visibleNow.forEach(markIn);
  const later = candidates.filter(belowFold);
  later.filter((el) => el.matches('[data-split]') || el.querySelector('[data-split]')).forEach(revealSplitGroup);
  revealBlocks(later.filter((el) => !el.matches('[data-split]') && !el.querySelector('[data-split]')));
}

/** Words re-rise when a page script swaps a <SplitWords> text (homepage audience toggle). */
export function onSplitReplay(event: Event): void {
  const words = (event.target as HTMLElement).querySelectorAll(WORD);
  gsap.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: EASE_TEXT, stagger: 0.03 });
}
