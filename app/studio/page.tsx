'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudioBooking } from '../api/studio/me/route';
import type { SceneResponseBody } from '../api/generate/scene/route';
import { downloadFile } from '../../src/lib/download';

const STORAGE_KEY = 'studio_token';
const TOTAL_SHOTS = 5;
const POLL_INTERVAL_MS = 4000;

// ── Auth states ───────────────────────────────────────────────────────────────

type AuthState =
  | { phase: 'checking' }
  | { phase: 'unauthenticated' }
  | { phase: 'sending' }
  | { phase: 'sent'; email: string }
  | { phase: 'authenticated'; token: string; email: string }
  | { phase: 'error'; message: string };

type StudioState =
  | { phase: 'loading' }
  | { phase: 'loaded'; bookings: StudioBooking[] }
  | { phase: 'error'; message: string };

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [auth, setAuth] = useState<AuthState>({ phase: 'checking' });
  const [studio, setStudio] = useState<StudioState>({ phase: 'loading' });
  // bookingId from ?bookingId= URL param — the active booking to focus/generate
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  // On mount: consume magic ?token=, check localStorage, or read ?bookingId=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get('token');
    const bookingIdParam = params.get('bookingId');

    if (bookingIdParam) {
      setActiveBookingId(bookingIdParam);
      const url = new URL(window.location.href);
      url.searchParams.delete('bookingId');
      window.history.replaceState({}, '', url.toString());
    }

    if (magicToken) {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());

      fetch('/api/auth/studio/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: magicToken }),
      })
        .then((res) => res.json())
        .then((data: { token?: string; email?: string; error?: string }) => {
          if (data.token && data.email) {
            localStorage.setItem(STORAGE_KEY, data.token);
            setAuth({ phase: 'authenticated', token: data.token, email: data.email });
          } else {
            setAuth({ phase: 'error', message: data.error ?? 'Invalid login link' });
          }
        })
        .catch(() => setAuth({ phase: 'error', message: 'Failed to verify login link' }));
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const payload = JSON.parse(atob(stored.split('.')[1]));
        setAuth({ phase: 'authenticated', token: stored, email: payload.email ?? '' });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setAuth({ phase: 'unauthenticated' });
      }
    } else {
      setAuth({ phase: 'unauthenticated' });
    }
  }, []);

  const loadBookings = useCallback(
    (token: string) => {
      fetch('/api/studio/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem(STORAGE_KEY);
            setAuth({ phase: 'unauthenticated' });
            throw new Error('Session expired');
          }
          return res.json();
        })
        .then((data) => setStudio({ phase: 'loaded', bookings: data.bookings ?? [] }))
        .catch((err) =>
          setStudio({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Failed to load studio',
          }),
        );
    },
    [],
  );

  // Fetch bookings once authenticated
  useEffect(() => {
    if (auth.phase !== 'authenticated') return;
    setStudio({ phase: 'loading' });
    loadBookings(auth.token);
  }, [auth, loadBookings]);

  if (auth.phase === 'checking') {
    return <PageShell><LoadingSpinner /></PageShell>;
  }

  if (auth.phase === 'unauthenticated' || auth.phase === 'sending' || auth.phase === 'sent') {
    return (
      <PageShell>
        <LoginPanel auth={auth} onAuthChange={setAuth} />
      </PageShell>
    );
  }

  if (auth.phase === 'error') {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm text-center py-20">
          <p className="text-[14px] text-muted">{auth.message}</p>
          <button
            type="button"
            className="mt-4 text-[13px] text-accent-strong underline underline-offset-4"
            onClick={() => setAuth({ phase: 'unauthenticated' })}
          >
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      email={auth.email}
      onLogout={() => {
        localStorage.removeItem(STORAGE_KEY);
        setAuth({ phase: 'unauthenticated' });
      }}
    >
      {studio.phase === 'loading' && <LoadingSpinner />}
      {studio.phase === 'error' && (
        <p className="py-20 text-center text-[14px] text-muted">{studio.message}</p>
      )}
      {studio.phase === 'loaded' && (
        <StudioGallery
          bookings={studio.bookings}
          activeBookingId={activeBookingId}
          token={auth.token}
          onBookingsChange={(updated) =>
            setStudio({ phase: 'loaded', bookings: updated })
          }
        />
      )}
    </PageShell>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

function PageShell({
  children,
  email,
  onLogout,
}: {
  children: React.ReactNode;
  email?: string;
  onLogout?: () => void;
}) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="font-serif text-[22px] tracking-[0.12em] text-ink uppercase">
            Next5
          </a>
          <div className="flex items-center gap-4">
            {email && (
              <span className="hidden text-[12px] text-muted sm:inline">{email}</span>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-[12px] text-muted hover:text-ink"
              >
                Sign out
              </button>
            )}
            <a
              href="/"
              className="rounded-full border border-line px-4 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt"
            >
              New shoot
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}

