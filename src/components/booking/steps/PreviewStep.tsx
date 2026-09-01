'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type {
  CreativeDirector,
  FeelingChoice,
  GoalChoice,
  ShootIntention,
} from '../../../types/booking';
import { Button } from '../../ui/Button';
import { ClockIcon, DownloadIcon, LockIcon, PhotoIcon, StarIcon } from '../../ui/Icons';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { Watermark } from '../../ui/Watermark';
import { downloadFile } from '../../../lib/download';
import { useDirectorNote } from '../../../hooks/useDirectorNote';
import { DirectorNote } from '../preview/DirectorNote';
import { PreviewLoader } from '../preview/PreviewLoader';
import { ShotFrame } from '../ui/ShotFrame';
import { StepLayout } from '../ui/StepLayout';

type PreviewStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  uploadedPhoto: string;
  intention: ShootIntention;
  /** Customer email — collected at the Upload step. Used to create the studio account. */
  email: string;
  /** Booking ID — generated at flow open time so the DB row can be created now. */
  bookingId: string;
  /** Customer's first name — captured during generation wait. */
  name: string;
  onNameChange: (name: string) => void;
  onNext: () => void;
  /** Fired once the first shot finishes generating, so the studio reveal at
   *  the end of the flow can show her actual photo instead of a placeholder. */
  onPreviewReady: (url: string) => void;
  /** From a claimed upsell offer — 0 when this route isn't discounted. */
  discountPercent?: number;
};

type GenerationState =
  | { phase: 'uploading' }
  | { phase: 'generating' }
  | { phase: 'done'; url: string }
  | { phase: 'error'; message: string };

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 120_000;

const feelingLabels: Record<FeelingChoice, string> = {
  beautiful: '✨ Beautiful & confident',
  soft: '🌸 Soft & feminine',
  elegant: '💎 Elegant & expensive',
  bold: '🔥 Bold & irresistible',
  fashion: '👗 Like a fashion girl',
  noticed: '📸 Like everyone noticed me',
};

const goalLabels: Record<GoalChoice, string> = {
  instagram: 'Refresh my Instagram',
  attention: 'Get more attention',
  style: 'Show my style',
  confident: 'Feel more confident',
  content: 'Create content',
  fun: 'Just have fun',
  jealous: 'Make someone jealous 😏',
};

