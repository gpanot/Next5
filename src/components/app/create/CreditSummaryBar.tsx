'use client';

import { AppLink as Link } from '../shell/AppLink';
import type { BatchEstimateDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';

type CreditSummaryBarProps = {
  breakdown: string;
  estimate: BatchEstimateDto | null;
  error: string | null;
  loading: boolean;
  submitting: boolean;
  disabled: boolean;
  onSubmit: () => void;
};

/** Sticky bottom bar: explicit multiplication, balance after, and the Generate button. */
export const CreditSummaryBar = ({ breakdown, estimate, error, loading, submitting, disabled, onSubmit }: CreditSummaryBarProps) => {
  const short = estimate && !estimate.canAfford;
  return (
    <div className="sticky bottom-20 z-10 lg:bottom-4">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md ${short ? 'border-app-warning/50 bg-app-panel/95' : 'border-app-line bg-app-panel/95'}`}>
        <div className="min-w-0 text-[14px]" aria-live="polite">
          {error ? <p className="text-app-danger">{error}</p> : (
            <>
              <p className="font-medium text-app-ink">{breakdown}{estimate ? ` = ${estimate.credits} photos` : ''}</p>
              <p className="text-[13px] text-app-muted">
                {loading ? 'Checking your balance…' : estimate ? (short ? `You have ${estimate.balance} — ${estimate.credits - estimate.balance} short.` : `You have ${estimate.balance} → ${estimate.balance - estimate.credits} after.`) : 'Choose your options.'}
              </p>
            </>
          )}
        </div>
        {short ? (
          <div className="flex gap-2">
            <Link href="/app/billing" className="inline-flex h-10 items-center rounded-xl border border-app-line px-4 text-[14px] font-medium text-app-ink hover:bg-app-sunken">Top up</Link>
            <Link href="/app/billing" className="inline-flex h-10 items-center rounded-xl bg-app-accent px-4 text-[14px] font-medium text-app-accent-ink hover:opacity-90">Upgrade</Link>
          </div>
        ) : (
          <AppButton size="lg" loading={submitting} disabled={disabled || loading || Boolean(error) || !estimate} onClick={onSubmit}>
            {estimate ? `Generate ${estimate.credits} photos` : 'Generate'}
          </AppButton>
        )}
      </div>
    </div>
  );
};
