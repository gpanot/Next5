'use client';

import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { clampTextX, textSpan, type TextAt } from '../../../../types/slideText';

type Props = {
  at: TextAt;
  /** Side margin of the text block, % of the slide width (textSide). */
  side: number;
  /** False: the text is only drawn, not draggable. */
  movable: boolean;
  /** True: the text only moves up and down, centered on the slide. */
  verticalOnly?: boolean;
  /** Hidden text still takes pointer events, so it can be grabbed over a rendered slide that already shows it. */
  hidden?: boolean;
  /** No dashed outline around movable text until it is dragged, so the slide reads clean (the editors' big preview). */
  quiet?: boolean;
  onMove?: (at: TextAt) => void;
  onDragging?: (dragging: boolean) => void;
  children: ReactNode;
};

type Drag = { id: number; x0: number; y0: number; from: TextAt; frame: DOMRect; height: number; moved: boolean; verticalOnly: boolean };

/** Snaps to the vertical center line within this share of the width. */
const SNAP = 0.025;
/** Pointer travel (px) before a press becomes a drag, so a tap still selects. */
const SLOP = 4;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Where the text goes for a pointer at (x, y), kept inside the frame (it rewraps narrower near a side, textSpan),
 *  snapped to the center line. */
const nextAt = (d: Drag, x: number, y: number): TextAt => {
  const raw = d.verticalOnly ? 0.5 : d.from.x + (x - d.x0) / d.frame.width;
  const snapped = Math.abs(raw - 0.5) < SNAP ? 0.5 : raw;
  return { x: clampTextX(snapped), y: clamp(d.from.y + (y - d.y0) / d.frame.height, 0, 1 - d.height) };
};

/**
 * A slide's text block placed at `at` (center x, top y, shares of the frame) that can be dragged anywhere on the slide
 * (toward a side it wraps narrower),
 * with mouse or finger. The frame is the nearest positioned parent. Drops call `onMove` once.
 */
export function MovableText({ at, side, movable, verticalOnly = false, hidden, quiet = false, onMove, onDragging, children }: Props) {
  const content = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<TextAt | null>(null);
  const shown = live ?? at;
  const span = textSpan(shown.x, side / 100);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const frame = (e.currentTarget.parentElement?.offsetParent as HTMLElement | null)?.getBoundingClientRect();
    const box = content.current?.getBoundingClientRect();
    if (!movable || !frame || !box || e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: at, frame, height: box.height / frame.height, moved: false, verticalOnly };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < SLOP) return;
    if (!d.moved) onDragging?.(true);
    d.moved = true;
    setLive(nextAt(d, e.clientX, e.clientY));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    onMove?.(nextAt(d, e.clientX, e.clientY));
    setLive(null);
    onDragging?.(false);
  };

  return (
    <>
      {!verticalOnly && live?.x === 0.5 && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-emerald-300/80" />}
      <div className="pointer-events-none absolute flex justify-center" style={{ top: `${shown.y * 100}%`, left: `${span.left * 100}%`, right: `${span.right * 100}%` }}>
        <div
          ref={content}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`${movable ? 'pointer-events-auto cursor-grab touch-none rounded-[1.5cqw] outline-offset-[1cqw] outline-dashed select-none active:cursor-grabbing' : ''} ${movable && (!quiet || live) ? 'outline-1' : 'outline-0'} ${live ? 'outline-emerald-300' : 'outline-white/60'}`}
        >
          <div className={hidden ? 'opacity-0' : undefined}>{children}</div>
        </div>
      </div>
    </>
  );
}
