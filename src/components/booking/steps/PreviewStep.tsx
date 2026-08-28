'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { ShootIntention, CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { LockIcon } from '../../ui/Icons';
import { ShotFrame } from '../ui/ShotFrame';

type PreviewStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  uploadedPhoto: string;
  intention: ShootIntention;
  onNext: () => void;
};

type GenerationState =
  | { phase: 'uploading' }
  | { phase: 'generating' }
  | { phase: 'done'; url: string }
  | { phase: 'error'; message: string };

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 120_000;

export const PreviewStep = ({
  route,
  director,
  uploadedPhoto,
  intention,
  onNext,
}: PreviewStepProps) => {
  const [state, setState] = useState<GenerationState>({ phase: 'uploading' });
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

  // ── Loading states ───────────────────────────────────────────────────────────

  if (state.phase === 'uploading' || state.phase === 'generating') {
    const label =
      state.phase === 'uploading'
        ? 'Uploading your photo…'
        : `${director.name} is preparing your shoot…`;

    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadedPhoto} alt="Your photo" className="h-16 w-16 rounded-full object-cover" />
          </div>
        </div>
        <div>
          <p className="label-caps text-[10px] font-medium text-accent-strong">{label}</p>
          <div className="mt-3 flex justify-center gap-1">
            {[0, 0.2, 0.4].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted">This usually takes 15–30 seconds</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (state.phase === 'error') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 py-12 text-center">
        <p className="text-[14px] text-muted">{state.message}</p>
        <Button onClick={startGeneration} size="lg">
          Try again
        </Button>
      </div>
    );
  }

  // ── Done — show the generated image ─────────────────────────────────────────

  const generatedUrl = state.url;

  return (
    <section className="animate-fade-in pb-8">
      {/* WOW moment headline */}
      <div className="text-center">
        <p className="label-caps text-[10px] font-medium text-accent-strong">Your first shot is ready</p>
        <h2 className="mt-2 font-serif text-[28px] leading-tight tracking-[0.05em] text-ink uppercase sm:text-[34px]">
          {route.title}
        </h2>
        <p className="mt-1.5 text-[13px] text-muted">{director.name} · Shot 01</p>
      </div>

      {/* First shot — AI generated */}
      <div className="relative mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgb(34_31_28/0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={generatedUrl}
          alt={`${route.title} — your first shot`}
          className="aspect-[3/4] w-full object-cover"
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="rounded-lg bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {route.scenes[0]}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 font-serif text-[11px] text-ink shadow-sm">
            01
          </span>
        </div>
      </div>

      {/* Locked previews — still use the route's example shots as placeholders */}
      <div className="mt-5">
        <p className="mb-3 text-center text-[11.5px] text-muted">4 more shots waiting for you</p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {route.shots.slice(1).map((shot, index) => (
            <div key={shot.src} className="group relative aspect-[3/4] overflow-hidden rounded-xl">
              <ShotFrame
                shot={shot}
                alt={`Locked shot ${index + 2}`}
                loading="lazy"
                className="h-full w-full scale-110 blur-[6px] brightness-75"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/30">
                <LockIcon className="h-5 w-5 text-white/80" />
                <span className="font-serif text-[11px] text-white/80">
                  {String(index + 2).padStart(2, '0')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-surface px-6 py-6 text-center">
        <p className="font-serif text-[22px] tracking-[0.04em] text-ink sm:text-[24px]">
          Love your first shot?
        </p>
        <p className="text-[13px] text-muted">
          Get the complete shoot — 5 personalized photos, 5 scenes, all yours.
        </p>
        <Button onClick={onNext} size="lg" withArrow fullWidth className="max-w-xs">
          I want this →
        </Button>
      </div>
    </section>
  );
};
