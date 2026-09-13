import { PLANS, getPricePerPhotoUsdCents } from '../../../config/plans';
import { SHOP } from '../../../content/business/marketing';
import { formatUsd } from '../../../lib/money';
import { MarketingImage } from '../shared/MarketingImage';

const PRODUCTS = 10;
const SHOTS = 3;

export const CostPerProduct = () => {
  const perPhoto = getPricePerPhotoUsdCents('shop_starter');
  const drop = perPhoto * PRODUCTS * SHOTS;
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
        <MarketingImage src={SHOP.costImage} sizes="(min-width: 1024px) 45vw, 100vw" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-app-line bg-app-panel p-6">
          <p className="label-caps text-[10px] font-medium text-app-muted">A new drop of {PRODUCTS} products</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[13px] text-app-muted">Booking a model</dt>
              <dd className="mt-1 text-[16px] font-medium text-app-ink">A half-day shoot, per set</dd>
            </div>
            <div>
              <dt className="text-[13px] text-app-muted">With Next5 Starter</dt>
              <dd className="mt-1 text-[28px] font-semibold tabular-nums text-app-accent">≈ {formatUsd(drop)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[13px] text-app-muted">
            {PRODUCTS} products × {SHOTS} shots at {formatUsd(perPhoto)} per photo on the {formatUsd(PLANS.shop_starter.monthlyUsdCents)}/month plan.
          </p>
        </div>
        <p className="text-[16px] leading-relaxed text-app-muted">
          No studio booking, no model fee, no evening spent shooting mirror photos. Photos arrive the same day your stock does.
        </p>
      </div>
    </div>
  );
};
