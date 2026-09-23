'use client';

/**
 * Blitz Slideshow Tab — dedicated admin tab for multi-text-card (CAROUSEL) videos.
 *
 * Three-panel layout identical to BlitzLabTab:
 *   Left  (280px): AssetsPanel (BACKGROUND + AUDIO only, no overlay) — global default background
 *   Center (1fr):  SlidePreview — CSS-only navigator, no Remotion dependency; drag to reposition
 *   Right  (220px): ContextPanel (Text + Business tabs) + SlideshowCopyPanel
 *
 * Each slide has its own background (set via per-slide picker in SlideshowCopyPanel).
 * The global background in AssetsPanel is the fallback for slides without their own.
 *
 * A collapsible Researcher section above the editor lets the user search
 * for inspiration and pre-populate Slide 1 with the hook text.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BLITZ_DEFAULT_DURATION_S,
  BLITZ_DEFAULT_TEXT_CONFIG,
  BLITZ_SLIDESHOW_SECONDS_PER_SLIDE,
  BLITZ_SLIDESHOW_TEXT_DEFAULTS,
} from '../../../config/blitzLab';
import { resolvePhase0ATemplate } from '../../../lib/phase0aTemplates';
import { Researcher, type NicheSlide } from '../shared/Researcher';
import type { ResearchVideo } from './ugcLab/researchCache';
import { AssetLibraryModal } from './blitzLab/AssetLibraryModal';
import { AssetsPanel, keyForLayer, type CurrentAssets } from './blitzLab/AssetsPanel';
import { ContextPanel } from './blitzLab/ContextPanel';
import { LibraryGrid } from './blitzLab/LibraryGrid';
import { RenderControls } from './blitzLab/RenderControls';
import { SlidePreview } from './blitzLab/SlidePreview';
import type { SlideData } from './blitzLab/SlidePreview';
import { SlideshowCopyPanel } from './blitzLab/SlideshowCopyPanel';
import { FootageConfirmDialog } from './blitzLab/FootageConfirmDialog';
import { resolveSlideshowMode } from './blitzLab/useSlideshowMode';
import { blitzApi, type BlitzAssetDto, type BlitzProjectDto, type BlitzTemplateDto } from './blitzLab/api';
import type { BlitzUploadType } from './blitzLab/upload';
import { isLocalKey, useBlitzUploads } from './blitzLab/useBlitzUploads';
import { useBlitzRender } from './blitzLab/useBlitzRender';
import { useClipDuration } from './blitzLab/useClipDuration';
import { useTextLayout } from './blitzLab/useTextLayout';
import type { BlitzLayer } from './blitzLab/canvasHitTest';

type Props = { token: string };

const DEFAULT_SLIDES: SlideData[] = [
  { text: "Here's the #1 mistake people make…" },
  { text: "Here's what actually works." },
  { text: "Save this if you found it helpful!" },
];

function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_220px]" aria-busy="true">
      <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="mx-auto w-full max-w-[340px] animate-pulse rounded-2xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}

export function BlitzSlideshowTab({ token }: Props) {
  // ── data ──────────────────────────────────────────────────────────────
  const [carouselTemplate, setCarouselTemplate] = useState<BlitzTemplateDto | null>(null);
  const [assets, setAssets] = useState<BlitzAssetDto[]>([]);
  const [library, setLibrary] = useState<BlitzProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(true);
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
  /** Set when a render is waiting on the "this becomes a video" confirmation. */
  const [footageConfirm, setFootageConfirm] = useState(false);

  const text = useTextLayout(carouselTemplate?.textConfig ?? BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS);

  // ── clip duration (background only — no overlay for slideshow) ────────
  const globalBgAsset = assets.find((a) => a.r2Key === currentAssets.backgroundKey);
  const backgroundVideoUrl =
    globalBgAsset && globalBgAsset.mediaKind === 'video' && !isLocalKey(currentAssets.backgroundKey)
      ? globalBgAsset.url
      : '';

  // Also consider per-slide background videos for duration
  const allBgVideoUrls = [
    backgroundVideoUrl,
    ...slides
      .map((s) => {
        if (!s.backgroundKey || isLocalKey(s.backgroundKey)) return '';
        const a = assets.find((a) => a.r2Key === s.backgroundKey);
        return a && a.mediaKind === 'video' ? a.url : '';
      })
      .filter(Boolean),
  ].filter(Boolean);

  const { seconds: clipSeconds } = useClipDuration(
    allBgVideoUrls,
    carouselTemplate?.durationSeconds ?? BLITZ_DEFAULT_DURATION_S,
  );

  // Still images only → a real slideshow timed by secondsPerSlide.
  // Any footage → an ordinary video timed by the footage.
  const { mode, videoSlideNumbers, durationSeconds } = resolveSlideshowMode(
    slides,
    assets,
    currentAssets.backgroundKey,
    secondsPerSlide,
    clipSeconds,
  );

  // ── uploads + render ──────────────────────────────────────────────────
  const handleKeyReplaced = useCallback((localKey: string, r2Key: string) => {
    setCurrentAssets((prev) => ({
      backgroundKey: prev.backgroundKey === localKey ? r2Key : prev.backgroundKey,
      overlayKey: prev.overlayKey,
      audioKey: prev.audioKey === localKey ? r2Key : prev.audioKey,
    }));
    // Also update any per-slide backgroundKey that was a local key
    setSlides((prev) =>
      prev.map((s) => (s.backgroundKey === localKey ? { ...s, backgroundKey: r2Key } : s)),
    );
  }, []);
  const { uploads, startUpload, retry } = useBlitzUploads({ token, setAssets, onKeyReplaced: handleKeyReplaced });

  const upsertLibraryProject = useCallback((project: BlitzProjectDto) => {
    setLibrary((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      if (exists) return prev.map((p) => (p.id === project.id ? project : p));
      return [project, ...prev];
    });
  }, []);

  const render = useBlitzRender(token, upsertLibraryProject, upsertLibraryProject, upsertLibraryProject);

  // ── load initial data ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([blitzApi.listTemplates(token), blitzApi.listAssets(token)])
      .then(([tRes, aRes]) => {
        if (!tRes.ok || !aRes.ok) throw new Error('Failed to load data');
        const allTemplates = tRes.data.templates ?? [];
        const carousel = allTemplates.find((t) => t.type === 'CAROUSEL') ?? null;
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
  }, [token]);

  useEffect(() => {
    blitzApi.listCompleted(token)
      .then((res) => {
        if (res.ok) {
          const carouselProjects = (res.data.projects ?? []).filter((p) => {
            const ca = p.currentAssets as { slides?: unknown } | null;
            return ca && 'slides' in ca;
          });
          setLibrary(carouselProjects);
        }
      })
      .finally(() => setLibraryLoading(false));
  }, [token]);

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
  const submitRender = useCallback(async () => {
    if (!carouselTemplate || blockedReason) return;
    const nonEmptySlides = slides.filter((s) => s.text.trim());
    await render.submit({
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

  /** Footage turns the slideshow into a video — confirm that before queuing. */
  const handleDoneEditing = useCallback(() => {
    if (!carouselTemplate || blockedReason) return;
    if (mode === 'video') {
      setFootageConfirm(true);
      return;
    }
    void submitRender();
  }, [carouselTemplate, blockedReason, mode, submitRender]);

  // ── picker handlers ───────────────────────────────────────────────────
  const handleSwapAsset = useCallback((type: BlitzUploadType, key: string, slideIndex?: number) => {
    if (type === 'BACKGROUND' && slideIndex !== undefined) {
      // Per-slide background
      setSlides((prev) =>
        prev.map((s, i) => (i === slideIndex ? { ...s, backgroundKey: key } : s)),
      );
    } else if (type === 'BACKGROUND') {
      setCurrentAssets((prev) => ({ ...prev, backgroundKey: key }));
    } else if (type === 'AUDIO') {
      setCurrentAssets((prev) => ({ ...prev, audioKey: key || undefined }));
    }
  }, []);

  const handlePickFile = useCallback((type: BlitzUploadType, file: File, slideIndex?: number) => {
    handleSwapAsset(type, startUpload(type, file), slideIndex);
  }, [handleSwapAsset, startUpload]);

  const handleRenameAsset = useCallback(async (id: string, name: string) => {
    const res = await blitzApi.renameAsset(token, id, name).catch(() => null);
    if (!res?.ok || !res.data.asset) return res?.data.error ?? 'Rename failed';
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name: res.data.asset.name } : a)));
    return null;
  }, [token]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    const res = await blitzApi.deleteAsset(token, id).catch(() => null);
    if (!res?.ok) return res?.data.error ?? 'Delete failed';
    setAssets((prev) => prev.filter((a) => a.id !== id));
    return null;
  }, [token]);

  // Close picker and apply selection
  const handlePickerSelect = useCallback((key: string) => {
    if (!picker) return;
    handleSwapAsset(picker.type, key, picker.slideIndex);
    setPicker(null);
  }, [picker, handleSwapAsset]);

  const handlePickerFile = useCallback((file: File) => {
    if (!picker) return;
    handlePickFile(picker.type, file, picker.slideIndex);
    setPicker(null);
  }, [picker, handlePickFile]);

  // Determine which key is "current" for the modal
  const pickerCurrentKey =
    picker?.slideIndex !== undefined
      ? (slides[picker.slideIndex]?.backgroundKey ?? '')
      : picker?.type ? keyForLayer(currentAssets, picker.type) : '';

  return (
    <div className="flex flex-col gap-6">

      {/* ── Step pills ────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {([1, 2] as const).map((s) => {
          const labels = { 1: '1 · Research', 2: '2 · Slideshows' };
          const active = step === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={[
                'rounded-full px-5 py-2 text-[13px] font-semibold transition-colors',
                active ? 'bg-ink text-white' : 'bg-surface-alt text-muted hover:text-ink',
              ].join(' ')}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>

      {/* ── Step 1: Research ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Research viral slideshows</p>
            <p className="text-[12px] text-muted mt-0.5">Search TikTok for niche content — click &ldquo;See Template&rdquo; to see which format it uses, then use a result to fill every slide.</p>
          </div>
          <Researcher
            token={token}
            cacheKey="blitz-slideshow-research"
            actionLabel="Use as inspiration"
            withSlides
            onAction={(video: ResearchVideo, generated?: NicheSlide[]) => {
              // Prefer the copy written for this niche; fall back to the template's
              // generic examples when generation was unavailable.
              const source = generated?.length
                ? generated
                : resolvePhase0ATemplate(video.template_id, video.hook).suggestedSlides;
              setSlides(source.map((s) => ({ text: s.text, bgPromptSuggestion: s.bgPrompt })));
              setCurrentSlideIndex(0);
              setStep(2);
            }}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Skip to Slideshow →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Slideshow Editor ──────────────────────────────────── */}
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_220px]">

              {/* ── Left: Slides copy panel + Audio ───────────────────── */}
              <div className="flex flex-col gap-4">
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
                  token={token}
                  onAssetCreated={(asset) => setAssets((prev) => [...prev, asset])}
                  mode={mode}
                  videoSlideNumbers={videoSlideNumbers}
                  secondsPerSlide={secondsPerSlide}
                  onSecondsPerSlideChange={setSecondsPerSlide}
                  durationSeconds={durationSeconds}
                />
                {/* Audio — below Slides; Background layer hidden (per-slide handles it) */}
                <AssetsPanel
                  assets={assets}
                  currentAssets={currentAssets}
                  uploads={uploads}
                  onOpenPicker={(type) => setPicker({ type })}
                  onRetryUpload={retry}
                  onRemoveAudio={() => setCurrentAssets((prev) => ({ ...prev, audioKey: undefined }))}
                  muteVideoAudio={muteVideoAudio}
                  onMuteVideoAudioChange={setMuteVideoAudio}
                  durationSeconds={durationSeconds}
                  hideLayers={['OVERLAY', 'BACKGROUND']}
                />
              </div>

              {/* ── Center: Slide preview + Render ────────────────────── */}
              <div className="flex min-w-0 flex-col items-center gap-4">
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
                {/* Audio preview — shown when a track is selected */}
                {(() => {
                  const audioAsset = currentAssets.audioKey && !isLocalKey(currentAssets.audioKey)
                    ? assets.find((a) => a.r2Key === currentAssets.audioKey)
                    : undefined;
                  if (!audioAsset) return null;
                  return (
                    <div className="w-full max-w-[340px] rounded-xl border border-line bg-white p-3 shadow-sm">
                      <p className="mb-2 text-[11px] font-medium text-muted">🎵 {audioAsset.name}</p>
                      <audio
                        key={audioAsset.r2Key}
                        controls
                        loop
                        src={audioAsset.url}
                        preload="none"
                        className="h-9 w-full"
                      />
                    </div>
                  );
                })()}
                <RenderControls
                  state={render.state}
                  isBusy={render.isBusy}
                  blockedReason={blockedReason}
                  onSubmit={handleDoneEditing}
                />
              </div>

              {/* ── Right: Text style ─────────────────────────────────── */}
              <div className="flex flex-col gap-4">
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

          {/* ── Library ───────────────────────────────────────────────── */}
          {!isLoading && (
            <section className="flex flex-col gap-3">
              <p className="text-[15px] font-semibold text-ink">Slideshow Library</p>
              <LibraryGrid
                projects={library}
                isLoading={libraryLoading}
                token={token}
                onDelete={(id) => setLibrary((prev) => prev.filter((p) => p.id !== id))}
                onVideoPlay={() => undefined}
              />
            </section>
          )}
        </>
      )}

      {/* ── "This becomes a video" confirmation ────────────────────────── */}
      {footageConfirm && (
        <FootageConfirmDialog
          videoSlideNumbers={videoSlideNumbers}
          durationSeconds={durationSeconds}
          onCancel={() => setFootageConfirm(false)}
          onContinue={() => { setFootageConfirm(false); void submitRender(); }}
        />
      )}

      {/* ── Asset picker modal ─────────────────────────────────────────── */}
      {picker && (
        <AssetLibraryModal
          type={picker.type}
          assets={assets}
          currentKey={pickerCurrentKey}
          onSelect={handlePickerSelect}
          onPickFile={handlePickerFile}
          onRename={handleRenameAsset}
          onDelete={handleDeleteAsset}
          onClose={() => setPicker(null)}
          token={token}
          onAssetCreated={(asset) => setAssets((prev) => [...prev, asset])}
        />
      )}
    </div>
  );
}
