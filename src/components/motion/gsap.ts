'use client';

/**
 * Single place that registers GSAP plugins, so every motion component shares
 * one ScrollTrigger instance. Import gsap and ScrollTrigger from here.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Read live, not cached: users can flip the OS setting while the page is open. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True for a mouse or trackpad. Pointer effects stay off on touch screens. */
export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * The pre-paint script sets data-motion="pending" on <html> so intro elements start hidden
 * (a data attribute, not a class, so it never clashes with React's className on hydration).
 * Each intro calls this once its start values are set, which hands control to GSAP.
 */
export function releaseMotionPending(): void {
  delete document.documentElement.dataset.motion;
}
