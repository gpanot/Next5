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
 * A Research step above the editor finds a TikTok to model and pre-fills every slide. When a
 * <StudioRunProvider> links the lab to Campaign Studio, a Profile step comes first and research
 * can search the run's IDC niches, one per search.
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
import { IdcNichePicker } from '../studio/runs/IdcNichePicker';
import { RunProfileStep } from '../studio/runs/RunProfileStep';
import { useStudioRunContext } from '../studio/runs/StudioRunContext';
import type { ResearchVideo } from '../ugcLab/researchCache';
import { AssetLibraryModal } from './AssetLibraryModal';
import { AssetsPanel, keyForLayer, type CurrentAssets } from './AssetsPanel';
import { ContextPanel } from './ContextPanel';
import { FlowTypePicker, type FlowType } from './FlowTypePicker';
import { LibraryGrid } from './LibraryGrid';
import { RealEstateTemplateStep } from './RealEstateTemplateStep';
import { RenderControls } from './RenderControls';
import { SlidePreview, type SlideData } from './SlidePreview';
import { SlideshowCopyPanel } from './SlideshowCopyPanel';
import { ZillowScrapeStep, type ZillowData } from './ZillowScrapeStep';
import { resolveSlideshowMode } from './useSlideshowMode';
import { blitzApi, type BlitzProjectDto, type BlitzTemplateDto } from './api';
import type { SlideshowCopy } from '../../../server/labs/slideshowCopy';
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

type Step = 'profile' | 'research' | 'editor';

/** Numbered steps — varies by flow type and whether linked to Campaign Studio. */
const buildSteps = (withProfile: boolean, flowType: 'b2b' | 'real_estate' | 'tiktok_shop' | null): { id: Step; label: string }[] => {
  if (flowType === 'real_estate') {
    return [
      { id: 'profile', label: '1 · Zillow' },
      { id: 'research', label: '2 · Angle' },
      { id: 'editor', label: '3 · Slideshow' },
    ];
  }
  const steps: { id: Step; label: string }[] = [
    ...(withProfile ? [{ id: 'profile' as const, label: 'Profile' }] : []),
    { id: 'research', label: 'Research' },
    { id: 'editor', label: 'Slideshows' },
  ];
  return steps.map((s, i) => ({ id: s.id, label: `${i + 1} · ${s.label}` }));
};

/** Pick the first unused selected photo whose tag matches the target; returns undefined when none left. */

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

