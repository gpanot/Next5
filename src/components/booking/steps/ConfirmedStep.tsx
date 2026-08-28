'use client';

import { useEffect, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { Booking, CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { CheckIcon } from '../../ui/Icons';
import { ShotFrame } from '../ui/ShotFrame';
import { StepActions, StepLayout } from '../ui/StepLayout';

type ConfirmedStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  booking: Booking;
  onDone: () => void;
};

const READY_AT_START = 1;
const SECOND_SHOT_MS = 3000;

export const ConfirmedStep = ({ route, director, booking, onDone }: ConfirmedStepProps) => {
  const [readyCount, setReadyCount] = useState(READY_AT_START);

  useEffect(() => {
    const timer = setTimeout(() => setReadyCount(2), SECOND_SHOT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <StepLayout
      footer={
        <StepActions
          hint={
            <p className="text-[12px] text-muted">
              Booking <span className="font-medium text-ink">#{booking.id}</span> · Keep this
              reference for support.
            </p>
          }
        >
          <Button onClick={onDone} variant="dark" size="lg" fullWidth className="sm:w-auto">
            Done
          </Button>
        </StepActions>
      }
    >
      <div className="animate-fade-in">
        <header className="text-center">
          <p className="label-caps text-[10px] font-medium text-accent-strong">
            Payment confirmed · Your shoot has started
          </p>
          <h2 className="mt-2.5 font-serif text-[26px] leading-tight tracking-[0.06em] text-ink uppercase sm:text-[32px]">
            {director.name} is crafting your
            <br className="hidden sm:block" /> remaining 4 photos.
          </h2>
          <p className="mt-3 text-[13px] text-muted">
            You&apos;ll get an email the moment your complete {route.title} shoot is ready.
          </p>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-10">
          <ShotProgress route={route} readyCount={readyCount} />

          <aside className="rounded-2xl border border-line bg-surface px-5 py-5">
            <p className="label-caps text-[9px] font-medium text-muted">Delivery</p>
            <p className="mt-2 text-[13px] text-ink">{booking.email}</p>
            <p className="mt-1 text-[12px] text-muted">Within 4 hours</p>

            <div className="mt-4 border-t border-line pt-4">
              <p className="label-caps text-[9px] font-medium text-muted">Creative direction</p>
              <p className="mt-2 text-[13px] text-ink">{director.name}</p>
              <p className="mt-1 text-[12px] text-muted">{director.specialty}</p>
            </div>
          </aside>
        </div>
      </div>
    </StepLayout>
  );
};

type ShotProgressProps = {
  route: PhotoRoute;
  readyCount: number;
};

const ShotProgress = ({ route, readyCount }: ShotProgressProps) => (
  <div>
    <div className="flex items-baseline justify-between">
      <p className="label-caps text-[9px] font-medium text-muted">Your 5 shots</p>
      <p className="text-[11.5px] text-muted" aria-live="polite">
        {readyCount} of 5 ready
      </p>
    </div>

    <ul className="mt-3 grid grid-cols-5 gap-2">
      {route.shots.map((shot, index) => {
        const ready = index < readyCount;

        return (
          <li key={shot.src} className="relative aspect-[3/4] overflow-hidden rounded-lg">
            <ShotFrame
              shot={shot}
              alt=""
              loading={index < 2 ? 'eager' : 'lazy'}
              interactive={false}
              className={`h-full w-full transition-all duration-700 ${ready ? '' : 'blur-[5px] brightness-75'}`}
            />

            <span
              className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1.5 text-[9.5px] font-medium transition-colors duration-500 ${
                ready ? 'bg-accent text-white' : 'bg-black/45 text-white/85'
              }`}
            >
              {ready ? (
                <>
                  <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
                  Ready
                </>
              ) : (
                <span className="animate-pulse">Creating…</span>
              )}
            </span>

            <span className="sr-only">
              Shot {index + 1}, {route.scenes[index]}
            </span>
          </li>
        );
      })}
    </ul>

    <p className="mt-3 text-[12px] text-muted">
      You can close this window — we&apos;ll email you when everything is ready.
    </p>
  </div>
);
