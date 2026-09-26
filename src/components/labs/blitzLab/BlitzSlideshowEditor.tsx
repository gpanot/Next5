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
 * Real estate flow: Zillow → Angle → Videos. The Videos step is the swipe deck and the editor in
 * one place: tapping Edit on a card opens this editor over the deck, "All videos" goes back to the
 * same spot in the deck, and text edits flow back onto the card.
 *
 * Website flow (linked to a Campaign Studio run): Profile → Videos. The website engine builds the
 * deck from the confirmed profile (6 cards per audience); there is no TikTok research step — viral
 * videos proved too hard to copy as slideshows, and the engine already knows the business.
 * Without a linked run the editor is a free-form slideshow.
 *
 * B2B No Website flow: Profile → Videos. Same website engine, but the profile is typed by hand
 * and carries product photos (read by a vision model) that play behind the product shots.
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
import { StepPills } from '../shared/StepPills';
import { RunProfileStep } from '../studio/runs/RunProfileStep';
import { useStudioRunContext } from '../studio/runs/StudioRunContext';
import { AssetLibraryModal } from './AssetLibraryModal';
import { AssetsPanel, keyForLayer, type CurrentAssets } from './AssetsPanel';
import { ContextPanel } from './ContextPanel';
import { FlowTypePicker, type FlowType } from './FlowTypePicker';
import { LibraryGrid } from './LibraryGrid';
import { ManualProfileStep, type ManualSelection } from './manual/ManualProfileStep';
import { RealEstateTemplateStep } from './RealEstateTemplateStep';
import { DeckEditBar } from './DeckEditBar';
import { SHOT_FORMAT, shotFormatError } from './shotFormat';
import { ANGLE_LABELS, SlideshowDeckStep, type DeckSource } from './SlideshowDeckStep';
import type { CopyCheckContext } from './deckApi';
import type { DeckCardData } from './SwipeDeck';
import type { ReAngle } from '../../../server/labs/slideshowCopy';
import { RenderControls } from './RenderControls';
import { SlidePreview, type SlideData } from './SlidePreview';
import { SlideshowCopyPanel } from './SlideshowCopyPanel';
import { ZillowScrapeStep, type ZillowData } from './ZillowScrapeStep';
import { resolveSlideshowMode } from './useSlideshowMode';
import { blitzApi, type BlitzProjectDto, type BlitzTemplateDto } from './api';
import type { BlitzUploadType } from './upload';
import { isLocalKey } from './useBlitzUploads';
import { useBlitzWorkspace } from './useBlitzWorkspace';
import { useDeckCardEditor } from './useDeckCardEditor';
import { useSetRemix } from './useSetRemix';
import { buildSet } from './slideshowSet';
import { useTextLayout } from './useTextLayout';
import type { BlitzLayer } from './canvasHitTest';

const DEFAULT_SLIDES: SlideData[] = [
  { text: "Here's the #1 mistake people make…" },
  { text: "Here's what actually works." },
  { text: 'Save this if you found it helpful!' },
];

type Step = 'profile' | 'research' | 'deck' | 'editor';
/** 'research' is the Angle step of the Zillow flow. */

