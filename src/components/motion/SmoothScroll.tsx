'use client';

/**
 * Lenis smooth scroll, driven by the GSAP ticker so ScrollTrigger reads the same
 * scroll position Lenis paints. Lenis is the only smooth-scroll engine on the site.
 * Off under prefers-reduced-motion: the page keeps native scrolling.
 * Touch keeps native scrolling too (syncTouch is off), so phones feel normal.
 */
import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, prefersReducedMotion, ScrollTrigger } from './gsap';

declare global {
  interface Window {
    /** Set while smooth scroll runs, so inline page scripts can scroll through Lenis. */
    __lenis?: Lenis;
  }
}

/**
 * Same-page #hash links scroll through Lenis. Links whose own handler called preventDefault are left alone.
 * Lenis honours the target's CSS scroll-margin-top, so pages set their sticky-nav offset there.
 */
function handleAnchorClick(lenis: Lenis, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
  const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
  const hash = link?.getAttribute('href');
  if (!hash || hash === '#') return;
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return;
  event.preventDefault();
  lenis.scrollTo(target);
  history.replaceState(null, '', hash);
}

export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.11, autoRaf: false });
    window.__lenis = lenis;

    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onClick = (event: MouseEvent) => handleAnchorClick(lenis, event);
    const refresh = () => ScrollTrigger.refresh();
    document.addEventListener('click', onClick);
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('load', refresh);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
  return null;
}
