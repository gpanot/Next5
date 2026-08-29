'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StudioBooking, StudioMeResponse } from '../api/studio/me/route';
import type { SceneResponseBody } from '../api/generate/scene/route';
import { downloadFile } from '../../src/lib/download';
import { photoRoutes } from '../../src/data/routes';
import type { RouteId } from '../../src/data/photos';
import { getCreativeDirector } from '../../src/data/photographers';
import { useBookingFlow } from '../../src/hooks/useBookingFlow';
import { BookingModal } from '../../src/components/booking/BookingModal';
import { PhotoRoutes } from '../../src/components/sections/PhotoRoutes';
import { StudioReveal } from '../../src/components/booking/confirmed/StudioReveal';
import type { CreativeDirector } from '../../src/types/booking';
import type { DiscountOffer } from '../../src/types/offer';

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
  | { phase: 'loaded'; bookings: StudioBooking[]; activeOffer: DiscountOffer | null }
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

  const loadBookings = useCallback((token: string) => {
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
      .then((data: StudioMeResponse) =>
        setStudio({ phase: 'loaded', bookings: data.bookings ?? [], activeOffer: data.activeOffer ?? null }),
      )
      .catch((err) =>
        setStudio({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Failed to load studio',
        }),
      );
  }, []);

  // Fetch bookings once authenticated
  useEffect(() => {
    if (auth.phase !== 'authenticated') return;
    setStudio({ phase: 'loading' });
    loadBookings(auth.token);
  }, [auth, loadBookings]);

  const claimOffer = useCallback(
    (offer: DiscountOffer) => {
      if (auth.phase !== 'authenticated' || studio.phase !== 'loaded') return;
      setStudio({ ...studio, activeOffer: offer });
      fetch('/api/studio/offer/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(offer),
      }).catch((err) => console.error('[studio] Failed to persist claimed offer:', err));
    },
    [auth, studio],
  );

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
          activeOffer={studio.activeOffer}
          activeBookingId={activeBookingId}
          token={auth.token}
          email={auth.email}
          onClaimOffer={claimOffer}
          onBookingsChange={(updated) =>
            setStudio({ ...studio, bookings: updated })
          }
          onRefresh={() => loadBookings(auth.token)}
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
          <Link href="/" className="font-serif text-[22px] tracking-[0.12em] text-ink uppercase">
            Next5
          </Link>
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
            {emailError && <p className="text-left text-[12px] text-accent-strong">{emailError}</p>}
            <button
              type="submit"
              disabled={auth.phase === 'sending'}
              className="w-full rounded-xl bg-ink-block px-6 py-3 font-serif text-[15px] tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
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
  activeOffer,
  activeBookingId,
  token,
  email,
  onClaimOffer,
  onBookingsChange,
  onRefresh,
}: {
  bookings: StudioBooking[];
  activeOffer: DiscountOffer | null;
  activeBookingId: string | null;
  token: string;
  email: string;
  onClaimOffer: (offer: DiscountOffer) => void;
  onBookingsChange: (updated: StudioBooking[]) => void;
  onRefresh: () => void;
}) {
  // Abandoned/unpaid previews still create a DB row (so the account exists
  // even if she never finishes) — those aren't "her studio" content yet.
  const paidBookings = useMemo(() => bookings.filter((b) => b.payment_status === 'confirmed'), [bookings]);

  const activeBooking = activeBookingId
    ? paidBookings.find((b) => b.id === activeBookingId) ?? null
    : (paidBookings[0] ?? null); // default to the most recent so the offers are visible on any visit, not just right after paying
  const otherBookings = paidBookings.filter((b) => b.id !== activeBooking?.id);

  return (
    <div className="space-y-12">
      <div>
        <p className="label-caps text-[9.5px] font-medium text-accent-strong">Your studio</p>
        <h1 className="mt-2 font-serif text-[32px] tracking-[0.06em] text-ink uppercase leading-none">
          My Photos
        </h1>
        {paidBookings.length > 0 && (
          <p className="mt-1 text-[13px] text-muted">
            {paidBookings.length} {paidBookings.length === 1 ? 'shoot' : 'shoots'}
          </p>
        )}
      </div>

      {paidBookings.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-serif text-[22px] tracking-[0.06em] text-ink">No shoots yet</p>
          <p className="mt-2 text-[13px] text-muted">Pick a studio below to start your first shoot.</p>
        </div>
      ) : (
        <>
          {activeBooking && (
            <BookingReveal
              booking={activeBooking}
              token={token}
              activeOffer={activeOffer}
              onClaimOffer={onClaimOffer}
              onUpdated={(updated) =>
                onBookingsChange(bookings.map((b) => (b.id === updated.id ? updated : b)))
              }
            />
          )}

          {otherBookings.map((booking) => (
            <BookingReveal
              key={booking.id}
              booking={booking}
              token={token}
              activeOffer={null}
              onClaimOffer={onClaimOffer}
              onUpdated={(updated) =>
                onBookingsChange(bookings.map((b) => (b.id === updated.id ? updated : b)))
              }
              compact
            />
          ))}
        </>
      )}

      <div className="border-t border-line pt-10">
        <p className="label-caps text-[9.5px] font-medium text-accent-strong">
          {paidBookings.length === 0 ? 'Get started' : 'Want another look?'}
        </p>
        <h2 className="mt-2 font-serif text-[26px] tracking-[0.05em] text-ink uppercase leading-none">
          Book another studio
        </h2>
        <div className="mt-6 -mx-6 sm:-mx-10">
          <BookAnotherStudio email={email} token={token} activeOffer={activeOffer} onBookingConfirmed={onRefresh} />
        </div>
      </div>
    </div>
  );
}

