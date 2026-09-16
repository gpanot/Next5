'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { SCORE_CRITERIA, scoreBand } from '../../../lib/scoreRubric';
import type { ScoreDetailsDto } from '../../../types/business/batches';

const BAND_LABEL = { great: 'Great', good: 'Good', fair: 'Could be better' } as const;
const BEST_FOR = { feed: 'your feed', story: 'a Story', listing: 'a shop listing', profile: 'your profile photo', ad: 'an ad' } as const;

type Props = {
  score: number;
  details: ScoreDetailsDto | null;
  /** Open on a big screen; on a phone the photo matters more than the breakdown. */
  defaultOpen?: boolean;
};

/**
 * Score, the six checks, and one posting tip.
 * Collapsed to a single line by default so it never covers the photo it is rating.
 */
export const ScoreCard = ({ score, details, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section aria-label="Scroll-Stop Score" className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!details}
        className="flex items-baseline justify-between gap-3 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-app-muted">
          Scroll-Stop Score
          {details && (
            <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          )}
        </span>
        <span className="text-[13px] text-app-muted">
          <span className="text-[26px] font-semibold tabular-nums text-app-ink">{score}</span>/100 · {BAND_LABEL[scoreBand(score)]}
        </span>
      </button>

      {details && !open && details.tip && (
        <p className="line-clamp-2 text-[13px] text-app-muted">
          <span className="font-medium text-app-ink">Tip:</span> {details.tip}
        </p>
      )}

      {details && open && (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {SCORE_CRITERIA.map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <span className="flex justify-between text-[11px] text-app-muted"><span>{c.label}</span><span className="tabular-nums">{details.criteria[c.id]}/10</span></span>
                <span className="h-1 overflow-hidden rounded-full bg-app-line"><span className="block h-full rounded-full bg-app-accent" style={{ width: `${details.criteria[c.id] * 10}%` }} /></span>
              </li>
            ))}
          </ul>
          {details.tip && <p className="rounded-lg bg-app-sunken px-3 py-2 text-[13px] text-app-ink"><span className="font-medium">Tip:</span> {details.tip} Best for {BEST_FOR[details.bestFor]}.</p>}
          <p className="text-[11px] text-app-muted">Rated by AI on six things that make people stop scrolling.</p>
        </>
      )}
    </section>
  );
};