// ── Login panel ───────────────────────────────────────────────────────────────

function LoginPanel({
  auth,
  onAuthChange,
}: {
  auth: AuthState;
  onAuthChange: (s: AuthState) => void;
}) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
        setEmailError('Please enter a valid email address.');
        return;
      }

      onAuthChange({ phase: 'sending' });
      try {
        const res = await fetch('/api/auth/studio/magic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to send link');
        onAuthChange({ phase: 'sent', email: trimmed });
      } catch (err) {
        onAuthChange({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Failed to send login link',
        });
      }
    },
    [email, onAuthChange],
  );

  return (
    <div className="mx-auto max-w-sm pt-20 pb-10 text-center">
      <p className="label-caps text-[9.5px] font-medium text-accent-strong">Your studio</p>
      <h1 className="mt-3 font-serif text-[34px] tracking-[0.06em] text-ink uppercase leading-none">
        My Photos
      </h1>
      <p className="mt-3 text-[13.5px] text-muted leading-relaxed">
        Enter the email you used when booking.
        <br />
        We&apos;ll send you a link to access your studio.
      </p>

      {auth.phase === 'sent' ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface px-6 py-8">
          <p className="text-[15px] font-medium text-ink">Check your inbox</p>
          <p className="mt-2 text-[13px] text-muted">
            We sent a login link to{' '}
            <span className="text-ink">{(auth as { email: string }).email}</span>.
            <br />
            Click it to open your studio.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex flex-col gap-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmailError('');
                setEmail(e.target.value);
              }}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            {emailError && <p className="text-left text-[12px] text-red-500">{emailError}</p>}
            <button
              type="submit"
              disabled={auth.phase === 'sending'}
              className="w-full rounded-xl bg-ink px-6 py-3 font-serif text-[15px] tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {auth.phase === 'sending' ? 'Sending…' : 'Access my studio'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Studio gallery ────────────────────────────────────────────────────────────

