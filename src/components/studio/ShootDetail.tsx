'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioBooking, StudioMeResponse } from '../../../app/api/studio/me/route';
import type { SceneResponseBody } from '../../../app/api/generate/scene/route';
import { photoRoutes } from '../../data/routes';
import type { RouteId } from '../../data/photos';
import { getCreativeDirector } from '../../data/photographers';
import { StudioReveal } from '../booking/confirmed/StudioReveal';

const TOTAL_SHOTS = 5;
const POLL_INTERVAL_MS = 4000;

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

type ShootDetailProps = {
  booking: StudioBooking;
  token: string;
  onUpdated: (updated: StudioBooking) => void;
};

/** One shoot's full reveal — gallery, downloads, and the director's note.
 *  The account-level discount offer lives on the "create another shooting"
 *  screen now, not here, so this never repeats it per shoot.
 *  Callers must render this with `key={booking.id}` — its generation state
 *  is only ever correct for the shoot it mounted with, and remounting on a
 *  key change is how that resets, rather than an effect watching for it. */
export const ShootDetail = ({ booking, token, onUpdated }: ShootDetailProps) => {
  const [extraShots, setExtraShots] = useState<{ sceneIndex: number; url: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const started = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const existingScenes = new Set(
    booking.photos.filter((p) => p.type === 'generated' && p.scene_index !== null).map((p) => p.scene_index as number),
  );
  const pendingScenes = [1, 2, 3, 4].filter(
    (i) => !existingScenes.has(i) && !extraShots.find((s) => s.sceneIndex === i),
  );

  useEffect(() => {
    if (started.current) return;
    if (pendingScenes.length === 0) return;
    if (booking.shoot_status === 'delivered') return;

    started.current = true;
    setIsGenerating(true);

    const run = async () => {
      for (const sceneIndex of pendingScenes) {
        try {
          const res = await fetch('/api/generate/scene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studioId: booking.route_id,
              feelings: booking.feelings,
              bookingId: booking.id,
              sceneIndex,
            }),
          });
          if (!res.ok) {
            console.error('[studio] scene generation failed:', sceneIndex, res.status);
            continue;
          }
          const data = (await res.json()) as SceneResponseBody;
          setExtraShots((prev) => [...prev, { sceneIndex, url: data.url }]);
        } catch (err) {
          console.error('[studio] scene generation error:', sceneIndex, err);
        }
      }
      setIsGenerating(false);
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  useEffect(() => {
    if (!isGenerating) return;
    pollRef.current = setInterval(() => {
      fetch('/api/studio/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data: StudioMeResponse) => {
          const updated = data.bookings?.find((b) => b.id === booking.id);
          if (updated) onUpdated(updated);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isGenerating, token, booking.id, onUpdated]);

  const previewPhoto = booking.photos.find((p) => p.type === 'preview');
  const shotUrls: (string | null)[] = Array.from({ length: TOTAL_SHOTS }, (_, i) => {
    if (i === 0) return previewPhoto?.url ?? null;
    const existing = booking.photos.find((p) => p.type === 'generated' && p.scene_index === i);
    if (existing?.url) return existing.url;
    return extraShots.find((s) => s.sceneIndex === i)?.url ?? null;
  });

  let route, director;
  try {
    route = photoRoutes.find((r) => r.id === booking.route_id) ?? null;
    director = route && booking.director_id ? getCreativeDirector(booking.director_id, route.id as RouteId) : null;
  } catch {
    route = null;
    director = null;
  }

  if (!route || !director) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-6 py-10 text-center">
        <p className="text-[13px] text-muted">
          This shoot&apos;s details couldn&apos;t be loaded. Contact support with booking{' '}
          <span className="font-medium text-ink">#{booking.id}</span>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="label-caps text-[9px] font-medium text-accent-strong">
        {isGenerating ? 'Creating your shoot…' : 'Ready'}
      </p>
      <h2 className="mt-1.5 font-serif text-[24px] tracking-[0.05em] text-ink uppercase leading-none">
        {route.title}
      </h2>
      <p className="mt-1.5 text-[12.5px] text-muted">
        With {director.name} · {dateFormatter.format(new Date(booking.created_at))} · Booking #{booking.id}
      </p>

      <div className="mt-5">
        <StudioReveal
          route={route}
          bookingId={booking.id}
          shotUrls={shotUrls}
          director={director}
        />
      </div>
    </div>
  );
};
