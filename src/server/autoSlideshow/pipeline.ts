// server-only — never import from a 'use client' file.
// Auto Slideshow pipeline: 1 profile → 2 levers → 3 plan → 4 write → 5 photos → 6 render. Each step saves its checkpoint
// with its time and cost, so any step can be inspected and a run can resume from any step.

import type { Prisma } from '@prisma/client';
import { signAdminToken } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import type { AutoPhoto, AutoPlan, AutoRunStatus, AutoSlide, AutoStep } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { BrandLever, StepCost } from '../../types/admin/metaAds';
import type { SlideshowPattern } from '../../types/admin/slideshowKnowledge';
import { buildProfile } from '../companyIntel/profile';
import { priorTopicsForSite } from './more';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { extractLevers } from '../metaAds/hormozi/levers';
import { clip } from '../metaAds/text';
import { runPool } from '../pool';
import { appBaseUrl } from '../social/links';
import { putObject } from '../storage/objectStore';
import { pickTracks } from './music';
import { makePhotos } from './photos';
import { planRun } from './plan';
import { photoIndexes, renderSlide, type PhotoCache } from './render';
import { writeSlideshow } from './write';

const running = (step: AutoStep): AutoRunStatus => `STEP_${step}_RUNNING`;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const loadRun = (runId: string) => prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId } });

const checkpoint = <T>(value: Prisma.JsonValue | null, step: number): T => {
  if (value === null) throw new Error(`Step ${step} checkpoint is missing — resume from step ${step}`);
  return value as unknown as T;
};

/** A re-run step keeps what earlier attempts spent as one line, so the run total is what was really paid. */
const withEarlier = (cost: StepCost, earlier: StepCost | undefined): StepCost =>
  earlier?.usdMicros ? { usdMicros: cost.usdMicros + earlier.usdMicros, items: [...cost.items, { label: 'Earlier attempts', usdMicros: earlier.usdMicros }] } : cost;

const saveStep = async (runId: string, step: AutoStep, ms: number, cost: StepCost, data: Prisma.AutoSlideshowRunUpdateInput) => {
  const run = await loadRun(runId);
  const costs = run.stepCosts as Record<string, StepCost>;
  await prisma.autoSlideshowRun.update({
    where: { id: runId },
    data: { ...data, stepTimings: { ...(run.stepTimings as Record<string, number>), [step]: ms }, stepCosts: json({ ...costs, [step]: withEarlier(cost, costs[step]) }) },
  });
};

/** `append` > 0: a "Get more" batch adding that many slideshows to a finished run. `rerender`: step 6 was asked for
 *  directly, so every slideshow renders again; otherwise only the ones not rendered yet. */
type RunOpts = { append: number; rerender: boolean };
type StepFn = (runId: string, meter: CostMeter, opts: RunOpts) => Promise<Prisma.AutoSlideshowRunUpdateInput>;

const profileStep: StepFn = async (runId, meter) => ({ profile: json(await buildProfile((await loadRun(runId)).url, meter)) });

/** A site with no quotable claim still gets slideshows: the CTA then uses a plain benefit, with no numbers. */
const leverStep: StepFn = async (runId, meter) => {
  const profile = checkpoint<BrandProfile>((await loadRun(runId)).profile, 1);
  const levers = await extractLevers(profile, meter).catch((err: unknown) => {
    console.warn(`[auto-slideshow] run ${runId}: no levers (${err instanceof Error ? err.message : err})`);
    return [] as BrandLever[];
  });
  return { levers: json(levers) };
};

/** Picks models and topics. On "Get more" it adds picks to the plan and keeps the run's photo set, so step 5 has nothing to redo. */
const planStep: StepFn = async (runId, meter, { append }) => {
  const run = await loadRun(runId);
  const avoidTopics = await priorTopicsForSite(run.url, run.createdAt, append > 0 ? runId : undefined);
  const input = { profile: checkpoint<BrandProfile>(run.profile, 1), levers: checkpoint<BrandLever[]>(run.levers, 2), avoidTopics };
  if (append === 0) return { plan: json(await planRun({ ...input, count: run.count }, meter)) };
  const before = checkpoint<AutoPlan>(run.plan, 3);
  const plan = await planRun({ ...input, count: append, priorPicks: before.picks }, meter);
  return { plan: json({ ...before, picks: [...before.picks, ...plan.picks], usedDrafts: before.usedDrafts || plan.usedDrafts }) };
};

const WRITE_CONCURRENCY = 5;

/** Replaces the run's slideshows with freshly written ones (on "Get more", writes only the new picks after the existing
 *  slideshows). A slideshow that fails is kept as failed, with its reason. */
