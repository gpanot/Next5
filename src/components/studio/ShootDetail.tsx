'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioBooking, StudioMeResponse } from '../../../app/api/studio/me/route';
import type { SceneResponseBody } from '../../../app/api/generate/scene/route';
import { photoRoutes } from '../../data/routes';
import type { RouteId } from '../../data/photos';
import { getCreativeDirector } from '../../data/photographers';
import { useDirectorNote } from '../../hooks/useDirectorNote';
import { StudioReveal } from '../booking/confirmed/StudioReveal';

const feelingLabels: Record<string, string> = {
  beautiful: 'Beautiful & confident',
  soft: 'Soft & feminine',
  elegant: 'Elegant & expensive',
  bold: 'Bold & irresistible',
  fashion: 'Like a fashion girl',
  noticed: 'Like everyone noticed me',
};

const TOTAL_SHOTS = 5;
const POLL_INTERVAL_MS = 4000;
const RETRY_POLL_INTERVAL_MS = 5000;
// How long a background retry is considered still in-flight (slightly > maxDuration of 150s)
const RETRY_TTL_MS = 160_000;

const retryStorageKey = (bookingId: string, sceneIndex: number) =>
  `next5:retrying:${bookingId}:${sceneIndex}`;

function readPendingRetries(bookingId: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  const now = Date.now();
  const pending = new Set<number>();
  for (let si = 0; si <= 4; si++) {
    const key = retryStorageKey(bookingId, si);
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const ts = Number(raw);
    if (now - ts < RETRY_TTL_MS) {
      pending.add(si);
    } else {
      localStorage.removeItem(key); // expired
    }
  }
  return pending;
}

function markRetrying(bookingId: string, sceneIndex: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(retryStorageKey(bookingId, sceneIndex), String(Date.now()));
  }
}

function clearRetrying(bookingId: string, sceneIndex: number) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(retryStorageKey(bookingId, sceneIndex));
  }
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

type ShootDetailProps = {
  booking: StudioBooking;
  token: string;
  onUpdated: (updated: StudioBooking) => void;
};

/** One shoot's full reveal — gallery, downloads, and the director's note.
 *  The account-level discount offer lives on the "create another shooting"
 *  screen now, not here, so this never repeats it per shoot.
 *  Callers must render this with `key={`${booking.id}-${booking.regenerate_count}`}` —
 *  its generation state is only ever correct for the shoot it mounted with,
 *  and remounting on a key change is the mechanism that resets generation
 *  both on first load and after each regeneration request. */
