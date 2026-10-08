'use client';

import { useState, useRef } from 'react';
import { GripVertical, Images, ImagePlus, Loader2, Minus, Plus, Sparkles, X } from 'lucide-react';
import {
  BLITZ_BUSINESS_TEXT_MAX,
  BLITZ_SLIDESHOW_SECONDS_MAX,
  BLITZ_SLIDESHOW_SECONDS_MIN,
} from '../../../config/blitzLab';
import { useLabClient } from '../LabClientProvider';
import { blitzApi, type BlitzAssetDto } from './api';
import type { SlideData } from './SlidePreview';
import { ShotAlternatives } from './ShotAlternatives';
import { countWords, type MediaChoice, type ShotFormat } from './shotFormat';

export type { SlideData };

const MAX_SLIDES = 10;

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/30 dark:border-neutral-700 dark:bg-neutral-800';

type SlideshowCopyPanelProps = {
  slides: SlideData[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  onChange: (slides: SlideData[]) => void;
  /** All loaded assets (for background thumbnails). */
  assets: BlitzAssetDto[];
  /** Called when the user clicks "pick background" for slide i. */
  onPickBackground: (slideIndex: number) => void;
  mentionBusiness: boolean;
  onMentionBusinessChange: (on: boolean) => void;
  businessText: string;
  onBusinessTextChange: (text: string) => void;
  /** Called after a background is AI-generated so the parent can add it to its assets state. */
  onAssetCreated?: (asset: BlitzAssetDto) => void;
  /** How long each card holds, in seconds. */
  secondsPerSlide: number;
  onSecondsPerSlideChange: (seconds: number) => void;
  /** Resulting clip length, in seconds. */
  durationSeconds: number;
  /**
   * Fixed shot format (deck videos): labels each slide with its role and a live word limit,
   * and locks the slide count and order. Absent = free-form slideshow.
   */
  shotFormat?: readonly ShotFormat[];
  /** Deck videos: the engine's runner-up clips per slide, for one-tap swap. */
  alternatives?: MediaChoice[][];
};

/** Slide text inputs + per-slide backgrounds + business line for the Blitz Slideshow editor. */
export function SlideshowCopyPanel({
  slides,
  currentIndex,
  onIndexChange,
  onChange,
  assets,
  onPickBackground,
  mentionBusiness,
  onMentionBusinessChange,
  businessText,
  onBusinessTextChange,
  onAssetCreated,
  secondsPerSlide,
  onSecondsPerSlideChange,
  durationSeconds,
  shotFormat,
  alternatives,
}: SlideshowCopyPanelProps) {
  const isFixed = Boolean(shotFormat);
  const client = useLabClient();
  const nonEmptyCount = slides.filter((s) => s.text.trim()).length;

  // Per-slide generate state: 'idle' | 'open' (showing prompt input) | 'generating' | 'error'
  const [genState, setGenState] = useState<Record<number, 'idle' | 'open' | 'generating' | 'error'>>({});
  // Per-slide prompt override (user can edit before generating)
  const [genPrompt, setGenPrompt] = useState<Record<number, string>>({});

  // Deck videos: pictures generated from the Swap row's "+", kept as extra swaps for that slide.
  const [generated, setGenerated] = useState<Record<number, MediaChoice[]>>({});

  // ── drag-to-reorder ────────────────────────────────────────────────────
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, i: number) => {
    dragIndexRef.current = i;
    e.dataTransfer.effectAllowed = 'move';
    // Transparent ghost — we rely on CSS opacity instead
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '';
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(i);
  };

  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === i) { setDragOverIndex(null); return; }
    const next = [...slides];
    const [removed] = next.splice(from, 1);
    next.splice(i, 0, removed);
    onChange(next);
    // Keep the active slide tracking correct after reorder
    if (currentIndex === from) {
      onIndexChange(i);
    } else if (from < i && currentIndex > from && currentIndex <= i) {
      onIndexChange(currentIndex - 1);
    } else if (from > i && currentIndex >= i && currentIndex < from) {
      onIndexChange(currentIndex + 1);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const getSlideGenState = (i: number) => genState[i] ?? 'idle';
  /** Prompt behind the slide's current picture: its template suggestion, else the asset name (which encodes the prompt). */
  const currentImagePrompt = (i: number) => {
    const slide = slides[i];
    if (!slide) return '';
    if (slide.bgPromptSuggestion) return slide.bgPromptSuggestion;
    const key = slide.backgroundKey;
    if (!key) return '';
    const label = assets.find((a) => a.r2Key === key)?.name
      ?? [...(alternatives?.[i] ?? []), ...(generated[i] ?? [])].find((c) => c.assetKey === key)?.mediaLabel
      ?? '';
    return label.replace(/\s*\[AI\]$/, '').replace(/\.(png|jpe?g|webp)$/i, '').trim();
  };

  const getSlidePrompt = (i: number) => genPrompt[i] ?? currentImagePrompt(i);

  const toggleGenOpen = (i: number) => {
    const current = getSlideGenState(i);
    if (current === 'open') {
      setGenState((prev) => ({ ...prev, [i]: 'idle' }));
    } else {
      // Pre-fill prompt with the current picture's prompt
      const prefill = currentImagePrompt(i);
      if (!genPrompt[i] && prefill) {
        setGenPrompt((prev) => ({ ...prev, [i]: prefill }));
      }
      setGenState((prev) => ({ ...prev, [i]: 'open' }));
    }
  };

  const handleGenerate = async (i: number) => {
    const prompt = getSlidePrompt(i).trim();
    if (!prompt) return;
    setGenState((prev) => ({ ...prev, [i]: 'generating' }));
    try {
      const res = await blitzApi.generateBackground(client, prompt);
      if (res.ok && res.data.asset) {
        const asset = res.data.asset;
        // Update slide background
        const next = [...slides];
        next[i] = { ...next[i], backgroundKey: asset.r2Key };
        onChange(next);
        onAssetCreated?.(asset);
        const choice: MediaChoice = { mediaUrl: asset.thumbnailUrl ?? asset.url, mediaKind: 'image', mediaLabel: asset.name, assetKey: asset.r2Key };
        setGenerated((prev) => ({ ...prev, [i]: [...(prev[i] ?? []), choice] }));
        setGenState((prev) => ({ ...prev, [i]: 'idle' }));
      } else {
        setGenState((prev) => ({ ...prev, [i]: 'error' }));
      }
    } catch {
      setGenState((prev) => ({ ...prev, [i]: 'error' }));
    }
  };

  const pickAlternative = (i: number, choice: MediaChoice) => {
    if (!choice.assetKey) return;
    const next = [...slides];
    next[i] = { ...next[i], backgroundKey: choice.assetKey, trimStart: choice.trimStart, positionY: choice.positionY };
    onChange(next);
    onIndexChange(i);
  };

  const updateSlide = (i: number, value: string) => {
    const next = [...slides];
    next[i] = { ...next[i], text: value };
    onChange(next);
  };

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return;
    const next = [...slides, { text: '' }];
    onChange(next);
    onIndexChange(next.length - 1);
  };

  const removeSlide = (i: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, idx) => idx !== i);
    onChange(next);
    onIndexChange(Math.min(currentIndex, next.length - 1));
  };

  return (
    <>
      {/* ── Business line (free-form only: deck videos don't mention the business) ── */}
      {!isFixed && (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-ink">Mention your business?</p>
          <div className="flex gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onMentionBusinessChange(val)}
                className={[
                  'min-h-9 rounded-full px-4 text-[12px] transition-colors',
                  mentionBusiness === val
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-muted ring-1 ring-line hover:text-ink dark:bg-neutral-800',
                ].join(' ')}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        {mentionBusiness && (
          <div className="flex flex-col gap-1">
            <label htmlFor="slideshow-business" className="text-[12px] font-medium text-muted">
              Business line (replace [BUSINESS_NAME] on every slide)
            </label>
            <input
              id="slideshow-business"
              value={businessText}
              maxLength={BLITZ_BUSINESS_TEXT_MAX}
              onChange={(e) => onBusinessTextChange(e.target.value)}
              placeholder="Sarah Lee · Keller Williams · 555-0100"
              className={inputClass}
            />
            <p className="text-right text-[10px] tabular-nums text-muted">
              {businessText.length}/{BLITZ_BUSINESS_TEXT_MAX}
            </p>
          </div>
        )}
      </div>
      )}

      {/* ── Slide inputs ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">Slides</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-muted">{durationSeconds.toFixed(0)} s total</span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
              {nonEmptyCount} / {slides.length}
            </span>
          </div>
        </div>

        {/* ── Timing control (free-form only: deck videos have fixed shot lengths) ── */}
        {!isFixed && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-alt px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Images className="h-3.5 w-3.5 shrink-0 text-muted" />
            <p className="text-[12px] font-medium text-ink">Slideshow</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="seconds-per-slide" className="text-[11px] text-muted">
              Seconds per slide
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSecondsPerSlideChange(secondsPerSlide - 1)}
                disabled={secondsPerSlide <= BLITZ_SLIDESHOW_SECONDS_MIN}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted transition-colors hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 dark:bg-neutral-800"
                aria-label="Shorter slides"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span id="seconds-per-slide" className="w-9 text-center text-[12px] font-semibold tabular-nums text-ink">
                {secondsPerSlide}s
              </span>
              <button
                type="button"
                onClick={() => onSecondsPerSlideChange(secondsPerSlide + 1)}
                disabled={secondsPerSlide >= BLITZ_SLIDESHOW_SECONDS_MAX}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted transition-colors hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 dark:bg-neutral-800"
                aria-label="Longer slides"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        )}

        <div className="flex flex-col gap-2">
          {slides.map((slide, i) => {
            const bgAsset = slide.backgroundKey ? assets.find((a) => a.r2Key === slide.backgroundKey) : undefined;
            const bgThumb = bgAsset?.thumbnailUrl ?? bgAsset?.url;
            const gs = getSlideGenState(i);
            const isGenerating = gs === 'generating';
            const isOpen = gs === 'open';
            const hasError = gs === 'error';
            const fmt = shotFormat?.[i];
            const words = countWords(slide.text);
            const overLimit = Boolean(fmt && (words === 0 || words > fmt.maxWords));
            const choices = alternatives?.[i] ? [...alternatives[i]!, ...(generated[i] ?? [])] : undefined;
            // Picture shots get the "+" slot; video shots only swap clips.
            const isPicture = (choices?.find((c) => c.assetKey === slide.backgroundKey)?.mediaKind ?? bgAsset?.mediaKind) === 'image';

            return (
              <div
                key={i}
                draggable={!isFixed}
                onDragStart={isFixed ? undefined : (e) => handleDragStart(e, i)}
                onDragEnd={isFixed ? undefined : handleDragEnd}
                onDragOver={isFixed ? undefined : (e) => handleDragOver(e, i)}
                onDrop={isFixed ? undefined : (e) => handleDrop(e, i)}
                className={[
                  'flex flex-col gap-1.5 rounded-xl border p-2 transition-colors',
                  i === currentIndex ? 'border-orange-400 ring-1 ring-orange-400/40' : 'border-line',
                  dragOverIndex === i && dragIndexRef.current !== i ? 'border-orange-400 bg-orange-50/60' : '',
                ].join(' ')}
              >
                {/* Drag handle + slide number + background picker + generate + remove */}
                <div className="flex items-center gap-1.5">
                  {/* Drag handle (free-form only: the shot order is fixed for deck videos) */}
                  {!isFixed && (
                    <span
                      className="flex h-7 w-4 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-label={`Drag slide ${i + 1} to reorder`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-[11px] font-semibold text-muted">
                    {i + 1}
                  </span>
                  {/* Per-slide background thumbnail / picker */}
                  <button
                    type="button"
                    onClick={() => onPickBackground(i)}
                    className="flex h-7 flex-1 items-center gap-1.5 overflow-hidden rounded-lg border border-line bg-surface-alt px-2 text-[11px] text-muted transition-colors hover:border-orange-400 hover:text-orange-600"
                    title={bgAsset ? `Background: ${bgAsset.name}` : 'Pick a background for this slide'}
                  >
                    {bgThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bgThumb} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {bgAsset ? bgAsset.name : 'Pick background'}
                    </span>
                  </button>

                  {/* AI generate button (free-form only: deck videos use the Swap row's "+") */}
                  {!isFixed && (
                  <button
                      type="button"
                      onClick={() => {
                        if (isGenerating) return;
                        toggleGenOpen(i);
                      }}
                      disabled={isGenerating}
                      title={slide.bgPromptSuggestion ? 'Generate AI background (prompt pre-filled from template)' : 'Generate AI background'}
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isOpen
                          ? 'bg-orange-500 text-white'
                          : isGenerating
                          ? 'bg-orange-50 text-orange-400'
                          : 'text-muted hover:bg-orange-50 hover:text-orange-500',
                        slide.bgPromptSuggestion ? 'ring-1 ring-orange-200' : '',
                      ].join(' ')}
                      aria-label={`Generate AI background for slide ${i + 1}`}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  {slides.length > 1 && !isFixed && (
                    <button
                      type="button"
                      onClick={() => removeSlide(i)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove slide ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Shot role + live word limit (deck videos) */}
                {fmt && (
                  <div className="flex items-baseline justify-between px-0.5 text-[11px]">
                    <span className="font-semibold text-ink">
                      {fmt.label} <span className="font-normal text-muted">· {fmt.durationSec}s</span>
                    </span>
                    <span className={overLimit ? 'font-semibold text-red-600 dark:text-red-400' : 'tabular-nums text-muted'}>
                      {words}/{fmt.maxWords} words
                    </span>
                  </div>
                )}

                {/* Engine runner-ups for this shot (deck videos) */}
                {choices && (
                  <ShotAlternatives
                    choices={choices}
                    currentKey={slide.backgroundKey}
                    onPick={(c) => pickAlternative(i, c)}
                    onAdd={isPicture ? () => { onIndexChange(i); toggleGenOpen(i); } : undefined}
                    addState={isGenerating ? 'generating' : isOpen ? 'open' : undefined}
                  />
                )}

                {/* Inline AI generate row */}
                {(isOpen || isGenerating || hasError) && (
                  <div className="flex flex-col gap-1 rounded-lg border border-orange-200 bg-orange-50/60 px-2 py-1.5">
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        rows={3}
                        value={getSlidePrompt(i)}
                        onChange={(e) => setGenPrompt((prev) => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !isGenerating) { e.preventDefault(); void handleGenerate(i); }
                        }}
                        placeholder="Background image prompt…"
                        aria-label={`Background image prompt for slide ${i + 1}`}
                        disabled={isGenerating}
                        className="w-full resize-none rounded-md border border-orange-200 bg-white px-2 py-1 text-[11px] leading-snug text-ink placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-orange-400/40 disabled:opacity-60 dark:border-orange-900/60 dark:bg-neutral-800"
                      />
                      <button
                        type="button"
                        onClick={() => void handleGenerate(i)}
                        disabled={isGenerating || !getSlidePrompt(i).trim()}
                        className="self-end inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {isGenerating ? 'Generating…' : 'Generate'}
                      </button>
                    </div>
                    {hasError && (
                      <p className="text-[10px] text-red-600">Generation failed — check your prompt and try again.</p>
                    )}
                    {isGenerating && (
                      <p className="text-[10px] text-muted">Usually 30–40 seconds…</p>
                    )}
                  </div>
                )}

                {/* Text input */}
                <textarea
                  value={slide.text}
                  rows={2}
                  placeholder={fmt ? `${fmt.label} line…` : `Slide ${i + 1} text…`}
                  aria-label={fmt ? `${fmt.label} text` : `Slide ${i + 1} text`}
                  onFocus={() => onIndexChange(i)}
                  onChange={(e) => updateSlide(i, e.target.value)}
                  className={`${inputClass} resize-none ${overLimit ? 'border-red-400 dark:border-red-500' : ''}`}
                />
              </div>
            );
          })}
        </div>

        {!isFixed && (
        <button
          type="button"
          onClick={addSlide}
          disabled={slides.length >= MAX_SLIDES}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-white px-4 text-[12px] text-muted transition-colors hover:border-orange-400 hover:text-orange-600 disabled:opacity-40"
        >
          + Add slide
          {slides.length >= MAX_SLIDES && <span className="text-[10px]">(max {MAX_SLIDES})</span>}
        </button>
        )}
      </div>
    </>
  );
}