const writeStep: StepFn = async (runId, meter, { append }) => {
  const run = await loadRun(runId);
  const [profile, levers, plan] = [checkpoint<BrandProfile>(run.profile, 1), checkpoint<BrandLever[]>(run.levers, 2), checkpoint<AutoPlan>(run.plan, 3)];
  const models = await prisma.slideshowModel.findMany({ where: { id: { in: plan.picks.map((p) => p.modelId) } } });
  const patternOf = new Map(models.map((m) => [m.id, m.pattern as unknown as SlideshowPattern]));
  // "Get more" writes only the picks step 3 just added (the plan's last `append`), after the highest position in use.
  // Counting existing slideshows is not enough: deleted ones leave their picks in the plan.
  const last = append > 0 ? await prisma.autoSlideshow.aggregate({ where: { runId }, _max: { position: true } }) : null;
  const start = append > 0 ? (last?._max.position ?? -1) + 1 : 0;
  if (append === 0) await prisma.autoSlideshow.deleteMany({ where: { runId } });
  const picks = append > 0 ? plan.picks.slice(-append) : plan.picks;
  const todo = picks.map((pick, i) => ({ pick, position: start + i }));
  // A random track per slideshow, all different while the library has enough; changeable in the editor.
  const tracks = await pickTracks(todo.length);
  await runPool(todo, WRITE_CONCURRENCY, async ({ pick, position }) => {
    const track = tracks[position - start];
    const music = track ? { audioAssetId: track.assetId, audioStart: track.startAt } : {};
    const base = { runId, position, modelId: pick.modelId, modelName: pick.modelName, hookPattern: pick.hookPattern, topic: pick.topic, ...music };
    try {
      const pattern = patternOf.get(pick.modelId);
      if (!pattern) throw new Error('Model was deleted');
      const written = await writeSlideshow({ pick, pattern, profile, levers }, meter);
      const slides: AutoSlide[] = written.slides.map((s) => ({ ...s, photoIndex: 0, imageKey: null }));
      await prisma.autoSlideshow.create({ data: { ...base, slides: json(slides), caption: written.caption, hashtags: written.hashtags } });
    } catch (err) {
      await prisma.autoSlideshow.create({ data: { ...base, status: 'failed', error: clip(err instanceof Error ? err.message : String(err), 500) } });
    }
  });
  if ((await prisma.autoSlideshow.count({ where: { runId, status: 'written', position: { gte: start } } })) === 0) throw new Error('No slideshow could be written — see each one for its reason');
  return {};
};

const photoStep: StepFn = async (runId, meter) => {
  const run = await loadRun(runId);
  const plan = checkpoint<AutoPlan>(run.plan, 3);
  const pool = plan.photoPrompts.length;
  const existing = (run.photos as AutoPhoto[] | null) ?? [];
  const shows = await prisma.autoSlideshow.findMany({ where: { runId, status: { not: 'failed' } }, orderBy: { position: 'asc' } });
  const hookOf = (show: { slides: unknown }) => (show.slides as AutoSlide[] | null)?.[0]?.photoPrompt;
  // The pool (shared, reused by every slideshow) comes first and never moves; hook photos follow, one per slideshow.
  const hookPrompts = existing.slice(pool).filter((p) => p.kind === 'hook').map((p) => p.prompt);
  for (const show of shows) {
    const prompt = hookOf(show);
    if (prompt && !hookPrompts.includes(prompt)) hookPrompts.push(prompt);
  }
  const made = await makePhotos(runId, [...plan.photoPrompts, ...hookPrompts], existing, meter);
  const photos = made.map((p, i) => (i >= pool ? { ...p, kind: 'hook' as const } : p));
  const poolMade = photos.slice(0, pool).filter((p) => p.imageKey).length;
  if (poolMade < 3) throw new Error(`Only ${poolMade} of ${pool} photos were made: ${photos.find((p) => p.error)?.error ?? 'unknown error'}`);
  // Point each new slideshow's hook slide at its own photo; one whose photo failed falls back to the pool in step 6.
  for (const show of shows.filter((s) => s.status === 'written')) {
    const prompt = hookOf(show);
    const index = prompt ? photos.findIndex((p, i) => i >= pool && p.prompt === prompt && p.imageKey) : -1;
    if (index < 0) continue;
    const slides = (show.slides as unknown as AutoSlide[]).map((s, i) => (i === 0 ? { ...s, photoIndex: index } : s));
    await prisma.autoSlideshow.update({ where: { id: show.id }, data: { slides: json(slides) } });
  }
  return { photos: json(photos) };
};

