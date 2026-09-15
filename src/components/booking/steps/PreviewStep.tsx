'use client';

import { useCallback, useRef, useState } from 'react'; // useRef needed for paymentSectionRef
import type { PhotoRoute } from '../../../data/routes';
import type { CreativeDirector, PaymentStatus, ShootIntention } from '../../../types/booking';
import { applyDiscount } from '../../../lib/format';
import { usePayment } from '../../../hooks/usePayment';
import { usePreviewGeneration } from '../../../hooks/usePreviewGeneration';
import { useDirectorNote } from '../../../hooks/useDirectorNote';
import { Button } from '../../ui/Button';
import { DownloadIcon, LockIcon } from '../../ui/Icons';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { Watermark } from '../../ui/Watermark';
import { downloadFile } from '../../../lib/download';
import { DirectorNote } from '../preview/DirectorNote';
import { PreviewLoader } from '../preview/PreviewLoader';
import { StepLayout } from '../ui/StepLayout';
import {
  DirectorBar,
  FullShootPanel,
  IncludedItems,
  IntentionRecap,
  PreviewLightboxOverlay,
} from '../preview/PreviewResultParts';
import {
  FeedbackWidget,
  FeedbackPopup,
  RadioRow,
  NOT_ME_REASONS,
  LIKE_BUT_REASONS,
} from '../preview/FeedbackBlock';
import {
  InlinePaymentSection,
  PaymentReceived,
} from '../preview/InlinePaymentSection';

// ── Label maps (needed for DirectorNote + IntentionRecap) ────────────────────

const feelingLabels: Record<string, string> = {
  beautiful: 'Beautiful & confident',
  soft: 'Soft & feminine',
  elegant: 'Elegant & expensive',
  bold: 'Bold & irresistible',
  fashion: 'Like a fashion girl',
  noticed: 'Like everyone noticed me',
};

const goalLabels: Record<string, string> = {
  instagram: 'Refresh my Instagram',
  attention: 'Get more attention',
  style: 'Show my style',
  confident: 'Feel more confident',
  content: 'Create content',
  fun: 'Just have fun',
  jealous: 'Make someone jealous',
};

// ── Props ─────────────────────────────────────────────────────────────────────

type PreviewStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  uploadedPhoto: string;
  intention: ShootIntention;
  email: string;
  bookingId: string;
  name: string;
  onNameChange: (name: string) => void;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  onPreviewReady: (url: string) => void;
  discountPercent?: number;
};

// ── Component ─────────────────────────────────────────────────────────────────

