'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { StudioBooking, StudioMeResponse } from '../api/studio/me/route';
import { StudioWorkspace } from '../../src/components/studio/StudioWorkspace';
import type { DiscountOffer } from '../../src/types/offer';

const STORAGE_KEY = 'studio_token';

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
  // bookingId from ?bookingId= URL param — she just paid for this one
  const [initialBookingId, setInitialBookingId] = useState<string | null>(null);
  // Track mobile pane so the header is hidden only on detail view (not the list)
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list');

  // On mount: consume magic ?token=, check localStorage, or read ?bookingId=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get('token');
    const bookingIdParam = params.get('bookingId');

    if (bookingIdParam) {
      setInitialBookingId(bookingIdParam);
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
    return fetch('/api/studio/me', {
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
        <div className="px-6">
          <LoginPanel auth={auth} onAuthChange={setAuth} />
        </div>
      </PageShell>
    );
  }

  if (auth.phase === 'error') {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm px-6 text-center py-20">
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
      hideHeaderOnMobile={mobilePane === 'detail'}
      onLogout={() => {
        localStorage.removeItem(STORAGE_KEY);
        setAuth({ phase: 'unauthenticated' });
      }}
    >
      {studio.phase === 'loading' && <LoadingSpinner />}
      {studio.phase === 'error' && (
        <p className="px-6 py-20 text-center text-[14px] text-muted">{studio.message}</p>
      )}
      {studio.phase === 'loaded' && (
        <>
          <div className="mx-auto mb-8 max-w-6xl px-6 sm:px-10 hidden sm:block">
            <p className="label-caps text-[9.5px] font-medium text-accent-strong">Your studio</p>
            <h1 className="mt-2 font-serif text-[32px] tracking-[0.06em] text-ink uppercase leading-none">
              My Photos
            </h1>
          </div>
          <StudioWorkspace
            bookings={studio.bookings}
            activeOffer={studio.activeOffer}
            initialBookingId={initialBookingId}
            token={auth.token}
            email={auth.email}
            onBookingsChange={(updated) => setStudio({ ...studio, bookings: updated })}
            onRefresh={() => loadBookings(auth.token)}
            onClaimOffer={claimOffer}
            onMobilePaneChange={setMobilePane}
          />
        </>
      )}
    </PageShell>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

function PageShell({
  children,
  email,
  onLogout,
  hideHeaderOnMobile = false,
}: {
  children: React.ReactNode;
  email?: string;
  onLogout?: () => void;
  hideHeaderOnMobile?: boolean;
}) {
  return (
    <div className="min-h-screen bg-page">
      <header className={`${hideHeaderOnMobile ? 'hidden' : ''} border-b border-line px-6 py-4 sm:block sm:px-10`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="font-serif text-[22px] tracking-[0.12em] text-ink uppercase">
            Studio
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

      {/* No horizontal cap here — the "create another shooting" view wants
          the full width the studio grid gets on the homepage. Views that do
          want the narrower reading width apply their own max-w-6xl. */}
      <main className="py-5 sm:py-10">{children}</main>
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

// ── Utility components ────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}
