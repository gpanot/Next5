'use client';

import { ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { PLAYBOOKS, playbookForStatus, type PlaybookId } from '../../../lib/realtorPlaybooks';
import type { CampaignDto } from '../../../types/business/campaigns';
import type { ListingDto } from '../../../types/business/listings';
import { isPlaybookReady } from './HomePicker';

export type Suggestion = { home: ListingDto; playbook: PlaybookId };

const ACTION: Partial<Record<PlaybookId, string>> = { just_listed: 'Plan launch week', open_house: 'Plan open house', just_sold: 'Plan sold posts' };

/**
 * A home whose Zillow status calls for a playbook she has not planned yet (§3.1: suggest only, never auto-start).
 * Homes with no status match fall back to Just listed when nothing at all is planned for them.
 */
export const suggestionsOf = (homes: ListingDto[], plans: CampaignDto[]): Suggestion[] =>
  homes.filter(isPlaybookReady).flatMap((home) => {
    const mine = plans.filter((c) => c.listingId === home.id);
    const fromStatus = playbookForStatus(home.status);
    const playbook = fromStatus ?? (mine.length === 0 && home.status !== 'pending' && home.status !== 'off_market' ? 'just_listed' : null);
    if (!playbook || mine.some((c) => c.playbook === playbook)) return [];
    return [{ home, playbook }];
  });

const Row = ({ s, href }: { s: Suggestion; href: string }) => (
  <li>
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-app-line bg-app-panel p-2 transition-colors duration-200 hover:border-app-ink/40">
      <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.home.candidates[0] ? <img src={s.home.candidates[0].thumbUrl} alt="" className="h-full w-full object-cover" /> : <Home aria-hidden className="h-5 w-5 text-app-muted" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium text-app-ink">{s.home.address ?? s.home.label}</span>
        <span className="truncate text-[12px] text-app-muted">{s.home.statusLabel ? `${s.home.statusLabel} on Zillow · nothing planned` : 'Nothing planned'}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 pr-1 text-[13px] font-medium text-app-accent">
        <span className="hidden sm:inline">{ACTION[s.playbook] ?? PLAYBOOKS[s.playbook].name}</span>
        <span className="sm:hidden">Plan</span>
        <ArrowRight aria-hidden className="h-4 w-4" />
      </span>
    </Link>
  </li>
);

export const SuggestedHomes = ({ items, hrefOf }: { items: Suggestion[]; hrefOf: (s: Suggestion) => string }) => (
  <section className="flex flex-col gap-2.5">
    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-app-muted">Ready to plan</h2>
    <ul className="flex flex-col gap-2">
      {items.map((s) => <Row key={`${s.home.id}-${s.playbook}`} s={s} href={hrefOf(s)} />)}
    </ul>
  </section>
);
