// server-only — never import from a 'use client' file.
// Auto Slideshow pipeline: 1 profile → 2 levers → 3 plan (picks from the site's Slideshow Bank, built on its first run)
// → 4 write → 5 photos (a fresh one per slide) → 6 render. Each step saves its checkpoint
// with its time and cost, so any step can be inspected and a run can resume from any step.

import type { Prisma } from '@prisma/client';
import { signAdminToken } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import type { AutoPhoto, AutoPlan, AutoRunStatus, AutoSlide, AutoStep, SlideshowPick } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { assignGoals, GOAL_LABELS, type ContentGoal } from '../../types/admin/contentGoals';
import type { BrandLever, StepCost } from '../../types/admin/metaAds';
import type { SlideshowBankContent } from '../../types/admin/slideshowBank';
import { buildProfile } from '../companyIntel/profile';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { extractLevers } from '../metaAds/hormozi/levers';
import { clip } from '../metaAds/text';
import { runPool } from '../pool';
import { appBaseUrl } from '../social/links';
import { chargeSlideshow } from '../slideshowCredits/charge';
import { putObject } from '../storage/objectStore';
import { bankForSite, loadUsage } from './bank/build';
import { assembleCombo, pickCombos } from './bank/pick';
import { headsFor, withDetectedHeads, type HeadsCache } from './heads';
import { pickTracks } from './music';
import { makePhotos } from './photos';
import { renderSlide, slidePhotoIndexes, type PhotoCache } from './render';
import { ownPhotoEntries, photosPending, withOwnPhotos } from './slidePhotos';

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
 *  directly, so every slideshow renders again; otherwise only the ones not rendered yet.
 *  `continued`: a hand-off invocation picking up step 5, which leaves already-failed photos for a later retry. */
type RunOpts = { append: number; rerender: boolean; continued: boolean };
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

/** Shown where older slideshows show their model's name. */
const bankModelName = (goal: ContentGoal) => `Bank · ${GOAL_LABELS[goal]}`;

/** Picks bank combos (building the site's bank on its first run), one per goal of the set mix. On "Get more" it adds
 *  picks to the plan; the bank is reused, so only photos and music are new. */
const planStep: StepFn = async (runId, meter, { append }) => {
  const run = await loadRun(runId);
  const [profile, levers] = [checkpoint<BrandProfile>(run.profile, 1), checkpoint<BrandLever[]>(run.levers, 2)];
  const bank = await bankForSite(run.url, profile, levers, meter);
  const before = append > 0 ? checkpoint<AutoPlan>(run.plan, 3) : null;
  // A full re-plan replaces this run's slideshows, so they do not count as used.
  const usage = await loadUsage(run.url, append > 0 ? undefined : runId);
  const goals = assignGoals(append > 0 ? append : run.count, (before?.picks ?? []).map((p) => p.goal));
  const picks: SlideshowPick[] = pickCombos(bank.content, usage, goals).map((combo) => {
    const show = assembleCombo(bank.content, combo);
    return { modelId: null, modelName: bankModelName(show.meat.goal), hookPattern: show.hookPattern, topic: show.meat.topic, goal: show.meat.goal, bank: combo };
  });
  if (picks.length === 0) throw new Error('The Slideshow Bank has no usable hook or CTA');
  const plan: AutoPlan = {
    picks: [...(before?.picks ?? []), ...picks],
    photoPrompts: before?.photoPrompts ?? [],
    usedDrafts: false,
    bankId: bank.id,
    bankBuilt: bank.built || Boolean(before?.bankBuilt),
  };
  return { plan: json(plan) };
};

const loadBank = async (plan: AutoPlan): Promise<SlideshowBankContent> => {
  const row = plan.bankId ? await prisma.slideshowBank.findUnique({ where: { id: plan.bankId } }) : null;
  if (!row) throw new Error('This plan was made before the Slideshow Bank (or its bank was deleted): re-run from step 3');
  return row.content as unknown as SlideshowBankContent;
};

/** Replaces the run's slideshows with the planned bank combos (on "Get more", adds only the new picks after the existing
 *  slideshows). No model call: the text comes from the bank. */
