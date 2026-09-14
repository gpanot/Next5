/**
 * Scroll-Stop Score rubric. Pure — shared by the scorer, tests and the UI copy.
 * v1 is an AI vision review against these six checks (not a model trained on engagement data).
 * Promise claims (real before/after engagement) are the data we calibrate the weights with later.
 */

export type ScoreCriterion = 'stop' | 'subject' | 'thumbnail' | 'light' | 'fresh' | 'real';

export const SCORE_CRITERIA: readonly { id: ScoreCriterion; label: string; weight: number }[] = [
  { id: 'stop', label: 'Stops the scroll', weight: 0.25 },
  { id: 'subject', label: 'Clear subject', weight: 0.2 },
  { id: 'thumbnail', label: 'Works small', weight: 0.15 },
  { id: 'light', label: 'Light and sharpness', weight: 0.15 },
  { id: 'fresh', label: 'Looks current', weight: 0.1 },
  { id: 'real', label: 'Looks real', weight: 0.15 },
];

export type ScoreDetails = {
  version: 1;
  criteria: Record<ScoreCriterion, number>;
  tip: string;
  bestFor: 'feed' | 'story' | 'listing' | 'profile' | 'ad';
};

const clamp = (n: number): number => Math.min(10, Math.max(0, Number.isFinite(n) ? n : 0));

/** Weighted 0–100 score from 0–10 criteria. */
export const totalScore = (criteria: Record<ScoreCriterion, number>): number =>
  Math.round(SCORE_CRITERIA.reduce((sum, c) => sum + clamp(criteria[c.id]) * c.weight, 0) * 10);

export const scoreBand = (score: number): 'great' | 'good' | 'fair' => (score >= 80 ? 'great' : score >= 65 ? 'good' : 'fair');
