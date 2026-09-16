import { prisma } from '../../../../../src/lib/db';
import { pollModelTest } from '../../../../../src/server/admin/modelTest';
import { adminRoute, json } from '../../../../../src/server/admin/route';

export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string }> };

/** GET — advances every model still working and returns the run with times and prices. */
export const GET = adminRoute(async (_req, ctx) => {
  const { runId } = await (ctx as Ctx).params;
  return json({ run: await pollModelTest(runId) });
});

/** DELETE — removes a run from the bench list (its photos stay in storage). */
export const DELETE = adminRoute(async (_req, ctx) => {
  const { runId } = await (ctx as Ctx).params;
  await prisma.modelTestRun.delete({ where: { id: runId } }).catch(() => undefined);
  return json({ deleted: true });
});
