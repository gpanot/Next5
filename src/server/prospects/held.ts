// server-only — never import from a 'use client' file.
// A Prospect Pack's run reached its hold (pipeline.ts holdForCast): the warm-up made the brand's first face. One face is
// enough to start (2026-10-21), so no other face is made; one is made here only when the warm-up made none.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { StepCost } from '../../types/admin/metaAds';
import { prepareCast } from '../brandCast/cast';
import { createMeter, type CostMeter } from '../metaAds/cost';

/** Puts what the face costs on the run's step 3 (with the warm-up), so the pack's cost counts them. */
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
  await prepareCast(pack.workspaceId, meter).catch((err: unknown) => console.warn(`[prospects] ${pack.id}: face failed:`, err instanceof Error ? err.message : err));
  await addToStep3(runId, meter).catch(() => undefined);
  await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'building' }, data: { status: 'faces', facesAt: new Date() } });
};