const writeStep: StepFn = async (runId, _meter, { append }) => {
  const run = await loadRun(runId);
  const plan = checkpoint<AutoPlan>(run.plan, 3);
  const bank = await loadBank(plan);
  // "Get more" writes only the picks step 3 just added (the plan's last `append`), after the highest position in use.
  // Counting existing slideshows is not enough: deleted ones leave their picks in the plan.
  const last = append > 0 ? await prisma.autoSlideshow.aggregate({ where: { runId }, _max: { position: true } }) : null;
  const start = append > 0 ? (last?._max.position ?? -1) + 1 : 0;
  if (append === 0) await prisma.autoSlideshow.deleteMany({ where: { runId } });
  const picks = append > 0 ? plan.picks.slice(-append) : plan.picks;
  // A random track per slideshow, all different while the library has enough; changeable in the editor.
  const tracks = await pickTracks(picks.length);
  for (const [i, pick] of picks.entries()) {
    const track = tracks[i];
    const base = {
      runId, position: start + i, modelId: null, modelName: pick.modelName, hookPattern: pick.hookPattern, topic: pick.topic, goal: pick.goal ?? null,
      ...(track ? { audioAssetId: track.assetId, audioStart: track.startAt } : {}),
    };
    try {
      if (!pick.bank) throw new Error('Planned before the Slideshow Bank: re-run from step 3');
      const show = assembleCombo(bank, pick.bank);
      const slides: AutoSlide[] = show.slides.map((s) => ({ ...s, imageKey: null }));
      const ids = { bankMeatId: pick.bank.meatId, bankHookId: pick.bank.hookId, bankCtaId: pick.bank.ctaId };
      await prisma.autoSlideshow.create({ data: { ...base, ...ids, slides: json(slides), caption: show.caption, hashtags: show.hashtags } });
    } catch (err) {
      await prisma.autoSlideshow.create({ data: { ...base, status: 'failed', error: clip(err instanceof Error ? err.message : String(err), 500) } });
    }
  }
  if ((await prisma.autoSlideshow.count({ where: { runId, status: 'written', position: { gte: start } } })) === 0) throw new Error('No slideshow could be written — see each one for its reason');
  return {};
};

/** On Vercel, step 5 stops starting photos after this long, so render still fits; the rest go to a fresh invocation. */
const PHOTO_BUDGET_MS = 170_000;

const photoStep: StepFn = async (runId, meter, { continued }) => {
  const run = await loadRun(runId);
  const plan = checkpoint<AutoPlan>(run.plan, 3);
  const pool = plan.photoPrompts.length;
  const existing = (run.photos as AutoPhoto[] | null) ?? [];
  const rows = await prisma.autoSlideshow.findMany({ where: { runId, status: { not: 'failed' } }, orderBy: { position: 'asc' } });
  const shows = rows.map((r) => ({ id: r.id, status: r.status, slides: r.slides as unknown as AutoSlide[], bank: r.bankHookId !== null }));
  const entries = ownPhotoEntries(pool, existing, shows);
  const deadline = process.env.VERCEL === '1' ? Date.now() + PHOTO_BUDGET_MS : undefined;
  const look = (run.profile as unknown as BrandProfile | null)?.slideshowStyle?.photoStyle;
  const made = await makePhotos(runId, [...plan.photoPrompts, ...entries.map((e) => e.prompt)], existing, meter, { deadline, skipFailed: continued, look });
  const photos = made.map((p, i) => (i >= pool ? { ...p, ...entries[i - pool] } : p));
  const poolMade = photos.slice(0, pool).filter((p) => p.imageKey).length;
  if (pool > 0 && poolMade < 3) throw new Error(`Only ${poolMade} of ${pool} photos were made: ${photos.find((p) => p.error)?.error ?? 'unknown error'}`);
  if (pool === 0 && !photos.some((p) => p.imageKey) && !photosPending(photos)) throw new Error(`No photo was made: ${photos.find((p) => p.error)?.error ?? 'unknown error'}`);
  // Point each written slideshow's slides at their own photos; a slide whose photo failed is filled in step 6.
  for (const show of shows.filter((s) => s.status === 'written')) {
    await prisma.autoSlideshow.update({ where: { id: show.id }, data: { slides: json(withOwnPhotos(show, photos)) } });
  }
  return { photos: json(photos) };
};

