'use client';

import { useState } from 'react';
import { MIN_DEPOSIT_CENTS, shortMoney } from './pricing';

/** Top-up CTA. Payments are not wired yet: a tap says so instead of pretending to charge. */
export function CheckoutButton({ label = `Start autopilot with ${shortMoney(MIN_DEPOSIT_CENTS)}` }: { label?: string }) {
  const [tapped, setTapped] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setTapped(true)}
        className="min-h-12 w-full rounded-full bg-blue-600 px-7 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 sm:w-auto dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {label} →
      </button>
      <p role="status" className="min-h-5 text-xs text-muted dark:text-zinc-400">
        {tapped ? 'Checkout opens soon. Nothing was charged.' : 'No subscription. Stop any day.'}
      </p>
    </div>
  );
}
