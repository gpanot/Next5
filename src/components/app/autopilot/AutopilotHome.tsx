'use client';

/** Autopilot (realtors): coverage of the next 30 days, homes ready to plan, and plans already made. */
import { ArrowRight, CalendarCheck2, LineChart, Link2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useApi } from '../../../hooks/useApi';
import { PLAYBOOKS, isPlaybookId } from '../../../lib/realtorPlaybooks';
import type { CampaignDto } from '../../../types/business/campaigns';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard, SkeletonText } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CoverageCard, type CoverageDto } from './CoverageCard';
import { SuggestedHomes, suggestionsOf } from './SuggestedHomes';

const shortDate = (d: string) => new Date(`${d}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const Hero = ({ to }: { to: string }) => (
  <section className="flex flex-col gap-4 rounded-2xl border border-app-line bg-app-panel p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
        <Link2 aria-hidden className="h-5 w-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-[16px] font-semibold text-app-ink">1 Zillow link → 7 days of posts</span>
        <span className="text-[13px] text-app-muted">2 voiced videos + 5 slideshows, on your free days.</span>
      </div>
    </div>
    <Link href={to} className="sm:shrink-0">
      <AppButton size="lg" fullWidth iconLeft={<Sparkles aria-hidden className="h-4 w-4" />}>Plan launch week</AppButton>
    </Link>
  </section>
);

const MarketCard = ({ to }: { to: string }) => (
  <Link href={to} className="flex items-center gap-3 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm transition-colors duration-200 hover:border-app-ink/40">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-sunken text-app-ink">
      <LineChart aria-hidden className="h-5 w-5" />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-[15px] font-semibold text-app-ink">Weekly market update</span>
      <span className="text-[13px] text-app-muted">3 cities + your state, one post every 2 days. Every stat sourced.</span>
    </span>
    <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-app-accent" />
  </Link>
);

const PlanRow = ({ c, to, homeLabel }: { c: CampaignDto; to: string; homeLabel: string | null }) => {
  const name = c.playbook && isPlaybookId(c.playbook) ? PLAYBOOKS[c.playbook].name : 'Campaign';
  const booked = c.status === 'scheduled';
  return (
    <li>
      <Link href={to} className="flex items-center justify-between gap-3 rounded-xl border border-app-line bg-app-panel p-4 transition-colors duration-200 hover:border-app-ink/40">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-medium text-app-ink">{name}{homeLabel ? ` · ${homeLabel}` : ''}</span>
          <span className="text-[12px] text-app-muted">{c.postCount} posts · from {shortDate(c.startDate)}</span>
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${booked ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
          {booked && <CalendarCheck2 aria-hidden className="h-3 w-3" />} {booked ? 'On calendar' : 'To approve'}
        </span>
      </Link>
    </li>
  );
};

export function AutopilotHome() {
  const { href } = useWorkspace();
  const campaigns = useApi<{ campaigns: CampaignDto[] }>('/api/app/campaigns?product=brand');
  const listings = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const coverage = useApi<CoverageDto>('/api/app/autopilot/coverage');

  if (campaigns.error) return <ErrorState message={campaigns.error} onRetry={campaigns.refresh} />;
  if (!campaigns.data || !listings.data) return <SkeletonText lines={6} />;

  const plans = campaigns.data.campaigns;
  const suggestions = suggestionsOf(listings.data.listings, plans);
  const labelOf = (id: string | null) => listings.data?.listings.find((l) => l.id === id)?.address ?? null;
  const wizard = href('/automation');

  return (
    <div className="flex flex-col gap-6">
      {coverage.data ? <CoverageCard coverage={coverage.data} fillHref={`${wizard}?moment=evergreen`} /> : !coverage.error && <SkeletonCard />}
      <Hero to={wizard} />
      {suggestions.length > 0 && <SuggestedHomes items={suggestions} hrefOf={(s) => `${wizard}?moment=${s.playbook}&listing=${s.home.id}`} />}
      <MarketCard to={`${wizard}?moment=market_update`} />
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-app-muted">Your plans</h2>
        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-app-line p-6 text-center text-[13px] text-app-muted">No plans yet. Paste a Zillow link above to fill your next week.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plans.map((c) => <PlanRow key={c.id} c={c} to={`${wizard}?id=${c.id}`} homeLabel={labelOf(c.listingId)} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
