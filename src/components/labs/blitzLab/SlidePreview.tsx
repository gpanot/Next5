'use client';

/**
 * SlidePreview — CSS-only slide navigator for the Blitz Slideshow tab.
 *
 * Shows the current slide's text over its own background (or the global fallback).
 * Navigation: prev/next arrows + dot indicators — always visible for all slides.
 * Drag the caption or business line to reposition (mirrors PreviewPlayer UX).
 * No Remotion dependency — pure React/CSS, instant preview.
 */

import { useCallback, useRef, useState } from 'react';
import { BLITZ_CANVAS_WIDTH } from '../../../config/blitzLab';
import { resolveBlitzFont } from '../../../remotion/fonts';
import type { TextConfig } from '../../../remotion/types';
import { hitTest } from './canvasHitTest';
import type { BlitzLayer } from './canvasHitTest';
import type { BlitzAssetDto } from './api';

export type SlideData = {
  text: string;
  /** R2 key for this slide's background; falls back to fallbackBackgroundKey when absent. */
  backgroundKey?: string;
  /** Recommended GPT-image-2 background prompt (pre-filled from Phase0A template when "Use as inspiration" is clicked). */
  bgPromptSuggestion?: string;
  /** Fixed slide length in seconds (7-shot deck videos). Absent = the editor's seconds-per-slide. */
  durationSec?: number;
  /** Start offset into a video background, seconds (the asset's best moment). */
  trimStart?: number;
  /** Caption position for this slide (TextConfig.positionY scale), chosen from the asset's text-safe zone. */
  positionY?: number;
};

