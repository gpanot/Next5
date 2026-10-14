// server-only — never import from a 'use client' file.
// A workspace's first calendar ideas, made by the server with no browser open:
//   'bank'  — once the first run's profile is ready (pipeline step 1): writes the Blitz Script Bank, while the run makes
//             its slideshow (whose step 3 builds the Slideshow Bank). It starts 'ideas' as soon as the bank has a week
//             of stories, and again once the bank is done.
//   'ideas' — the first batch of Blitz ideas, filled up to IDEAS_PER_BATCH: the first week from a bank still being
//             built, the rest on the next start. It needs only the Blitz bank, so it does not wait for the run; the
//             pipeline starts it again once the run is done, in case the bank phase was cut short.
// Both skip a workspace that already has ideas, and runs that are not a workspace's own (admin runs, idea runs).
// Once the first batch is written, the deck's top card's voiceover is recorded too (2026-10-14), so the Ideas page
// plays it at once instead of recording it on arrival (~9 s).

import { signAdminToken } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import { appBaseUrl } from '../social/links';
import { blitzBankReady, prepareBlitzBank } from './blitzBank';
import { IDEAS_PER_BATCH } from '../../types/admin/calendarIdeas';
import { generateIdeas, hasIdeas, ideaCount } from './calendarIdeas';
import { narrateSlides } from './blitzVoice';
import type { IdeaDto } from '../../types/admin/calendarIdeas';

/**
 * Records the voiceover of the first Blitz idea the deck shows (soonest proposed one, as useIdeas deckOrder puts Blitz
 * ideas first in a new workspace). The recording is cached by its text and voice, so the deck's own request hits it.
 * Not counted in the free day's previews: it is the one every new workspace hears. Never throws.
 */
const recordTopVoice = async (workspaceId: string, ideas: IdeaDto[]): Promise<void> => {
  const top = ideas.filter((i) => i.status === 'proposed' && i.format === 'blitz' && i.card).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt))[0];
  if (!top?.card) return;
  const t0 = Date.now();
  await narrateSlides(top.card.shots.map((s) => ({ text: s.text })), top.card.voice, workspaceId)
    .then(() => console.log(`[first-ideas] workspace ${workspaceId}: top voiceover ready in ${Date.now() - t0}ms`))
    .catch((err: unknown) => console.warn(`[first-ideas] top voiceover for ${workspaceId} failed:`, err instanceof Error ? err.message : err));
};

export type IdeasPhase = 'bank' | 'ideas';

export const isIdeasPhase = (v: unknown): v is IdeasPhase => v === 'bank' || v === 'ideas';

/** Never throws: it runs in the background. */
export async function prepareRunIdeas(runId: string, phase: IdeasPhase): Promise<void> {
  try {
    const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true, ideaForRunId: true } });
    const workspaceId = run?.workspaceId;
    if (!workspaceId || run.ideaForRunId) return;
    if (phase === 'bank') {
      if (await hasIdeas(workspaceId)) return;
      await prepareBlitzBank(workspaceId, () => void kickRunIdeas(runId, 'ideas'));
      return await kickRunIdeas(runId, 'ideas');
    }
    // Up to 3 passes: one may only wait for a batch another start was writing, then the next fills what it left.
    const works: Array<() => Promise<void>> = [];
    let voiced = false;
    for (let pass = 0; pass < 3; pass += 1) {
      const before = await ideaCount(workspaceId);
      // The second half waits for the whole bank: a bank still being built has only the first week's stories.
      if (before >= IDEAS_PER_BATCH || (before > 0 && !(await blitzBankReady(workspaceId)))) break;
      const t0 = Date.now();
      const batch = await generateIdeas(workspaceId, runId, null, { firstOnly: true });
      works.push(batch.work);
      if (!voiced && batch.list.ideas.length > 0) {
        // Started now, not with the batch's work: later passes can wait a while for the bank.
        voiced = true;
        const recording = recordTopVoice(workspaceId, batch.list.ideas);
        works.push(() => recording);
      }
      console.log(`[first-ideas] workspace ${workspaceId}: ${before} → ${batch.list.ideas.length} ideas in ${Date.now() - t0}ms`);
    }
    await Promise.all(works.map((work) => work()));
  } catch (err) {
    console.error(`[first-ideas] run ${runId} (${phase}) failed:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Starts a phase for a workspace's own run. On Vercel each phase gets its own invocation (internal route); locally it
 * just runs alongside. Never throws. A second 'ideas' start is harmless: the batch is written once (generateIdeas).
 */
export async function kickRunIdeas(runId: string, phase: IdeasPhase): Promise<void> {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true, ideaForRunId: true } }).catch(() => null);
  if (!run?.workspaceId || run.ideaForRunId) return;
  if (process.env.VERCEL !== '1') {
    void prepareRunIdeas(runId, phase);
    return;
  }
  try {
    const res = await fetch(`${appBaseUrl()}/api/admin/auto-slideshow/runs/${runId}/ideas`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signAdminToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.warn(`[first-ideas] ${phase} for run ${runId} refused (${res.status})`);
  } catch (err) {
    console.warn(`[first-ideas] ${phase} for run ${runId} not started:`, err instanceof Error ? err.message : err);
  }
}
