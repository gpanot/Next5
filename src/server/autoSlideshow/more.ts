// server-only — never import from a 'use client' file.
// "Get more": adds slideshows to a finished run. The run keeps its site read and proof (steps 1-2); step 3 adds picks
// from the site's Slideshow Bank (least-used parts first), step 4 writes only those, steps 5-6 make their photos and slides.

import { prisma } from '../../lib/db';
import type { AutoPlan } from '../../types/admin/autoSlideshow';

/** Reopens a finished run for `count` more slideshows. False when the run is missing or not finished (e.g. a double tap).
 *  The new total is the slideshows the run has now plus `count`: the stored count can be stale (deletes, older runs), and
 *  the calendar reads `count - slideshows` as "still being made". `castId`: the brand face all of them use (the plan
 *  keeps it for step 4); none: the faces take turns. */
export const reopenForMore = async (runId: string, count: number, castId?: string): Promise<boolean> => {
  const [existing, run] = await Promise.all([
    prisma.autoSlideshow.count({ where: { runId } }),
    prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { plan: true } }),
  ]);
  const before = run?.plan as AutoPlan | null | undefined;
  const plan = before ? { ...before, castId } : undefined;
  const { count: updated } = await prisma.autoSlideshowRun.updateMany({
    where: { id: runId, status: 'COMPLETED' },
    data: { count: existing + count, status: 'STEP_3_RUNNING', error: null, failedStep: null, startedAt: new Date(), finishedAt: null, ...(plan ? { plan } : {}) },
  });
  return updated === 1;
};