/** Numbered steps — varies by flow type and whether linked to Campaign Studio. */
const buildSteps = (withProfile: boolean, flowType: FlowType | null): { id: Step; label: string }[] => {
  if (flowType === 'real_estate') {
    return [
      { id: 'profile',  label: '1 · Zillow' },
      { id: 'research', label: '2 · Angle' },
      { id: 'deck',     label: '3 · Videos' },
    ];
  }
  // Linked to a Campaign Studio run, or a hand-typed profile: the website engine builds the deck.
  if (withProfile || flowType === 'b2b_manual') {
    return [
      { id: 'profile', label: '1 · Profile' },
      { id: 'deck',    label: '2 · Videos' },
    ];
  }
  return [{ id: 'editor', label: '1 · Slideshow' }];
};

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
  const studioRun = useStudioRunContext();
  const withProfile = studioRun !== null;
  // When linked to Campaign Studio, always B2B. initialFlowType overrides (for RE from the tab).
  const [flowType, setFlowType] = useState<FlowType | null>(
    initialFlowType ?? (withProfile ? 'b2b' : null),
  );
  const [zillowData, setZillowData] = useState<ZillowData | null>(null);
  /** The angle the user selected in step 2 (Zillow flow only). */
  const [selectedAngle, setSelectedAngle] = useState<ReAngle | null>(null);
  /** Deck cards for the selected angle. Owned here so editor changes show up on the deck. */
  const [deckCards, setDeckCards] = useState<DeckCardData[]>([]);
  /** B2B No Website: the business picked or being typed in the Profile step. */
  const [manualSelection, setManualSelection] = useState<ManualSelection>(null);
  /** The deck card open in the editor. Null = the deck is showing. */
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // ── step navigation ───────────────────────────────────────────────────
  const steps = buildSteps(withProfile, flowType);
  const [step, setStep] = useState<Step>(() => {
    if (initialFlowType === 'real_estate' || initialFlowType === 'b2b_manual') return 'profile'; // Zillow / typed profile
    return withProfile ? 'profile' : 'editor';
  });

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

  // Free-form: secondsPerSlide × slideCount. Deck videos: the fixed 3/4/4/4/4/4/3 s shots (below).
  // Video backgrounds are trimmed/held by the Remotion Sequence window, not the clip length.
  const { durationSeconds: freeFormSeconds } = resolveSlideshowMode(slides, null, null, secondsPerSlide);

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

  // Where the deck comes from, and what edited copy is checked against before render.
  const deckSource: DeckSource | null =
    flowType === 'real_estate'
      ? (zillowData && selectedAngle
        ? { kind: 'zillow', zillowData, angle: selectedAngle, angleLabel: ANGLE_LABELS[selectedAngle] }
        : null)
      : flowType === 'b2b_manual'
        ? (manualSelection && manualSelection !== 'new' ? { kind: 'website', runId: manualSelection } : null)
        : (studioRun?.runId ? { kind: 'website', runId: studioRun.runId } : null);
  const checkContext: CopyCheckContext | null =
    deckSource?.kind === 'zillow' ? { engine: 'zillow', facts: deckSource.zillowData.facts }
    : deckSource?.kind === 'website' ? { engine: 'website', runId: deckSource.runId }
    : null;

  const deck = useDeckCardEditor({
    zillowData, checkContext, deckCards, setDeckCards, editingCardId, setEditingCardId,
    slides, setSlides, currentSlideIndex, setCurrentSlideIndex,
    assets, addAsset, setCurrentAssets,
  });
  const { editingCard } = deck;
  const durationSeconds = deck.fixedDurationSeconds ?? freeFormSeconds;

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
  // Deck videos are re-validated against the 7-shot format before render (spec 11.3).
  const formatError = editingCard ? shotFormatError(slides.map((s) => s.text)) : null;
  const blockedReason =
    formatError ? formatError
    : !hasAnyBackground ? 'Pick a background'
    : !hasSlideContent ? 'Enter at least one slide text'
    : hasLocalKey ? 'Upload in progress…'
    : null;

  // ── submit render ─────────────────────────────────────────────────────
  const handleDoneEditing = async () => {
    if (!carouselTemplate || blockedReason) return;
    // Deck videos: same guardrails as generation, on the server, before anything renders.
    if (!(await deck.checkBeforeRender())) return;
    const nonEmptySlides = slides.filter((s) => s.text.trim());
    const projectId = await render.submit({
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
      // Saved with the render so the Slideshow Library can Remix it later.
      set: buildSet(editingCard, slides),
    });
    deck.markRendered(projectId);
  };

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

  // Plain functions: the React Compiler memoizes them.
  const handlePickerSelect = (key: string) => {
    if (!picker) return;
    handleSwapAsset(picker.type, key, picker.slideIndex);
    setPicker(null);
  };

  const handlePickerFile = (file: File) => {
    if (!picker) return;
    handleSwapAsset(picker.type, pickFile(picker.type, file), picker.slideIndex);
    setPicker(null);
  };

  /** Which key the modal should show as current. */
  const pickerCurrentKey =
    picker?.slideIndex !== undefined
      ? (slides[picker.slideIndex]?.backgroundKey ?? '')
      : picker?.type ? keyForLayer(currentAssets, picker.type) : '';

  /** Zillow flow: angle picked in step 2 → a fresh deck for that angle. */
  const handleAngleSelected = useCallback((angle: ReAngle) => {
    setSelectedAngle(angle);
    setDeckCards([]);
    setEditingCardId(null);
    setStep('deck');
  }, []);

  const remix = useSetRemix({
    setSlides, setCurrentSlideIndex, setCurrentAssets, setMentionBusiness, setBusinessText, setMuteVideoAudio,
    setEditingCardId, text, openRemix: deck.openRemix,
    // A free-form Set opens in the plain editor, whatever step the deck flow is on.
    showFreeEditor: () => { if (step === 'deck') setStep('editor'); },
  });

  const audioAsset = currentAssets.audioKey && !isLocalKey(currentAssets.audioKey)
    ? assets.find((a) => a.r2Key === currentAssets.audioKey)
    : undefined;

  /** The 3-panel editor + library. Shared by the free-form Slideshow step and the deck's edit view. */
  const editorView = (
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
              shotFormat={editingCard ? SHOT_FORMAT : undefined}
              alternatives={deck.alternatives}
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
              onDragCaption={editingCard ? deck.dragSlideCaption : text.dragCaption}
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
            {deck.copyProblems.length > 0 && (
              <div role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-semibold">Fix before rendering:</p>
                <ul className="mt-1 list-disc pl-4">
                  {deck.copyProblems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            )}
            <RenderControls
              state={render.state}
              isBusy={render.isBusy}
              blockedReason={blockedReason}
              onSubmit={() => void handleDoneEditing()}
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
            onRemix={remix}
          />
        </section>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Step pills — always shown since flow is always set before editor renders */}
      <StepPills steps={steps} current={step} onChange={setStep} label="Blitz Slideshow steps" />

      {/* ── Profile step ──────────────────────────────────────────────── */}
      {step === 'profile' && (
        <>
          {/* B2B linked to Campaign Studio → confirm the profile, then the engine builds the deck */}
          {flowType === 'b2b' && (
            <RunProfileStep
              onConfirmed={() => {
                setDeckCards([]);
                setEditingCardId(null);
                setStep('deck');
              }}
            />
          )}

          {/* B2B No Website → type the profile + product photos, then the engine builds the deck */}
          {flowType === 'b2b_manual' && (
            <ManualProfileStep
              selection={manualSelection}
              onSelect={setManualSelection}
              onUploaded={addAsset}
              onConfirmed={(runId) => {
                setManualSelection(runId);
                setDeckCards([]);
                setEditingCardId(null);
                setStep('deck');
              }}
            />
          )}

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
          {/* Real Estate → eligible angle cards (new deck flow: passes angle, no copy gen here) */}
          {flowType === 'real_estate' && zillowData && (
            <RealEstateTemplateStep
              angles={zillowData.angles}
              facts={zillowData.facts}
              photoTags={zillowData.photoTags}
              onAngleSelected={handleAngleSelected}
            />
          )}
        </>
      )}

      {/* ── Videos step (both engines) ────────────────────────────────── */}
      {/* Deck and editor share this step. The deck stays mounted (hidden) while a card is */}
      {/* open, so swipe history and filters survive the round trip.                       */}
      {step === 'deck' && !deckSource && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {flowType === 'real_estate' ? 'Pick an angle first.'
            : flowType === 'b2b_manual' ? 'Save a business profile first.'
            : 'Pick a Campaign Studio run and confirm its profile first.'}
        </div>
      )}
      {step === 'deck' && deckSource && (
        <>
          <div className={editingCard ? 'hidden' : undefined}>
            <SlideshowDeckStep
              key={deckSource.kind === 'zillow' ? `zillow-${deckSource.angle}` : `website-${deckSource.runId}`}
              source={deckSource}
              cards={deckCards}
              onCardsChange={setDeckCards}
              onEditCard={deck.openCard}
              paused={Boolean(editingCard)}
              onBack={() => setStep(flowType === 'real_estate' ? 'research' : 'profile')}
              fallbackAudioUrl={assets.find((a) => a.type === 'AUDIO')?.url}
            />
          </div>
          {editingCard && (
            <>
              <DeckEditBar
                lensLabel={editingCard.lensValue}
                hookStyle={editingCard.hookStyle}
                position={deckCards.indexOf(editingCard) + 1}
                total={deckCards.length}
                onBack={deck.backToDeck}
              />
              {editorView}
            </>
          )}
        </>
      )}

      {/* ── Slideshow editor (free-form flows) ────────────────────────── */}
      {step === 'editor' && editorView}

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