export const PreviewStep = ({
  route,
  director,
  uploadedPhoto,
  intention,
  email,
  bookingId,
  name,
  onNameChange,
  paymentStatus,
  onPaymentStatusChange,
  onPreviewReady,
  discountPercent = 0,
}: PreviewStepProps) => {
  const [zoomed, setZoomed] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven]   = useState<'love' | 'not_me' | 'like_but' | null>(null);
  const [showNotMePopup, setShowNotMePopup] = useState(false);
  const [showLikeButPopup, setShowLikeButPopup] = useState(false);
  const [notMeReason, setNotMeReason]       = useState<string | null>(null);
  const [likeButReason, setLikeButReason]   = useState<string | null>(null);

  const { state, isRegenerating, regenSecondsLeft, startGeneration, regenGenerate } =
    usePreviewGeneration({
      uploadedPhoto,
      studioId: route.id,
      feelings: intention.feelings,
      email,
      bookingId,
      onPreviewReady,
    });

  const finalPriceVnd = applyDiscount(route.priceVnd, discountPercent);
  const { intent, isCreating, error: paymentError, retry, simulateTransfer } = usePayment(
    showPayment ? { bookingId, amountVnd: finalPriceVnd, routeTitle: route.title } : null,
    onPaymentStatusChange,
  );

  const note = useDirectorNote({
    directorName: director.name,
    directorSpecialty: director.specialty,
    directorSignature: director.signature,
    studioTitle: route.title,
    feelings: intention.feelings.map((f) => feelingLabels[f] ?? f),
    goals: intention.goals.map((g) => goalLabels[g] ?? g),
  });

  const recordFeedback = useCallback(
    (feedback: string, detail?: string) => {
      fetch('/api/preview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, feedback, feedbackDetail: detail }),
      }).catch((err) => console.warn('[feedback]', err));
    },
    [bookingId],
  );

  const [namePrefilled] = useState(() => name.trim().length > 0);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state.phase === 'uploading' || state.phase === 'generating') {
    return (
      <StepLayout>
        <PreviewLoader
          uploadedPhoto={uploadedPhoto}
          director={director}
          note={note}
          name={name}
          onNameChange={onNameChange}
          hideName={namePrefilled}
        />
      </StepLayout>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <StepLayout centered>
        <div className="flex flex-col items-center gap-5 py-12 text-center">
          <p className="max-w-sm text-[14px] text-muted">{state.message}</p>
          <Button onClick={startGeneration} size="lg">Try again</Button>
        </div>
      </StepLayout>
    );
  }

  const generatedUrl = state.url;

  // ── Done state ────────────────────────────────────────────────────────────
  return (
    <StepLayout
      footer={
        showPayment ? (
          <div className="flex items-center gap-4">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <p className="text-[11.5px] text-muted">
              Keep this window open — we detect your transfer automatically.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="flex items-baseline gap-2">
              <span className="label-caps text-[9px] font-medium text-muted shrink-0">{director.name} says</span>
              <p className="font-display text-[16px] italic text-ink leading-snug">&ldquo;You look amazing.&rdquo;</p>
            </div>
            <IncludedItems directorName={director.name} />
            <div className="lg:shrink-0">
              <Button onClick={() => setShowPayment(true)} size="lg" withArrow fullWidth className="lg:w-auto">
                Complete my shoot
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <LockIcon className="h-3 w-3" />
                One payment · Secure &amp; easy
              </p>
            </div>
          </div>
        )
      }
    >
      <DirectorBar director={director} />

      <div className="mt-4 animate-fade-in grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,232px)] lg:items-start lg:gap-8">
        {/* ── Col 1: Photo ────────────────────────────────────────────── */}
        <div className="relative mx-auto w-[90vw] lg:mx-0 lg:w-full lg:max-w-none">
          <button
            type="button"
            onClick={() => !isRegenerating && setZoomed(true)}
            aria-label="View your first shot full screen"
            disabled={isRegenerating}
            className="relative w-full overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgb(29_21_32/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedUrl}
              alt={`${route.title} — your first shot`}
              className={`aspect-[3/4] w-full object-cover transition-[filter] duration-500 ${isRegenerating ? 'blur-sm brightness-50' : ''}`}
            />
            {!isRegenerating && (
              <>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/55 to-transparent p-4">
                  <span className="rounded-full bg-white/90 px-3 py-1 font-display text-[11px] text-ink">01 / 05</span>
                </div>
                <Watermark position="bottom-left" />
              </>
            )}
            {isRegenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="font-display text-[15px] leading-snug text-white">Regenerating your first photo…</p>
                <p className="font-display text-[38px] leading-none tabular-nums text-white/90">{regenSecondsLeft}</p>
                <p className="text-[11px] text-white/60">seconds left</p>
              </div>
            )}
          </button>

          {!isRegenerating && (
            <button
              type="button"
              onClick={() => downloadFile(generatedUrl, `next5-${route.id}-preview.jpg`)}
              aria-label="Download preview photo"
              className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {zoomed && (
          <ImageLightbox
            src={generatedUrl}
            alt={`${route.title} — your first shot`}
            onClose={() => setZoomed(false)}
            imageOverlay={<Watermark position="bottom-right" />}
            overlay={
              <PreviewLightboxOverlay
                onDownload={() => downloadFile(generatedUrl, `next5-${route.id}-preview.jpg`)}
              />
            }
          />
        )}

        {/* ── Col 2: Feedback + Director note ───────────────────────── */}
        <div className="lg:pt-1">
          <FeedbackWidget
            value={feedbackGiven}
            onLove={() => { setFeedbackGiven('love'); recordFeedback('love'); }}
            onNotMe={() => { setFeedbackGiven('not_me'); setNotMeReason(null); setShowNotMePopup(true); }}
            onLikeBut={() => { setFeedbackGiven('like_but'); setLikeButReason(null); setShowLikeButPopup(true); }}
          />
          <IntentionRecap intention={intention} />
          <div className="mt-4">
            <DirectorNote director={director} note={note} />
          </div>
        </div>

        {/* ── Col 3: Full shoot / locked shots ──────────────────────── */}
        <FullShootPanel route={route} />
      </div>

      {/* ── Inline payment section ─────────────────────────────────────── */}
      {showPayment && (
        <div ref={paymentSectionRef} className="mt-8 border-t border-line pt-8 pb-4">
          {paymentStatus !== 'pending' ? (
            <PaymentReceived />
          ) : (
            <InlinePaymentSection
              route={route}
              discountPercent={discountPercent}
              isCreating={isCreating}
              paymentError={paymentError}
              intent={intent}
              retry={retry}
              simulateTransfer={simulateTransfer}
            />
          )}
        </div>
      )}

      {/* ── Feedback popups ────────────────────────────────────────────── */}
      {showNotMePopup && (
        <FeedbackPopup onClose={() => setShowNotMePopup(false)}>
          <p className="font-display text-[20px] leading-tight text-ink">What feels off?</p>
          <div className="mt-4 flex flex-col gap-2">
            {NOT_ME_REASONS.map(({ id, label }) => (
              <RadioRow key={id} label={label} selected={notMeReason === id} onSelect={() => setNotMeReason(id)} />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => {
                recordFeedback('not_me', notMeReason ?? undefined);
                setShowNotMePopup(false);
                setFeedbackGiven(null);
                regenGenerate();
              }}
              className="font-display text-[15px] italic text-accent-strong transition-opacity hover:opacity-70"
            >
              Try another →
            </button>
          </div>
        </FeedbackPopup>
      )}

      {showLikeButPopup && (
        <FeedbackPopup onClose={() => setShowLikeButPopup(false)}>
          <p className="font-display text-[20px] leading-tight text-ink">Totally fair.</p>
          <p className="mt-1 text-[13px] text-muted">What are you unsure about?</p>
          <div className="mt-4 flex flex-col gap-2">
            {LIKE_BUT_REASONS.map(({ id, label }) => (
              <RadioRow key={id} label={label} selected={likeButReason === id} onSelect={() => setLikeButReason(id)} />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => { recordFeedback('like_but', likeButReason ?? undefined); setShowLikeButPopup(false); }}
              className="font-display text-[15px] italic text-accent-strong transition-opacity hover:opacity-70"
            >
              Continue →
            </button>
          </div>
        </FeedbackPopup>
      )}
    </StepLayout>
  );
};
