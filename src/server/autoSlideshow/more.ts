// server-only — never import from a 'use client' file.
// "Get more": adds slideshows to a finished run. The run keeps its site read and proof (steps 1-2) and its photo set;
// step 3 adds picks on topics this site does not have yet, step 4 writes only those, step 6 renders only those.

import { prisma } from '../../lib/db';

/** Topics kept in the prompt: enough to steer, small enough to stay cheap. */
const PRIOR_LIMIT = 40;

/** Topics already made for `url` by runs created before `before`, plus run `includeRunId`'s own, newest first. */
export const priorTopicsForSite = async (url: string, before: Date, includeRunId?: string): Promise<string[]> => {
  const sources = [{ run: { url, createdAt: { lt: before } } }, ...(includeRunId ? [{ runId: includeRunId }] : [])];
  const rows = await prisma.autoSlideshow.findMany({
    where: { OR: sources, status: { not: 'failed' } },
    orderBy: { createdAt: 'desc' },
    take: PRIOR_LIMIT,
    select: { topic: true },
  });
  return [...new Set(rows.map((r) => r.topic))];
};

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