export function BlitzSlideshowEditor({ initialFlowType }: { initialFlowType?: FlowType } = {}) {
  const client = useLabClient();

  // ── data ──────────────────────────────────────────────────────────────
  const [carouselTemplate, setCarouselTemplate] = useState<BlitzTemplateDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── flow type ─────────────────────────────────────────────────────────
  // null = picker not yet shown (only when !withProfile && no B2B is forced)
  const withProfile = useStudioRunContext() !== null;
  // When linked to Campaign Studio, always B2B. initialFlowType overrides (for RE from the tab).
  const [flowType, setFlowType] = useState<FlowType | null>(
    initialFlowType ?? (withProfile ? 'b2b' : null),
  );
  const [zillowData, setZillowData] = useState<ZillowData | null>(null);
  /** Badge shown in editor when RE copy fell back to static templates. */
  const [isFallbackCopy, setIsFallbackCopy] = useState(false);

  // ── step navigation ───────────────────────────────────────────────────
  const steps = buildSteps(withProfile, flowType);
  const [step, setStep] = useState<Step>(() => {
    if (initialFlowType === 'real_estate') return 'profile'; // start at Zillow step
    return withProfile ? 'profile' : 'research';
  });

  // ── editor state ──────────────────────────────────────────────────────
  const [currentAssets, setCurrentAssets] = useState<CurrentAssets>({ backgroundKey: '', overlayKey: '' });
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  /** True once the user has edited slides or a research action has pre-filled them. */
  const [slidesEdited, setSlidesEdited] = useState(false);
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

  /** Called when the user picks a RE angle and copy was generated. Populates the editor. */
  const handleRealEstateTemplateAction = useCallback((copy: SlideshowCopy) => {
    if (!zillowData) return;
    setIsFallbackCopy(copy.source === 'fallback');

    // 1. Set slides with text immediately so the editor is usable right away.
    //    Backgrounds will be filled in once photos are imported (async below).
    const pool = zillowData.selectedCandidates.map((c, i) => ({
      id: c.id,
      url: c.url,
      tag: zillowData.photoTags[i] ?? (i === 0 ? 'exterior' : 'other'),
    }));
    // Record which slide maps to which photo pool entry (by index into pool)
    const slidePhotoMap: number[] = copy.slides.map((s) => {
      const mutablePool = [...pool];
      const idx = mutablePool.findIndex((p) => p.tag === s.photo);
      return idx !== -1 ? idx : 0;
    });

    const textSlides: SlideData[] = copy.slides.map((s) => ({ text: s.text }));
    setSlides(textSlides);
    setSlidesEdited(true);
    setCurrentSlideIndex(0);

    // Leave the business line blank for RE — the agent fills in their name/brand manually.
    // (copy.caption + hashtags belong in the social post, not the per-slide overlay.)

    // Auto-pick first audio asset
    const firstAudio = assets.find((a) => a.type === 'AUDIO');
    if (firstAudio) setCurrentAssets((prev) => ({ ...prev, audioKey: firstAudio.r2Key }));

    setStep('editor');

    // 2. Import selected photos in the background; fill in backgroundKeys when done.
    const photoUrls = zillowData.selectedCandidates.map((c) => c.url);
    fetch(client.url('/blitz/import-photos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
      body: JSON.stringify({ photoUrls, listingRunId: zillowData.listingRunId }),
    })
      .then((res) => res.json() as Promise<{ assets?: typeof assets }>)
      .then((data) => {
        const imported = data.assets ?? [];
        if (imported.length === 0) return;
        // Add imported assets to the asset library
        imported.forEach(addAsset);
        // Build an ordered pool of r2Keys matched to the photo pool order
        const keyPool = pool.map((_, i) => imported[i]?.r2Key ?? null);
        setSlides((prev) => {
          // usedIndices is created fresh inside the updater so the function is pure.
          // React StrictMode invokes state updaters twice in dev; if usedIndices were
          // defined in the outer closure the first call would fill it and the second
          // (authoritative) call would see all slots taken → every slide gets null.
          const usedIndices = new Set<number>();
          return prev.map((slide, slideIdx) => {
            const targetPoolIdx = slidePhotoMap[slideIdx] ?? 0;
            let chosen: string | null = null;
            for (let offset = 0; offset < keyPool.length; offset++) {
              const idx = (targetPoolIdx + offset) % keyPool.length;
              if (!usedIndices.has(idx) && keyPool[idx]) {
                chosen = keyPool[idx];
                usedIndices.add(idx);
                break;
              }
            }
            return chosen ? { ...slide, backgroundKey: chosen } : slide;
          });
        });
      })
      .catch((e) => console.error('[RE import-photos] error:', e)); // silently ignore import errors — user can pick backgrounds manually
  }, [zillowData, assets, client, addAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResearchAction = useCallback((video: ResearchVideo, generated?: NicheSlide[]) => {
    // Prefer the copy written for this niche; fall back to the template's generic examples
    // when generation was unavailable.
    const source = generated?.length
      ? generated
      : (resolveTemplateFor(video.template_id, video.hook)?.suggestedSlides ?? []);
    if (source.length === 0) {
      // Nothing to fill — just navigate to the editor without touching slides.
      setStep('editor');
      return;
    }
    // If the user has already edited their slides, ask before overwriting.
    if (slidesEdited) {
      const ok = window.confirm(
        'You have already edited your slides. Replace them with this inspiration? Your current edits will be lost.',
      );
      if (!ok) {
        setStep('editor');
        return;
      }
    }
    setSlides(source.map((s) => ({ text: s.text, bgPromptSuggestion: s.bgPrompt })));
    setSlidesEdited(true);
    setCurrentSlideIndex(0);
    setStep('editor');
  }, [resolveTemplateFor, slidesEdited]);

  const audioAsset = currentAssets.audioKey && !isLocalKey(currentAssets.audioKey)
    ? assets.find((a) => a.r2Key === currentAssets.audioKey)
    : undefined;

  return (
    <div className="flex flex-col gap-6">

      {/* Step pills — always shown since flow is always set before editor renders */}
      <StepPills steps={steps} current={step} onChange={setStep} label="Blitz Slideshow steps" />

      {/* ── Profile step ──────────────────────────────────────────────── */}
      {step === 'profile' && (
        <>
          {/* B2B linked to Campaign Studio → RunProfileStep (unchanged) */}
          {flowType === 'b2b' && <RunProfileStep onConfirmed={() => setStep('research')} />}

          {/* Real Estate → Zillow scrape + photo selection */}
          {flowType === 'real_estate' && (
            <ZillowScrapeStep
              onDone={(data) => {
                setZillowData(data);
                setStep('research');
              }}
            />
          )}
        </>
      )}

      {/* ── Research step ─────────────────────────────────────────────── */}
      {step === 'research' && (
        <>
          {/* B2B → TikTok researcher (unchanged) */}
          {(flowType === 'b2b' || flowType === null) && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[14px] font-semibold text-ink">Research viral slideshows</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  Search TikTok for niche content — click &ldquo;See Template&rdquo; to see which format it uses, then
                  use a result to fill every slide.
                </p>
              </div>
              <Researcher
                cacheKey="blitz-slideshow-research"
                actionLabel="Use as inspiration"
                withSlides
                onAction={handleResearchAction}
                renderNichePicker={({ runSearch, busy, active }) => (
                  <IdcNichePicker active={active} busy={busy} onPick={runSearch} />
                )}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep('editor')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-6 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Skip to Slideshow →
                </button>
              </div>
            </div>
          )}

          {/* Real Estate → eligible angle cards */}
          {flowType === 'real_estate' && zillowData && (
            <RealEstateTemplateStep
              angles={zillowData.angles}
              facts={zillowData.facts}
              photoTags={zillowData.photoTags}
              onCopyReady={handleRealEstateTemplateAction}
            />
          )}
        </>
      )}

      {/* ── Slideshow editor ──────────────────────────────────────────── */}
      {step === 'editor' && (
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
                  onChange={(next) => { setSlides(next); setSlidesEdited(true); }}
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
                {isFallbackCopy && (
                  <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                    <span>Fallback copy — AI unavailable. Edit manually or retry.</span>
                    <button
                      type="button"
                      onClick={() => { setIsFallbackCopy(false); setStep('research'); }}
                      className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      ← Retry AI
                    </button>
                  </div>
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
