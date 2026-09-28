// server-only — never import from a 'use client' file.
// The decoupled 6-step pipeline. Each step reads the previous steps' saved checkpoints from the database and writes
// its own, with its time and cost, so any step can be inspected and a run can resume from any step.

import type { Prisma } from '@prisma/client';
import type { BrandProfile, CompetitorResearch, CopyPlan, HormoziResult, MetaAdRunStatus, PipelineStep, StepCost } from '../../types/admin/metaAds';
import { prisma } from '../../lib/db';
import { researchCompetitors } from './competitors';
import { withImageRules, writeCopy } from './copy';
import { createMeter, type CostMeter } from './cost';
import { designAd } from './design';
import { runHormozi } from './hormozi';
import { buildProfile } from './profile';
import { clip } from './text';

const running = (step: PipelineStep): MetaAdRunStatus => `STEP_${step}_RUNNING`;

const loadRun = (runId: string) => prisma.metaAdRun.findUniqueOrThrow({ where: { id: runId } });

const checkpoint = <T>(value: Prisma.JsonValue | null, step: number): T => {
  if (value === null) throw new Error(`Step ${step} checkpoint is missing — resume from step ${step}`);
  return value as unknown as T;
};

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** A re-run step keeps what earlier attempts spent as one line, so the run total is what was really paid. */
const withEarlier = (cost: StepCost, earlier: StepCost | undefined): StepCost =>
  earlier?.usdMicros ? { usdMicros: cost.usdMicros + earlier.usdMicros, items: [...cost.items, { label: 'Earlier attempts', usdMicros: earlier.usdMicros }] } : cost;

/** Saves the step's output with its time and cost. Cost is saved on failure too: the calls were still paid for. */
const saveStep = async (runId: string, step: PipelineStep, ms: number, cost: StepCost, data: Prisma.MetaAdRunUpdateInput) => {
  const run = await loadRun(runId);
  const previous = run.stepCosts as Record<string, StepCost>;
  const timings = { ...(run.stepTimings as Record<string, number>), [step]: ms };
  const costs = { ...previous, [step]: withEarlier(cost, previous[step]) };
  await prisma.metaAdRun.update({ where: { id: runId }, data: { ...data, stepTimings: timings, stepCosts: json(costs) } });
};

type StepFn = (runId: string, meter: CostMeter) => Promise<Prisma.MetaAdRunUpdateInput>;

const profileStep: StepFn = async (runId, meter) => {
  const run = await loadRun(runId);
  return { profile: json(await buildProfile(run.url, meter)) };
};

const competitorStep: StepFn = async (runId, meter) => {
  const run = await loadRun(runId);
  return { competitors: json(await researchCompetitors(checkpoint<BrandProfile>(run.profile, 1), meter)) };
};

const hormoziStep: StepFn = async (runId, meter) => {
  const run = await loadRun(runId);
  const result = await runHormozi(checkpoint<BrandProfile>(run.profile, 1), checkpoint<CompetitorResearch>(run.competitors, 2), meter);
  return { hormoziPicks: json(result) };
};

/** Writes the copy checkpoint and replaces the run's ads with `adCount` fresh rows. */
const copyStep: StepFn = async (runId, meter) => {
  const run = await loadRun(runId);
  const plan = await writeCopy(checkpoint<BrandProfile>(run.profile, 1), checkpoint<HormoziResult>(run.hormoziPicks, 3), run.adCount, meter);
  await prisma.$transaction([
    prisma.metaAd.deleteMany({ where: { runId } }),
    prisma.metaAd.createMany({ data: plan.ads.map((ad, position) => ({ ...ad, runId, position })) }),
  ]);
  return { copyPlan: json(plan) };
};

/** Step 5 designs every ad that is not ready yet (image, then text per ad). Step 6 alone re-composites saved images. */
const designStep = (step: 5 | 6): StepFn => async (runId, meter) => {
  const run = await loadRun(runId);
  const profile = checkpoint<BrandProfile>(run.profile, 1);
  checkpoint<CopyPlan>(run.copyPlan, 4);
  const ads = await prisma.metaAd.findMany({ where: { runId, ...(step === 5 ? { status: { not: 'ready' } } : {}) }, orderBy: { position: 'asc' } });
  await Promise.all(ads.map((ad) => designAd(ad, profile, meter, step === 6 ? 'composite' : 'both')));
  const ready = await prisma.metaAd.count({ where: { runId, status: 'ready' } });
  if (ready === 0) throw new Error('No ad finished designing — see each ad for its error');
  return {};
};

/** Adds extra spend to a step that already ran (a regenerated image), keeping its line items. */
const addStepCost = async (runId: string, step: PipelineStep, cost: StepCost) => {
  if (cost.usdMicros === 0) return;
  const run = await loadRun(runId);
  const costs = run.stepCosts as Record<string, StepCost>;
  const current = costs[step] ?? { usdMicros: 0, items: [] };
  const items = [...current.items, ...cost.items.map((i) => ({ ...i, label: `Regenerate · ${i.label}` }))];
  await prisma.metaAdRun.update({ where: { id: runId }, data: { stepCosts: json({ ...costs, [step]: { usdMicros: current.usdMicros + cost.usdMicros, items } }) } });
};

/**
 * New image for one ad, re-placed and re-composited. Same scene, with the current composition and guard rules (older
 * ads were written with older rules). Its cost is added to step 5. Never throws.
 */
export const regenerateAdImage = async (runId: string, adId: string): Promise<void> => {
  const meter = createMeter();
  try {
    const [run, stored] = await Promise.all([loadRun(runId), prisma.metaAd.findFirstOrThrow({ where: { id: adId, runId } })]);
    const ad = await prisma.metaAd.update({ where: { id: adId }, data: { imagePrompt: withImageRules(stored.imagePrompt, stored.style) } });
    await designAd(ad, checkpoint<BrandProfile>(run.profile, 1), meter, 'both');
  } finally {
    await addStepCost(runId, 5, meter.summary()).catch((err: unknown) => console.error('[meta-ads] regenerate cost not saved:', err));
  }
};

const STEPS: Record<PipelineStep, StepFn> = { 1: profileStep, 2: competitorStep, 3: hormoziStep, 4: copyStep, 5: designStep(5), 6: designStep(6) };

/** Runs steps `fromStep`…5 (step 5 already composites, so a normal run skips a separate step 6). Never throws. */
export const runPipeline = async (runId: string, fromStep: PipelineStep = 1): Promise<void> => {
  const last: PipelineStep = fromStep === 6 ? 6 : 5;
  for (let step = fromStep; step <= last; step = (step + 1) as PipelineStep) {
    const t0 = Date.now();
    const meter = createMeter();
    try {
      await prisma.metaAdRun.update({ where: { id: runId }, data: { status: running(step), error: null, failedStep: null } });
      const data = await STEPS[step](runId, meter);
      await saveStep(runId, step, Date.now() - t0, meter.summary(), data);
      console.log(`[meta-ads] run ${runId} step ${step} OK in ${Date.now() - t0}ms, $${meter.summary().usdMicros / 1e6}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[meta-ads] run ${runId} step ${step} FAILED:`, message);
      await saveStep(runId, step, Date.now() - t0, meter.summary(), {}).catch(() => undefined);
      await prisma.metaAdRun.update({ where: { id: runId }, data: { status: 'FAILED', failedStep: step, error: clip(message, 1_000), finishedAt: new Date() } });
      return;
    }
  }
  await prisma.metaAdRun.update({ where: { id: runId }, data: { status: 'COMPLETED', finishedAt: new Date() } });
};
