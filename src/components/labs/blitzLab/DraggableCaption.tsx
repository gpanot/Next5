'use client';

/**
 * A paused deck card's caption, moved up or down by drag (never sideways: it stays centered) or by the arrow keys.
 * Placed like SlideCaption (its bottom edge at positionY of the card's height). It goes at most halfway into TikTok's
 * top and bottom bands (shown in red while dragging).
 * The new height is reported once, on release; the parent shows it from then on.
 */

import type React from 'react';
import { useRef, useState } from 'react';
import type { TextConfig } from '../../../remotion/types';
import { TIKTOK_SAFE_ZONE } from '../../../config/tiktokSafeZone';
import { CAPTION_TOP_MIN, CAPTION_Y_MAX } from '../../../types/admin/calendarIdeas';
import { CaptionText } from './SlideCaption';

type Props = {
  text: React.ReactNode;
  config: TextConfig;
  positionY?: number;
  onMove: (positionY: number) => void;
};

const KEY_STEP = 0.02;

/** `y` kept within the limits for a caption `capH` tall (fraction of the card): its top edge too. */
const clampY = (y: number, capH: number) => Math.min(CAPTION_Y_MAX, Math.max(Math.min(CAPTION_Y_MAX, CAPTION_TOP_MIN + capH), y));

/** TikTok's top and bottom bands, over the card while the caption moves. */
function SafeBands() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
      <div className="absolute inset-x-0 top-0 bg-red-500/40" style={{ height: `${TIKTOK_SAFE_ZONE.top * 100}%` }} />
      <div className="absolute inset-x-0 bottom-0 bg-red-500/40" style={{ height: `${TIKTOK_SAFE_ZONE.bottom * 100}%` }} />
    </div>
  );
}

export function DraggableCaption({ text, config, positionY, onMove }: Props) {
  const saved = positionY ?? config.positionY ?? 0.15;
  const frameRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ pointerY: number; y: number; height: number; capH: number } | null>(null);
  const [dragY, setDragY] = useState<number | null>(null);
  const y = dragY ?? saved;

  /** The card's height and the caption's, as a fraction of it. */
  const measure = (caption: HTMLElement) => {
    const card = frameRef.current?.parentElement?.getBoundingClientRect();
    return card && card.height > 0 ? { height: card.height, capH: caption.getBoundingClientRect().height / card.height } : null;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const m = measure(e.currentTarget);
    if (!m) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { pointerY: e.clientY, y: saved, ...m };
    setDragY(saved);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (s) setDragY(clampY(s.y + (e.clientY - s.pointerY) / s.height, s.capH));
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    if (dragY !== null && Math.abs(dragY - saved) > 0.002) onMove(Number(dragY.toFixed(4)));
    setDragY(null);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    e.stopPropagation();
    const m = measure(e.currentTarget);
    if (m) onMove(clampY(saved + (e.key === 'ArrowUp' ? -KEY_STEP : KEY_STEP), m.capH));
  };

  return (
    <>
      {dragY !== null && <SafeBands />}
      <div ref={frameRef} className="pointer-events-none absolute inset-x-0 z-[4] flex justify-center" style={{ bottom: `${(1 - y) * 100}%` }}>
        <div
          data-no-swipe
          role="slider"
          tabIndex={0}
          aria-label="Caption height. Drag up or down."
          aria-orientation="vertical"
          aria-valuemin={Math.round(CAPTION_TOP_MIN * 100)}
          aria-valuemax={Math.round(CAPTION_Y_MAX * 100)}
          aria-valuenow={Math.round(y * 100)}
          title="Drag up or down"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={[
            // Full width, so the caption wraps exactly like SlideCaption (its padding is a % of the card).
            'pointer-events-auto w-full cursor-ns-resize touch-none rounded-xl outline-dashed outline-2 -outline-offset-2 transition-[outline-color]',
            'focus-visible:outline-white',
            dragY === null ? 'outline-white/70' : 'outline-white',
          ].join(' ')}
        >
          <CaptionText text={text} config={config} />
        </div>
      </div>
    </>
  );
}