function StudioGallery({
  bookings,
  activeBookingId,
  token,
  onBookingsChange,
}: {
  bookings: StudioBooking[];
  activeBookingId: string | null;
  token: string;
  onBookingsChange: (updated: StudioBooking[]) => void;
}) {
  const activeBooking = activeBookingId
    ? bookings.find((b) => b.id === activeBookingId) ?? null
    : null;
  const otherBookings = activeBookingId
    ? bookings.filter((b) => b.id !== activeBookingId)
    : bookings;

  if (bookings.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-[22px] tracking-[0.06em] text-ink">No shoots yet</p>
        <p className="mt-2 text-[13px] text-muted">
          Your photos will appear here after your first shoot.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 font-serif text-[14px] tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-80"
        >
          Start your first shoot
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <p className="label-caps text-[9.5px] font-medium text-accent-strong">Your studio</p>
        <h1 className="mt-2 font-serif text-[32px] tracking-[0.06em] text-ink uppercase leading-none">
          My Photos
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {bookings.length} {bookings.length === 1 ? 'shoot' : 'shoots'}
        </p>
      </div>

      {/* Active booking (just paid) shown at the top with generation progress */}
      {activeBooking && (
        <ActiveBookingCard
          booking={activeBooking}
          token={token}
          onUpdated={(updated) =>
            onBookingsChange(bookings.map((b) => (b.id === updated.id ? updated : b)))
          }
        />
      )}

      {otherBookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}

// ── Active booking card (generating photos) ───────────────────────────────────

type GeneratedShot = { sceneIndex: number; url: string };

function ActiveBookingCard({
  booking,
  token,
  onUpdated,
}: {
  booking: StudioBooking;
  token: string;
  onUpdated: (updated: StudioBooking) => void;
}) {
  const [extraShots, setExtraShots] = useState<GeneratedShot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const started = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generatedCount =
    booking.photos.filter((p) => p.type === 'generated' || p.type === 'preview').length +
    extraShots.length;

  const isDelivered =
    booking.shoot_status === 'delivered' || generatedCount >= TOTAL_SHOTS;

  // Determine which sceneIndexes still need generation (1–4, preview is 0)
  const existingScenes = new Set(
    booking.photos
      .filter((p) => p.type === 'generated' && p.scene_index !== null)
      .map((p) => p.scene_index as number),
  );
  const pendingScenes = [1, 2, 3, 4].filter(
    (i) => !existingScenes.has(i) && !extraShots.find((s) => s.sceneIndex === i),
  );

  // Start generation for pending scenes
  useEffect(() => {
    if (started.current) return;
    if (pendingScenes.length === 0) return;
    if (isDelivered) return;
    if (booking.payment_status !== 'confirmed') return;

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
  }, []);

  // Poll for updated booking data after generation completes
  useEffect(() => {
    if (!isGenerating) return;
    pollRef.current = setInterval(() => {
      fetch('/api/studio/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data: { bookings?: StudioBooking[] }) => {
          const updated = data.bookings?.find((b) => b.id === booking.id);
          if (updated) onUpdated(updated);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isGenerating, token, booking.id, onUpdated]);

  // Build the full 5-shot URL array (preview + generated)
  const previewPhoto = booking.photos.find((p) => p.type === 'preview');
  const shotUrls: (string | null)[] = Array.from({ length: TOTAL_SHOTS }, (_, i) => {
    if (i === 0) return previewPhoto?.url ?? null;
    const existing = booking.photos.find(
      (p) => p.type === 'generated' && p.scene_index === i,
    );
    if (existing?.url) return existing.url;
    return extraShots.find((s) => s.sceneIndex === i)?.url ?? null;
  });

  const readyCount = shotUrls.filter(Boolean).length;

  return (
    <article className="animate-fade-in rounded-2xl border-2 border-accent/30 bg-surface overflow-hidden shadow-[0_0_0_4px_rgba(var(--color-accent)/.06)]">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line">
        <div>
          <p className="label-caps text-[9px] font-medium text-accent-strong">Just booked</p>
          <p className="mt-0.5 font-serif text-[18px] tracking-[0.05em] text-ink">
            {booking.route_title || booking.route_id}
          </p>
          <p className="text-[12px] text-muted">
            {isDelivered
              ? `All ${TOTAL_SHOTS} photos ready`
              : `${readyCount} of ${TOTAL_SHOTS} photos ready · ${isGenerating ? 'Generating…' : 'Starting…'}`}
          </p>
        </div>
        {isDelivered && (
          <button
            type="button"
            onClick={() =>
              downloadAll(
                shotUrls
                  .map((url, i) => ({ url, scene_index: i, id: `shot-${i}`, type: 'generated', is_stored: false }))
                  .filter((p) => p.url) as (typeof booking.photos[number] & { url: string })[],
                booking.route_id,
              )
            }
            className="shrink-0 rounded-xl border border-line bg-page px-4 py-2 text-[12px] text-ink transition-colors hover:bg-surface-alt"
          >
            Download all
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!isDelivered && (
        <div className="px-5 pt-3">
          <div className="h-1 w-full rounded-full bg-surface-alt overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-1000"
              style={{ width: `${(readyCount / TOTAL_SHOTS) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-0.5 bg-line mt-3">
        {shotUrls.map((url, index) => (
          <div key={index} className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
            {url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Shot ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
                  <span className="font-serif text-[10px] text-white/80 drop-shadow">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(url, `next5-${booking.route_id}-shot${String(index + 1).padStart(2, '0')}.jpg`)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
                    aria-label={`Download shot ${index + 1}`}
                  >
                    <DownloadIcon />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                {isGenerating ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
                ) : (
                  <span className="font-serif text-[11px] text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-5 py-4">
        <p className="text-[12px] text-muted">
          Booking <span className="font-medium text-ink">#{booking.id}</span> · Your photos will also be sent to your email.
        </p>
      </div>
    </article>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: StudioBooking }) {
  const deliveredPhotos = booking.photos.filter(
    (p) => (p.type === 'generated' || p.type === 'preview') && p.url,
  );
  const statusLabel =
    {
      preview_generating: 'Generating preview…',
      preview_ready: 'Preview ready',
      creating: 'Creating your shoot…',
      delivered: 'Delivered',
      error: 'Error',
    }[booking.shoot_status] ?? booking.shoot_status;

  const isDelivered = booking.shoot_status === 'delivered';

  return (
    <article className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line">
        <div>
          <p className="label-caps text-[9px] font-medium text-muted">{booking.id}</p>
          <p className="mt-0.5 font-serif text-[18px] tracking-[0.05em] text-ink">
            {booking.route_title}
          </p>
          <p className="text-[12px] text-muted">
            {booking.director_name && `With ${booking.director_name} · `}
            {statusLabel}
          </p>
        </div>

        {isDelivered && deliveredPhotos.length > 0 && (
          <button
            type="button"
            onClick={() => downloadAll(deliveredPhotos as (typeof deliveredPhotos[number] & { url: string })[], booking.route_id)}
            className="shrink-0 rounded-xl border border-line bg-page px-4 py-2 text-[12px] text-ink transition-colors hover:bg-surface-alt"
          >
            Download all
          </button>
        )}
      </div>

      {deliveredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 md:grid-cols-5 bg-line">
          {deliveredPhotos.map((photo, index) => (
            <PhotoTile key={photo.id} photo={photo} index={index} routeId={booking.route_id} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-[13px] text-muted">
          {isDelivered ? 'No photos found.' : 'Your photos are being created…'}
        </div>
      )}
    </article>
  );
}

// ── Photo tile ────────────────────────────────────────────────────────────────

type PhotoTilePhoto = { id: string; url: string | null; type: string; scene_index: number | null };

function PhotoTile({
  photo,
  index,
  routeId,
}: {
  photo: PhotoTilePhoto;
  index: number;
  routeId: string;
}) {
  if (!photo.url) return null;

  const shotLabel =
    photo.scene_index !== null ? `0${photo.scene_index + 1}` : `0${index + 1}`;

  return (
    <div className="relative group aspect-[3/4] overflow-hidden bg-surface-alt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`Shot ${shotLabel}`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="font-serif text-[11px] text-white/90">{shotLabel}</span>
        <button
          type="button"
          onClick={() => downloadFile(photo.url!, `next5-${routeId}-shot${shotLabel}.jpg`)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
          aria-label={`Download shot ${shotLabel}`}
        >
          <DownloadIcon />
        </button>
      </div>
    </div>
  );
}

async function downloadAll(
  photos: { url: string | null; scene_index?: number | null }[],
  routeId: string,
) {
  for (const [index, photo] of photos.entries()) {
    if (!photo.url) continue;
    const label =
      photo.scene_index != null
        ? String(photo.scene_index + 1).padStart(2, '0')
        : String(index + 1).padStart(2, '0');
    downloadFile(photo.url, `next5-${routeId}-shot${label}.jpg`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

// ── Utility components ────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