type SlidePreviewProps = {
  slides: SlideData[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  /** All loaded assets (used to resolve background thumbnails). */
  assets: BlitzAssetDto[];
  /** Global background key used when a slide has no individual background. */
  fallbackBackgroundKey: string;
  businessText?: string;
  textConfig: TextConfig;
  /** Called when the user drags the caption (canvas-px delta). */
  onDragCaption: (dx: number, dy: number) => void;
  /** Called when the user drags the business line (canvas-px delta). */
  onDragBusiness: (dx: number, dy: number) => void;
};

const LAYER_LABEL: Record<BlitzLayer, string> = {
  TEXT: 'Caption',
  OVERLAY: 'Meme video',
  BUSINESS: 'Business line',
};

/** Maps TextConfig values to CSS proportional to the 9:16 preview container. */
function cssTextStyle(config: TextConfig): React.CSSProperties {
  const strokeW = config.strokeWidth ?? 3;
  const strokeC = config.strokeColor ?? '#000000';
  return {
    fontFamily: resolveBlitzFont(config.font),
    // Scale font relative to the container width (1080px canvas → 100cqw in this preview).
    // cqw requires containerType: 'inline-size' on the parent — set on the canvas div.
    fontSize: `${Math.round((config.fontSize / 1080) * 100)}cqw`,
    fontWeight: config.fontWeight ?? 700,
    color: config.color ?? '#ffffff',
    textAlign: 'center' as const,
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.25,
    ...(strokeW > 0
      ? ({ WebkitTextStroke: `${(strokeW / 1080) * 100}cqw ${strokeC}`, paintOrder: 'stroke fill' } as React.CSSProperties)
      : { textShadow: '0 2px 8px rgba(0,0,0,0.8)' }),
    padding: '0 8%',
    margin: 0,
  };
}

export function SlidePreview({
  slides,
  currentIndex,
  onIndexChange,
  assets,
  fallbackBackgroundKey,
  businessText,
  textConfig,
  onDragCaption,
  onDragBusiness,
}: SlidePreviewProps) {
  // Always navigate over ALL slides (including empty), so the user sees 3 slots.
  const count = Math.max(1, slides.length);
  const safeIndex = Math.min(currentIndex, count - 1);
  const currentSlide = slides[safeIndex];
  const rawText = currentSlide?.text ?? '';
  // Replace [BUSINESS_NAME] placeholder with the actual business text for preview display.
  const currentText = businessText?.trim()
    ? rawText.replace(/\[BUSINESS_NAME\]/g, businessText.trim())
    : rawText;

  // Resolve background for the current slide
  const bgKey = currentSlide?.backgroundKey || fallbackBackgroundKey;
  const backgroundAsset = assets.find((a) => a.r2Key === bgKey);
  const bgUrl = backgroundAsset
    ? backgroundAsset.thumbnailUrl ?? backgroundAsset.url
    : undefined;

  const prev = () => onIndexChange(Math.max(0, safeIndex - 1));
  const next = () => onIndexChange(Math.min(count - 1, safeIndex + 1));

  // ── Drag-to-reposition (mirrors PreviewPlayer) ───────────────────────
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ layer: BlitzLayer; x: number; y: number } | null>(null);
  /** The layer being dragged — mirrored in state because render reads it for the label. */
  const [draggingLayer, setDraggingLayer] = useState<BlitzLayer | null>(null);
  const [hovered, setHovered] = useState<BlitzLayer | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const root = canvasRef.current;
    const layer = root ? hitTest(root, e.clientX, e.clientY) : null;
    if (!layer || layer === 'OVERLAY') return; // no overlay in slideshow
    drag.current = { layer, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingLayer(layer);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const root = canvasRef.current;
    if (!root) return;
    const current = drag.current;
    if (!current) {
      const hit = hitTest(root, e.clientX, e.clientY);
      setHovered(hit === 'OVERLAY' ? null : hit);
      return;
    }
    const scale = BLITZ_CANVAS_WIDTH / root.getBoundingClientRect().width;
    const dx = (e.clientX - current.x) * scale;
    const dy = (e.clientY - current.y) * scale;
    drag.current = { ...current, x: e.clientX, y: e.clientY };
    if (current.layer === 'TEXT') onDragCaption(dx, dy);
    else if (current.layer === 'BUSINESS') onDragBusiness(dx, dy);
  }, [onDragCaption, onDragBusiness]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
    setDraggingLayer(null);
  }, []);

  const cursorClass = draggingLayer ? 'cursor-grabbing' : hovered ? 'cursor-grab' : 'cursor-default';

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* Arrows + Canvas row */}
      <div className="flex w-full items-center justify-center gap-2">
        {/* Prev arrow — outside the canvas on the left */}
        {count > 1 ? (
          <button
            type="button"
            onClick={prev}
            disabled={safeIndex === 0}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 shadow transition hover:bg-neutral-300 disabled:opacity-30 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            aria-label="Previous slide"
          >
            ‹
          </button>
        ) : (
          <div className="w-9 shrink-0" />
        )}

      {/* Canvas — containerType enables cqw units in cssTextStyle */}
      <div
        ref={canvasRef}
        className="relative w-full max-w-[300px] overflow-hidden rounded-2xl bg-neutral-900"
        style={{ aspectRatio: '9/16', containerType: 'inline-size' } as React.CSSProperties}
      >
        {/* Background */}
        {bgUrl ? (
          backgroundAsset?.mediaKind === 'video' ? (
            <video
              key={bgKey} // re-mount when background changes slide
              src={backgroundAsset.url}
              poster={backgroundAsset.thumbnailUrl ?? undefined}
              muted
              playsInline
              loop
              autoPlay
              onLoadedMetadata={(e) => {
                if (currentSlide?.trimStart) e.currentTarget.currentTime = currentSlide.trimStart;
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p className="px-6 text-center text-[10px] text-white/50">
              {currentSlide?.backgroundKey
                ? 'Loading background…'
                : 'No background — pick one for this slide or set a global default'}
            </p>
          </div>
        )}

        {/* Semi-transparent scrim so text is always legible */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Slide text — data-blitz-layer for drag hit testing */}
        <div
          data-blitz-layer="TEXT"
          className="absolute inset-x-0 flex justify-center"
          style={{ bottom: `${(1 - (currentSlide?.positionY ?? textConfig.positionY ?? 0.15)) * 100}%` }}
        >
          {currentText ? (
            <p style={cssTextStyle(textConfig)}>{currentText}</p>
          ) : (
            <p
              style={{ ...cssTextStyle(textConfig), opacity: 0.35 }}
            >
              Slide {safeIndex + 1} text…
            </p>
          )}
        </div>

        {/* Business pill removed — [BUSINESS_NAME] is replaced inline in the slide text instead */}

        {/* Pointer-capture layer: handles drag + hover — rendered BEFORE buttons so buttons sit on top */}
        <div
          className={`absolute inset-0 touch-none select-none ${cursorClass}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* (arrows moved outside canvas) */}

        {/* Drag hint tooltip */}
        {hovered && !draggingLayer && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[10px] text-white/90 shadow">
            Drag to reposition {LAYER_LABEL[hovered].toLowerCase()}
          </div>
        )}

        {/* Active drag label */}
        {draggingLayer && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-semibold text-white shadow">
            Moving {LAYER_LABEL[draggingLayer].toLowerCase()}…
          </div>
        )}
      </div>{/* end canvas */}

        {/* Next arrow — outside the canvas on the right */}
        {count > 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={safeIndex === count - 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 shadow transition hover:bg-neutral-300 disabled:opacity-30 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            aria-label="Next slide"
          >
            ›
          </button>
        ) : (
          <div className="w-9 shrink-0" />
        )}
      </div>{/* end arrows + canvas row */}

      {/* Dots + counter — always shown when count > 1 */}
      {count > 1 && (
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onIndexChange(i)}
              className={`h-2 rounded-full transition-all ${
                i === safeIndex ? 'w-5 bg-orange-500' : 'w-2 bg-neutral-300'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
          <span className="ml-1 text-[11px] tabular-nums text-muted">
            {safeIndex + 1} / {count}
          </span>
        </div>
      )}
    </div>
  );
}
