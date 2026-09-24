'use client';

/**
 * Blitz Slideshow — multi-text-card (CAROUSEL) editor.
 *
 * Three-panel layout, same shape as BlitzLabEditor:
 *   Left  (320px): SlideshowCopyPanel (per-slide text + background) + AssetsPanel for audio
 *   Center (1fr):  SlidePreview — CSS-only navigator, no Remotion dependency; drag to reposition
 *   Right  (220px): ContextPanel (text style)
 *
 * Each slide has its own background, picked per slide. The global background in AssetsPanel is
 * the fallback for slides without one.
 *
 * A Research step above the editor finds a TikTok to model and pre-fills every slide.
 *
 * Presentational and transport-agnostic: every request goes through the surrounding
 * <LabClientProvider>, so the same editor runs in the admin tab and on the user side.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BLITZ_DEFAULT_TEXT_CONFIG,
  BLITZ_SLIDESHOW_SECONDS_PER_SLIDE,
  BLITZ_SLIDESHOW_TEXT_DEFAULTS,
} from '../../../config/blitzLab';
import { useLabClient } from '../LabClientProvider';
import { useContentTemplates } from '../shared/useContentTemplates';
import { Researcher, type NicheSlide } from '../shared/Researcher';
import { StepPills } from '../shared/StepPills';
import type { ResearchVideo } from '../ugcLab/researchCache';
import { AssetLibraryModal } from './AssetLibraryModal';
import { AssetsPanel, keyForLayer, type CurrentAssets } from './AssetsPanel';
import { ContextPanel } from './ContextPanel';
import { LibraryGrid } from './LibraryGrid';
import { RenderControls } from './RenderControls';
import { SlidePreview, type SlideData } from './SlidePreview';
import { SlideshowCopyPanel } from './SlideshowCopyPanel';
import { resolveSlideshowMode } from './useSlideshowMode';
import { blitzApi, type BlitzProjectDto, type BlitzTemplateDto } from './api';
import type { BlitzUploadType } from './upload';
import { isLocalKey } from './useBlitzUploads';
import { useBlitzWorkspace } from './useBlitzWorkspace';
import { useTextLayout } from './useTextLayout';
import type { BlitzLayer } from './canvasHitTest';

const DEFAULT_SLIDES: SlideData[] = [
  { text: "Here's the #1 mistake people make…" },
  { text: "Here's what actually works." },
  { text: 'Save this if you found it helpful!' },
];

const STEPS = [
  { id: 1 as const, label: '1 · Research' },
  { id: 2 as const, label: '2 · Slideshows' },
];

/** A render belongs to this editor when its assets carry slides. */
const isSlideshowProject = (project: BlitzProjectDto): boolean => {
  const assets = project.currentAssets as { slides?: unknown } | null;
  return Boolean(assets && 'slides' in assets);
};

function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr_220px]" aria-busy="true">
      <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="mx-auto w-full max-w-[340px] animate-pulse rounded-2xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}

