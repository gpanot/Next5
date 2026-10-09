'use client';

import { usd } from '../../../../../types/admin/slideshowCredits';
import { cardClass } from './fields';

export const postsLabel = (posts: number) => (posts === 1 ? '1 post' : `${posts} posts`);

/** The balance in posts (what the user buys), with the dollar amount below. */
export function BalanceCard({ balanceCents, priceCents }: { balanceCents: number; priceCents: number }) {
  const posts = Math.max(0, Math.floor(balanceCents / priceCents));
  return (
    <div className={cardClass}>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase dark:text-zinc-400">Credit balance</p>
      <p className={`mt-1 text-3xl font-light tracking-tight ${posts === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink dark:text-zinc-100'}`}>{postsLabel(posts)}</p>
      <p className="mt-1 text-sm text-muted dark:text-zinc-400">
        {usd(balanceCents)} balance · {usd(priceCents)} per post
      </p>
    </div>
  );
}
