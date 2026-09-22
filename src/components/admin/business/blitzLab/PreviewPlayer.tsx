'use client';

/**
 * Blitz Lab — Center Preview Player
 *
 * - Dynamically imports RemotionPlayerInner with ssr:false to avoid
 *   Next.js 16 SSR hydration errors (Remotion uses browser Canvas APIs).
 * - An absolute-positioned div on top of the player captures pointer events
 *   for overlay drag. Deltas are multiplied by the canvas-to-DOM scale ratio
 *   so the 1080px canvas maps 1:1 to what the user drags on screen.
 * - "Play from Start" increments playFromStartSignal, which RemotionPlayerInner
 *   watches via useEffect to seekTo(0) + play(). We avoid ref forwarding through
 *   dynamic() (not supported by Next.js) by using a signal prop instead.
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
  onOffsetChange: (dx: number, dy: number) => void;
};

export function PreviewPlayer({ inputProps, onOffsetChange }: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Signal-based "Play from Start": increment triggers seekTo(0)+play inside RemotionPlayerInner
  const [playFromStartSignal, setPlayFromStartSignal] = useState(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const domWidth = containerRef.current?.getBoundingClientRect().width ?? 360;
      const scale = BLITZ_CANVAS_WIDTH / domWidth;
      onOffsetChange(e.movementX * scale, e.movementY * scale);
    },
    [isDragging, onOffsetChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }, []);

  const handlePlayFromStart = useCallback(() => {
    setPlayFromStartSignal((n) => n + 1);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 9:16 aspect ratio container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl shadow-lg"
        style={{ aspectRatio: '9/16', maxWidth: 320 }}
      >
        {/* Remotion player (SSR-safe) */}
        <RemotionPlayerWrapper
          inputProps={inputProps}
          playFromStartSignal={playFromStartSignal}
        />

        {/* Drag-capture overlay — sits above the canvas, captures all pointer events */}
        <div
          className={[
            'absolute inset-0',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          ].join(' ')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Play from Start convenience button */}
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
