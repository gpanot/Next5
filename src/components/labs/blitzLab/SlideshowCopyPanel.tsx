'use client';

import { useState } from 'react';
import { Images, ImagePlus, Loader2, Minus, Plus, Sparkles, Wand2, X } from 'lucide-react';
import {
  BLITZ_BUSINESS_TEXT_MAX,
  BLITZ_SLIDESHOW_SECONDS_MAX,
  BLITZ_SLIDESHOW_SECONDS_MIN,
} from '../../../config/blitzLab';
import { useLabClient } from '../LabClientProvider';
import { blitzApi, type BlitzAssetDto } from './api';
import type { SlideData } from './SlidePreview';

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
  /** Audio library assets — used by Auto to pick a random track. */
  audioAssets?: BlitzAssetDto[];
  /** Called when Auto picks an audio track so the parent can set audioKey. */
  onAutoAudioPick?: (audioKey: string) => void;
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
  audioAssets = [],
  onAutoAudioPick,
}: SlideshowCopyPanelProps) {
  const client = useLabClient();
  const nonEmptyCount = slides.filter((s) => s.text.trim()).length;

  // Per-slide generate state: 'idle' | 'open' (showing prompt input) | 'generating' | 'error'
  const [genState, setGenState] = useState<Record<number, 'idle' | 'open' | 'generating' | 'error'>>({});
  // Per-slide prompt override (user can edit before generating)
  const [genPrompt, setGenPrompt] = useState<Record<number, string>>({});

  // Auto-generate state: null = idle, number = index currently generating
  const [autoGenerating, setAutoGenerating] = useState<boolean>(false);
  const [autoProgress, setAutoProgress] = useState<number>(0);

  const getSlideGenState = (i: number) => genState[i] ?? 'idle';
  const getSlidePrompt = (i: number) => genPrompt[i] ?? (slides[i]?.bgPromptSuggestion ?? '');

  const toggleGenOpen = (i: number) => {
    const current = getSlideGenState(i);
    if (current === 'open') {
      setGenState((prev) => ({ ...prev, [i]: 'idle' }));
    } else {
      // Pre-fill prompt with suggestion if available
      if (!genPrompt[i] && slides[i]?.bgPromptSuggestion) {
        setGenPrompt((prev) => ({ ...prev, [i]: slides[i].bgPromptSuggestion! }));
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
        setGenState((prev) => ({ ...prev, [i]: 'idle' }));
      } else {
        setGenState((prev) => ({ ...prev, [i]: 'error' }));
      }
    } catch {
      setGenState((prev) => ({ ...prev, [i]: 'error' }));
    }
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

  /**
   * Auto: generate backgrounds for every slide that has a prompt suggestion
   * (or uses the slide text as a fallback prompt), then pick a random audio.
   * Runs slides sequentially so the user can see progress.
   */
  const handleAutoGenerate = async () => {
    if (autoGenerating) return;
    setAutoGenerating(true);
    setAutoProgress(0);

    // Work on a mutable copy we'll accumulate into
    let current = [...slides];

    for (let i = 0; i < current.length; i++) {
      const slide = current[i];
      const prompt = (slide.bgPromptSuggestion ?? slide.text).trim();
      if (!prompt) {
        setAutoProgress(i + 1);
        continue;
      }
      // Mark this slide as generating
      setGenState((prev) => ({ ...prev, [i]: 'generating' }));
      onIndexChange(i);
      try {
        const res = await blitzApi.generateBackground(client, prompt);
        if (res.ok && res.data.asset) {
          const asset = res.data.asset;
          onAssetCreated?.(asset);
          current = current.map((s, idx) =>
            idx === i ? { ...s, backgroundKey: asset.r2Key } : s,
          );
          onChange(current);
          setGenState((prev) => ({ ...prev, [i]: 'idle' }));
        } else {
          setGenState((prev) => ({ ...prev, [i]: 'error' }));
        }
      } catch {
        setGenState((prev) => ({ ...prev, [i]: 'error' }));
      }
      setAutoProgress(i + 1);
    }

    // Pick a random audio from the library (if any exist and none is set yet)
    const libraryAudio = audioAssets.filter((a) => a.source === 'library');
    if (libraryAudio.length > 0 && onAutoAudioPick) {
      const pick = libraryAudio[Math.floor(Math.random() * libraryAudio.length)];
      onAutoAudioPick(pick.r2Key);
    }

    setAutoGenerating(false);
  };

  return (
    <>
      {/* ── Business line ─────────────────────────────────────────────── */}
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

      {/* ── Slide inputs ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">Slides</p>
          <div className="flex items-center gap-2">
            {/* Auto-generate all backgrounds + pick a track */}
            <button
                type="button"
                onClick={() => void handleAutoGenerate()}
                disabled={autoGenerating || !slides.some((s) => (s.bgPromptSuggestion ?? s.text).trim())}
                title="Generate all backgrounds and pick a music track automatically"
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                  autoGenerating
                    ? 'bg-orange-100 text-orange-500 cursor-default'
                    : 'bg-orange-500 text-white hover:opacity-90 disabled:opacity-40',
                ].join(' ')}
              >
                {autoGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {autoProgress}/{slides.length}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    Auto
                  </>
                )}
              </button>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
              {nonEmptyCount} / {slides.length}
            </span>
          </div>
        </div>

        {/* ── Timing control ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-alt px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Images className="h-3.5 w-3.5 shrink-0 text-muted" />
            <p className="text-[12px] font-medium text-ink">Slideshow</p>
            <span className="ml-auto text-[11px] tabular-nums text-muted">
              {durationSeconds.toFixed(0)} s total
            </span>
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

        <div className="flex flex-col gap-2">
          {slides.map((slide, i) => {
            const bgAsset = slide.backgroundKey ? assets.find((a) => a.r2Key === slide.backgroundKey) : undefined;
            const bgThumb = bgAsset?.thumbnailUrl ?? bgAsset?.url;
            const gs = getSlideGenState(i);
            const isGenerating = gs === 'generating';
            const isOpen = gs === 'open';
            const hasError = gs === 'error';

            return (
              <div
                key={i}
                className={`flex flex-col gap-1.5 rounded-xl border p-2 transition-colors ${
                  i === currentIndex ? 'border-orange-400 ring-1 ring-orange-400/40' : 'border-line'
                }`}
              >
                {/* Slide number + background picker + generate + remove */}
                <div className="flex items-center gap-1.5">
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

                  {/* AI generate button */}
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

                  {slides.length > 1 && (
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

                {/* Inline AI generate row */}
                {(isOpen || isGenerating || hasError) && (
                  <div className="flex flex-col gap-1 rounded-lg border border-orange-200 bg-orange-50/60 px-2 py-1.5">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={getSlidePrompt(i)}
                        onChange={(e) => setGenPrompt((prev) => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isGenerating) void handleGenerate(i); }}
                        placeholder="Background image prompt…"
                        disabled={isGenerating}
                        className="min-w-0 flex-1 rounded-md border border-orange-200 bg-white px-2 py-1 text-[11px] text-ink placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-orange-400/40 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => void handleGenerate(i)}
                        disabled={isGenerating || !getSlidePrompt(i).trim()}
                        className="shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {isGenerating ? 'Generating…' : 'Generate'}
                      </button>
                    </div>
                    {hasError && (
                      <p className="text-[10px] text-red-600">Generation failed — check your prompt and try again.</p>
                    )}
                    {isGenerating && (
                      <p className="text-[10px] text-muted">Usually 10–30 seconds…</p>
                    )}
                  </div>
                )}

                {/* Text input */}
                <textarea
                  value={slide.text}
                  rows={2}
                  placeholder={`Slide ${i + 1} text…`}
                  onFocus={() => onIndexChange(i)}
                  onChange={(e) => updateSlide(i, e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addSlide}
          disabled={slides.length >= MAX_SLIDES}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-white px-4 text-[12px] text-muted transition-colors hover:border-orange-400 hover:text-orange-600 disabled:opacity-40"
        >
          + Add slide
          {slides.length >= MAX_SLIDES && <span className="text-[10px]">(max {MAX_SLIDES})</span>}
        </button>
      </div>
    </>
  );
}
