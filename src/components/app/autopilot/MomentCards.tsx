'use client';

import { CalendarHeart, DollarSign, HandCoins, Home, LineChart, Lock, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

type Moment = { id: string; label: string; sub: string; icon: ReactNode; ready: boolean };

/** Step 1 cards: one per playbook (docs/business-studios/15-realtor-autopilot-plan.md §3.2). */
const MOMENTS: Moment[] = [
  { id: 'just_listed', label: 'Just listed', sub: '7 days from one Zillow link', icon: <Home aria-hidden className="h-5 w-5" />, ready: true },
  { id: 'open_house', label: 'Open house', sub: '3 days, ends on the day', icon: <CalendarHeart aria-hidden className="h-5 w-5" />, ready: true },
  { id: 'price_drop', label: 'Price drop', sub: 'New price, 3 posts', icon: <DollarSign aria-hidden className="h-5 w-5" />, ready: true },
  { id: 'just_sold', label: 'Just sold', sub: '2 days of proof', icon: <HandCoins aria-hidden className="h-5 w-5" />, ready: true },
  { id: 'market_update', label: 'Market update', sub: 'This week’s numbers, sourced', icon: <LineChart aria-hidden className="h-5 w-5" />, ready: true },
  { id: 'evergreen', label: 'No listing this week', sub: 'Tips that fill empty days', icon: <Sparkles aria-hidden className="h-5 w-5" />, ready: true },
];

type Props = {
  value: string;
  onChange: (id: string) => void;
  /** Cards her plan does not include: shown with a lock, a tap goes to `onLocked`. */
  locked?: readonly string[];
  onLocked?: (id: string) => void;
};

export const MomentCards = ({ value, onChange, locked = [], onLocked }: Props) => (
  <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
    {MOMENTS.map((m) => {
      const active = m.id === value;
      const isLocked = m.ready && locked.includes(m.id);
      return (
        <li key={m.id}>
          <button
            type="button"
            disabled={!m.ready}
            onClick={() => (isLocked ? onLocked?.(m.id) : onChange(m.id))}
            aria-pressed={active}
            className={[
              'flex h-full w-full flex-col items-start gap-2 rounded-xl border p-3 text-left shadow-sm transition-colors duration-200',
              active ? 'border-app-accent bg-app-accent-soft' : 'border-app-line bg-app-panel hover:border-app-ink/40',
              m.ready ? '' : 'cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            <span className={`flex w-full items-center justify-between ${active ? 'text-app-accent' : 'text-app-muted'}`}>
              {m.icon}
              {isLocked && <Lock aria-label="Paid plans" className="h-4 w-4" />}
            </span>
            <span className="text-[14px] font-semibold text-app-ink">{m.label}</span>
            <span className="text-[12px] leading-snug text-app-muted">{!m.ready ? 'Soon' : isLocked ? 'On paid plans' : m.sub}</span>
          </button>
        </li>
      );
    })}
  </ul>
);
