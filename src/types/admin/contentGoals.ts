// Content goals for Auto Slideshow: what each slideshow is for. The plan step gives every slideshow one, following a
// set mix; the calendar colors posts by it. Shared by server and client.

import type { SlideshowPattern } from './slideshowKnowledge';

export const CONTENT_GOALS = ['teach', 'proof', 'myth', 'story', 'product'] as const;
export type ContentGoal = (typeof CONTENT_GOALS)[number];

export const GOAL_LABELS: Record<ContentGoal, string> = {
  teach: 'Teach',
  proof: 'Proof',
  myth: 'Myth buster',
  story: 'Story',
  product: 'Product',
};

/** Share of slideshows per goal, in percent (sums to 100). Value first; the product leads only 1 in 10. */
export const GOAL_MIX: Record<ContentGoal, number> = { teach: 40, proof: 20, myth: 15, story: 15, product: 10 };

export const isContentGoal = (v: unknown): v is ContentGoal => typeof v === 'string' && (CONTENT_GOALS as readonly string[]).includes(v);

/** True when a model's structure suits the goal. Product fits any model. */
export const goalFitsPattern = (goal: ContentGoal, pattern: Pick<SlideshowPattern, 'format' | 'hookArchetype'>): boolean => {
  switch (goal) {
    case 'teach':
      return pattern.format === 'listicle' || pattern.format === 'steps';
    case 'proof':
      return pattern.format === 'before_after' || pattern.hookArchetype === 'proof_result';
    case 'myth':
      return pattern.format === 'myth_truth' || pattern.hookArchetype === 'contrarian';
    case 'story':
      return pattern.format === 'story';
    case 'product':
      return true;
  }
};

/**
 * Goals for `count` new slideshows, so the run's whole set (`prior` + new) stays closest to GOAL_MIX:
 * each new one takes the goal furthest below its share. Ties go to the goal listed first.
 */
export const assignGoals = (count: number, prior: (ContentGoal | null | undefined)[] = []): ContentGoal[] => {
  const used = new Map<ContentGoal, number>(CONTENT_GOALS.map((g) => [g, 0]));
  for (const g of prior) if (g) used.set(g, (used.get(g) ?? 0) + 1);
  let total = prior.filter(Boolean).length;
  const goals: ContentGoal[] = [];
  for (let i = 0; i < count; i += 1) {
    total += 1;
    const gap = (g: ContentGoal) => (GOAL_MIX[g] / 100) * total - (used.get(g) ?? 0);
    const goal = CONTENT_GOALS.reduce((best, g) => (gap(g) > gap(best) ? g : best));
    used.set(goal, (used.get(goal) ?? 0) + 1);
    goals.push(goal);
  }
  return goals;
};
