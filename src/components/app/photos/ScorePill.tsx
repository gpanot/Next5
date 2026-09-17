'use client';

import { ChevronDown, Gauge } from 'lucide-react';
import { scoreBand } from '../../../lib/scoreRubric';

type Props = { score: number | null; open: boolean; onToggle: () => void };

const TONE = { great: 'text-emerald-300', good: 'text-white', fair: 'text-amber-200' } as const;

/**
 * "Score 86 ⌄" — the score as a small pill on top of the photo instead of a card covering it.
 * Tapping it opens the breakdown, the tip and the Post Kit.
 */
export const ScorePill = ({ score, open, onToggle }: Props) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={open}
    aria-haspopup="dialog"
    className="pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/45 px-3.5 text-[14px] font-medium text-white shadow-sm ring-1 ring-white/15 backdrop-blur-md transition-colors duration-200 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
  >
    {score === null ? (
      <span>Post Kit</span>
    ) : (
      <>
        <Gauge aria-hidden className="h-4 w-4 opacity-80" />
        <span>Score <span className={`font-semibold tabular-nums ${TONE[scoreBand(score)]}`}>{score}</span></span>
      </>
    )}
    <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
  </button>
);
