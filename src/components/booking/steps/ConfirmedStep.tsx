'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { Booking, CreativeDirector } from '../../../types/booking';
import type { DiscountOffer } from '../../../types/offer';
import type { SceneResponseBody } from '../../../../app/api/generate/scene/route';
import { Button } from '../../ui/Button';
import { StudioReveal } from '../confirmed/StudioReveal';
import { StepActions, StepLayout } from '../ui/StepLayout';

const EMAIL_COUNTDOWN_SECONDS = 15 * 60; // 15 minutes

/** Counts down from `initialSeconds` and returns the remaining formatted time. */
function useCountdown(initialSeconds: number, active: boolean) {
  const [remaining, setRemaining] = useState(initialSeconds);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

type ConfirmedStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  booking: Booking;
  onDone: () => void;
  activeOffer: DiscountOffer | null;
  onClaimOffer: (offer: DiscountOffer) => void;
};

type GeneratedShot = {
  scene: number; // 2–5
  url: string;
};

const TOTAL_POST_PAYMENT_SHOTS = 4;

export const ConfirmedStep = ({
  route,
  director,
  booking,
  onDone,
  activeOffer,
  onClaimOffer,
}: ConfirmedStepProps) => {
  // Shot 1 is already generated — it's whatever she approved on the preview step.
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const started = useRef(false);
  const offersRef = useRef<HTMLDivElement | null>(null);

  const readyCount = 1 + generatedShots.length;
  const countdown = useCountdown(EMAIL_COUNTDOWN_SECONDS, isGenerating);

  const scrollToOffers = () => {
    offersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (started.current) return;
    if (!booking.uploadedPhoto) return;
    started.current = true;

    setIsGenerating(true);

    const run = async () => {
      for (let sceneIndex = 1; sceneIndex <= TOTAL_POST_PAYMENT_SHOTS; sceneIndex++) {
        try {
          const res = await fetch('/api/generate/scene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photoDataUrl: booking.uploadedPhoto,
              studioId: booking.studioId,
              feelings: booking.intention.feelings,
              bookingId: booking.id,
              sceneIndex,
            }),
          });

          if (!res.ok) {
            console.error(`[confirmed] scene ${sceneIndex} failed:`, res.status);
            continue;
          }

          const data = (await res.json()) as SceneResponseBody;
          setGeneratedShots((prev) => [...prev, { scene: data.scene, url: data.url }]);
        } catch (err) {
          console.error(`[confirmed] scene ${sceneIndex} error:`, err);
        }
      }
      setIsGenerating(false);
    };

    run();
  }, [booking]);

  const shotUrls = useMemo<(string | null)[]>(() => {
    const urls: (string | null)[] = [booking.previewUrl];
    for (let shotNumber = 2; shotNumber <= route.shots.length; shotNumber += 1) {
      urls.push(generatedShots.find((s) => s.scene === shotNumber)?.url ?? null);
    }
    return urls;
  }, [booking.previewUrl, generatedShots, route.shots.length]);

  const allReady = readyCount === route.shots.length;

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
          <Button onClick={scrollToOffers} variant="dark" size="lg" fullWidth className="sm:w-auto">
            Special Offers
          </Button>
        </StepActions>
      }
    >
      <div className="animate-fade-in">
        <header className="text-center">
          <p className="label-caps text-[10px] font-medium text-accent-strong">
            {allReady ? 'Your studio is ready' : 'Payment confirmed · Your shoot has started'}
          </p>
          <h2 className="mt-2.5 font-serif text-[26px] leading-tight tracking-[0.06em] text-ink uppercase sm:text-[32px]">
            Welcome to your studio.
          </h2>
          <p className="mt-3 text-[13px] text-muted">
            {allReady
              ? 'All 5 shots are ready below, and on their way to your email too.'
              : 'Your photos are being crafted. You will receive a link to download them directly in your email.'}
          </p>
        </header>

        {isGenerating && (
          <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-line bg-surface px-5 py-4 text-center">
            <p className="tabular-nums font-serif text-[36px] leading-none tracking-wide text-ink">
              {countdown}
            </p>
            <p className="mt-2 text-[13px] font-medium text-ink">
              Within 15 min, you will receive a link to download your photos directly in your email.
            </p>
            <p className="mt-1.5 text-[11.5px] text-muted">
              You may check your spam folder if you can&apos;t find it immediately.
            </p>
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-10">
          <StudioReveal
            route={route}
            bookingId={booking.id}
            shotUrls={shotUrls}
            director={director}
            activeOffer={activeOffer}
            onClaimOffer={onClaimOffer}
            onDone={onDone}
            offersRef={offersRef}
          />

          <aside className="rounded-2xl border border-line bg-surface px-5 py-5">
            <p className="label-caps text-[9px] font-medium text-muted">Delivery</p>
            <p className="mt-2 text-[13px] text-ink">{booking.email}</p>
            <p className="mt-1 text-[12px] text-muted">Within 30 minutes</p>

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