const RENDER_CONCURRENCY = 4;
export const slideKey = (runId: string, slideshowId: string, index: number) => `admin/auto-slideshow/${runId}/${slideshowId}/${index}.jpg`;

/** Renders slideshows not rendered yet (all of them again when step 6 is re-run directly). Heads found on photos made
 *  before head detection existed are stored with the photos. */
const renderStep: StepFn = async (runId, _meter, { rerender }) => {
  const run = await loadRun(runId);
  const photos = checkpoint<AutoPhoto[]>(run.photos, 5);
  const shows = await prisma.autoSlideshow.findMany({ where: { runId, status: rerender ? { not: 'failed' } : { in: ['written', 'rendering'] } }, orderBy: { position: 'asc' } });
  const cache: PhotoCache = new Map();
  const heads: HeadsCache = new Map();
  const look = (run.profile as unknown as BrandProfile | null)?.slideshowStyle;
  await runPool(shows, RENDER_CONCURRENCY, async (show) => {
    try {
      await prisma.autoSlideshow.update({ where: { id: show.id }, data: { status: 'rendering', error: null } });
      const slides = show.slides as unknown as AutoSlide[];
      const indexes = slidePhotoIndexes(slides, show.position, photos);
      if (indexes.some((i) => i === null)) throw new Error('No photo was made for this slideshow');
      const rendered: AutoSlide[] = [];
      for (const [i, slide] of slides.entries()) {
        const key = slideKey(runId, show.id, i);
        const photo = photos[indexes[i]!]!;
        await putObject(key, await renderSlide(slide, photo.imageKey!, cache, look, await headsFor(photo, cache, heads)), 'image/jpeg');
        rendered.push({ ...slide, photoIndex: indexes[i]!, imageKey: key });
      }
      await prisma.autoSlideshow.update({ where: { id: show.id }, data: { slides: json(rendered), status: 'ready' } });
      await chargeSlideshow(runId, show.id);
    } catch (err) {
      await prisma.autoSlideshow.update({ where: { id: show.id }, data: { status: 'failed', error: clip(err instanceof Error ? err.message : String(err), 500) } });
    }
  });
  if ((await prisma.autoSlideshow.count({ where: { runId, status: 'ready' } })) === 0) throw new Error('No slideshow could be rendered');
  const withHeads = await withDetectedHeads(photos, heads);
  return withHeads ? { photos: json(withHeads) } : {};
};

const STEPS: Record<AutoStep, StepFn> = { 1: profileStep, 2: leverStep, 3: planStep, 4: writeStep, 5: photoStep, 6: renderStep };

/**
 * On Vercel one function has 300 s. Steps 1-4 take about 1-2 min (more when the site's bank is built), photos and render
 * another 2-3 min, so step 5 starts in a fresh invocation via the continue route; a step 5 that ran out of its time
 * budget hands off again. Locally it just keeps going. True when the new invocation took the work.
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

const photosLeft = async (runId: string) => photosPending(((await loadRun(runId)).photos as AutoPhoto[] | null) ?? []);

/** Runs steps `fromStep`…6. Never throws: a failure is saved on the run with its step.
 *  `append` > 0 adds that many slideshows to a finished run (see ./more). `continued`: called by the hand-off. */
export const runAutoPipeline = async (runId: string, fromStep: AutoStep = 1, append = 0, continued = false): Promise<void> => {
  const opts: RunOpts = { append, rerender: fromStep === 6, continued };
  for (let step = fromStep; step <= 6; step = (step + 1) as AutoStep) {
    const t0 = Date.now();
    const meter = createMeter();
    try {
      await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: running(step), error: null, failedStep: null } });
      const data = await STEPS[step](runId, meter, opts);
      await saveStep(runId, step, Date.now() - t0, meter.summary(), data);
      console.log(`[auto-slideshow] run ${runId} step ${step} OK in ${Date.now() - t0}ms, $${meter.summary().usdMicros / 1e6}`);
      if (step === 4 && (await handOff(runId))) return;
      if (step === 5 && (await photosLeft(runId)) && (await handOff(runId))) return;
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
