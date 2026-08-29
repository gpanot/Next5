'use client';

import { useBookingFlow } from '../../hooks/useBookingFlow';
import { BookingModal } from '../booking/BookingModal';
import { PhotoRoutes } from '../sections/PhotoRoutes';
import type { DiscountOffer } from '../../types/offer';

type CreateShootPanelProps = {
  email: string;
  activeOffer: DiscountOffer | null;
  onBookingConfirmed: (bookingId: string) => void;
};

/** Picking a new studio, reusing the real booking flow end to end — no
 *  separate page, just `useBookingFlow` + `BookingModal` mounted here
 *  instead of on the homepage. */
export const CreateShootPanel = ({ email, activeOffer, onBookingConfirmed }: CreateShootPanelProps) => (
  <CreateShootPanelInner
    // Remounts (fresh useBookingFlow) whenever the persisted offer changes —
    // simplest way to keep this flow's pricing in sync with an offer claimed
    // elsewhere on the page, without lifting useBookingFlow's internals up.
    key={activeOffer ? `${activeOffer.percent}:${activeOffer.eligibleRouteIds.join(',')}` : 'none'}
    email={email}
    activeOffer={activeOffer}
    onBookingConfirmed={onBookingConfirmed}
  />
);

const CreateShootPanelInner = ({ email, activeOffer, onBookingConfirmed }: CreateShootPanelProps) => {
  const flow = useBookingFlow({
    initialHasBookedBefore: true,
    initialActiveOffer: activeOffer,
    initialEmail: email,
    onBookingConfirmed: (bookingId) => {
      flow.close();
      onBookingConfirmed(bookingId);
    },
  });

  return (
    <div className="-mx-6 sm:-mx-10">
      <PhotoRoutes
        onSelectRoute={flow.open}
        discountPercentFor={flow.discountPercentFor}
        activeOffer={flow.activeOffer}
        hasBookedBefore
      />
      {flow.isOpen && <BookingModal flow={flow} />}
    </div>
  );
};
