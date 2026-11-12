'use client';

import { MapPin } from 'lucide-react';

export type AreaDraft = { city: string; state: string; zips: string };

type Props = { value: AreaDraft; onChange: (patch: Partial<AreaDraft>) => void };

const INPUT = 'h-11 w-full rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted transition-colors duration-200 focus:border-app-accent focus:outline-none';

export const isAreaDraftValid = (a: AreaDraft) => a.city.trim().length > 1 && /^[A-Za-z]{2}$/.test(a.state.trim());

/** "Where do you sell?" — asked once, saved on the workspace, reused every week (§4.8). */
export const MarketAreaForm = ({ value, onChange }: Props) => (
  <div className="flex flex-col gap-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
    <p className="flex items-center gap-2 text-[14px] font-medium text-app-ink">
      <MapPin aria-hidden className="h-4 w-4 text-app-accent" /> Where do you sell?
    </p>
    <div className="grid grid-cols-[1fr_5rem] gap-2">
      <input aria-label="City" placeholder="Austin" value={value.city} onChange={(e) => onChange({ city: e.target.value })} className={INPUT} />
      <input aria-label="State" placeholder="TX" maxLength={2} value={value.state} onChange={(e) => onChange({ state: e.target.value.toUpperCase() })} className={`${INPUT} uppercase`} />
    </div>
    <input
      aria-label="Zip codes"
      inputMode="numeric"
      placeholder="Zips, optional (up to 3): 78704, 78745"
      value={value.zips}
      onChange={(e) => onChange({ zips: e.target.value })}
      className={INPUT}
    />
    <p className="text-[12px] text-app-muted">Every number comes from a real source (Redfin, Realtor.com, Freddie Mac…) and shows it on the slide.</p>
  </div>
);
