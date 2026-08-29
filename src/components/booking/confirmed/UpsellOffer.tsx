'use client';

import { REPEAT_DISCOUNT_PERCENT } from '../../../hooks/useBookingFlow';
import type { PhotoRoute } from '../../../data/routes';
import { photoRoutes } from '../../../data/routes';
import { applyDiscount, formatVnd } from '../../../lib/format';
import type { DiscountOffer } from '../../../types/offer';

type UpsellOfferProps = {
  route: PhotoRoute;
  onClaim: (offer: DiscountOffer) => void;
  onDone: () => void;
};

export const BUNDLE_PERCENT = 30;

const scrollToRoutes = () => {
  requestAnimationFrame(() => {
    document.getElementById('routes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

/** Shown once the studio reveal is complete — the highest-satisfaction moment
 *  in the whole flow. Two offers, side by side: the repeat price (already
 *  automatic — this button just takes her to go pick one) and the bundle
 *  (the one that actually needs claiming). */
export const UpsellOffer = ({ route, onClaim, onDone }: UpsellOfferProps) => {
  const otherRoutes = photoRoutes.filter((r) => r.id !== route.id);
  const repeatPriceVnd = applyDiscount(route.priceVnd, REPEAT_DISCOUNT_PERCENT);
  const bundlePriceVnd = applyDiscount(route.priceVnd, BUNDLE_PERCENT);
  // The full-collection headline (e.g. "5 studios for 1,046,500") is 30% off
  // the list price of all 5 — a value statement, not a single line item. What
  // she's actually charged from here is the 4 remaining studios below it,
  // one at a time, since studio #1 is already paid for.
  const collectionValueVnd = Math.round(
    route.priceVnd * (otherRoutes.length + 1) * (1 - BUNDLE_PERCENT / 100),
  );

  const exploreNextStudio = () => {
    onDone();
    scrollToRoutes();
  };

  const claimBundle = () => {
    onClaim({
      percent: BUNDLE_PERCENT,
      eligibleRouteIds: otherRoutes.map((r) => r.id),
      multiUse: true,
      label: 'Saigon Collection',
    });
    onDone();
    scrollToRoutes();
  };

  return (
    <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/[0.06] px-5 py-5 sm:px-6 sm:py-6">
      <p className="label-caps text-[9px] font-medium text-accent-strong">While you&apos;re here</p>
      <h3 className="mt-1.5 font-serif text-[19px] text-ink">Loved your studio?</h3>

      <button
        type="button"
        onClick={exploreNextStudio}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-page px-4 py-3 text-left transition-colors duration-300 hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="text-[13px] text-ink">
          Loved your first shoot? Next studio:{' '}
          <span className="font-medium">{formatVnd(repeatPriceVnd)} VND</span>
        </span>
        <span className="shrink-0 rounded-full bg-surface-alt px-3 py-1.5 text-[12px] font-medium text-ink">
          -{REPEAT_DISCOUNT_PERCENT}%
        </span>
      </button>

      <button
        type="button"
        onClick={claimBundle}
        className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-xl bg-ink-block px-4 py-3.5 text-left transition-colors duration-300 hover:bg-ink-block/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="min-w-0">
          <span className="label-caps block text-[9px] font-medium text-on-dark-muted">
            Best value · today only
          </span>
          <span className="mt-0.5 block text-[13.5px] font-medium text-on-dark">
            Complete your Saigon Collection: all {otherRoutes.length + 1} studios for{' '}
            {formatVnd(collectionValueVnd)} VND
          </span>
          <span className="mt-1 block text-[11px] text-on-dark-muted">
            {otherRoutes.length} remaining studios · {formatVnd(bundlePriceVnd)} VND each ·{' '}
            {formatVnd(bundlePriceVnd * otherRoutes.length)} VND total from here
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-white">
          -{BUNDLE_PERCENT}%
        </span>
      </button>
    </div>
  );
};

type OfferReminderProps = {
  offer: DiscountOffer;
  onDone: () => void;
};

/** Once the bundle is already active, don't pitch it again — just remind her
 *  it's still open and let her jump back to the grid. */
export const OfferReminder = ({ offer, onDone }: OfferReminderProps) => {
  const explore = () => {
    onDone();
    scrollToRoutes();
  };

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3.5">
      <p className="text-[12.5px] text-ink">
        Your <span className="font-medium">{offer.label}</span> discount (
        <span className="font-medium text-accent-strong">-{offer.percent}%</span>) is still open
        for {offer.eligibleRouteIds.length} more studio{offer.eligibleRouteIds.length === 1 ? '' : 's'}.
      </p>
      <button
        type="button"
        onClick={explore}
        className="shrink-0 text-[11.5px] font-medium text-accent-strong underline underline-offset-4"
      >
        Explore
      </button>
    </div>
  );
};
