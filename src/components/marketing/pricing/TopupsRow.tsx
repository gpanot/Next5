import { getPricePerVideoUsdCents, topupList } from '../../../config/plans';
import { formatUsd } from '../../../lib/money';

export const TopupsRow = () => (
  <div className="flex flex-col gap-4">
    <div>
      <h3 className="text-[18px] font-semibold text-app-ink">Need more videos? Top up anytime.</h3>
      <p className="mt-1 text-[14px] text-app-muted">Top-up videos last 12 months and work with any plan.</p>
    </div>
    <ul className="grid gap-3 sm:grid-cols-3">
      {topupList().map((topup) => (
        <li key={topup.id} className="flex items-baseline justify-between rounded-xl border border-app-line bg-app-panel p-4">
          <span className="text-[15px] font-medium text-app-ink">{topup.credits} videos</span>
          <span className="text-right">
            <span className="block text-[18px] font-semibold tabular-nums text-app-ink">{formatUsd(topup.usdCents)}</span>
            <span className="block text-[12px] tabular-nums text-app-muted">{formatUsd(Math.round(topup.usdCents / topup.credits))} per video</span>
          </span>
        </li>
      ))}
    </ul>
    <p className="text-[12px] text-app-muted">For comparison, Brand Starter works out to {formatUsd(getPricePerVideoUsdCents('brand_starter'))} per video.</p>
  </div>
);
