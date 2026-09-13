import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../../src/server/api';
import { requireOwnedBatch } from '../../../../../../../../src/server/generation/access';
import { pump } from '../../../../../../../../src/server/generation/pump';
import { isRedoReason, redoItem } from '../../../../../../../../src/server/generation/redo';
import { HttpError, readJsonObject } from '../../../../../../../../src/server/http';

type Ctx = RouteContext<'/api/app/batches/[batchId]/items/[itemId]/redo'>;

/** POST …/items/[itemId]/redo — { reason, note? }. Free twice per photo, then 1 credit (2 for high-res). */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { batchId, itemId } = await ctx.params;
  const batch = await requireOwnedBatch(session.userId, batchId);
  const body = await readJsonObject(req);
  if (!isRedoReason(body.reason)) throw new HttpError(400, 'invalid_reason', 'Tell us what to fix.');

  const result = await redoItem({
    workspaceId: batch.workspaceId,
    batchId,
    itemId,
    reason: body.reason,
    note: typeof body.note === 'string' ? body.note : undefined,
  });
  after(() => pump({ batchId }).catch((err: unknown) => console.error('[redo] pump failed:', err)));
  return NextResponse.json(result);
});
