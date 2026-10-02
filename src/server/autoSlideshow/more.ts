// server-only — never import from a 'use client' file.
// "Get more": adds slideshows to a finished run. The run keeps its site read and proof (steps 1-2); step 3 adds picks
// from the site's Slideshow Bank (least-used parts first), step 4 writes only those, steps 5-6 make their photos and slides.

import { prisma } from '../../lib/db';

/** Reopens a finished run for `count` more slideshows. False when the run is missing or not finished (e.g. a double tap).
 *  The new total is the slideshows the run has now plus `count`: the stored count can be stale (deletes, older runs), and
 *  the calendar reads `count - slideshows` as "still being made". */
export const reopenForMore = async (runId: string, count: number): Promise<boolean> => {
  const existing = await prisma.autoSlideshow.count({ where: { runId } });
  const { count: updated } = await prisma.autoSlideshowRun.updateMany({
    where: { id: runId, status: 'COMPLETED' },
    data: { count: existing + count, status: 'STEP_3_RUNNING', error: null, failedStep: null, startedAt: new Date(), finishedAt: null },
  });
  return updated === 1;
};
