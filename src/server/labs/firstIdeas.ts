// server-only — never import from a 'use client' file.
// A workspace's first calendar ideas, made by the server with no browser open:
//   'bank'  — once the first run's profile is ready (pipeline step 1): writes the Blitz Script Bank, while the run makes
//             its slideshow (whose step 3 builds the Slideshow Bank).
//   'ideas' — once the run is done: the first batch, mixed by Settings › Content, from both banks. Only footage and
//             images are left to make.
// Both skip a workspace that already has ideas, and runs that are not a workspace's own (admin runs, idea runs).

import { prisma } from '../../lib/db';
import { prepareBlitzBank } from './blitzBank';
import { generateIdeas, hasIdeas } from './calendarIdeas';

export type IdeasPhase = 'bank' | 'ideas';

export const isIdeasPhase = (v: unknown): v is IdeasPhase => v === 'bank' || v === 'ideas';

/** Never throws: it runs in the background. */
export async function prepareRunIdeas(runId: string, phase: IdeasPhase): Promise<void> {
  try {
    const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true, ideaForRunId: true, status: true } });
    const workspaceId = run?.workspaceId;
    if (!workspaceId || run.ideaForRunId || (await hasIdeas(workspaceId))) return;
    if (phase === 'bank') return await prepareBlitzBank(workspaceId);
    if (run.status !== 'COMPLETED') return;
    const t0 = Date.now();
    const { list, work } = await generateIdeas(workspaceId, runId, null, { firstOnly: true });
    console.log(`[first-ideas] workspace ${workspaceId}: ${list.ideas.length} ideas in ${Date.now() - t0}ms`);
    await work();
  } catch (err) {
    console.error(`[first-ideas] run ${runId} (${phase}) failed:`, err instanceof Error ? err.message : err);
  }
}
