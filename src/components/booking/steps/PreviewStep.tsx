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
import { ClockIcon, LockIcon, PhotoIcon, StarIcon } from '../../ui/Icons';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { Watermark } from '../../ui/Watermark';
import { useDirectorNote } from '../../../hooks/useDirectorNote';
import { applyDiscount, discountNoteLabel } from '../../../lib/format';
import { DirectorNote } from '../preview/DirectorNote';
import { PreviewLoader } from '../preview/PreviewLoader';
import { PriceTag } from '../ui/PriceTag';
import { ShotFrame } from '../ui/ShotFrame';
import { StepLayout } from '../ui/StepLayout';

type PreviewStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  uploadedPhoto: string;
  intention: ShootIntention;
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
      setState({ phase: 'error', message: 'Generation timed out. Please retry.' });
      return;
    }
    try {
      const res = await fetch(`/api/preview/${taskId}`);
      const data = await res.json();

      if (data.status === 'completed' && data.url) {
        clearPoll();
        setState({ phase: 'done', url: data.url });
        return;
      }
      if (['failed', 'cancelled', 'timeout', 'deleted'].includes(data.status)) {
        clearPoll();
        setState({
          phase: 'error',
          message: data.error ?? `Generation ${data.status}. Please retry.`,
        });
        return;
      }
      // Still in progress — poll again
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch {
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    }
  }, []);

  const startGeneration = useCallback(async () => {
    startedRef.current = true;
    deadlineRef.current = Date.now() + MAX_WAIT_MS;
    setState({ phase: 'uploading' });

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoDataUrl: uploadedPhoto,
          studioId: route.id,
          feelings: intention.feelings,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({
          phase: 'error',
          message: err.error ?? `Upload failed (${res.status})`,
        });
        return;
      }

      const { taskId } = await res.json();
      taskIdRef.current = taskId;
      setState({ phase: 'generating' });
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error. Please retry.',
      });
    }
  }, [uploadedPhoto, route.id, intention.feelings, poll]);

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
          label={
            state.phase === 'uploading'
              ? 'Uploading your photo…'
              : `${director.name} is preparing your shoot…`
          }
          note={note}
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
  const finalPriceVnd =
    discountPercent > 0 ? applyDiscount(route.priceVnd, discountPercent) : route.priceVnd;

  return (
    <StepLayout
      footer={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <PriceTag
            amountVnd={finalPriceVnd}
            originalAmountVnd={discountPercent > 0 ? route.priceVnd : undefined}
            note={
              discountPercent > 0
                ? `${discountNoteLabel(discountPercent)} · Delivered in 4 hours`
                : 'High-resolution · Delivered in 4 hours'
            }
          />

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
              4 hours
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
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="View your first shot full screen"
          className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgb(34_31_28/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:mx-0 lg:max-w-none"
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

        {zoomed && (
          <ImageLightbox
            src={generatedUrl}
            alt={`${route.title} — your first shot`}
            onClose={() => setZoomed(false)}
            overlay={<Watermark />}
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
