// server-only — never import from a 'use client' file.
// Step 3: pick proven models for this business, one topic per slideshow, and one shared set of mood photos.
// Each slideshow gets a content goal from a set mix (contentGoals.ts). Value first: the business only shows up on the CTA
// slide, except for the "product" goal (1 in 10).

import { prisma } from '../../lib/db';
import type { AutoPlan, SlideshowPick } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { BrandLever } from '../../types/admin/metaAds';
import { assignGoals, type ContentGoal } from '../../types/admin/contentGoals';
import type { SlideshowPattern } from '../../types/admin/slideshowKnowledge';
import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import { clip } from '../metaAds/text';
import { describeUsedTemplates, rotatePicks } from './rotate';

export type PlanModel = { id: string; name: string; niches: string[]; pattern: SlideshowPattern; views: number; savesPerMille: number };

/** Approved models, most proven first; drafts only when nothing is approved yet. */
export const loadPlanModels = async (): Promise<{ models: PlanModel[]; usedDrafts: boolean }> => {
  const load = (status: string) =>
    prisma.slideshowModel.findMany({ where: { status }, include: { references: { where: { status: 'ready' }, select: { views: true, saves: true } } } });
  let rows = await load('approved');
  const usedDrafts = rows.length === 0;
  if (usedDrafts) rows = await load('draft');
  if (rows.length === 0) throw new Error('No slideshow model yet: import proven slideshows in Slideshow Knowledge first');
  const models = rows.map((m) => {
    const views = m.references.reduce((sum, r) => sum + Number(r.views), 0);
    const saves = m.references.reduce((sum, r) => sum + Number(r.saves), 0);
    return { id: m.id, name: m.name, niches: m.niches, pattern: m.pattern as unknown as SlideshowPattern, views, savesPerMille: views ? Math.round((saves / views) * 10_000) / 10 : 0 };
  });
  return { models: models.sort((a, b) => b.views - a.views), usedDrafts };
};

const SYSTEM = `You plan TikTok photo slideshows for a business. Each slideshow copies a proven model's structure and gives the
business's audience something useful about the problem the business solves. Each slideshow has a GOAL, given in order:
- teach: useful tips or how-to steps. Best models: listicle, steps.
- proof: a result people can get, built on one of "Claims the site proves" (none → results people in this field commonly get). Best models: before_after, or a proof_result hook.
- myth: busts a common wrong belief in the audience's world. Best models: myth_truth, or a contrarian hook.
- story: a short story of someone in the audience facing the problem. Best model: story.
- product: the product itself is the subject (what it does, who it is for, how to use it), still useful. Any model.
The business itself appears only on the last slide, except for the product goal.
Choose:
- For each slideshow, in the GOALS order: modelId (from the list), hookPattern (the model's main hook or one of its other proven hooks, copied exactly),
  topic (what this slideshow is about, 3-8 words, specific to the audience and its goal, e.g. "putting mistakes that cost beginners strokes").
- Pick a model that fits the slideshow's goal and the business. Spread the slideshows across the good-fit models and across their hooks.
- Every topic is different. Topics sit in the audience's world, not the product's features (except product goal).
- photoPrompts: {PHOTOS} photo descriptions for the backgrounds, shared by all slideshows (the hook slide of each slideshow gets its own photo later; these fill the other slides). Real-looking photography of the
  audience's world (places, objects, people doing the activity, seen from a distance or from behind), bright daytime light,
  varied scenes. Never dusk, night, golden hour, dim interiors or cinematic/moody lighting: dark photos look bad on TikTok. Never text, logos, screens with UI, or close-up faces. One sentence each.
Return JSON: {"slideshows": [{"modelId","hookPattern","topic"}], "photoPrompts": [string]}`;

