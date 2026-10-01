// server-only — never import from a 'use client' file.
// Template rotation: a template is one model + one of its hooks. New picks go to the least-used template, so "Get more"
// (which plans 1 slideshow at a time) does not keep returning the top model's main hook.

import type { SlideshowPick } from '../../types/admin/autoSlideshow';
import { goalFitsPattern } from '../../types/admin/contentGoals';
import type { PlanModel } from './plan';

type Template = { modelId: string; modelName: string; hookPattern: string; model: PlanModel };

const keyOf = (t: { modelId: string; hookPattern: string }) => `${t.modelId}\n${t.hookPattern}`;

/** Every hook of the models in play: the ones the run already uses plus the ones the plan just chose (the good fits). */
const templatesInPlay = (models: PlanModel[], picks: SlideshowPick[]): Template[] => {
  const inPlay = new Set(picks.map((p) => p.modelId));
  return models
    .filter((m) => inPlay.has(m.id))
    .flatMap((m) => [...new Set([m.pattern.hookPattern, ...(m.pattern.hookVariants ?? [])])].map((hookPattern) => ({ modelId: m.id, modelName: m.name, hookPattern, model: m })));
};

/** Templates that suit the pick's goal; all of them when none does (or the pick has no goal). */
const forGoal = (templates: Template[], pick: SlideshowPick): Template[] => {
  if (!pick.goal) return templates;
  const fit = templates.filter((t) => goalFitsPattern(pick.goal!, t.model.pattern));
  return fit.length > 0 ? fit : templates;
};

/** Moves each new pick to a least-used template (among those suiting its goal) when its own is used more often. Keeps
 *  the topic and goal. Ties keep the plan's choice, then prefer another hook of the same model, then the more proven model. */
export const rotatePicks = (models: PlanModel[], prior: SlideshowPick[], picks: SlideshowPick[]): SlideshowPick[] => {
  const templates = templatesInPlay(models, [...prior, ...picks]);
  if (templates.length < 2) return picks;
  const uses = new Map(templates.map((t) => [keyOf(t), 0]));
  for (const p of prior) uses.set(keyOf(p), (uses.get(keyOf(p)) ?? 0) + 1);
  return picks.map((pick) => {
    const candidates = forGoal(templates, pick);
    const min = Math.min(...candidates.map((t) => uses.get(keyOf(t)) ?? 0));
    const own = uses.get(keyOf(pick)) ?? 0;
    const target = own <= min ? pick : (candidates.find((t) => t.modelId === pick.modelId && uses.get(keyOf(t)) === min) ?? candidates.find((t) => uses.get(keyOf(t)) === min)!);
    uses.set(keyOf(target), (uses.get(keyOf(target)) ?? 0) + 1);
    return { ...pick, modelId: target.modelId, modelName: target.modelName, hookPattern: target.hookPattern };
  });
};

/** Prompt line telling the planner which templates are already used, so its picks need fewer moves. */
export const describeUsedTemplates = (prior: SlideshowPick[]): string => {
  if (prior.length === 0) return '';
  const counts = new Map<string, number>();
  for (const p of prior) counts.set(`${p.modelId} "${p.hookPattern}"`, (counts.get(`${p.modelId} "${p.hookPattern}"`) ?? 0) + 1);
  const list = [...counts].map(([t, n]) => `${t} ×${n}`).join(' · ');
  return `Model + hook already used by this business's slideshows (pick other hooks or models first): ${list}`;
};
