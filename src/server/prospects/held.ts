// server-only — never import from a 'use client' file.
// A Prospect Pack's run reached its hold (pipeline.ts holdForCast): the warm-up made the brand's first face, so the
// other faces are made now (a full cast to choose from), and the pack waits for the admin's face check.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { StepCost } from '../../types/admin/metaAds';
import { startCast } from '../brandCast/cast';
import { createMeter, type CostMeter } from '../metaAds/cost';

/** Puts what the extra faces cost on the run's step 3 (with the warm-up), so the pack's cost counts them. */
const addToStep3 = async (runId: string, meter: CostMeter): Promise<void> => {
  const spent = meter.summary();
  if (spent.usdMicros === 0) return;
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { stepCosts: true } });
  const costs = run.stepCosts as Record<string, StepCost>;
  const step3 = costs['3'] ?? { usdMicros: 0, items: [] };
  const merged = { ...costs, 3: { usdMicros: step3.usdMicros + spent.usdMicros, items: [...step3.items, ...spent.items] } };
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { stepCosts: merged as unknown as Prisma.InputJsonValue } });
};

/** Never throws: the admin can still make faces by hand on the face check. */
export const onRunHeld = async (runId: string): Promise<void> => {
  const pack = await prisma.prospectPack.findFirst({ where: { brandRunId: runId }, select: { id: true, workspaceId: true } });
  if (!pack) return;
  const meter = createMeter();
  const job = await startCast(pack.workspaceId, meter).catch((err: unknown) => {
    console.warn(`[prospects] ${pack.id}: more faces not started:`, err instanceof Error ? err.message : err);
    return null;
  });
  await job?.().catch((err: unknown) => console.warn(`[prospects] ${pack.id}: faces failed:`, err instanceof Error ? err.message : err));
  await addToStep3(runId, meter).catch(() => undefined);
  await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'building' }, data: { status: 'faces' } });
};
