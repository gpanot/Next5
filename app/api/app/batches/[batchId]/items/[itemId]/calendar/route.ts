import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../../src/server/api';
import { addToCalendar, removeFromCalendar } from '../../../../../../../../src/server/calendar/calendar';
import { requireOwnedBatch } from '../../../../../../../../src/server/generation/access';
import { toItemDto } from '../../../../../../../../src/server/generation/dto';
import { HttpError } from '../../../../../../../../src/server/http';
import { prisma } from '../../../../../../../../src/lib/db';
import { requireWorkspace } from '../../../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/batches/[batchId]/items/[itemId]/calendar'>;

const itemOf = async (batchId: string, itemId: string) => {
  const item = await prisma.batchItem.findFirst({ where: { id: itemId, batchId } });
  if (!item) throw new HttpError(404, 'item_not_found', 'Photo not found.');
  return item;
};

/** POST — "Add to calendar": books this photo on her next open posting day. */
export const POST = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { batchId, itemId } = await ctx.params;
  await requireOwnedBatch(session.userId, batchId);
  const ws = await requireWorkspace(session.userId, 'brand');
  await itemOf(batchId, itemId);
  const slot = await addToCalendar(ws, itemId);
  return NextResponse.json({ item: await toItemDto(await itemOf(batchId, itemId), slot) }, { status: 201 });
});

/** DELETE — takes the photo off the calendar. */
export const DELETE = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { batchId, itemId } = await ctx.params;
  const batch = await requireOwnedBatch(session.userId, batchId);
  await removeFromCalendar(batch.workspaceId, itemId);
  const slot = await prisma.postSlot.findFirst({ where: { itemId }, select: { scheduledFor: true, status: true } });
  return NextResponse.json({ item: await toItemDto(await itemOf(batchId, itemId), slot) });
});
