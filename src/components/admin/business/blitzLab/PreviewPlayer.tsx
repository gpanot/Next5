'use client';

/**
 * Blitz Lab — Center Preview Player
 *
 * - Dynamically imports RemotionPlayerInner with ssr:false (Remotion uses browser APIs).
 * - A transparent layer on top of the player captures pointer events:
 *     • pointer down on the caption  → select TEXT and drag it
 *     • pointer down on the meme clip → select OVERLAY and drag it
 *     • pointer down on empty space   → nothing
 *   Hit testing reads the real DOM boxes of the composition layers (canvasHitTest).
 * - Drag deltas come from clientX/clientY (movementX is unreliable with display
 *   scaling) and are scaled from DOM px to 1080p canvas px.
 * - The selected layer gets an outline that follows it every frame.
 */

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { BLITZ_CANVAS_WIDTH } from '../../../../config/blitzLab';
import type { GreenScreenProps } from '../../../../remotion/types';
import { hitTest, type BlitzLayer } from './canvasHitTest';
import { useLayerOutline } from './useLayerOutline';

const RemotionPlayerWrapper = dynamic(
  () => import('./RemotionPlayerInner').then((mod) => ({ default: mod.RemotionPlayerInner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-neutral-900 text-[11px] text-white/40">
        Loading preview…
      </div>
    ),
  },
);

const LAYER_LABEL: Record<BlitzLayer, string> = { TEXT: 'Caption', OVERLAY: 'Meme video' };

type PreviewPlayerProps = {
  inputProps: GreenScreenProps;
  activeLayer: BlitzLayer;
  onSelectLayer: (layer: BlitzLayer) => void;
  onOverlayOffsetChange: (dx: number, dy: number) => void;
  onTextOffsetChange: (dx: number, dy: number) => void;
};

export function PreviewPlayer({
  inputProps,
  activeLayer,
  onSelectLayer,
  onOverlayOffsetChange,
  onTextOffsetChange,
}: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ layer: BlitzLayer; x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<BlitzLayer | null>(null);
  const [playFromStartSignal, setPlayFromStartSignal] = useState(0);
  const outline = useLayerOutline(containerRef, activeLayer);
  const hoverOutline = useLayerOutline(containerRef, hovered && hovered !== activeLayer && !isDragging ? hovered : null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const root = containerRef.current;
    const layer = root ? hitTest(root, e.clientX, e.clientY) : null;
    if (!layer) return;
    onSelectLayer(layer);
    drag.current = { layer, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, [onSelectLayer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const root = containerRef.current;
    if (!root) return;
    const current = drag.current;
    if (!current) {
      setHovered(hitTest(root, e.clientX, e.clientY));
      return;
    }
    const scale = BLITZ_CANVAS_WIDTH / root.getBoundingClientRect().width;
    const dx = (e.clientX - current.x) * scale;
    const dy = (e.clientY - current.y) * scale;
    drag.current = { ...current, x: e.clientX, y: e.clientY };
    if (current.layer === 'TEXT') onTextOffsetChange(dx, dy);
    else onOverlayOffsetChange(dx, dy);
  }, [onOverlayOffsetChange, onTextOffsetChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
    setIsDragging(false);
  }, []);

  const cursor = isDragging ? 'cursor-grabbing' : hovered ? 'cursor-grab' : 'cursor-default';

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* 9:16 aspect ratio container */}
      <div
        ref={containerRef}
        className="relative mx-auto overflow-hidden rounded-2xl shadow-lg"
        style={{ aspectRatio: '9/16', width: '100%', maxWidth: 400 }}
      >
        <RemotionPlayerWrapper inputProps={inputProps} playFromStartSignal={playFromStartSignal} />

        {/* Hover outline for a layer that is not selected yet */}
        {hoverOutline && (
          <div
            className="pointer-events-none absolute rounded-md border border-dashed border-white/80"
            style={{ left: hoverOutline.left, top: hoverOutline.top, width: hoverOutline.width, height: hoverOutline.height }}
          />
        )}

        {/* Selection outline */}
        {outline && (
          <div
            className="pointer-events-none absolute rounded-md border-2 border-orange-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-opacity"
            style={{ left: outline.left, top: outline.top, width: outline.width, height: outline.height }}
          >
            <span
              className={[
                'absolute left-0 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white',
                outline.top < 24 ? 'top-1 ml-1' : '-top-6',
              ].join(' ')}
            >
              {LAYER_LABEL[activeLayer]}
            </span>
          </div>
        )}

        {/* Pointer capture layer. touch-none so a finger drag moves the layer instead of scrolling the page. */}
        <div
          data-testid="blitz-canvas"
          className={['absolute inset-0 touch-none', cursor].join(' ')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => !drag.current && setHovered(null)}
        />

        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
          <span className="whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-sm">
            {isDragging ? `Moving ${LAYER_LABEL[activeLayer].toLowerCase()}` : 'Click the text or the video to select it'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPlayFromStartSignal((n) => n + 1)}
        className="min-h-9 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt"
      >
        ▶ Play from Start
      </button>
    </div>
  );
}