// ── One booking's reveal (delivered, or still generating) ─────────────────────

function BookingReveal({
  booking,
  token,
  activeOffer,
  onClaimOffer,
  onUpdated,
  compact = false,
}: {
  booking: StudioBooking;
  token: string;
  /** Only the highlighted/active booking pitches an offer — showing it again
   *  on every past booking would just be noise. */
  activeOffer: DiscountOffer | null;
  onClaimOffer: (offer: DiscountOffer) => void;
  onUpdated: (updated: StudioBooking) => void;
  compact?: boolean;
}) {
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
  }, []);

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

  let route, director: CreativeDirector | null;
  try {
    route = photoRoutes.find((r) => r.id === booking.route_id) ?? null;
    director = route && booking.director_id ? getCreativeDirector(booking.director_id, route.id as RouteId) : null;
  } catch {
    route = null;
    director = null;
  }

  if (compact) {
    return (
      <CompactBookingCard booking={booking} shotUrls={shotUrls} routeTitle={route?.title ?? booking.route_title} />
    );
  }

  if (!route || !director) {
    // Data doesn't resolve to a known studio/director — fall back to the
    // simple read-only card rather than crashing StudioReveal.
    return (
      <CompactBookingCard booking={booking} shotUrls={shotUrls} routeTitle={route?.title ?? booking.route_title} />
    );
  }

  return (
    <div>
      <p className="label-caps text-[9px] font-medium text-accent-strong">
        {isGenerating ? 'Creating your shoot…' : 'Ready'}
      </p>
      <StudioReveal
        route={route}
        bookingId={booking.id}
        shotUrls={shotUrls}
        director={director}
        activeOffer={activeOffer}
        onClaimOffer={onClaimOffer}
        onDone={() => {}}
      />
    </div>
  );
}

/** Plain read-only gallery — used for past bookings, and as a fallback when a
 *  booking's route/director can't be resolved to known data. */
function CompactBookingCard({
  booking,
  shotUrls,
  routeTitle,
}: {
  booking: StudioBooking;
  shotUrls: (string | null)[];
  routeTitle: string;
}) {
  const ready = shotUrls.filter(Boolean) as string[];

  return (
    <article className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line">
        <div>
          <p className="label-caps text-[9px] font-medium text-muted">{booking.id}</p>
          <p className="mt-0.5 font-serif text-[18px] tracking-[0.05em] text-ink">{routeTitle}</p>
          <p className="text-[12px] text-muted">
            {booking.director_name && `With ${booking.director_name} · `}
            {booking.shoot_status === 'delivered' ? 'Delivered' : 'Creating your shoot…'}
          </p>
        </div>
        {ready.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              for (const [i, url] of ready.entries()) {
                downloadFile(url, `next5-${booking.route_id}-shot${String(i + 1).padStart(2, '0')}.jpg`);
                await new Promise((r) => setTimeout(r, 250));
              }
            }}
            className="shrink-0 rounded-xl border border-line bg-page px-4 py-2 text-[12px] text-ink transition-colors hover:bg-surface-alt"
          >
            Download all
          </button>
        )}
      </div>

      {ready.length > 0 ? (
        <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 md:grid-cols-5 bg-line">
          {ready.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Shot ${index + 1}`}
              className="aspect-[3/4] w-full object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-[13px] text-muted">Your photos are being created…</div>
      )}
    </article>
  );
}

// ── Book another studio ───────────────────────────────────────────────────────

function BookAnotherStudio({
  email,
  token,
  activeOffer,
  onBookingConfirmed,
}: {
  email: string;
  token: string;
  activeOffer: DiscountOffer | null;
  onBookingConfirmed: () => void;
}) {
  return (
    <BookAnotherStudioInner
      // Remounts (with a fresh useBookingFlow) whenever the persisted offer
      // changes — simplest way to keep the flow's own pricing state in sync
      // with an offer claimed elsewhere on the page, without lifting all of
      // useBookingFlow's internals up here.
      key={activeOffer ? `${activeOffer.percent}:${activeOffer.eligibleRouteIds.join(',')}` : 'none'}
      email={email}
      token={token}
      activeOffer={activeOffer}
      onBookingConfirmed={onBookingConfirmed}
    />
  );
}

function BookAnotherStudioInner({
  email,
  token,
  activeOffer,
  onBookingConfirmed,
}: {
  email: string;
  token: string;
  activeOffer: DiscountOffer | null;
  onBookingConfirmed: () => void;
}) {
  const flow = useBookingFlow({
    initialHasBookedBefore: true,
    initialActiveOffer: activeOffer,
    initialEmail: email,
    onBookingConfirmed: () => {
      flow.close();
      onBookingConfirmed();
    },
  });

  return (
    <>
      <PhotoRoutes
        onSelectRoute={flow.open}
        discountPercentFor={flow.discountPercentFor}
        activeOffer={flow.activeOffer}
        hasBookedBefore
      />
      {flow.isOpen && <BookingModal flow={flow} />}
    </>
  );
}

// ── Utility components ────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}