const RENDER_CONCURRENCY = 4;
export const slideKey = (runId: string, slideshowId: string, index: number) => `admin/auto-slideshow/${runId}/${slideshowId}/${index}.jpg`;

/** Renders slideshows not rendered yet (all of them again when step 6 is re-run directly). */
const renderStep: StepFn = async (runId, _meter, { rerender }) => {
  const run = await loadRun(runId);
  const photos = checkpoint<AutoPhoto[]>(run.photos, 5);
  const available = photos.flatMap((p, i) => (p.imageKey && p.kind !== 'hook' ? [i] : []));
  const shows = await prisma.autoSlideshow.findMany({ where: { runId, status: rerender ? { not: 'failed' } : { in: ['written', 'rendering'] } }, orderBy: { position: 'asc' } });
  const cache: PhotoCache = new Map();
  await runPool(shows, RENDER_CONCURRENCY, async (show) => {
    try {
      await prisma.autoSlideshow.update({ where: { id: show.id }, data: { status: 'rendering', error: null } });
      const slides = show.slides as unknown as AutoSlide[];
      const indexes = photoIndexes(slides.length, show.position, available);
      const hookPhoto = photos[slides[0]?.photoIndex ?? -1];
      if (hookPhoto?.kind === 'hook' && hookPhoto.imageKey) indexes[0] = slides[0]!.photoIndex;
      const rendered: AutoSlide[] = [];
      for (const [i, slide] of slides.entries()) {
        const key = slideKey(runId, show.id, i);
        await putObject(key, await renderSlide(slide, photos[indexes[i]!]!.imageKey!, cache), 'image/jpeg');
        rendered.push({ ...slide, photoIndex: indexes[i]!, imageKey: key });
      }
      await prisma.autoSlideshow.update({ where: { id: show.id }, data: { slides: json(rendered), status: 'ready' } });
    } catch (err) {
      await prisma.autoSlideshow.update({ where: { id: show.id }, data: { status: 'failed', error: clip(err instanceof Error ? err.message : String(err), 500) } });
    }
  });
  if ((await prisma.autoSlideshow.count({ where: { runId, status: 'ready' } })) === 0) throw new Error('No slideshow could be rendered');
  return {};
};

const STEPS: Record<AutoStep, StepFn> = { 1: profileStep, 2: leverStep, 3: planStep, 4: writeStep, 5: photoStep, 6: renderStep };

/**
 * On Vercel one function has 300 s. Steps 1-4 take about 1-2 min, photos and render another 2-3 min, so step 5 starts
 * in a fresh invocation via the continue route. Locally it just keeps going. True when the new invocation took the work.
 */
const handOff = async (runId: string): Promise<boolean> => {
  if (process.env.VERCEL !== '1') return false;
  try {
    await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: running(5) } });
    const res = await fetch(`${appBaseUrl()}/api/admin/auto-slideshow/runs/${runId}/continue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signAdminToken()}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.warn(`[auto-slideshow] hand-off of run ${runId} refused (${res.status}); continuing inline`);
    return res.ok;
  } catch (err) {
    console.warn(`[auto-slideshow] hand-off of run ${runId} failed; continuing inline:`, err instanceof Error ? err.message : err);
    return false;
  }
};

/** Runs steps `fromStep`…6. Never throws: a failure is saved on the run with its step.
 *  `append` > 0 adds that many slideshows to a finished run (see ./more). */
export const runAutoPipeline = async (runId: string, fromStep: AutoStep = 1, append = 0): Promise<void> => {
  const opts: RunOpts = { append, rerender: fromStep === 6 };
  for (let step = fromStep; step <= 6; step = (step + 1) as AutoStep) {
    const t0 = Date.now();
    const meter = createMeter();
    try {
      await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: running(step), error: null, failedStep: null } });
      const data = await STEPS[step](runId, meter, opts);
      await saveStep(runId, step, Date.now() - t0, meter.summary(), data);
      console.log(`[auto-slideshow] run ${runId} step ${step} OK in ${Date.now() - t0}ms, $${meter.summary().usdMicros / 1e6}`);
      if (step === 4 && (await handOff(runId))) return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[auto-slideshow] run ${runId} step ${step} FAILED:`, message);
      await saveStep(runId, step, Date.now() - t0, meter.summary(), {}).catch(() => undefined);
      await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: 'FAILED', failedStep: step, error: clip(message, 1_000), finishedAt: new Date() } });
      return;
    }
  }
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: 'COMPLETED', finishedAt: new Date() } });
};