const describeModels = (models: PlanModel[]) =>
  models
    .map((m) => {
      const hooks = [m.pattern.hookPattern, ...(m.pattern.hookVariants ?? [])].map((h) => `"${h}"`).join(' | ');
      return `- id ${m.id} "${m.name}" · niches: ${m.niches.join(', ') || '-'} · ${m.pattern.format}, ${m.pattern.hookArchetype} hook, ${m.pattern.itemCount} items · proof: ${m.views} views, ${m.savesPerMille}‰ saves\n  hooks: ${hooks}\n  meat: ${m.pattern.itemPattern}`;
    })
    .join('\n');

type RawPlan = { slideshows?: Array<{ modelId?: unknown; hookPattern?: unknown; topic?: unknown }>; photoPrompts?: unknown };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.trim(), max) : '');

/** Keeps only valid picks, each with the goal of its place in the order; a hook that is not one of the model's proven
 *  hooks falls back to the main one. */
const toPicks = (raw: RawPlan, models: PlanModel[], goals: ContentGoal[]): SlideshowPick[] => {
  const byId = new Map(models.map((m) => [m.id, m]));
  const picks = (raw.slideshows ?? []).slice(0, goals.length).flatMap((s, i) => {
    const model = typeof s.modelId === 'string' ? byId.get(s.modelId) : undefined;
    const topic = str(s.topic, 120);
    if (!model || !topic) return [];
    const hooks = [model.pattern.hookPattern, ...(model.pattern.hookVariants ?? [])];
    const hook = hooks.find((h) => h === str(s.hookPattern, 200)) ?? model.pattern.hookPattern;
    return [{ modelId: model.id, modelName: model.name, hookPattern: hook, topic, goal: goals[i] ?? 'teach' }];
  });
  return picks;
};

export const planRun = async (
  input: { profile: BrandProfile; levers: BrandLever[]; count: number; avoidTopics?: string[]; priorPicks?: SlideshowPick[] },
  meter: CostMeter,
): Promise<AutoPlan> => {
  const { models, usedDrafts } = await loadPlanModels();
  const { profile, levers, count, avoidTopics = [], priorPicks = [] } = input;
  const goals = assignGoals(count, priorPicks.map((p) => p.goal));
  const photos = Math.min(Math.max(Math.max(...models.map((m) => m.pattern.itemCount)) + 5, 8), 16);
  const raw = await metaAdsJson<RawPlan>(
    [
      { role: 'system', content: SYSTEM.replace('{PHOTOS}', String(photos)) },
      {
        role: 'user',
        content: [
          `Plan ${count} slideshows. GOALS, in order: ${goals.map((g, i) => `${i + 1}. ${g}`).join(' · ')}`,
          `BUSINESS: ${profile.brandName} (${profile.domain})`,
          `Sells: ${profile.valueProp}`,
          `Audience: ${profile.audience}`,
          `Categories: ${profile.productCategories.join(', ')}`,
          `Claims the site proves: ${levers.map((l) => l.claim).join(' · ') || 'none'}`,
          avoidTopics.length ? `Topics already made for this business (pick new ones, not rewordings): ${avoidTopics.join(' · ')}` : '',
          describeUsedTemplates(priorPicks),
          `\nPROVEN MODELS\n${describeModels(models)}`,
        ].filter(Boolean).join('\n'),
      },
    ],
    { maxTokens: 6_000, meter, label: 'OpenAI slideshow plan' },
  );
  const picks = toPicks(raw, models, goals);
  if (picks.length === 0) throw new Error('The plan picked no valid model');
  // Fewer picks than asked: reuse the planned ones as "part 2" rather than returning less.
  const planned = picks.length;
  for (let i = 0; picks.length < count; i += 1) {
    const base = picks[i % planned]!;
    picks.push({ ...base, topic: `${base.topic}, part ${Math.floor(i / planned) + 2}` });
  }
  const rotated = rotatePicks(models, priorPicks, picks);
  const photoPrompts = Array.isArray(raw.photoPrompts) ? raw.photoPrompts.map((p) => str(p, 400)).filter(Boolean).slice(0, 16) : [];
  if (photoPrompts.length < 3) throw new Error('The plan returned too few photo descriptions');
  return { picks: rotated, photoPrompts, usedDrafts };
};
