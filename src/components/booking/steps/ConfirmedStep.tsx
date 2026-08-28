'use client';

import { useEffect, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { Booking, CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { StepFooter } from '../ui/StepFooter';

type ConfirmedStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  booking: Booking;
  onDone: () => void;
};

type ShotStatus = 'ready' | 'creating';

export const ConfirmedStep = ({
  route,
  director,
  booking,
  onDone,
}: ConfirmedStepProps) => {
  const [shotStatuses, setShotStatuses] = useState<ShotStatus[]>([
    'ready',
    'creating',
    'creating',
    'creating',
    'creating',
  ]);

  // Animate shot 2 becoming "ready" after a few seconds for the effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShotStatuses(['ready', 'ready', 'creating', 'creating', 'creating']);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="animate-fade-in pb-8">
      {/* Confirmation headline */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/12">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent-strong" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 12.5 5 5 10-11" />
          </svg>
        </div>

        <p className="mt-5 label-caps text-[10px] font-medium text-accent-strong">Your shoot has started</p>
        <h2 className="mt-2 font-serif text-[28px] leading-tight tracking-[0.06em] text-ink uppercase sm:text-[34px]">
          {director.name} is crafting
          <br />
          your remaining 4 photos.
        </h2>
      </div>

      {/* Progress display */}
      <div className="mx-auto mt-8 max-w-xs rounded-2xl border border-line bg-surface p-5">
        <ul className="space-y-3">
          {shotStatuses.map((status, index) => (
            <li key={index} className="flex items-center gap-3">
              <div className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-all duration-500',
                status === 'ready'
                  ? 'bg-accent text-white'
                  : 'border border-line bg-page text-muted',
              ].join(' ')}>
                {status === 'ready' ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 4 4 10-10" />
                  </svg>
                ) : (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted/60" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-[12.5px] ${status === 'ready' ? 'font-medium text-ink' : 'text-muted'}`}>
                  Shot {String(index + 1).padStart(2, '0')}
                </p>
                <p className="text-[11px] text-muted">
                  {status === 'ready' ? '✓ Ready' : 'Creating…'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Delivery info */}
      <div className="mt-6 rounded-2xl bg-surface-alt px-5 py-4 text-center">
        <p className="text-[13px] font-medium text-ink">
          Your complete shoot will be delivered to
        </p>
        <p className="mt-0.5 text-[13px] text-accent-strong">{booking.email}</p>
        <p className="mt-2 text-[12px] text-muted">within 4 hours</p>
      </div>

      <p className="mt-5 text-center text-[12px] text-muted">
        Booking <span className="font-medium text-ink">#{booking.id}</span>
      </p>

      <StepFooter>
        <Button onClick={onDone} variant="dark" size="lg" fullWidth className="sm:w-auto">
          Done
        </Button>
      </StepFooter>
    </section>
  );
};
