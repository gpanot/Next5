/**
 * Campaign Studio cron recovery tick.
 * Called by the existing /api/cron/generations route to recover jobs stuck in 'running'.
 *
 * A Vercel Lambda can be killed mid-waitUntil. The next tick detects any job that has been
 * 'running' for more than STUCK_THRESHOLD_MS and marks it 'failed' with a timeout error so the
 * admin can retry from the UI.
 */
// server-only
import { prisma } from '../../lib/db';

const STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 min — Lambda max is 120 s; 3 min is safe

/** Marks studio jobs that have been running longer than STUCK_THRESHOLD_MS as failed. */
export async function recoverStuckStudioJobs(): Promise<void> {
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS);

  // Recover stuck extract jobs
  await prisma.studioRun.updateMany({
    where: { extractStatus: 'running', updatedAt: { lt: stuckBefore } },
    data: { extractStatus: 'failed', extractError: 'Job timed out (Lambda restart)' },
  });

  // Recover stuck research jobs
  await prisma.studioRun.updateMany({
    where: { researchStatus: 'running', updatedAt: { lt: stuckBefore } },
    data: { researchStatus: 'failed', researchError: 'Job timed out (Lambda restart)' },
  });

  // Recover stuck generate jobs
  await prisma.studioRun.updateMany({
    where: { generateStatus: 'running', updatedAt: { lt: stuckBefore } },
    data: { generateStatus: 'failed', generateError: 'Job timed out (Lambda restart)' },
  });
}
