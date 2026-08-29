'use client';

import { useBookingFlow } from '../../hooks/useBookingFlow';
import { BookingModal } from '../booking/BookingModal';
import { PhotoRoutes } from '../sections/PhotoRoutes';
import { CollectionOffers } from './CollectionOffers';
import type { DiscountOffer } from '../../types/offer';

type CreateShootPanelProps = {
  email: string;
  activeOffer: DiscountOffer | null;
  missingRouteIds: readonly string[];
  onClaimOffer: (offer: DiscountOffer) => void;
  onBookingConfirmed: (bookingId: string) => void;
};

/** Picking a new studio, reusing the real booking flow end to end — no
 *  separate page, just `useBookingFlow` + `BookingModal` mounted here
 *  instead of on the homepage. The collection offers live here too, right
 *  where she's about to act on them, rather than in the sidebar. */
export const CreateShootPanel = (props: CreateShootPanelProps) => (
  <CreateShootPanelInner
    // Remounts (fresh useBookingFlow) whenever the persisted offer changes —
    // simplest way to keep this flow's pricing in sync with an offer claimed
    // elsewhere on the page, without lifting useBookingFlow's internals up.
    key={props.activeOffer ? `${props.activeOffer.percent}:${props.activeOffer.eligibleRouteIds.join(',')}` : 'none'}
    {...props}
  />
);

const CreateShootPanelInner = ({
  email,
  activeOffer,
  missingRouteIds,
  onClaimOffer,
  onBookingConfirmed,
}: CreateShootPanelProps) => {
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
    <div className="-mx-6 space-y-6 sm:-mx-10">
      <CollectionOffers missingRouteIds={missingRouteIds} activeOffer={activeOffer} onClaimOffer={onClaimOffer} />
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
