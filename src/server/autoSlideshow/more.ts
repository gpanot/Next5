// server-only — never import from a 'use client' file.
// "Get more": adds slideshows to a finished run. The run keeps its site read and proof (steps 1-2); step 3 adds picks
// from the site's Slideshow Bank (least-used parts first), step 4 writes only those, steps 5-6 make their photos and slides.
// Asked for while the run is busy, the batch waits in the plan's queue and starts when the batch before it is done.

import { prisma } from '../../lib/db';
import type { AutoPlan, QueuedMore } from '../../types/admin/autoSlideshow';

const queuedTotal = (plan: AutoPlan | null | undefined) => (plan?.queued ?? []).reduce((sum, q) => sum + q.count, 0);

/** Reopens a finished run for `count` more slideshows. False when the run is missing or not finished (e.g. a double tap).
 *  The new total is the slideshows the run has now plus `count` plus the batches still queued: the stored count can be
 *  stale (deletes, older runs), and the calendar reads `count - slideshows` as "still being made". `castId`: the brand
 *  face all of them use (the plan keeps it for step 4); none: the faces take turns. */
export const reopenForMore = async (runId: string, count: number, castId?: string): Promise<boolean> => {
  const [existing, run] = await Promise.all([
    prisma.autoSlideshow.count({ where: { runId } }),
    prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { plan: true } }),
  ]);
  const before = run?.plan as AutoPlan | null | undefined;
  const plan = before ? { ...before, castId } : undefined;
  const { count: updated } = await prisma.autoSlideshowRun.updateMany({
    where: { id: runId, status: 'COMPLETED' },
    data: { count: existing + count + queuedTotal(before), status: 'STEP_3_RUNNING', error: null, failedStep: null, startedAt: new Date(), finishedAt: null, ...(plan ? { plan } : {}) },
  });
  return updated === 1;
};

/** Queues `count` more slideshows on a run that is busy making a batch. False when the run is not busy (finished,
 *  failed or missing). The count goes up now, so the new ones show as "still being made" at once. */
export const queueMore = async (runId: string, count: number, castId?: string): Promise<boolean> => {
  const entry: QueuedMore = castId ? { count, castId } : { count };
  const updated = await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET plan = jsonb_set(plan, '{queued}', COALESCE(plan->'queued', '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb),
        count = count + ${count}
    WHERE id = ${runId} AND status LIKE 'STEP_%_RUNNING' AND plan IS NOT NULL`;
  return updated === 1;
};

/** Adds `count` slideshows to the run: now when it is finished, else after the batch it is making. Null when the run is
 *  missing or failed. A run that finishes between the two tries is reopened on the second. */
export const addMore = async (runId: string, count: number, castId?: string): Promise<'started' | 'queued' | null> => {
  if (await reopenForMore(runId, count, castId)) return 'started';
  if (await queueMore(runId, count, castId)) return 'queued';
  return (await reopenForMore(runId, count, castId)) ? 'started' : null;
};

/** Takes the oldest queued batch off a finished run and reopens the run for it. Returns its size, or 0 when none (or
 *  when another batch took the run first; this one is then queued behind it). */
export const startQueuedMore = async (runId: string): Promise<number> => {
  const rows = await prisma.$queryRaw<{ next: QueuedMore }[]>`
    UPDATE public.auto_slideshow_runs r
    SET plan = jsonb_set(r.plan, '{queued}', (r.plan->'queued') - 0)
    FROM (SELECT id, plan->'queued'->0 AS next FROM public.auto_slideshow_runs WHERE id = ${runId} FOR UPDATE) q
    WHERE r.id = q.id AND r.status = 'COMPLETED' AND jsonb_array_length(COALESCE(r.plan->'queued', '[]'::jsonb)) > 0
    RETURNING q.next`;
  const next = rows[0]?.next;
  if (!next) return 0;
  if (await reopenForMore(runId, next.count, next.castId)) return next.count;
  // A "Get more" tap reopened the run first: this batch waits behind it again.
  await queueMore(runId, next.count, next.castId);
  return 0;
};

/** A failed batch drops the ones queued behind it (nothing charged yet), so they stop showing as "still being made". */
export const dropQueuedMore = async (runId: string): Promise<void> => {
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET count = GREATEST(0, count - (SELECT COALESCE(SUM((q->>'count')::int), 0) FROM jsonb_array_elements(plan->'queued') q)),
        plan = plan - 'queued'
    WHERE id = ${runId} AND jsonb_array_length(COALESCE(plan->'queued', '[]'::jsonb)) > 0`.catch((err: unknown) => {
    console.warn(`[auto-slideshow] run ${runId}: could not drop queued batches:`, err instanceof Error ? err.message : err);
  });
};

/** Step 3's new plan, written with the queue as it is in the database now, so a batch queued meanwhile is not lost. */
export const savePlanKeepingQueue = async (runId: string, plan: AutoPlan): Promise<void> => {
  const { queued: _ignored, ...rest } = plan;
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET plan = ${JSON.stringify(rest)}::jsonb || CASE WHEN plan->'queued' IS NOT NULL THEN jsonb_build_object('queued', plan->'queued') ELSE '{}'::jsonb END
    WHERE id = ${runId}`;
};
