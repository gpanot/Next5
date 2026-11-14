'use client';

import { useState } from 'react';
import { parseMarketCity, type MarketCity } from '../../../lib/marketPlaces';

const INPUT = 'h-11 w-full rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted transition-colors duration-200 focus:border-app-accent focus:outline-none';

type Props = { label: string; busy?: boolean; onSubmit: (city: MarketCity) => void; onCancel?: () => void };

/** City + state (2 letters or the full name), checked before it is sent. */
export const CityInput = ({ label, busy = false, onSubmit, onCancel }: Props) => {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const parsed = parseMarketCity({ city, state });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed && !busy) onSubmit(parsed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_5.5rem] gap-2">
        <input aria-label="City" placeholder="Austin" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={INPUT} />
        <input aria-label="State" placeholder="TX" autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} className={`${INPUT} uppercase`} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!parsed || busy}
          className="h-10 rounded-xl bg-app-ink px-4 text-[14px] font-medium text-app-panel transition-opacity duration-200 disabled:opacity-40"
        >
          {label}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 px-3 text-[14px] text-app-muted transition-colors duration-200 hover:text-app-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
