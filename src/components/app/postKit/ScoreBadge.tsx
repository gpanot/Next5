import { Gauge } from 'lucide-react';
import { scoreBand } from '../../../lib/scoreRubric';

const TONE = {
  great: 'bg-emerald-600 text-white',
  good: 'bg-white/90 text-ink',
  fair: 'bg-black/55 text-white',
} as const;

/** Scroll-Stop Score pill for photo tiles. */
export const ScoreBadge = ({ score, className = '' }: { score: number; className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm ${TONE[scoreBand(score)]} ${className}`} title="Scroll-Stop Score">
    <Gauge aria-hidden className="h-3 w-3" />
    {score}
  </span>
);
