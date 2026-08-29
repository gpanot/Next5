'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';

type ImageLightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
  /** Opening zoom. Use 2 for contact sheets, where the whole point is to look
   *  at one frame rather than the grid. Defaults to fit-to-screen. */
  initialScale?: number;
  /** Anchored to the viewport corner, not the image — stays put through pan
   *  and zoom instead of transforming with the photo. Used for the preview
   *  watermark; most callers leave this unset. */
  overlay?: ReactNode;
};

/**
 * Full-screen lightbox with:
 * - Opens at `initialScale` (fit-to-screen by default)
 * - Native browser pinch-to-zoom (touch-action: pinch-zoom)
 * - Double-tap to toggle between 1× and 2×
 * - Drag/pan when zoomed
 * - Accessible close button (top-right) + Escape key
 *
 * Rendered through a portal on <body>: the booking modal panel carries a
 * transform, which would otherwise make it the containing block for this
 * `position: fixed` overlay and trap it inside the panel.
 */
export const ImageLightbox = ({
  src,
  alt,
  onClose,
  initialScale = 1,
  overlay,
}: ImageLightboxProps) => {
  const INITIAL_SCALE = initialScale;
  const MIN_SCALE = 1;
  const MAX_SCALE = 6;

  const [scale, setScale] = useState(INITIAL_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Pinch state
  const lastPinchDist = useRef<number | null>(null);
  const lastScaleRef = useRef(INITIAL_SCALE);

  // Pan state
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Double-tap state
  const lastTap = useRef(0);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  // Clamp translate so the image doesn't scroll too far off screen
  const clamp = (t: { x: number; y: number }, s: number) => {
    const maxX = Math.max(0, (s - 1) * 50); // percent of half-width
    const maxY = Math.max(0, (s - 1) * 50);
    return {
      x: Math.min(maxX, Math.max(-maxX, t.x)),
      y: Math.min(maxY, Math.max(-maxY, t.y)),
    };
  };

  /* ── Touch handlers ──────────────────────────────────────────────── */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
      lastScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDragging.current = true;

      // Double-tap detection
      const now = Date.now();
      if (now - lastTap.current < 300) {
        const next = scale > 1.2 ? MIN_SCALE : Math.max(INITIAL_SCALE, 2);
        setScale(next);
        setTranslate({ x: 0, y: 0 });
        lastScaleRef.current = next;
      }
      lastTap.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // prevent page scroll while interacting
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / lastPinchDist.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lastScaleRef.current * ratio));
      setScale(next);
      if (next <= MIN_SCALE) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
      const dx = e.touches[0].clientX - lastPointer.current.x;
      const dy = e.touches[0].clientY - lastPointer.current.y;
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTranslate((prev) => clamp({ x: prev.x + dx * 0.3, y: prev.y + dy * 0.3 }, scale));
    }
  };

  const handleTouchEnd = () => {
    lastPinchDist.current = null;
    isDragging.current = false;
    lastScaleRef.current = scale;
    // Snap back to 1× if pinch ended below threshold
    if (scale < 1.1) {
      setScale(MIN_SCALE);
      setTranslate({ x: 0, y: 0 });
    }
  };

  /* ── Mouse pan (desktop) ─────────────────────────────────────────── */
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || scale <= 1) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setTranslate((prev) => clamp({ x: prev.x + dx * 0.3, y: prev.y + dy * 0.3 }, scale));
  };

  const handleMouseUp = () => { isDragging.current = false; };

  /* ── Wheel zoom (desktop) ─────────────────────────────────────────── */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
      if (next <= MIN_SCALE) setTranslate({ x: 0, y: 0 });
      return next;
    });
  };

  // Only ever mounted in response to a click, so document is always available.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-lightbox-open="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      {/* Hint */}
      <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink/55 px-3.5 py-1.5 text-[11px] text-white/85 backdrop-blur-sm select-none">
        Scroll or pinch to zoom · Double-tap to reset · Drag to pan
      </p>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          transform: `scale(${scale}) translate(${translate.x}%, ${translate.y}%)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease',
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
          userSelect: 'none',
          cursor: scale > 1 ? 'grab' : 'zoom-in',
        }}
      />

      {overlay}
    </div>,
    document.body,
  );
};
