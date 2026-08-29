'use client';

import { useMemo, useState } from 'react';
import type { StudioBooking } from '../../../app/api/studio/me/route';
import { photoRoutes } from '../../data/routes';
import type { DiscountOffer } from '../../types/offer';
import { ShootSidebar } from './ShootSidebar';
import { ShootDetail } from './ShootDetail';
import { CreateShootPanel } from './CreateShootPanel';

type MainView = { kind: 'shoot'; bookingId: string } | { kind: 'create' };

type StudioWorkspaceProps = {
  bookings: StudioBooking[];
  activeOffer: DiscountOffer | null;
  /** From ?bookingId= — she just paid for this one, so open straight to it. */
  initialBookingId: string | null;
  token: string;
  email: string;
  onBookingsChange: (updated: StudioBooking[]) => void;
  onRefresh: () => Promise<void> | void;
  onClaimOffer: (offer: DiscountOffer) => void;
};

/** Each purchase is a dated shoot with a photographer, not just "more
 *  photos in a pile" — this is the sidebar-of-sessions + detail view that
 *  reflects that. Collapses to a list-then-detail pair on mobile, same
 *  pattern as any native mail/notes app. */
export const StudioWorkspace = ({
  bookings,
  activeOffer,
  initialBookingId,
  token,
  email,
  onBookingsChange,
  onRefresh,
  onClaimOffer,
}: StudioWorkspaceProps) => {
  // Abandoned/unpaid previews still create a DB row so the account exists
  // even if she never finishes — those aren't a "shoot" yet.
  const shoots = useMemo(() => bookings.filter((b) => b.payment_status === 'confirmed'), [bookings]);
  const missingRouteIds = useMemo(
    () => photoRoutes.filter((route) => !shoots.some((s) => s.route_id === route.id)).map((route) => route.id),
    [shoots],
  );

  const [rawView, setView] = useState<MainView>(() => {
    if (initialBookingId) return { kind: 'shoot', bookingId: initialBookingId };
    return shoots[0] ? { kind: 'shoot', bookingId: shoots[0].id } : { kind: 'create' };
  });
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>(
    initialBookingId || shoots.length === 0 ? 'detail' : 'list',
  );

  // If the shoot she was viewing disappears from `bookings` (shouldn't
  // normally happen), fall back to the most recent one rather than showing a
  // dead view — computed fresh each render instead of reconciled in an
  // effect, since it's a pure function of (rawView, shoots).
  const view: MainView =
    rawView.kind === 'shoot' && !shoots.find((s) => s.id === rawView.bookingId)
      ? (shoots[0] ? { kind: 'shoot', bookingId: shoots[0].id } : { kind: 'create' })
      : rawView;

  const selectShoot = (id: string) => {
    setView({ kind: 'shoot', bookingId: id });
    setMobilePane('detail');
  };

  const startCreating = () => {
    setView({ kind: 'create' });
    setMobilePane('detail');
  };

  const handleBookingConfirmed = (bookingId: string) => {
    Promise.resolve(onRefresh()).then(() => selectShoot(bookingId));
  };

  const selectedShoot = view.kind === 'shoot' ? shoots.find((s) => s.id === view.bookingId) ?? null : null;

  return (
    <div className="lg:flex lg:items-start lg:gap-10">
      <div className={`${mobilePane === 'list' ? 'block' : 'hidden'} lg:block lg:w-[300px] lg:shrink-0`}>
        <ShootSidebar
          shoots={shoots}
          selectedId={view.kind === 'shoot' ? view.bookingId : null}
          isCreating={view.kind === 'create'}
          onSelect={selectShoot}
          onCreateNew={startCreating}
        />
      </div>

      <div className={`${mobilePane === 'detail' ? 'block' : 'hidden'} min-w-0 flex-1 lg:block`}>
        {shoots.length > 0 && (
          <button
            type="button"
            onClick={() => setMobilePane('list')}
            className="mb-4 flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink lg:hidden"
          >
            ← Your shoots
          </button>
        )}

        {view.kind === 'create' ? (
          <CreateShootPanel
            email={email}
            activeOffer={activeOffer}
            missingRouteIds={missingRouteIds}
            onClaimOffer={onClaimOffer}
            onBookingConfirmed={handleBookingConfirmed}
          />
        ) : selectedShoot ? (
          <ShootDetail
            key={selectedShoot.id}
            booking={selectedShoot}
            token={token}
            onUpdated={(updated) => onBookingsChange(bookings.map((b) => (b.id === updated.id ? updated : b)))}
          />
        ) : null}
      </div>
    </div>
  );
};
