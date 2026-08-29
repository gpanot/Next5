'use client';

import { COLLECTION_PERCENT, THREE_PACK_PERCENT } from '../../hooks/useBookingFlow';
import { photoRoutes } from '../../data/routes';
import { applyDiscount, formatVnd } from '../../lib/format';
import type { DiscountOffer } from '../../types/offer';

type CollectionOffersProps = {
  /** Studios she hasn't booked yet — the pool either claimable tier draws from. */
  missingRouteIds: readonly string[];
  /** Once something's claimed there's nothing left to offer here — the
   *  studio grid's own banner and per-card pricing already carry the
   *  "active offer" message, so this renders nothing rather than repeat it. */
  activeOffer: DiscountOffer | null;
  onClaimOffer: (offer: DiscountOffer) => void;
};

/** Below this, "pick 3" and "complete the collection" would cover the same
 *  studios at two different discounts — just show the better one. */
const THREE_PACK_THRESHOLD = 3;

/** The claimable account-level offers, shown right where she's about to pick
 *  a studio — not tucked in a sidebar she may never scroll to. */
export const CollectionOffers = ({ missingRouteIds, activeOffer, onClaimOffer }: CollectionOffersProps) => {
  if (activeOffer || missingRouteIds.length === 0) return null;

  const referencePriceVnd = photoRoutes[0].priceVnd;
  const threePackPriceVnd = applyDiscount(referencePriceVnd, THREE_PACK_PERCENT);
  const collectionPriceVnd = applyDiscount(referencePriceVnd, COLLECTION_PERCENT);

  const claim = (percent: number, label: string, eligibleRouteIds: readonly string[]) =>
    onClaimOffer({ percent, label, eligibleRouteIds, multiUse: true });

  return (
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
      <div className="grid gap-3 sm:grid-cols-2">
        {missingRouteIds.length > THREE_PACK_THRESHOLD && (
          <button
            type="button"
            onClick={() =>
              claim(THREE_PACK_PERCENT, 'Studio 3-pack', missingRouteIds.slice(0, THREE_PACK_THRESHOLD))
            }
            className="rounded-xl border border-line bg-page px-4 py-3.5 text-left transition-colors duration-200 hover:bg-surface-alt"
          >
            <span className="label-caps block text-[9px] font-medium text-muted">Pick 3, save more</span>
            <span className="mt-1 block text-[13px] font-medium text-ink">
              3 studios for -{THREE_PACK_PERCENT}%
            </span>
            <span className="mt-1 block text-[11.5px] text-muted">{formatVnd(threePackPriceVnd)} VND each</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => claim(COLLECTION_PERCENT, 'Saigon Collection', missingRouteIds)}
          className="rounded-xl bg-ink-block px-4 py-3.5 text-left transition-colors duration-200 hover:bg-ink-block/85"
        >
          <span className="label-caps block text-[9px] font-medium text-on-dark-muted">
            Best value · today only
          </span>
          <span className="mt-1 block text-[13px] font-medium text-on-dark">
            Complete your collection — {missingRouteIds.length} studio{missingRouteIds.length === 1 ? '' : 's'} left
          </span>
          <span className="mt-1 block text-[11.5px] text-on-dark-muted">
            {formatVnd(collectionPriceVnd)} VND each · -{COLLECTION_PERCENT}%
          </span>
        </button>
      </div>
    </div>
  );
};