export const PreviewStep = ({
  route,
  director,
  uploadedPhoto,
  intention,
  email,
  bookingId,
  name,
  onNameChange,
  onNext,
  onPreviewReady,
  discountPercent = 0,
}: PreviewStepProps) => {
  const [state, setState] = useState<GenerationState>({ phase: 'uploading' });
  const [zoomed, setZoomed] = useState(false);
  const taskIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const deadlineRef = useRef(Date.now() + MAX_WAIT_MS);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const poll = useCallback(async (taskId: string) => {
    if (Date.now() > deadlineRef.current) {
      console.error('[preview] Poll timed out for taskId:', taskId);
      setState({ phase: 'error', message: 'Generation timed out. Please retry.' });
      return;
    }
    try {
      const res = await fetch(`/api/preview/${taskId}`);
      const data = await res.json();

      console.log('[preview] Poll', taskId, '→', data.status, data.url ? `url: ${data.url}` : '');

      if (data.status === 'completed' && data.url) {
        clearPoll();
        console.log('[preview] ✓ Generation complete! Preview URL:', data.url);
        setState({ phase: 'done', url: data.url });
        return;
      }
      if (['failed', 'cancelled', 'timeout', 'deleted'].includes(data.status)) {
        clearPoll();
        console.error('[preview] Generation failed with status:', data.status, data.error);
        setState({
          phase: 'error',
          message: data.error ?? `Generation ${data.status}. Please retry.`,
        });
        return;
      }
      // Still in progress — poll again
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch (err) {
      console.warn('[preview] Poll network error, retrying:', err);
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    }
  }, []);

  const startGeneration = useCallback(async () => {
    startedRef.current = true;
    deadlineRef.current = Date.now() + MAX_WAIT_MS;
    setState({ phase: 'uploading' });

    const t0 = Date.now();
    console.log('[preview] Starting generation', {
      studioId: route.id,
      email,
      bookingId,
      feelings: intention.feelings,
      photoBytes: Math.round((uploadedPhoto?.length ?? 0) * 0.75),
    });

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoDataUrl: uploadedPhoto,
          studioId: route.id,
          feelings: intention.feelings,
          email,
          bookingId,
        }),
      });

      console.log('[preview] POST /api/preview response:', res.status, 'in', Date.now() - t0, 'ms');

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[preview] POST /api/preview failed:', err);
        setState({
          phase: 'error',
          message: err.error ?? `Upload failed (${res.status})`,
        });
        return;
      }

      const data = await res.json();
      const { taskId } = data;
      console.log('[preview] Task created:', taskId, 'in', Date.now() - t0, 'ms');
      taskIdRef.current = taskId;
      setState({ phase: 'generating' });
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch (err) {
      console.error('[preview] Network error calling /api/preview:', err);
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error. Please retry.',
      });
    }
  }, [uploadedPhoto, route.id, intention.feelings, email, bookingId, poll]);

  useEffect(() => {
    if (!startedRef.current) {
      startGeneration();
    }
    return () => clearPoll();
  }, [startGeneration]);

  useEffect(() => {
    if (state.phase === 'done') onPreviewReady(state.url);
  }, [state, onPreviewReady]);

  // Written in parallel with the shot, so it is on screen when she gets there.
  const note = useDirectorNote({
    directorName: director.name,
    directorSpecialty: director.specialty,
    directorSignature: director.signature,
    studioTitle: route.title,
    feelings: intention.feelings.map((f) => feelingLabels[f].replace(/^\S+\s/, '')),
    goals: intention.goals.map((g) => goalLabels[g]),
  });

  if (state.phase === 'uploading' || state.phase === 'generating') {
    return (
      <StepLayout>
        <PreviewLoader
          uploadedPhoto={uploadedPhoto}
          director={director}
          note={note}
          name={name}
          onNameChange={onNameChange}
        />
      </StepLayout>
    );
  }

  if (state.phase === 'error') {
    return (
      <StepLayout centered>
        <div className="flex flex-col items-center gap-5 py-12 text-center">
          <p className="max-w-sm text-[14px] text-muted">{state.message}</p>
          <Button onClick={startGeneration} size="lg">
            Try again
          </Button>
        </div>
      </StepLayout>
    );
  }

  const generatedUrl = state.url;

  return (
    <StepLayout
      footer={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          {/* Director quote — replaces price tag on mobile */}
          <div className="flex items-baseline gap-2">
            <span className="label-caps text-[9px] font-medium text-muted shrink-0">{director.name} says</span>
            <p className="font-serif text-[16px] italic text-ink leading-snug">
              &ldquo;You look amazing.&rdquo;
            </p>
          </div>

          <ul className="hidden items-center gap-6 lg:flex">
            <IncludedItem icon={<PhotoIcon className="h-4.5 w-4.5" />}>
              5 personalized
              <br />
              photos
            </IncludedItem>
            <IncludedItem icon={<StarIcon className="h-4.5 w-4.5" />}>
              {director.name}&apos;s creative
              <br />
              direction
            </IncludedItem>
            <IncludedItem icon={<ClockIcon className="h-4.5 w-4.5" />}>
              Delivered within
              <br />
              30 min
            </IncludedItem>
          </ul>

          <div className="lg:shrink-0">
            <Button onClick={onNext} size="lg" withArrow fullWidth className="lg:w-auto">
              Get all 5 photos
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <LockIcon className="h-3 w-3" />
              One payment · Secure &amp; easy
            </p>
          </div>
        </div>
      }
    >
      <div className="animate-fade-in grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,232px)] lg:items-start lg:gap-8">
        <div className="relative mx-auto w-[90vw] lg:mx-0 lg:w-full lg:max-w-none">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="View your first shot full screen"
            className="relative w-full overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgb(34_31_28/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedUrl}
              alt={`${route.title} — your first shot`}
              className="aspect-[3/4] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/55 to-transparent p-4">
              <span className="rounded-full bg-white/90 px-3 py-1 font-serif text-[11px] text-ink">
                01 / 05
              </span>
            </div>
            <Watermark position="bottom-left" />
          </button>

          {/* Download button — top-right corner of the thumbnail */}
          <button
            type="button"
            onClick={() => downloadFile(generatedUrl, `next5-${route.id}-preview.jpg`)}
            aria-label="Download preview photo"
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
          </button>
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

        <div className="lg:pt-1">
          <p className="label-caps text-[10px] font-medium text-accent-strong">
            Your first shot is ready
          </p>
          <h2 className="mt-2 font-serif text-[26px] leading-none tracking-[0.06em] text-ink uppercase sm:text-[29px]">
            {route.title}
          </h2>
          <p className="mt-2 text-[13px] text-muted">Shot 01 of 5</p>

          <IntentionRecap intention={intention} />

          <div className="mt-4">
            <DirectorNote director={director} note={note} />
          </div>
        </div>

        <div className="lg:pt-1">
          <p className="label-caps text-[9px] font-medium text-muted">
            Unlock the remaining 4 shots
          </p>
          <LockedShots route={route} />
          <ul className="mt-3 space-y-1">
            {route.scenes.slice(1).map((scene, index) => (
              <li key={scene} className="flex items-baseline gap-2 text-[11.5px] text-muted">
                <span className="font-serif text-[10px] text-accent-strong">
                  {String(index + 2).padStart(2, '0')}
                </span>
                {scene}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </StepLayout>
  );
};

type IncludedItemProps = { icon: React.ReactNode; children: React.ReactNode };

const IncludedItem = ({ icon, children }: IncludedItemProps) => (
  <li className="flex items-center gap-2.5 text-[11.5px] leading-tight text-muted">
    <span className="shrink-0 text-accent">{icon}</span>
    <span>{children}</span>
  </li>
);

const IntentionRecap = ({ intention }: { intention: ShootIntention }) => {
  if (intention.feelings.length === 0 && intention.goals.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {intention.feelings.map((f) => (
        <span key={f} className="rounded-full bg-accent/12 px-2.5 py-1 text-[11px] text-ink">
          {feelingLabels[f]}
        </span>
      ))}
      {intention.goals.map((g) => (
        <span key={g} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] text-muted">
          {goalLabels[g]}
        </span>
      ))}
    </div>
  );
};

/** Floating download button anchored to the lightbox viewport. */
const PreviewLightboxOverlay = ({ onDownload }: { onDownload: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onDownload(); }}
    aria-label="Download preview photo"
    className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:bottom-6 sm:left-auto sm:right-16 sm:translate-x-0"
  >
    <DownloadIcon className="h-3.5 w-3.5" />
    Download
  </button>
);

const LockedShots = ({ route }: { route: PhotoRoute }) => (
  <div className="mt-2.5 grid grid-cols-4 gap-2 lg:grid-cols-2">
    {route.shots.slice(1).map((shot, index) => (
      <div key={shot.src} className="relative aspect-[3/4] overflow-hidden rounded-lg">
        <ShotFrame
          shot={shot}
          alt=""
          loading="lazy"
          interactive={false}
          className="h-full w-full scale-110 blur-[6px] brightness-75"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/25">
          <LockIcon className="h-4 w-4 text-white/85" />
          <span className="font-serif text-[10px] text-white/85">
            {String(index + 2).padStart(2, '0')}
          </span>
        </div>
        <span className="sr-only">
          Shot {index + 2}, {route.scenes[index + 1]} — unlocked with the full shoot
        </span>
      </div>
    ))}
  </div>
);