export const ShootDetail = ({ booking, token, onUpdated }: ShootDetailProps) => {
  const [extraShots, setExtraShots] = useState<{ sceneIndex: number; url: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  // Initialise from localStorage so "Generating…" persists across navigation
  const [retryingScenes, setRetryingScenes] = useState<Set<number>>(
    () => readPendingRetries(booking.id),
  );
  const started = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          if (data.url) setExtraShots((prev) => [...prev, { sceneIndex, url: data.url! }]);
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

  // Poll while a background retry is in progress, stopping when the photo appears in booking.photos
  useEffect(() => {
    if (retryingScenes.size === 0) {
      if (retryPollRef.current) clearInterval(retryPollRef.current);
      return;
    }
    retryPollRef.current = setInterval(() => {
      fetch('/api/studio/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data: StudioMeResponse) => {
          const updated = data.bookings?.find((b) => b.id === booking.id);
          if (!updated) return;
          // Check if any retrying scene is now in the DB
          const resolved = [...retryingScenes].filter((si) =>
            updated.photos.some((p) => p.scene_index === si),
          );
          if (resolved.length > 0) {
            resolved.forEach((si) => clearRetrying(booking.id, si));
            setRetryingScenes((prev) => {
              const next = new Set(prev);
              resolved.forEach((si) => next.delete(si));
              return next;
            });
            onUpdated(updated);
          }
        })
        .catch(() => {});
    }, RETRY_POLL_INTERVAL_MS);
    return () => {
      if (retryPollRef.current) clearInterval(retryPollRef.current);
    };
  }, [retryingScenes, token, booking.id, onUpdated]);

  // On mount: if a delivered booking still has null slots, do a one-shot refresh
  // in case a background generation completed while the component was unmounted.
  useEffect(() => {
    if (booking.shoot_status !== 'delivered') return;
    const hasNullSlots = booking.photos.length < TOTAL_SHOTS ||
      [0, 1, 2, 3, 4].some((i) => {
        if (i === 0) return !booking.photos.find((p) => p.type === 'preview' || (p.type === 'generated' && p.scene_index === 0));
        return !booking.photos.find((p) => p.type === 'generated' && p.scene_index === i);
      });
    if (!hasNullSlots) return;
    fetch('/api/studio/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: StudioMeResponse) => {
        const updated = data.bookings?.find((b) => b.id === booking.id);
        if (updated) onUpdated(updated);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewPhoto = booking.photos.find((p) => p.type === 'preview');
  // slot 0 = preview photo, or a retried generated scene_index=0; slots 1-4 = generated scenes 1-4
  const shotUrls: (string | null)[] = Array.from({ length: TOTAL_SHOTS }, (_, i) => {
    if (i === 0) {
      return (
        previewPhoto?.url ??
        booking.photos.find((p) => p.type === 'generated' && p.scene_index === 0)?.url ??
        extraShots.find((s) => s.sceneIndex === 0)?.url ??
        null
      );
    }
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

  // Fetch the same AI-generated director note that was shown during preview.
  // Same inputs → same deterministic prompt → same note, no extra storage needed.
  const note = useDirectorNote(
    route && director
      ? {
          directorName: director.name,
          directorSpecialty: director.specialty,
          directorSignature: director.signature,
          studioTitle: route.title,
          feelings: booking.feelings.map((f) => feelingLabels[f] ?? f),
          goals: [],
        }
      : null,
  );

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
      <h2 className="mt-1.5 font-display text-[24px] tracking-[0.05em] text-ink uppercase leading-none">
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
          retryingScenes={retryingScenes}
          director={director}
          directorNote={note}
          regenerateCount={booking.regenerate_count}
          bookingCreatedAt={booking.created_at}
          onRetryFailed={async (sceneIndex: number) => {
            const res = await fetch('/api/generate/scene', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studioId: booking.route_id,
                feelings: booking.feelings,
                bookingId: booking.id,
                sceneIndex,
                background: true, // return immediately; server generates in background
              }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({})) as { error?: string };
              throw new Error(err.error ?? 'Generation failed');
            }
            const data = (await res.json()) as SceneResponseBody;
            if (data.background) {
              // Persist to localStorage so "Generating…" survives navigation
              markRetrying(booking.id, sceneIndex);
              setRetryingScenes((prev) => new Set(prev).add(sceneIndex));
            } else if (data.url != null) {
              // Synchronous response (mock mode) — show immediately
              setExtraShots((prev) => [
                ...prev.filter((s) => s.sceneIndex !== sceneIndex),
                { sceneIndex, url: data.url! },
              ]);
            }
          }}
          onRegenerate={async (sceneIndex: number, reason: string) => {
            const res = await fetch('/api/studio/regenerate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ bookingId: booking.id, sceneIndex, reason }),
            });
            const data = await res.json() as { ok: boolean; error?: string };
            if (!res.ok || !data.ok) throw new Error(data.error ?? 'Regeneration failed');
            // Fetch fresh booking data — regenerate_count changed and generated photos were deleted,
            // so the updated booking triggers a re-mount of this component (key changes in StudioWorkspace).
            const meRes = await fetch('/api/studio/me', { headers: { Authorization: `Bearer ${token}` } });
            if (meRes.ok) {
              const meData = await meRes.json() as { bookings: typeof booking[] };
              const updated = meData.bookings?.find((b) => b.id === booking.id);
              if (updated) onUpdated(updated);
            }
          }}
        />
      </div>
    </div>
  );
};
