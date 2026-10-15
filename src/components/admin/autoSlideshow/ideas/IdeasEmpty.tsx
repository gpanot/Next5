'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IDEAS_PER_BATCH } from '../../../../types/admin/calendarIdeas';
import type { IdeasState } from './useIdeas';

const primary = 'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95 disabled:opacity-40';

/** Ideas are Blitz videos only: slideshows are made in Campaigns. A short line under the deck says where. */
export function CampaignsHint() {
  const campaigns = `${usePathname().replace(/\/ideas$/, '')}/campaigns`;
  return (
    <p className="text-center text-xs text-app-muted">
      Want photo slideshows?{' '}
      <Link href={campaigns} className="font-semibold text-app-ink underline underline-offset-2">Make them in Campaigns</Link>
    </p>
  );
}

/** Nothing left to swipe: a new free Blitz batch. */
export function IdeasEmpty({ ideas }: { ideas: IdeasState }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="max-w-[34ch] text-sm leading-relaxed text-app-muted">No ideas left to swipe. Get new ones: each one you keep fills your next empty day.</p>
      {ideas.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{ideas.error}</p>}
      <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void ideas.generate()} disabled={ideas.generating} className={primary}>
          <Sparkles aria-hidden className="h-4 w-4" /> {ideas.error ? 'Try again' : `Get ${IDEAS_PER_BATCH} Blitz ideas`}
        </button>
      </div>
      <CampaignsHint />
    </div>
  );
}
