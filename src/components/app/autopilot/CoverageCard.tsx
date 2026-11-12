'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AppButton } from '../../ui/AppButton';

export type CoverageDto = { planned: number; days: number; emptyThisWeek: number };

/** "22 of the next 30 days planned" + the one-tap "Fill empty days" (Autopilot §3.1, Phase E). */
export const CoverageCard = ({ coverage, fillHref }: { coverage: CoverageDto; fillHref: string }) => {
  const pct = Math.round((coverage.planned / coverage.days) * 100);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[16px] font-semibold text-app-ink">
          <span className="tabular-nums">{coverage.planned}</span> of the next {coverage.days} days planned
        </span>
        <span className="text-[13px] font-medium tabular-nums text-app-muted">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-app-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Days planned">
        <div className="h-full rounded-full bg-app-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {coverage.emptyThisWeek > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-app-muted">
            {coverage.emptyThisWeek} empty day{coverage.emptyThisWeek === 1 ? '' : 's'} this week.
          </span>
          <Link href={fillHref} className="sm:shrink-0">
            <AppButton variant="secondary" fullWidth iconLeft={<Sparkles aria-hidden className="h-4 w-4" />}>Fill empty days</AppButton>
          </Link>
        </div>
      ) : (
        <span className="text-[13px] text-app-muted">Every day this week has a post.</span>
      )}
    </section>
  );
};
