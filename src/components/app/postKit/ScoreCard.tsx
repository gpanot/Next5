import { SCORE_CRITERIA, scoreBand } from '../../../lib/scoreRubric';
import type { ScoreDetailsDto } from '../../../types/business/batches';

const BAND_LABEL = { great: 'Great', good: 'Good', fair: 'Could be better' } as const;
const BEST_FOR = { feed: 'your feed', story: 'a Story', listing: 'a shop listing', profile: 'your profile photo', ad: 'an ad' } as const;

/** Score, the six checks, and one posting tip. */
export const ScoreCard = ({ score, details }: { score: number; details: ScoreDetailsDto | null }) => (
  <section aria-label="Scroll-Stop Score" className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[13px] font-medium text-[#6b635a]">Scroll-Stop Score</p>
      <p className="text-[13px] text-[#6b635a]"><span className="text-[26px] font-semibold tabular-nums text-[#1f1c19]">{score}</span>/100 · {BAND_LABEL[scoreBand(score)]}</p>
    </div>
    {details && (
      <>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {SCORE_CRITERIA.map((c) => (
            <li key={c.id} className="flex flex-col gap-1">
              <span className="flex justify-between text-[11px] text-[#6b635a]"><span>{c.label}</span><span className="tabular-nums">{details.criteria[c.id]}/10</span></span>
              <span className="h-1 overflow-hidden rounded-full bg-[#ece5dc]"><span className="block h-full rounded-full bg-[#b86b45]" style={{ width: `${details.criteria[c.id] * 10}%` }} /></span>
            </li>
          ))}
        </ul>
        {details.tip && <p className="rounded-lg bg-[#f5efe7] px-3 py-2 text-[13px] text-[#1f1c19]"><span className="font-medium">Tip:</span> {details.tip} Best for {BEST_FOR[details.bestFor]}.</p>}
      </>
    )}
    <p className="text-[11px] text-[#8a8178]">Rated by AI on six things that make people stop scrolling.</p>
  </section>
);
