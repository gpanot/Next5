'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { Booking, CreativeDirector } from '../../../types/booking';
import type { DiscountOffer } from '../../../types/offer';
import type { SceneResponseBody } from '../../../../app/api/generate/scene/route';
import { Button } from '../../ui/Button';
import { ClosingNote } from '../confirmed/ClosingNote';
import { StudioReveal } from '../confirmed/StudioReveal';
import { OfferReminder, UpsellOffer } from '../confirmed/UpsellOffer';
import { StepActions, StepLayout } from '../ui/StepLayout';

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

  const readyCount = 1 + generatedShots.length;

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
          <Button onClick={onDone} variant="dark" size="lg" fullWidth className="sm:w-auto">
            Done
          </Button>
        </StepActions>
      }
    >
      <div className="animate-fade-in">
        <header className="text-center">
          <p className="label-caps text-[10px] font-medium text-accent-strong">
            {allReady ? 'Your studio is ready' : "Payment confirmed · Your shoot has started"}
          </p>
          <h2 className="mt-2.5 font-serif text-[26px] leading-tight tracking-[0.06em] text-ink uppercase sm:text-[32px]">
            {isGenerating ? (
              <>
                {director.name} is crafting your
                <br className="hidden sm:block" /> remaining {TOTAL_POST_PAYMENT_SHOTS - generatedShots.length} photo{TOTAL_POST_PAYMENT_SHOTS - generatedShots.length !== 1 ? 's' : ''}.
              </>
            ) : (
              <>Welcome to your studio.</>
            )}
          </h2>
          <p className="mt-3 text-[13px] text-muted">
            {isGenerating
              ? `Browse and download each shot as it's ready — the full ${route.title} set is also on its way to your email.`
              : 'All 5 shots are ready below, and on their way to your email too.'}
          </p>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-10">
          <StudioReveal route={route} bookingId={booking.id} shotUrls={shotUrls} />

          <aside className="rounded-2xl border border-line bg-surface px-5 py-5">
            <p className="label-caps text-[9px] font-medium text-muted">Delivery</p>
            <p className="mt-2 text-[13px] text-ink">{booking.email}</p>
            <p className="mt-1 text-[12px] text-muted">Within 4 hours</p>

            <div className="mt-4 border-t border-line pt-4">
              <p className="label-caps text-[9px] font-medium text-muted">Creative direction</p>
              <p className="mt-2 text-[13px] text-ink">{director.name}</p>
              <p className="mt-1 text-[12px] text-muted">{director.specialty}</p>
            </div>

            {allReady && <ClosingNote director={director} />}
          </aside>
        </div>

        {allReady && (
          activeOffer ? (
            <OfferReminder offer={activeOffer} onDone={onDone} />
          ) : (
            <UpsellOffer route={route} onClaim={onClaimOffer} onDone={onDone} />
          )
        )}
      </div>
    </StepLayout>
  );
};
