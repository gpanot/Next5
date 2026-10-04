'use client';

import { useEffect } from 'react';
import type { CreditsDto } from '../../../types/admin/slideshowCredits';
import { useAdminApi } from '../business/useAdminApi';
import { CREDITS_CHANGED } from './creditsEvents';

/** How often the pill re-reads the balance: slideshows are charged as they finish rendering. */
const REFRESH_MS = 30_000;

/**
 * Balance, kept fresh: every 30 s, when the tab comes back into view, when `version` changes (Settings closed), and at
 * once when credits are spent (a kept idea made into a post).
 */
const useCreditsBalance = (token: string, version: number) => {
  const { data, refresh } = useAdminApi<CreditsDto>(token, `/api/slideshow/credits?v=${version}`);
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(CREDITS_CHANGED, refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(CREDITS_CHANGED, refresh);
    };
  }, [refresh]);
  return data;
};

/** "12 posts left" in the top bar; opens Settings → Credits. Amber with "Add credits" when none are left. */
export function CreditsPill({ token, version, onOpen }: { token: string; version: number; onOpen: () => void }) {
  const credits = useCreditsBalance(token, version);
  if (!credits) return <span aria-hidden className="h-10 w-28 animate-pulse rounded-full bg-app-line/60" />;
  const left = Math.max(0, Math.floor(credits.balanceCents / credits.priceCents));
  const empty = left === 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${left} posts left. Open credits`}
      className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition active:scale-95 ${
        empty
          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
          : 'border-app-line text-app-ink hover:bg-app-sunken'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${empty ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden />
      {empty ? 'Add credits' : <><span className="tabular-nums">{left}</span> {left === 1 ? 'post' : 'posts'} left</>}
    </button>
  );
}
