'use client';

import { BadgeCheck } from 'lucide-react';

export type DisclosureDraft = { agentName: string; brokerage: string };

type Props = { value: DisclosureDraft; onChange: (patch: Partial<DisclosureDraft>) => void };

const INPUT = 'h-11 w-full rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted transition-colors duration-200 focus:border-app-accent focus:outline-none';

export const isDisclosureValid = (d: DisclosureDraft) => d.agentName.trim().length >= 2 && d.brokerage.trim().length >= 2;

/** "Listed by {name}, {brokerage}": asked once, before her first listing plan (§5.5). */
export const DisclosureForm = ({ value, onChange }: Props) => (
  <div className="flex flex-col gap-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
    <p className="flex items-center gap-2 text-[14px] font-medium text-app-ink">
      <BadgeCheck aria-hidden className="h-4 w-4 text-app-accent" /> Who lists this home?
    </p>
    <div className="grid gap-2 sm:grid-cols-2">
      <input aria-label="Your name" placeholder="Your name" autoComplete="name" value={value.agentName} onChange={(e) => onChange({ agentName: e.target.value })} className={INPUT} />
      <input aria-label="Brokerage" placeholder="Brokerage" autoComplete="organization" value={value.brokerage} onChange={(e) => onChange({ brokerage: e.target.value })} className={INPUT} />
    </div>
    <p className="text-[12px] text-app-muted">
      Every listing caption ends with “Listed by {value.agentName.trim() || 'you'}, {value.brokerage.trim() || 'your brokerage'}”. Asked once.
    </p>
  </div>
);
