'use client';

/**
 * Pointer-driven effects (tilt, depth) that are purely additive: mouse and
 * trackpad only, one update per animation frame, and everything eases back to
 * rest on pointer leave, window blur or tab hide, so nothing is left half-moved.
 */
import { gsap, hasFinePointer, prefersReducedMotion } from './gsap';

/** Normalised pointer position in the zone: -1 (left/top) to 1 (right/bottom). */
type FieldHandler = (nx: number, ny: number) => void;

export function attachPointerField(zone: HTMLElement, onField: FieldHandler): () => void {
  if (!hasFinePointer() || prefersReducedMotion()) return () => undefined;
  let frame = 0;
  let clientX = 0;
  let clientY = 0;

  const apply = () => {
    frame = 0;
    const rect = zone.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nx = gsap.utils.clamp(-1, 1, ((clientX - rect.left) / rect.width) * 2 - 1);
    const ny = gsap.utils.clamp(-1, 1, ((clientY - rect.top) / rect.height) * 2 - 1);
    onField(nx, ny);
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    clientX = event.clientX;
    clientY = event.clientY;
    if (!frame) frame = requestAnimationFrame(apply);
  };
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    onField(0, 0);
  };
  const onVisibility = () => {
    if (document.hidden) reset();
  };

  zone.addEventListener('pointermove', onMove);
  zone.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    cancelAnimationFrame(frame);
    zone.removeEventListener('pointermove', onMove);
    zone.removeEventListener('pointerleave', reset);
    window.removeEventListener('blur', reset);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** 3D tilt toward the pointer. `maxDeg` caps the rotation so it stays subtle. */
export function attachTilt(zone: HTMLElement, target: HTMLElement, maxDeg = 6): () => void {
  gsap.set(target, { transformPerspective: 1100 });
  const toX = gsap.quickTo(target, 'rotationX', { duration: 0.7, ease: 'power3.out' });
  const toY = gsap.quickTo(target, 'rotationY', { duration: 0.7, ease: 'power3.out' });
  const detach = attachPointerField(zone, (nx, ny) => {
    toY(nx * maxDeg);
    toX(-ny * maxDeg);
  });
  return () => {
    detach();
    gsap.set(target, { rotationX: 0, rotationY: 0 });
  };
}

/** Layers drift against the pointer by `depth` px, which reads as parallax depth. */
export function attachDepth(zone: HTMLElement, layers: { el: HTMLElement; depth: number }[]): () => void {
  const movers = layers.map(({ el, depth }) => ({
    depth,
    toX: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3.out' }),
    toY: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3.out' }),
  }));
  const detach = attachPointerField(zone, (nx, ny) => {
    movers.forEach(({ depth, toX, toY }) => {
      toX(-nx * depth);
      toY(-ny * depth);
    });
  });
  return () => {
    detach();
    gsap.set(layers.map(({ el }) => el), { x: 0, y: 0 });
  };
}
