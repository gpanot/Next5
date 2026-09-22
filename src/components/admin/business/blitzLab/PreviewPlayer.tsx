'use client';

/**
 * Blitz Lab — Center Preview Player
 *
 * - Dynamically imports RemotionPlayerInner with ssr:false to avoid
 *   Next.js 16 SSR hydration errors (Remotion uses browser Canvas APIs).
 * - An absolute-positioned div on top of the player captures pointer events.
 *   Deltas are multiplied by the canvas-to-DOM scale ratio so the 1080px
 *   canvas maps 1:1 to what the user drags on screen.
 * - Dragging routes to the active layer:
 *     activeLayer === 'OVERLAY' → onOverlayOffsetChange(dx, dy)
 *     activeLayer === 'TEXT'    → onTextOffsetChange(dx, dy)
 * - "Play from Start" increments playFromStartSignal, which RemotionPlayerInner
 *   watches via useEffect to seekTo(0) + play().
 */

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { BLITZ_CANVAS_WIDTH } from '../../../../config/blitzLab';
import type { GreenScreenProps } from '../../../../remotion/types';

const RemotionPlayerWrapper = dynamic(
  () =>
    import('./RemotionPlayerInner').then((mod) => ({
      default: mod.RemotionPlayerInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black text-[11px] text-white/40">
        Loading preview…
      </div>
    ),
  },
);

type PreviewPlayerProps = {
  inputProps: GreenScreenProps;
  activeLayer: 'OVERLAY' | 'TEXT';
  onOverlayOffsetChange: (dx: number, dy: number) => void;
  onTextOffsetChange: (dx: number, dy: number) => void;
};

export function PreviewPlayer({
  inputProps,
  activeLayer,
  onOverlayOffsetChange,
  onTextOffsetChange,
}: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [playFromStartSignal, setPlayFromStartSignal] = useState(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      // Scale mouse delta from DOM pixels → 1080p canvas pixels
      const domWidth = containerRef.current?.getBoundingClientRect().width ?? 360;
      const scale = BLITZ_CANVAS_WIDTH / domWidth;
      const dx = e.movementX * scale;
      const dy = e.movementY * scale;
      if (activeLayer === 'TEXT') {
        onTextOffsetChange(dx, dy);
      } else {
        onOverlayOffsetChange(dx, dy);
      }
    },
    [isDragging, activeLayer, onOverlayOffsetChange, onTextOffsetChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }, []);

  const handlePlayFromStart = useCallback(() => {
    setPlayFromStartSignal((n) => n + 1);
  }, []);

  // Cursor hint: crosshair to indicate which layer is being dragged
  const cursor = isDragging
    ? 'cursor-grabbing'
    : activeLayer === 'TEXT'
    ? 'cursor-text'
    : 'cursor-grab';

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* 9:16 aspect ratio container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl shadow-lg mx-auto"
        style={{ aspectRatio: '9/16', width: '100%', maxWidth: 400 }}
      >
        {/* Remotion player (SSR-safe) */}
        <RemotionPlayerWrapper
          inputProps={inputProps}
          playFromStartSignal={playFromStartSignal}
        />

        {/* Drag-capture overlay — covers entire canvas, routes to active layer */}
        <div
          className={['absolute inset-0', cursor].join(' ')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Active-layer badge */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-sm">
            {activeLayer === 'TEXT' ? 'T dragging caption' : '🎬 dragging video'}
          </span>
        </div>
      </div>

      {/* Play from Start */}
      <button
        type="button"
        onClick={handlePlayFromStart}
        className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
      >
        ▶ Play from Start
      </button>
    </div>
  );
}
