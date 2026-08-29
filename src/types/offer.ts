/**
 * A discount claimed from the studio-reveal upsell. Lives for the rest of the
 * browser session — claiming doesn't charge anything by itself, it just makes
 * `eligibleRouteIds` cheaper the next time one of them is booked.
 */
export type DiscountOffer = {
  percent: number;
  eligibleRouteIds: readonly string[];
  /** Bundle offers: the offer survives until every route in the list has been
   *  redeemed. Single-route offers: redeeming any one route clears it. */
  multiUse: boolean;
  label: string;
};
