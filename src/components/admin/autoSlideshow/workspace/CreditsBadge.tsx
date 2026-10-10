'use client';

import { useEffect } from 'react';
import type { CreditsDto } from '../../../../types/admin/slideshowCredits';
import { useAdminApi } from '../../business/useAdminApi';
import { CREDITS_CHANGED } from '../creditsEvents';
import { postsLabel } from '../settings/credits/BalanceCard';

const pillClass = 'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors duration-200';

/** The sidebar's Credits balance, in posts left. Re-reads whenever credits are spent, refunded or bought. */
export function CreditsBadge({ token }: { token: string }) {
  const { data, refresh } = useAdminApi<CreditsDto>(token, '/api/slideshow/credits');
  useEffect(() => {
    window.addEventListener(CREDITS_CHANGED, refresh);
    return () => window.removeEventListener(CREDITS_CHANGED, refresh);
  }, [refresh]);

  if (!data) return <span aria-hidden className="ml-auto h-5 w-14 animate-pulse rounded-full bg-app-sunken" />;
  const posts = Math.max(0, Math.floor(data.balanceCents / data.priceCents));
  const tone = posts === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-app-sunken text-app-ink';
  return <span className={`${pillClass} ${tone}`} aria-label={`${postsLabel(posts)} left`}>{postsLabel(posts)}</span>;
}
