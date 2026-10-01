// server-only — never import from a 'use client' file.
// Runs and slideshows that stopped moving. On Vercel a background job is killed at its time limit and cannot record
// the failure itself, so anything with no progress for 10 minutes is marked failed here, where a person can retry it.

import { prisma } from '../../lib/db';
import { AUTO_STEPS } from '../../types/admin/autoSlideshow';

export const STUCK_AFTER_MS = 10 * 60 * 1000;

/** Marks stuck runs failed on their step, and slideshows stuck rendering failed. Cheap: a few indexed updates. */
export const expireStuck = async (now = Date.now()): Promise<void> => {
  const cutoff = new Date(now - STUCK_AFTER_MS);
  const error = 'Stopped: no progress for 10 minutes. Retry from this step.';
  await Promise.all([
    ...AUTO_STEPS.map((step) =>
      prisma.autoSlideshowRun.updateMany({
        where: { status: `STEP_${step}_RUNNING`, updatedAt: { lt: cutoff } },
        data: { status: 'FAILED', failedStep: step, error, finishedAt: new Date(now) },
      }),
    ),
    prisma.autoSlideshow.updateMany({
      where: { status: 'rendering', updatedAt: { lt: cutoff } },
      data: { status: 'failed', error: 'Rendering timed out after 10 minutes. Tap Retry.' },
    }),
  ]);
};