export function BlitzSlideshowEditor() {
  const client = useLabClient();

  // ── data ──────────────────────────────────────────────────────────────
  const [carouselTemplate, setCarouselTemplate] = useState<BlitzTemplateDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── step navigation ───────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── editor state ──────────────────────────────────────────────────────
  const [currentAssets, setCurrentAssets] = useState<CurrentAssets>({ backgroundKey: '', overlayKey: '' });
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [mentionBusiness, setMentionBusiness] = useState(false);
  const [businessText, setBusinessText] = useState('');
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [activeLayer, setActiveLayer] = useState<BlitzLayer>('TEXT');
  const [picker, setPicker] = useState<{ type: BlitzUploadType; slideIndex?: number } | null>(null);
  /** How long each card holds in slideshow mode. Ignored once a slide carries footage. */
  const [secondsPerSlide, setSecondsPerSlide] = useState(BLITZ_SLIDESHOW_SECONDS_PER_SLIDE);

  const text = useTextLayout(carouselTemplate?.textConfig ?? BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS);

  // Duration is always secondsPerSlide × slideCount — video backgrounds are
  // trimmed/held by the Remotion Sequence window, not the clip length.
  const { durationSeconds } = resolveSlideshowMode(slides, null, null, secondsPerSlide);

  // ── assets, uploads, library, render ───────────────────────────────────
  const handleKeyReplaced = useCallback((localKey: string, r2Key: string) => {
    setCurrentAssets((prev) => ({
      backgroundKey: prev.backgroundKey === localKey ? r2Key : prev.backgroundKey,
      overlayKey: prev.overlayKey,
      audioKey: prev.audioKey === localKey ? r2Key : prev.audioKey,
    }));
    setSlides((prev) => prev.map((s) => (s.backgroundKey === localKey ? { ...s, backgroundKey: r2Key } : s)));
  }, []);

  const {
    assets, setAssets, addAsset, uploads, pickFile, retryUpload,
    library, libraryLoading, removeLibraryProject, renameAsset, deleteAsset, render,
  } = useBlitzWorkspace({ onKeyReplaced: handleKeyReplaced, filterLibrary: isSlideshowProject });

  const { resolve: resolveTemplateFor } = useContentTemplates();

  // ── load the carousel template + assets ────────────────────────────────
  useEffect(() => {
    Promise.all([blitzApi.listTemplates(client), blitzApi.listAssets(client)])
      .then(([tRes, aRes]) => {
        if (!tRes.ok || !aRes.ok) throw new Error('Failed to load data');
        const carousel = (tRes.data.templates ?? []).find((t) => t.type === 'CAROUSEL') ?? null;
        setCarouselTemplate(carousel);
        const allAssets = aRes.data.assets ?? [];
        setAssets(allAssets);
        if (carousel) {
          const defaults = carousel.defaultAssets as { backgroundKey?: string; audioKey?: string };
          setCurrentAssets({
            backgroundKey: defaults.backgroundKey ?? allAssets.find((a) => a.type === 'BACKGROUND')?.r2Key ?? '',
            overlayKey: '',
            audioKey: defaults.audioKey,
          });
        }
      })
      .catch((err) => setLoadError(String(err)))
      .finally(() => setIsLoading(false));
  }, [client, setAssets]);

  // ── blocked reason ────────────────────────────────────────────────────
  const hasGlobalBackground = Boolean(currentAssets.backgroundKey) && !isLocalKey(currentAssets.backgroundKey);
  const hasAnyBackground = hasGlobalBackground
    || slides.some((s) => Boolean(s.backgroundKey) && !isLocalKey(s.backgroundKey ?? ''));
  const hasSlideContent = slides.some((s) => s.text.trim());
  const hasLocalKey =
    [currentAssets.backgroundKey, currentAssets.audioKey ?? ''].some(isLocalKey)
    || slides.some((s) => s.backgroundKey && isLocalKey(s.backgroundKey));
  const blockedReason =
    !hasAnyBackground ? 'Pick a background'
    : !hasSlideContent ? 'Enter at least one slide text'
    : hasLocalKey ? 'Upload in progress…'
    : null;

  // ── submit render ─────────────────────────────────────────────────────
  const handleDoneEditing = useCallback(() => {
    if (!carouselTemplate || blockedReason) return;
    const nonEmptySlides = slides.filter((s) => s.text.trim());
    void render.submit({
      templateId: carouselTemplate.id,
      currentAssets: {
        backgroundKey: currentAssets.backgroundKey || (nonEmptySlides.find((s) => s.backgroundKey)?.backgroundKey ?? ''),
        ...(currentAssets.audioKey ? { audioKey: currentAssets.audioKey } : {}),
      },
      overlayZoom: 1.0,
      overlayOffsetX: 0,
      overlayOffsetY: 0,
      mentionBusiness,
      captionText: nonEmptySlides[0]?.text ?? '',
      slides: nonEmptySlides,
      durationSeconds,
      textConfigOverride: text.override,
      businessText: mentionBusiness ? businessText : undefined,
      muteVideoAudio,
    });
  }, [carouselTemplate, blockedReason, slides, currentAssets, mentionBusiness, businessText, muteVideoAudio, durationSeconds, text.override, render]);

  // ── picker handlers ───────────────────────────────────────────────────
  const handleSwapAsset = useCallback((type: BlitzUploadType, key: string, slideIndex?: number) => {
    if (type === 'BACKGROUND' && slideIndex !== undefined) {
      setSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, backgroundKey: key } : s)));
    } else if (type === 'BACKGROUND') {
      setCurrentAssets((prev) => ({ ...prev, backgroundKey: key }));
    } else if (type === 'AUDIO') {
      setCurrentAssets((prev) => ({ ...prev, audioKey: key || undefined }));
    }
  }, []);

  const handlePickerSelect = useCallback((key: string) => {
    if (!picker) return;
    handleSwapAsset(picker.type, key, picker.slideIndex);
    setPicker(null);
  }, [picker, handleSwapAsset]);

  const handlePickerFile = useCallback((file: File) => {
    if (!picker) return;
    handleSwapAsset(picker.type, pickFile(picker.type, file), picker.slideIndex);
    setPicker(null);
  }, [picker, handleSwapAsset, pickFile]);

  /** Which key the modal should show as current. */
  const pickerCurrentKey =
    picker?.slideIndex !== undefined
      ? (slides[picker.slideIndex]?.backgroundKey ?? '')
      : picker?.type ? keyForLayer(currentAssets, picker.type) : '';

  const handleResearchAction = useCallback((video: ResearchVideo, generated?: NicheSlide[]) => {
    // Prefer the copy written for this niche; fall back to the template's generic examples
    // when generation was unavailable.
    const source = generated?.length
      ? generated
      : (resolveTemplateFor(video.template_id, video.hook)?.suggestedSlides ?? []);
    if (source.length === 0) return;
    setSlides(source.map((s) => ({ text: s.text, bgPromptSuggestion: s.bgPrompt })));
    setCurrentSlideIndex(0);
    setStep(2);
  }, [resolveTemplateFor]);

  const audioAsset = currentAssets.audioKey && !isLocalKey(currentAssets.audioKey)
    ? assets.find((a) => a.r2Key === currentAssets.audioKey)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <StepPills steps={STEPS} current={step} onChange={setStep} label="Blitz Slideshow steps" />

      {/* ── Step 1: Research ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Research viral slideshows</p>
            <p className="mt-0.5 text-[12px] text-muted">
              Search TikTok for niche content — click &ldquo;See Template&rdquo; to see which format it uses, then use
              a result to fill every slide.
            </p>
          </div>
          <Researcher
            cacheKey="blitz-slideshow-research"
            actionLabel="Use as inspiration"
            withSlides
            onAction={handleResearchAction}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-6 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Skip to Slideshow →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Slideshow editor ──────────────────────────────────── */}
      {step === 2 && (
        <>
          {loadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-[13px] text-red-700">
              Failed to load Blitz Slideshow: {loadError}
            </div>
          )}

          {!carouselTemplate && !isLoading && !loadError && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-[13px] text-amber-800">
              No CAROUSEL template found. Seed one in the database: type=CAROUSEL, name=Slideshow.
            </div>
          )}

          {isLoading ? (
            <EditorSkeleton />
          ) : carouselTemplate ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_1fr_220px]">
              {/* Left: slide copy + audio. Below the canvas on phones so the preview comes first. */}
              <div className="order-2 flex flex-col gap-4 lg:order-none">
                <SlideshowCopyPanel
                  slides={slides}
                  currentIndex={currentSlideIndex}
                  onIndexChange={setCurrentSlideIndex}
                  onChange={setSlides}
                  assets={assets}
                  onPickBackground={(i) => setPicker({ type: 'BACKGROUND', slideIndex: i })}
                  mentionBusiness={mentionBusiness}
                  onMentionBusinessChange={setMentionBusiness}
                  businessText={businessText}
                  onBusinessTextChange={setBusinessText}
                  onAssetCreated={addAsset}
                  secondsPerSlide={secondsPerSlide}
                  onSecondsPerSlideChange={setSecondsPerSlide}
                  durationSeconds={durationSeconds}
                  audioAssets={assets.filter((a) => a.type === 'AUDIO')}
                  onAutoAudioPick={(key) => setCurrentAssets((prev) => ({ ...prev, audioKey: key }))}
                />
                {/* Audio only — the Background layer is hidden because slides own their own. */}
                <AssetsPanel
                  assets={assets}
                  currentAssets={currentAssets}
                  uploads={uploads}
                  onOpenPicker={(type) => setPicker({ type })}
                  onRetryUpload={retryUpload}
                  onRemoveAudio={() => setCurrentAssets((prev) => ({ ...prev, audioKey: undefined }))}
                  muteVideoAudio={muteVideoAudio}
                  onMuteVideoAudioChange={setMuteVideoAudio}
                  durationSeconds={durationSeconds}
                  hideLayers={['OVERLAY', 'BACKGROUND']}
                />
              </div>

              {/* Center: slide preview + render */}
              <div className="order-1 flex min-w-0 flex-col items-center gap-4 lg:order-none">
                <SlidePreview
                  slides={slides}
                  currentIndex={currentSlideIndex}
                  onIndexChange={setCurrentSlideIndex}
                  assets={assets}
                  fallbackBackgroundKey={currentAssets.backgroundKey}
                  businessText={mentionBusiness ? businessText : undefined}
                  textConfig={text.resolved}
                  onDragCaption={text.dragCaption}
                  onDragBusiness={text.dragBusiness}
                />
                {/* Hidden auto-playing audio — loops as long as a track is selected. */}
                {audioAsset && !muteVideoAudio && (
                  <audio
                    key={audioAsset.r2Key}
                    autoPlay
                    loop
                    src={audioAsset.url}
                    preload="auto"
                    style={{ display: 'none' }}
                  />
                )}
                <RenderControls
                  state={render.state}
                  isBusy={render.isBusy}
                  blockedReason={blockedReason}
                  onSubmit={handleDoneEditing}
                />
              </div>

              {/* Right: text style */}
              <div className="order-3 flex flex-col gap-4 lg:order-none">
                <ContextPanel
                  activeLayer={activeLayer}
                  onActiveLayerChange={setActiveLayer}
                  showBusiness={mentionBusiness}
                  onResetBusinessPosition={text.resetBusinessPosition}
                  hideOverlay
                  overlayZoom={1}
                  onZoomChange={() => undefined}
                  onResetPosition={() => undefined}
                  onSwapOverlay={() => undefined}
                  textConfig={text.resolved}
                  onTextConfigChange={text.patch}
                  onResetTextPosition={text.resetCaptionPosition}
                />
              </div>
            </div>
          ) : null}

          {!isLoading && (
            <section className="flex flex-col gap-3">
              <p className="text-[15px] font-semibold text-ink">Slideshow Library</p>
              <LibraryGrid
                projects={library}
                isLoading={libraryLoading}
                onDelete={removeLibraryProject}
                onVideoPlay={() => undefined}
              />
            </section>
          )}
        </>
      )}

      {picker && (
        <AssetLibraryModal
          type={picker.type}
          assets={assets}
          currentKey={pickerCurrentKey}
          onSelect={handlePickerSelect}
          onPickFile={handlePickerFile}
          onRename={renameAsset}
          onDelete={deleteAsset}
          onClose={() => setPicker(null)}
          onAssetCreated={addAsset}
        />
      )}
    </div>
  );
}
