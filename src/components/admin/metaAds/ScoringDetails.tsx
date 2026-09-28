'use client';

import { CRAFT_WEIGHTS, WINNER_RULES, WINNER_WEIGHTS } from '../../../config/metaAdsScoring';
import type { CompetitorResearch, HormoziResult } from '../../../types/admin/metaAds';

const agreementLabel = (rho: number | null) => {
  if (rho === null) return 'too few ads to measure';
  if (rho >= 0.5) return 'strong: the rubric agrees with the market';
  if (rho >= 0.2) return 'weak agreement';
  if (rho > -0.2) return 'no agreement: craft does not predict what advertisers keep';
  return 'opposite: the rubric favours ads advertisers stop';
};

/** How the picks were made, with the weights used and whether the rubric agreed with the market on this run. */
export function ScoringDetails({ hormozi, competitors }: { hormozi: HormoziResult; competitors: CompetitorResearch }) {
  const { scoring } = hormozi;
  return (
    <details className="rounded-xl border border-line bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer font-bold text-ink dark:text-zinc-100">
        How picks are scored · {scoring.provenCount} proven winner{scoring.provenCount === 1 ? '' : 's'} · rubric vs market ρ {scoring.agreement.rho ?? '—'}
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed text-muted">
        <p>
          <b className="text-ink dark:text-zinc-100">The market picks.</b> Winner score = survival {WINNER_WEIGHTS.survival} + scale {WINNER_WEIGHTS.scale} + age {WINNER_WEIGHTS.age} + reach {WINNER_WEIGHTS.reach}. Survival compares
          an ad&apos;s age with 2× the advertiser&apos;s own kill window (median life of the ads they stopped; {WINNER_RULES.defaultKillDays} days when too few). Proven = still running, {WINNER_RULES.provenMinDays}+ days, and past 2× the window (or {WINNER_RULES.provenMinDaysNoBaseline}+ days when no window is measurable) or {WINNER_RULES.provenMinCopies}+ copies.
        </p>
        <p>
          <b className="text-ink dark:text-zinc-100">Craft explains.</b> Craft = copy {CRAFT_WEIGHTS.copy} + image {CRAFT_WEIGHTS.visual}. Copy is graded twice on the 8 Hormozi criteria; a point needs a quote found in the ad; far-apart grades keep the lower one. It only breaks ties.
        </p>
        <p>
          <b className="text-ink dark:text-zinc-100">Agreement this run:</b> ρ = {scoring.agreement.rho ?? '—'} over {scoring.agreement.n} ads — {agreementLabel(scoring.agreement.rho)}. Scoring {scoring.version}.
        </p>
        <p>
          Advertiser histories read:{' '}
          {competitors.advertisers.map((a) => `${a.pageName}${a.own ? ' (you)' : ''}: ${a.active} running, ${a.stopped} stopped${a.killMedianDays ? `, kills at ~${a.killMedianDays}d` : ''}`).join(' · ') || 'none'}
        </p>
      </div>
    </details>
  );
}
