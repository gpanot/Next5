'use client';

import { usd } from '../../../../../types/admin/slideshowCredits';
import { cardClass } from './fields';

export const postsLabel = (posts: number) => (posts === 1 ? '1 post' : `${posts} posts`);

/** Hand-drawn coffee cup: one post costs about a coffee. */
function CoffeeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
      <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
      <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 3c0 1 1 1 1 2s-1 1-1 2M12 3c0 1 1 1 1 2s-1 1-1 2" />
    </svg>
  );
}

/** Promo stamp: the post price is locked for good. Blue, slightly tilted, like a sticker. */
function ForeverPrice({ priceCents }: { priceCents: number }) {
  return (
    <div className="flex shrink-0 -rotate-3 flex-col items-center rounded-xl bg-blue-600 px-3 py-2 text-white shadow-md ring-4 ring-blue-100 transition-transform hover:rotate-0 sm:px-4 dark:bg-blue-500 dark:ring-blue-950">
      <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">Forever</span>
      <span className="text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">{usd(priceCents)}</span>
      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold opacity-90">
        <CoffeeIcon />
        per post
      </span>
    </div>
  );
}

/** The balance in posts (what the user buys; no dollar amount), the forever price on the right, and a benefits reminder. */
export function BalanceCard({ balanceCents, priceCents }: { balanceCents: number; priceCents: number }) {
  const posts = Math.max(0, Math.floor(balanceCents / priceCents));
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase dark:text-zinc-400">Credit balance</p>
          <p className={`mt-1 text-3xl font-light tracking-tight ${posts === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink dark:text-zinc-100'}`}>{postsLabel(posts)}</p>
        </div>
        <ForeverPrice priceCents={priceCents} />
      </div>
      <div className="mt-4 border-t border-line pt-3 text-sm dark:border-zinc-800">
        <p className="font-semibold text-ink dark:text-zinc-100">No filming. No editing. No content team.</p>
      </div>
    </div>
  );
}
